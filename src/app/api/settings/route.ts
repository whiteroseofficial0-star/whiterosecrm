import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCompanySchema = z.object({
  companyName: z.string().optional(),
  logoUrl: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  currency: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [company, industries, sources, areas, services, whatsappTemplates] = await Promise.all([
    prisma.companySetting.findFirst(),
    prisma.industry.findMany({ orderBy: { name: "asc" } }),
    prisma.leadSource.findMany({ orderBy: { name: "asc" } }),
    prisma.area.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({
    company: company ?? { companyName: "WhiteRose", currency: "INR" },
    industries,
    sources,
    areas,
    services,
    whatsappTemplates,
  });
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
  const parsed = updateCompanySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.companySetting.findFirst();

  let settings;
  if (existing) {
    settings = await prisma.companySetting.update({
      where: { id: existing.id },
      data: parsed.data,
    });
  } else {
    settings = await prisma.companySetting.create({
      data: parsed.data,
    });
  }

  return NextResponse.json(settings);
}
