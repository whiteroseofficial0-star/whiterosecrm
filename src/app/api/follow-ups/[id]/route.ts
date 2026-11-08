import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFollowUpSchema = z.object({
  leadId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  date: z.string().optional(),
  time: z.string().optional(),
  type: z
    .enum([
      "PHONE_CALL",
      "WHATSAPP",
      "VISIT",
      "EMAIL",
      "DEMO",
      "MEETING",
      "PROPOSAL_DISCUSSION",
      "PAYMENT_FOLLOW_UP",
      "OTHER",
    ])
    .optional(),
  purpose: z.string().optional(),
  reminderMins: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["PENDING", "COMPLETED", "RESCHEDULED", "CANCELLED"]).optional(),
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
  if (!hasPermission(session.user.permissions, "followups.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const followUp = await prisma.followUp.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, businessName: true, contactPerson: true, mobile: true } },
      client: { select: { id: true, businessName: true, contactPerson: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!followUp) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  return NextResponse.json(followUp);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "followups.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateFollowUpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.followUp.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  const { date, ...updateData } = parsed.data;

  const followUp = await prisma.followUp.update({
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

  return NextResponse.json(followUp);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "followups.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.followUp.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  await prisma.followUp.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
