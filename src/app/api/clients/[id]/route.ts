import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateClientSchema = z.object({
  businessName: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  mobile: z.string().min(1).optional(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  finalDealValue: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_HOLD"]).optional(),
  accountManagerId: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "clients.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      lead: true,
      accountManager: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      projects: {
        include: {
          projectManager: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        include: { installments: true },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "clients.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const data = parsed.data;

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...data,
      finalDealValue: data.finalDealValue !== undefined ? data.finalDealValue ?? undefined : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
    },
    include: {
      accountManager: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "clients.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    { error: "Client deletion is not supported. Clients can be marked as INACTIVE instead." },
    { status: 400 }
  );
}
