import Link from "next/link";
import { Flame, AlertTriangle, FileText, Wallet, Video } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

export function NeedsAttention({
  data,
}: {
  data: {
    hotWithoutFollowUp: number;
    overdueCount: number;
    requestedNoProposal: number;
    overduePaymentTotal: number;
    demosToday: number;
  };
}) {
  const items = [
    {
      show: data.hotWithoutFollowUp > 0,
      href: "/leads?priority=HOT",
      icon: Flame,
      text: `${data.hotWithoutFollowUp} hot lead${data.hotWithoutFollowUp === 1 ? "" : "s"} have no follow-up scheduled`,
      accent: "text-red-600",
    },
    {
      show: data.overdueCount > 0,
      href: "/follow-ups?tab=overdue",
      icon: AlertTriangle,
      text: `${data.overdueCount} follow-up${data.overdueCount === 1 ? "" : "s"} overdue`,
      accent: "text-amber-600",
    },
    {
      show: data.requestedNoProposal > 0,
      href: "/leads?status=PROPOSAL_REQUESTED",
      icon: FileText,
      text: `${data.requestedNoProposal} requested proposal${data.requestedNoProposal === 1 ? "" : "s"} not yet created`,
      accent: "text-blue-600",
    },
    {
      show: data.overduePaymentTotal > 0,
      href: "/payments?status=OVERDUE",
      icon: Wallet,
      text: `${formatINR(data.overduePaymentTotal)} in payments overdue`,
      accent: "text-emerald-600",
    },
    {
      show: data.demosToday > 0,
      href: "/meetings?type=PRODUCT_DEMO&date=today",
      icon: Video,
      text: `${data.demosToday} demo${data.demosToday === 1 ? "" : "s"} scheduled today`,
      accent: "text-violet-600",
    },
  ].filter((i) => i.show);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs Your Attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">You&apos;re all caught up. 🎉</p>
        ) : (
          items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={i}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <Icon className={`h-4 w-4 shrink-0 ${item.accent}`} />
                <span className="text-slate-700 dark:text-slate-300">{item.text}</span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
