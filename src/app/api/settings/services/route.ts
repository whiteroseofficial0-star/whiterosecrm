import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["SOFTWARE_DEVELOPMENT", "CYBERSECURITY", "AUTOMATION", "AI_SERVICES", "OTHER"]),
  defaultPrice: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required").optional(),
  category: z.enum(["SOFTWARE_DEVELOPMENT", "CYBERSECURITY", "AUTOMATION", "AI_SERVICES", "OTHER"]).optional(),
  defaultPrice: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = serviceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.service.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: { name: ["Service already exists"] } }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      defaultPrice: parsed.data.defaultPrice,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json(service, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateServiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id, ...data } = parsed.data;

  const service = await prisma.service.update({
    where: { id },
    data,
  });

  return NextResponse.json(service);
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  await prisma.service.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
