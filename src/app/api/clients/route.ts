import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAll, hasPermission } from "@/lib/rbac";
import { z } from "zod";

const createClientSchema = z.object({
  leadId: z.string().optional().nullable(),
  businessName: z.string().min(1, "Business name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  mobile: z.string().min(1, "Mobile number is required"),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  finalDealValue: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_HOLD"]).optional(),
  accountManagerId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "clients.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const accountManagerId = searchParams.get("accountManagerId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (!canViewAll(session.user.role)) {
    where.accountManagerId = session.user.id;
  }

  if (search) {
    where.OR = [
      { businessName: { contains: search } },
      { contactPerson: { contains: search } },
      { mobile: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (accountManagerId) where.accountManagerId = accountManagerId;

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        accountManager: { select: { id: true, name: true, email: true } },
        _count: { select: { projects: true, payments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json({
    clients,
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
  if (!hasPermission(session.user.permissions, "clients.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;

  if (data.leadId) {
    const existing = await prisma.client.findUnique({ where: { leadId: data.leadId } });
    if (existing) {
      return NextResponse.json({ error: "Client already exists for this lead" }, { status: 400 });
    }
  }

  const client = await prisma.client.create({
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      finalDealValue: data.finalDealValue ?? undefined,
    },
    include: {
      accountManager: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(client, { status: 201 });
}
