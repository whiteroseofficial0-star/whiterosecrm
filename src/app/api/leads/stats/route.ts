import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAll, hasPermission } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "leads.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: Record<string, unknown> = { isDeleted: false };

  if (!canViewAll(session.user.role)) {
    where.assignedToId = session.user.id;
  }

  const grouped = await prisma.lead.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
    _sum: { dealValue: true },
  });

  const stats = grouped.map((g) => ({
    status: g.status,
    count: g._count._all,
    totalDealValue: Number(g._sum.dealValue ?? 0),
  }));

  return NextResponse.json(stats);
}
