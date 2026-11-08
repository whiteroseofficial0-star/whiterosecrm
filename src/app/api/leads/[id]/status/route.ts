import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum([
    "NEW_LEAD", "CONTACTED", "FOLLOW_UP", "INTERESTED",
    "DEMO_SCHEDULED", "DEMO_COMPLETED", "PROPOSAL_REQUESTED",
    "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "ON_HOLD",
  ]),
});

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
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: { status: parsed.data.status },
    include: {
      industry: true,
      source: true,
      area: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: id,
      type: "status_change",
      description: `Status changed from ${existing.status} to ${parsed.data.status}`,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(lead);
}
