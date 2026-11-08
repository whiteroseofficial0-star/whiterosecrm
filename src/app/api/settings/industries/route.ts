import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const industrySchema = z.object({
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean().optional(),
});

const updateIndustrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required").optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const industries = await prisma.industry.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { leads: true } } },
  });

  return NextResponse.json({ industries });
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
  const parsed = industrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.industry.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: { name: ["Industry already exists"] } }, { status: 400 });
  }

  const industry = await prisma.industry.create({
    data: { name: parsed.data.name, isCustom: true, isActive: parsed.data.isActive ?? true },
  });

  return NextResponse.json(industry, { status: 201 });
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
  const parsed = updateIndustrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id, ...data } = parsed.data;

  const industry = await prisma.industry.update({
    where: { id },
    data,
  });

  return NextResponse.json(industry);
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

  const existing = await prisma.industry.findUnique({ where: { id }, include: { _count: { select: { leads: true } } } });
  if (!existing) {
    return NextResponse.json({ error: "Industry not found" }, { status: 404 });
  }

  if (existing._count.leads > 0) {
    await prisma.industry.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.industry.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
