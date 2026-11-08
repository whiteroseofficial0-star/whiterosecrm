import {
  Users,
  UserPlus,
  PhoneCall,
  AlertTriangle,
  Flame,
  Heart,
  Video,
  FileText,
  Handshake,
  Trophy,
  XCircle,
  Building2,
  FolderKanban,
  CheckCircle2,
  IndianRupee,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { auth } from "@/auth";
import { getDashboardStats, getLeadsByStatus, getLeadsByIndustry, getNeedsAttention } from "@/lib/dashboard-data";
import { StatCard } from "@/components/dashboard/stat-card";
import { LeadsByStatusChart, LeadsByIndustryChart } from "@/components/dashboard/dashboard-charts";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { formatINR } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const [stats, byStatus, byIndustry, attention] = await Promise.all([
    getDashboardStats(),
    getLeadsByStatus(),
    getLeadsByIndustry(),
    getNeedsAttention(),
  ]);

  const keyStats = [
    { label: "Total Leads", value: stats.totalLeads, icon: Users },
    { label: "Hot Leads", value: stats.hotLeads, icon: Flame, accent: "danger" as const },
    { label: "Won Deals", value: stats.won, icon: Trophy, accent: "success" as const },
    { label: "Revenue", value: formatINR(stats.revenueThisMonth), icon: TrendingUp, accent: "success" as const },
  ];

  const secondaryStats = [
    { label: "New Leads", value: stats.newLeads, icon: UserPlus },
    { label: "Follow-ups Today", value: stats.followUpsToday, icon: PhoneCall, accent: "warning" as const },
    { label: "Overdue", value: stats.overdueFollowUps, icon: AlertTriangle, accent: "danger" as const },
    { label: "Interested", value: stats.interestedLeads, icon: Heart },
    { label: "Demos", value: stats.demoScheduled, icon: Video },
    { label: "Proposals", value: stats.proposalSent, icon: FileText },
    { label: "Negotiation", value: stats.negotiation, icon: Handshake, accent: "warning" as const },
    { label: "Lost", value: stats.lost, icon: XCircle, accent: "danger" as const },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
          Welcome back, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Here&apos;s what&apos;s happening across WhiteRose today.
        </p>
      </div>

      {/* Key Stats - 2 on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {keyStats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </div>

      {/* Secondary Stats - horizontally scrollable on mobile */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex gap-3 md:grid md:grid-cols-4 lg:grid-cols-8">
          {secondaryStats.map((s) => (
            <div key={s.label} className="w-[130px] flex-shrink-0 md:w-auto">
              <StatCard label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
            </div>
          ))}
        </div>
      </div>

      {/* Charts - stack on mobile, side-by-side on desktop */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <LeadsByStatusChart data={byStatus} />
          <LeadsByIndustryChart data={byIndustry} />
        </div>
        <NeedsAttention data={attention} />
      </div>
    </div>
  );
}
