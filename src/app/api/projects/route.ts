import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAll, hasPermission } from "@/lib/rbac";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientId: z.string().min(1, "Client is required"),
  serviceType: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  projectValue: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  projectManagerId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum([
    "PLANNING", "REQUIREMENT_GATHERING", "DESIGN", "DEVELOPMENT",
    "TESTING", "CLIENT_REVIEW", "DEPLOYMENT", "MAINTENANCE",
    "COMPLETED", "ON_HOLD", "CANCELLED",
  ]).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "projects.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const clientId = searchParams.get("clientId") || "";
  const projectManagerId = searchParams.get("projectManagerId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (!canViewAll(session.user.role)) {
    where.projectManagerId = session.user.id;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { client: { businessName: { contains: search } } },
      { serviceType: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (projectManagerId) where.projectManagerId = projectManagerId;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, businessName: true, contactPerson: true } },
        projectManager: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  return NextResponse.json({
    projects,
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
  if (!hasPermission(session.user.permissions, "projects.update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { startDate, deadline, projectValue, ...rest } = parsed.data;

  const project = await prisma.project.create({
    data: {
      ...rest,
      projectValue: projectValue ?? undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      projectManagerId: rest.projectManagerId || session.user.id,
    },
    include: {
      client: { select: { id: true, businessName: true, contactPerson: true } },
      projectManager: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
