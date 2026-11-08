import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const installmentSchema = z.object({
  label: z.string().min(1, "Label is required"),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().optional().nullable(),
});

const createPaymentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional().nullable(),
  totalAmount: z.number().positive("Total amount must be positive"),
  dueDate: z.string().optional().nullable(),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "RAZORPAY", "OTHER"]).optional().nullable(),
  transactionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  installments: z.array(installmentSchema).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "payments.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const clientId = searchParams.get("clientId") || "";
  const projectId = searchParams.get("projectId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { client: { businessName: { contains: search } } },
      { client: { contactPerson: { contains: search } } },
      { transactionId: { contains: search } },
      { notes: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (projectId) where.projectId = projectId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        client: { select: { id: true, businessName: true, contactPerson: true } },
        project: { select: { id: true, name: true } },
        installments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return NextResponse.json({
    payments,
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
  if (!hasPermission(session.user.permissions, "payments.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { dueDate, installments, ...paymentData } = parsed.data;

  const payment = await prisma.payment.create({
    data: {
      ...paymentData,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      installments: installments?.length
        ? {
            create: installments.map((inst) => ({
              label: inst.label,
              amount: inst.amount,
              dueDate: inst.dueDate ? new Date(inst.dueDate) : undefined,
            })),
          }
        : undefined,
    },
    include: {
      client: { select: { id: true, businessName: true, contactPerson: true } },
      project: { select: { id: true, name: true } },
      installments: true,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
