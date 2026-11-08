import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { slugifyProposalNumber } from "@/lib/utils";
import { z } from "zod";

const proposalItemSchema = z.object({
  serviceId: z.string().optional().nullable(),
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be non-negative"),
});

const createProposalSchema = z.object({
  leadId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  date: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  discount: z.number().min(0).optional().default(0),
  tax: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(proposalItemSchema).min(1, "At least one item is required"),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "proposals.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const leadId = searchParams.get("leadId") || "";
  const clientId = searchParams.get("clientId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (leadId) where.leadId = leadId;
  if (clientId) where.clientId = clientId;

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      include: {
        lead: { select: { id: true, businessName: true, contactPerson: true } },
        client: { select: { id: true, businessName: true, contactPerson: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.proposal.count({ where }),
  ]);

  return NextResponse.json({
    proposals,
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
  if (!hasPermission(session.user.permissions, "proposals.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProposalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { items, date, validUntil, ...proposalData } = parsed.data;

  const seq = await prisma.proposal.count() + 1;
  const proposalNumber = slugifyProposalNumber(seq);

  let subtotal = 0;
  for (const item of items) {
    subtotal += item.quantity * item.price;
  }

  const discount = proposalData.discount ?? 0;
  const taxRate = proposalData.tax ?? 0;
  const taxAmount = ((subtotal - discount) * taxRate) / 100;
  const total = subtotal - discount + taxAmount;

  const proposal = await prisma.proposal.create({
    data: {
      proposalNumber,
      leadId: proposalData.leadId || null,
      clientId: proposalData.clientId || null,
      date: date ? new Date(date) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      subtotal,
      discount,
      tax: taxAmount,
      total,
      notes: proposalData.notes || null,
      terms: proposalData.terms || null,
      createdById: session.user.id,
      items: {
        create: items.map((item) => ({
          serviceId: item.serviceId || null,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
        })),
      },
    },
    include: {
      lead: { select: { id: true, businessName: true, contactPerson: true } },
      client: { select: { id: true, businessName: true, contactPerson: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { service: true } },
    },
  });

  return NextResponse.json(proposal, { status: 201 });
}
