import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "leads.convert")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const existingClient = await prisma.client.findUnique({ where: { leadId: id } });
  if (existingClient) {
    return NextResponse.json({ error: "Client already exists for this lead" }, { status: 400 });
  }

  const client = await prisma.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        leadId: lead.id,
        businessName: lead.businessName,
        contactPerson: lead.contactPerson,
        mobile: lead.mobile,
        whatsapp: lead.whatsapp,
        email: lead.email,
        address: lead.address,
        finalDealValue: lead.dealValue,
        startDate: new Date(),
        status: "ACTIVE",
        accountManagerId: lead.assignedToId,
      },
      include: {
        lead: true,
        accountManager: { select: { id: true, name: true, email: true } },
      },
    });

    if (lead.status !== "WON") {
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: "WON" },
      });
    }

    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "converted",
        description: `Lead "${lead.businessName}" was converted to a client`,
        createdById: session.user.id,
      },
    });

    return newClient;
  });

  return NextResponse.json(client, { status: 201 });
}
