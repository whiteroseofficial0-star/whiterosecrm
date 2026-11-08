import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAll, hasPermission } from "@/lib/rbac";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";

const createMeetingSchema = z.object({
  leadId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  type: z.enum([
    "PHYSICAL_MEETING",
    "ONLINE_MEETING",
    "PRODUCT_DEMO",
    "REQUIREMENT_DISCUSSION",
    "PROPOSAL_DISCUSSION",
    "PROJECT_MEETING",
  ]),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  durationMins: z.number().optional().nullable(),
  location: z.string().optional().nullable(),
  meetUrl: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "meetings.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "all";
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const assignedToId = searchParams.get("assignedToId") || "";
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
    where.status = "SCHEDULED";
  } else if (tab === "upcoming") {
    where.date = { gt: todayEnd };
    where.status = "SCHEDULED";
  } else if (tab === "completed") {
    where.status = "COMPLETED";
  } else if (tab === "cancelled") {
    where.status = "CANCELLED";
  }

  if (status && tab === "all") where.status = status;
  if (type) where.type = type;
  if (assignedToId) where.assignedToId = assignedToId;

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
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
    prisma.meeting.count({ where }),
  ]);

  return NextResponse.json({
    meetings,
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
  if (!hasPermission(session.user.permissions, "meetings.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createMeetingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { date, ...rest } = parsed.data;

  const meeting = await prisma.meeting.create({
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

  return NextResponse.json(meeting, { status: 201 });
}
