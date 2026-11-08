import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAll, hasPermission } from "@/lib/rbac";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";

const createFollowUpSchema = z.object({
  leadId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.enum([
    "PHONE_CALL",
    "WHATSAPP",
    "VISIT",
    "EMAIL",
    "DEMO",
    "MEETING",
    "PROPOSAL_DISCUSSION",
    "PAYMENT_FOLLOW_UP",
    "OTHER",
  ]),
  purpose: z.string().min(1, "Purpose is required"),
  reminderMins: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z
    .enum(["PENDING", "COMPLETED", "RESCHEDULED", "CANCELLED"])
    .optional(),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "followups.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "all";
  const status = searchParams.get("status") || "";
  const assignedToId = searchParams.get("assignedToId") || "";
  const leadId = searchParams.get("leadId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const where: Record<string, unknown> = {};

  if (!canViewAll(session.user.role as "SUPER_ADMIN" | "ADMIN" | "SALES_EXECUTIVE" | "DEVELOPER")) {
    where.assignedToId = session.user.id;
  }

  if (tab === "today") {
    where.date = { gte: todayStart, lte: todayEnd };
    where.status = "PENDING";
  } else if (tab === "upcoming") {
    where.date = { gt: todayEnd };
    where.status = "PENDING";
  } else if (tab === "overdue") {
    where.date = { lt: todayStart };
    where.status = "PENDING";
  } else if (tab === "completed") {
    where.status = "COMPLETED";
  }

  if (status && tab === "all") where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;
  if (leadId) where.leadId = leadId;

  const [followUps, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      include: {
        lead: { select: { id: true, businessName: true, contactPerson: true, mobile: true } },
        client: { select: { id: true, businessName: true, contactPerson: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      skip,
      take: limit,
    }),
    prisma.followUp.count({ where }),
  ]);

  return NextResponse.json({
    followUps,
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
  if (!hasPermission(session.user.permissions, "followups.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createFollowUpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { date, ...rest } = parsed.data;

  const followUp = await prisma.followUp.create({
    data: {
      ...rest,
      date: new Date(date),
      assignedToId: rest.assignedToId || session.user.id,
    },
    include: {
      lead: { select: { id: true, businessName: true, contactPerson: true, mobile: true } },
      client: { select: { id: true, businessName: true, contactPerson: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}
