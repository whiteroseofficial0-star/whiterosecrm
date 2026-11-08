import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canViewAll, hasPermission, type RoleName } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

/** Parse a YYYY-MM-DD query value into a UTC date (start or end of day). */
function parseDay(value: string | null, edge: "start" | "end"): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (edge === "end") date.setUTCHours(23, 59, 59, 999);
  return date;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.permissions, "reports.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  let fromDate = parseDay(searchParams.get("from"), "start");
  let toDate = parseDay(searchParams.get("to"), "end");
  // Tolerate a reversed range instead of returning empty results.
  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [
      new Date(toDate.getTime() - 86_399_999),
      new Date(fromDate.getTime() + 86_399_999),
    ];
  }
  const range = fromDate || toDate ? { gte: fromDate, lte: toDate } : undefined;
  const leadWhere = { isDeleted: false, ...(range ? { createdAt: range } : {}) };

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    leadsByStatus,
    leadsByIndustry,
    leadsBySource,
    leadsByArea,
    conversionFunnel,
    revenueByMonth,
    payments,
    totalLeads,
    wonLeads,
    lostLeads,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
      where: leadWhere,
    }),
    prisma.lead.groupBy({
      by: ["industryId"],
      _count: { id: true },
      where: leadWhere,
    }),
    prisma.lead.groupBy({
      by: ["sourceId"],
      _count: { id: true },
      where: leadWhere,
    }),
    prisma.lead.groupBy({
      by: ["areaId"],
      _count: { id: true },
      where: { ...leadWhere, areaId: { not: null } },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { isDeleted: false },
      orderBy: { status: "asc" },
    }),
    prisma.payment.findMany({
      where: range ? { createdAt: range } : { createdAt: { gte: sixMonthsAgo } },
      select: { paidAmount: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: range ? { createdAt: range } : undefined,
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        client: { select: { id: true, businessName: true } },
      },
    }),
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, status: "WON" } }),
    prisma.lead.count({ where: { ...leadWhere, status: "LOST" } }),
  ]);

  // Resolve industry names
  const industryIds = leadsByIndustry.map((g) => g.industryId).filter(Boolean) as string[];
  const industries = industryIds.length
    ? await prisma.industry.findMany({ where: { id: { in: industryIds } }, select: { id: true, name: true } })
    : [];
  const industryMap = new Map(industries.map((i) => [i.id, i.name]));
  const resolvedIndustries = leadsByIndustry.map((g) => ({
    name: g.industryId ? (industryMap.get(g.industryId) ?? "Unknown") : "Unknown",
    count: g._count.id,
  }));

  // Resolve source names
  const sourceIds = leadsBySource.map((g) => g.sourceId).filter(Boolean) as string[];
  const sources = sourceIds.length
    ? await prisma.leadSource.findMany({ where: { id: { in: sourceIds } }, select: { id: true, name: true } })
    : [];
  const sourceMap = new Map(sources.map((s) => [s.id, s.name]));
  const resolvedSources = leadsBySource.map((g) => ({
    name: g.sourceId ? (sourceMap.get(g.sourceId) ?? "Unknown") : "Unknown",
    count: g._count.id,
  }));

  // Resolve area names
  const areaIds = leadsByArea.map((g) => g.areaId).filter(Boolean) as string[];
  const areas = areaIds.length
    ? await prisma.area.findMany({ where: { id: { in: areaIds } }, select: { id: true, name: true } })
    : [];
  const areaMap = new Map(areas.map((a) => [a.id, a.name]));
  const resolvedAreas = leadsByArea.map((g) => ({
    name: g.areaId ? (areaMap.get(g.areaId) ?? "Unknown") : "Unknown",
    count: g._count.id,
  }));

  // Revenue by month
  const monthlyRev: Record<string, number> = {};
  for (const p of revenueByMonth) {
    const key = p.createdAt.toISOString().slice(0, 7);
    monthlyRev[key] = (monthlyRev[key] ?? 0) + Number(p.paidAmount ?? 0);
  }
  const revenueTrend = Object.entries(monthlyRev)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  // Per-person performance. Admins see every active user; everyone else only themselves.
  const viewAll = canViewAll(session.user.role as RoleName);
  const topPerformers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      department: true,
      role: { select: { label: true } },
      leadsAssigned: {
        select: { id: true, status: true, dealValue: true },
        where: leadWhere,
      },
      followUps: {
        select: { id: true, status: true },
        where: range ? { date: range } : undefined,
      },
      tasks: {
        select: { id: true, status: true },
        where: range
          ? { OR: [{ dueDate: range }, { dueDate: null, createdAt: range }] }
          : undefined,
      },
      meetings: {
        select: { id: true, status: true },
        where: range ? { date: range } : undefined,
      },
      activities: {
        select: { id: true },
        where: range ? { createdAt: range } : undefined,
      },
    },
    where: viewAll ? { status: "ACTIVE" } : { id: session.user.id },
    orderBy: { name: "asc" },
  });
  const salesExecs = topPerformers.map((u) => {
    const totalLeads = u.leadsAssigned.length;
    const won = u.leadsAssigned.filter((l) => l.status === "WON").length;
    const lost = u.leadsAssigned.filter((l) => l.status === "LOST").length;
    const totalDealValue = u.leadsAssigned
      .filter((l) => l.status === "WON")
      .reduce((sum, l) => sum + Number(l.dealValue ?? 0), 0);
    return {
      id: u.id,
      name: u.name,
      role: u.role.label,
      department: u.department,
      totalLeads,
      won,
      lost,
      totalDealValue,
      followUps: u.followUps.length,
      followUpsDone: u.followUps.filter((f) => f.status === "COMPLETED").length,
      tasks: u.tasks.length,
      tasksDone: u.tasks.filter((t) => t.status === "COMPLETED").length,
      meetings: u.meetings.length,
      meetingsDone: u.meetings.filter((m) => m.status === "COMPLETED").length,
      activities: u.activities.length,
    };
  });

  // Payment summary
  const totalPayments = payments.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.paidAmount ?? 0), 0);
  const totalOutstanding = payments
    .filter((p) => p.status === "PENDING" || p.status === "PARTIALLY_PAID")
    .reduce((s, p) => s + Number(p.totalAmount) - Number(p.paidAmount ?? 0), 0);
  const totalOverdue = payments
    .filter((p) => p.status === "OVERDUE")
    .reduce((s, p) => s + Number(p.totalAmount) - Number(p.paidAmount ?? 0), 0);

  const paymentStatusBreakdown = payments.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Outstanding payments list
  const outstandingPayments = payments
    .filter((p) => p.status === "PENDING" || p.status === "PARTIALLY_PAID" || p.status === "OVERDUE")
    .map((p) => ({
      id: p.id,
      client: p.client.businessName,
      totalAmount: Number(p.totalAmount),
      paidAmount: Number(p.paidAmount),
      outstanding: Number(p.totalAmount) - Number(p.paidAmount),
      status: p.status,
      dueDate: p.dueDate,
    }));

  // Conversion funnel in pipeline order
  const funnelOrder: Array<{ status: string; count: number }> = [
    { status: "NEW_LEAD", count: 0 },
    { status: "CONTACTED", count: 0 },
    { status: "FOLLOW_UP", count: 0 },
    { status: "INTERESTED", count: 0 },
    { status: "DEMO_SCHEDULED", count: 0 },
    { status: "DEMO_COMPLETED", count: 0 },
    { status: "PROPOSAL_REQUESTED", count: 0 },
    { status: "PROPOSAL_SENT", count: 0 },
    { status: "NEGOTIATION", count: 0 },
    { status: "WON", count: 0 },
    { status: "LOST", count: 0 },
    { status: "ON_HOLD", count: 0 },
  ];
  const funnelMap = new Map<string, number>(conversionFunnel.map((g) => [String(g.status), g._count.id]));
  const funnel = funnelOrder.map((s) => ({ status: s.status, count: funnelMap.get(s.status) ?? 0 }));

  // Revenue by client (from payments)
  const clientRevenue: Record<string, { client: string; total: number; paid: number }> = {};
  for (const p of payments) {
    const b = p.client.businessName;
    if (!clientRevenue[b]) clientRevenue[b] = { client: b, total: 0, paid: 0 };
    clientRevenue[b].total += Number(p.totalAmount);
    clientRevenue[b].paid += Number(p.paidAmount);
  }
  const revenueByClient = Object.values(clientRevenue).sort((a, b) => b.paid - a.paid);

  return NextResponse.json({
    dateRange: { from: fromDate ?? null, to: toDate ?? null },
    leadsByStatus: leadsByStatus.map((g) => ({ status: g.status, count: g._count.id })),
    leadsByIndustry: resolvedIndustries,
    leadsBySource: resolvedSources,
    leadsByArea: resolvedAreas,
    conversionFunnel: funnel,
    revenueTrend,
    topPerformers: salesExecs,
    paymentSummary: {
      total: totalPayments,
      paid: totalPaid,
      outstanding: totalOutstanding,
      overdue: totalOverdue,
    },
    totalLeads,
    wonLeads,
    lostLeads,
    paymentStatusBreakdown,
    outstandingPayments,
    revenueByClient,
  });
}
