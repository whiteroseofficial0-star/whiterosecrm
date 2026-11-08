import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fiveDaysAgo = new Date(now);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const [
    hotLeadsNoActivity,
    demoCompletedNoFollowUp,
    proposalRequestedNoProposal,
    overdueTasks,
    highValueLowScore,
  ] = await Promise.all([
    // 1. Hot leads not contacted in 5+ days
    prisma.lead.findMany({
      where: {
        isDeleted: false,
        priority: "HOT",
        status: { notIn: ["WON", "LOST"] },
      },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        assignedTo: { select: { name: true } },
      },
    }).then((leads) =>
      leads
        .filter((l) => {
          if (l.activities.length === 0) return true;
          return new Date(l.activities[0].createdAt) < fiveDaysAgo;
        })
        .map((l) => ({
          type: "hot_lead_stale",
          title: `Hot lead "${l.businessName}" needs attention`,
          message: `Last activity was ${l.activities.length > 0 ? `${Math.floor((now.getTime() - new Date(l.activities[0].createdAt).getTime()) / 86400000)} days ago` : "never recorded"}. Assigned to ${l.assignedTo?.name ?? "unassigned"}.`,
          leadId: l.id,
        }))
    ),

    // 2. Leads with status DEMO_COMPLETED but no follow-ups scheduled after today
    prisma.lead.findMany({
      where: {
        isDeleted: false,
        status: "DEMO_COMPLETED",
      },
      include: {
        followUps: {
          where: {
            date: { gte: now },
            status: { notIn: ["CANCELLED"] },
          },
          orderBy: { date: "asc" },
          take: 1,
        },
        assignedTo: { select: { name: true } },
      },
    }).then((leads) =>
      leads
        .filter((l) => l.followUps.length === 0)
        .map((l) => ({
          type: "demo_no_followup",
          title: `Demo completed for "${l.businessName}" - schedule follow-up`,
          message: `No follow-up scheduled after demo. Assigned to ${l.assignedTo?.name ?? "unassigned"}.`,
          leadId: l.id,
        }))
    ),

    // 3. Leads with status PROPOSAL_REQUESTED but no proposals
    prisma.lead.findMany({
      where: {
        isDeleted: false,
        status: "PROPOSAL_REQUESTED",
      },
      include: {
        proposals: { take: 1 },
        assignedTo: { select: { name: true } },
      },
    }).then((leads) =>
      leads
        .filter((l) => l.proposals.length === 0)
        .map((l) => ({
          type: "proposal_not_created",
          title: `Proposal requested for "${l.businessName}"`,
          message: `Client requested a proposal but none has been created yet. Assigned to ${l.assignedTo?.name ?? "unassigned"}.`,
          leadId: l.id,
        }))
    ),

    // 4. Overdue tasks
    prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        assignedTo: { select: { name: true } },
        lead: { select: { businessName: true } },
      },
    }).then((tasks) =>
      tasks.map((t) => ({
        type: "overdue_task",
        title: `Overdue task: "${t.title}"`,
        message: `Due ${Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / 86400000)} days ago. Assigned to ${t.assignedTo?.name ?? "unassigned"}.`,
        taskId: t.id,
      }))
    ),

    // 5. Leads with high deal value but low score
    prisma.lead.findMany({
      where: {
        isDeleted: false,
        dealValue: { gt: 100000 },
        leadScore: { lt: 50 },
        status: { notIn: ["WON", "LOST"] },
      },
      select: {
        id: true,
        businessName: true,
        dealValue: true,
        leadScore: true,
        assignedTo: { select: { name: true } },
      },
    }).then((leads) =>
      leads.map((l) => ({
        type: "high_value_low_score",
        title: `High-value lead "${l.businessName}" with low score`,
        message: `Deal value ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(l.dealValue))} but only ${l.leadScore} points. Assigned to ${l.assignedTo?.name ?? "unassigned"}.`,
        leadId: l.id,
      }))
    ),
  ]);

  const recommendations = [
    ...hotLeadsNoActivity,
    ...demoCompletedNoFollowUp,
    ...proposalRequestedNoProposal,
    ...overdueTasks,
    ...highValueLowScore,
  ];

  return NextResponse.json({ recommendations });
}
