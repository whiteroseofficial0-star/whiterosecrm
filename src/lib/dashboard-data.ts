import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export async function getDashboardStats() {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [
    totalLeads,
    newLeads,
    followUpsToday,
    overdueFollowUps,
    hotLeads,
    interestedLeads,
    demoScheduled,
    proposalSent,
    negotiation,
    won,
    lost,
    totalClients,
    activeProjects,
    completedProjects,
    pipelineAgg,
    payments,
    revenueThisMonthAgg,
  ] = await Promise.all([
    prisma.lead.count({ where: { isDeleted: false } }),
    prisma.lead.count({ where: { isDeleted: false, status: "NEW_LEAD" } }),
    prisma.followUp.count({
      where: { date: { gte: todayStart, lte: todayEnd }, status: "PENDING" },
    }),
    prisma.followUp.count({
      where: { date: { lt: todayStart }, status: "PENDING" },
    }),
    prisma.lead.count({ where: { isDeleted: false, priority: "HOT" } }),
    prisma.lead.count({ where: { isDeleted: false, status: "INTERESTED" } }),
    prisma.lead.count({ where: { isDeleted: false, status: "DEMO_SCHEDULED" } }),
    prisma.lead.count({ where: { isDeleted: false, status: "PROPOSAL_SENT" } }),
    prisma.lead.count({ where: { isDeleted: false, status: "NEGOTIATION" } }),
    prisma.lead.count({ where: { isDeleted: false, status: "WON" } }),
    prisma.lead.count({ where: { isDeleted: false, status: "LOST" } }),
    prisma.client.count(),
    prisma.project.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.project.count({ where: { status: "COMPLETED" } }),
    prisma.lead.aggregate({
      where: { isDeleted: false, status: { notIn: ["WON", "LOST"] } },
      _sum: { dealValue: true },
    }),
    prisma.payment.findMany({ select: { totalAmount: true, paidAmount: true, status: true } }),
    prisma.payment.aggregate({
      where: { updatedAt: { gte: monthStart, lte: monthEnd }, status: "PAID" },
      _sum: { paidAmount: true },
    }),
  ]);

  const outstandingPayments = payments.reduce((sum, p) => {
    const remaining = Number(p.totalAmount) - Number(p.paidAmount);
    return remaining > 0 ? sum + remaining : sum;
  }, 0);

  const conversionRate = totalLeads > 0 ? Math.round((won / totalLeads) * 1000) / 10 : 0;

  return {
    totalLeads,
    newLeads,
    followUpsToday,
    overdueFollowUps,
    hotLeads,
    interestedLeads,
    demoScheduled,
    proposalSent,
    negotiation,
    won,
    lost,
    totalClients,
    activeProjects,
    completedProjects,
    expectedRevenue: Number(pipelineAgg._sum.dealValue ?? 0),
    revenueThisMonth: Number(revenueThisMonthAgg._sum.paidAmount ?? 0),
    outstandingPayments,
    conversionRate,
  };
}

export async function getLeadsByStatus() {
  const grouped = await prisma.lead.groupBy({
    by: ["status"],
    where: { isDeleted: false },
    _count: { _all: true },
  });
  return grouped.map((g) => ({ status: g.status, count: g._count._all }));
}

export async function getLeadsByIndustry() {
  const leads = await prisma.lead.findMany({
    where: { isDeleted: false },
    select: { industry: { select: { name: true } }, customIndustry: true },
  });
  const counts = new Map<string, number>();
  for (const l of leads) {
    const name = l.industry?.name ?? l.customIndustry ?? "Other";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export async function getNeedsAttention() {
  const todayStart = startOfDay(new Date());

  const [hotWithoutFollowUp, overdueCount, requestedNoProposal, paymentsOverdueAgg, demosToday] =
    await Promise.all([
      prisma.lead.count({
        where: { isDeleted: false, priority: "HOT", followUps: { none: {} } },
      }),
      prisma.followUp.count({ where: { date: { lt: todayStart }, status: "PENDING" } }),
      prisma.lead.count({
        where: { isDeleted: false, status: "PROPOSAL_REQUESTED", proposals: { none: {} } },
      }),
      prisma.payment.findMany({
        where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
        select: { totalAmount: true, paidAmount: true, dueDate: true },
      }),
      prisma.meeting.count({
        where: { date: { gte: todayStart, lte: endOfDay(new Date()) }, type: "PRODUCT_DEMO" },
      }),
    ]);

  const overduePaymentTotal = paymentsOverdueAgg
    .filter((p) => p.dueDate && p.dueDate < new Date())
    .reduce((sum, p) => sum + (Number(p.totalAmount) - Number(p.paidAmount)), 0);

  return {
    hotWithoutFollowUp,
    overdueCount,
    requestedNoProposal,
    overduePaymentTotal,
    demosToday,
  };
}
