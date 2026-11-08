import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMeetingSchema = z.object({
  leadId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  type: z
    .enum([
      "PHYSICAL_MEETING",
      "ONLINE_MEETING",
      "PRODUCT_DEMO",
      "REQUIREMENT_DISCUSSION",
      "PROPOSAL_DISCUSSION",
      "PROJECT_MEETING",
    ])
    .optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  durationMins: z.number().optional().nullable(),
  location: z.string().optional().nullable(),
  meetUrl: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "meetings.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, businessName: true, contactPerson: true, mobile: true } },
      client: { select: { id: true, businessName: true, contactPerson: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(meeting);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "meetings.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateMeetingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.meeting.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { date, ...updateData } = parsed.data;

  const meeting = await prisma.meeting.update({
    where: { id },
    data: {
      ...updateData,
      ...(date !== undefined && { date: new Date(date) }),
    },
    include: {
      lead: { select: { id: true, businessName: true, contactPerson: true, mobile: true } },
      client: { select: { id: true, businessName: true, contactPerson: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(meeting);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "meetings.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.meeting.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  await prisma.meeting.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
