import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const proposalItemSchema = z.object({
  serviceId: z.string().optional().nullable(),
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be non-negative"),
});

const updateProposalSchema = z.object({
  leadId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  date: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(proposalItemSchema).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "proposals.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, businessName: true, contactPerson: true, mobile: true, email: true, address: true, city: true, state: true } },
      client: { select: { id: true, businessName: true, contactPerson: true, mobile: true, email: true, address: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { service: true } },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json(proposal);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "proposals.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateProposalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.proposal.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const { items, date, validUntil, ...updateData } = parsed.data;

  const data: Record<string, unknown> = { ...updateData };

  if (date !== undefined) data.date = new Date(date);
  if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null;

  if (items) {
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.price;
    }

    const discount = updateData.discount ?? existing.discount;
    const taxRate = updateData.tax ?? existing.tax;
    const taxAmount = ((subtotal - discount) * taxRate) / 100;
    const total = subtotal - discount + taxAmount;

    data.subtotal = subtotal;
    data.discount = discount;
    data.tax = taxAmount;
    data.total = total;

    data.items = {
      deleteMany: {},
      create: items.map((item) => ({
        serviceId: item.serviceId || null,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
      })),
    };
  } else if (updateData.discount !== undefined || updateData.tax !== undefined) {
    const subtotal = existing.subtotal;
    const discount = updateData.discount ?? existing.discount;
    const taxRate = updateData.tax ?? existing.tax;
    const taxAmount = ((subtotal - discount) * taxRate) / 100;
    const total = subtotal - discount + taxAmount;

    data.discount = discount;
    data.tax = taxAmount;
    data.total = total;
  }

  const proposal = await prisma.proposal.update({
    where: { id },
    data,
    include: {
      lead: { select: { id: true, businessName: true, contactPerson: true } },
      client: { select: { id: true, businessName: true, contactPerson: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { service: true } },
    },
  });

  return NextResponse.json(proposal);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "proposals.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.proposal.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  await prisma.proposal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
