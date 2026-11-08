import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  roleId: z.string().optional(),
  department: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "team.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      status: true,
      joinDate: true,
      avatarUrl: true,
      role: { select: { id: true, name: true, label: true } },
      _count: {
        select: {
          leadsAssigned: { where: { isDeleted: false } },
          projectsManaged: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (emailTaken) {
      return NextResponse.json({ error: { email: ["Email already exists"] } }, { status: 400 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email ? parsed.data.email.toLowerCase() : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      status: true,
      joinDate: true,
      role: { select: { id: true, name: true, label: true } },
      _count: {
        select: {
          leadsAssigned: { where: { isDeleted: false } },
          projectsManaged: true,
        },
      },
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const actorId = session.user.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Nobody can remove their own account through the team screen.
  if (id === actorId) {
    return NextResponse.json({ error: "You cannot remove your own account" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { role: { select: { name: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Admins cannot remove a super admin; the last super admin is protected.
  if (existing.role.name === "SUPER_ADMIN") {
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only a super admin can remove a super admin" }, { status: 403 });
    }
    const otherSuperAdmins = await prisma.user.count({
      where: { role: { name: "SUPER_ADMIN" }, status: "ACTIVE", id: { not: id } },
    });
    if (otherSuperAdmins === 0) {
      return NextResponse.json({ error: "At least one active super admin is required" }, { status: 400 });
    }
  }

  // Removing the member must not orphan records that require an owner
  // (created leads, proposals, notes): those are handed to the person doing
  // the removal. Optional assignments are simply unassigned.
  await prisma.$transaction([
    prisma.lead.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    prisma.lead.updateMany({ where: { createdById: id }, data: { createdById: actorId } }),
    prisma.followUp.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    prisma.task.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    prisma.meeting.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    prisma.proposal.updateMany({ where: { createdById: id }, data: { createdById: actorId } }),
    prisma.client.updateMany({ where: { accountManagerId: id }, data: { accountManagerId: null } }),
    prisma.project.updateMany({ where: { projectManagerId: id }, data: { projectManagerId: null } }),
    prisma.note.updateMany({ where: { authorId: id }, data: { authorId: actorId } }),
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.leadActivity.updateMany({ where: { createdById: id }, data: { createdById: null } }),
    prisma.document.updateMany({ where: { uploadedById: id }, data: { uploadedById: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
