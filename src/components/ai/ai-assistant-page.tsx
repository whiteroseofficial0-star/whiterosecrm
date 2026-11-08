"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sparkles,
  Phone,
  Video,
  FileText,
  AlertTriangle,
  CheckSquare,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Recommendation {
  type: string;
  title: string;
  message: string;
  leadId?: string;
  taskId?: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; variant: "hot" | "warm" | "cold" | "danger" | "default" }> = {
  hot_lead_stale: { icon: Phone, color: "text-red-600", variant: "hot" },
  demo_no_followup: { icon: Video, color: "text-amber-600", variant: "warm" },
  proposal_not_created: { icon: FileText, color: "text-blue-600", variant: "cold" },
  overdue_task: { icon: CheckSquare, color: "text-red-600", variant: "danger" },
  high_value_low_score: { icon: TrendingUp, color: "text-purple-600", variant: "default" },
};

export function AIAssistantPage() {
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/ai/recommendations");
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (!cancelled) setRecommendations(json.recommendations ?? []);
      } catch {
        if (!cancelled) toast.error("Failed to load recommendations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">AI Assistant</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Smart recommendations and AI-powered features coming in Phase 8
            </p>
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
            <Sparkles className="h-8 w-8 text-rose-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Features Coming Soon</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            In Phase 8, the AI Assistant will provide intelligent lead scoring predictions,
            automated follow-up suggestions, revenue forecasting, and smart deal insights.
          </p>
        </CardContent>
      </Card>

      {/* Live Recommendations from real data */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recommendations</h2>
          {!loading && (
            <Badge variant="default">{recommendations.length} items</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
          </div>
        ) : recommendations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-emerald-500 mb-3" />
              <p className="font-medium text-slate-700 dark:text-slate-300">All clear!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">No urgent recommendations at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const config = TYPE_CONFIG[rec.type] ?? { icon: AlertTriangle, color: "text-slate-600", variant: "default" as const };
              const Icon = config.icon;
              return (
                <Card key={`${rec.type}-${i}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{rec.title}</p>
                        <Badge variant={config.variant} className="shrink-0">
                          {rec.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{rec.message}</p>
                      {rec.leadId && (
                        <Link href={`/leads/${rec.leadId}`}>
                          <Button variant="link" className="mt-1 h-auto p-0 text-xs">
                            View Lead →
                          </Button>
                        </Link>
                      )}
                      {rec.taskId && (
                        <Link href="/tasks">
                          <Button variant="link" className="mt-1 h-auto p-0 text-xs">
                            View Tasks →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
