import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAll, hasPermission } from "@/lib/rbac";
import { z } from "zod";

const createLeadSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  position: z.string().optional().nullable(),
  mobile: z.string().min(1, "Mobile number is required"),
  alternateMobile: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  areaId: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pinCode: z.string().optional().nullable(),
  googleMapsUrl: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  industryId: z.string().optional().nullable(),
  customIndustry: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  status: z.enum([
    "NEW_LEAD", "CONTACTED", "FOLLOW_UP", "INTERESTED",
    "DEMO_SCHEDULED", "DEMO_COMPLETED", "PROPOSAL_REQUESTED",
    "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "ON_HOLD",
  ]).optional(),
  priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
  leadScore: z.number().min(0).max(100).optional(),
  scoreOverridden: z.boolean().optional(),
  dealValue: z.number().optional().nullable(),
  probability: z.number().min(0).max(100).optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  lostNotes: z.string().optional().nullable(),
  visitingCardUrl: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  serviceIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "leads.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";
  const industryId = searchParams.get("industryId") || "";
  const sourceId = searchParams.get("sourceId") || "";
  const areaId = searchParams.get("areaId") || "";
  const assignedToId = searchParams.get("assignedToId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const sort = searchParams.get("sort") || "createdAt-desc";

  const [sortField, sortDir] = sort.split("-");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };

  if (!canViewAll(session.user.role)) {
    where.assignedToId = session.user.id;
  }

  if (search) {
    where.OR = [
      { businessName: { contains: search } },
      { contactPerson: { contains: search } },
      { mobile: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (industryId) where.industryId = industryId;
  if (sourceId) where.sourceId = sourceId;
  if (areaId) where.areaId = areaId;
  if (assignedToId) where.assignedToId = assignedToId;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        industry: true,
        source: true,
        area: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        services: { include: { service: true } },
      },
      orderBy: { [sortField]: sortDir },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "leads.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { serviceIds, ...leadData } = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      ...leadData,
      dealValue: leadData.dealValue ?? undefined,
      createdById: session.user.id,
      assignedToId: leadData.assignedToId || session.user.id,
      services: serviceIds?.length
        ? { create: serviceIds.map((serviceId) => ({ serviceId })) }
        : undefined,
    },
    include: {
      industry: true,
      source: true,
      area: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      services: { include: { service: true } },
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "created",
      description: `Lead "${lead.businessName}" was created`,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
