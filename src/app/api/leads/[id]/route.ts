import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateLeadSchema = z.object({
  businessName: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  position: z.string().optional().nullable(),
  mobile: z.string().min(1).optional(),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "leads.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      industry: true,
      source: true,
      area: true,
      assignedTo: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      services: { include: { service: true } },
      activities: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      followUps: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
      },
      tasks: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      meetings: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
      },
      proposals: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      client: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "leads.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { serviceIds, ...updateData } = parsed.data;

  if (updateData.dealValue !== undefined) {
    (updateData as Record<string, unknown>).dealValue = updateData.dealValue ?? null;
  }
  if (updateData.expectedCloseDate !== undefined) {
    (updateData as Record<string, unknown>).expectedCloseDate = updateData.expectedCloseDate ? new Date(updateData.expectedCloseDate) : null;
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...updateData,
      ...(serviceIds !== undefined && {
        services: {
          deleteMany: {},
          create: serviceIds.map((serviceId) => ({ serviceId })),
        },
      }),
    },
    include: {
      industry: true,
      source: true,
      area: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      services: { include: { service: true } },
    },
  });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await prisma.leadActivity.create({
      data: {
        leadId: id,
        type: "status_change",
        description: `Status changed from ${existing.status} to ${parsed.data.status}`,
        createdById: session.user.id,
      },
    });
  }

  return NextResponse.json(lead);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "leads.delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await prisma.lead.update({
    where: { id },
    data: { isDeleted: true },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: id,
      type: "deleted",
      description: `Lead "${existing.businessName}" was deleted`,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
