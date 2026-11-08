"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/utils";

const COLUMNS = [
  { status: "NEW_LEAD", label: "New Lead", color: "bg-slate-100 dark:bg-slate-800" },
  { status: "CONTACTED", label: "Contacted", color: "bg-blue-50 dark:bg-blue-950" },
  { status: "FOLLOW_UP", label: "Follow Up", color: "bg-amber-50 dark:bg-amber-950" },
  { status: "INTERESTED", label: "Interested", color: "bg-orange-50 dark:bg-orange-950" },
  { status: "DEMO_SCHEDULED", label: "Demo Scheduled", color: "bg-purple-50 dark:bg-purple-950" },
  { status: "DEMO_COMPLETED", label: "Demo Completed", color: "bg-violet-50 dark:bg-violet-950" },
  { status: "PROPOSAL_SENT", label: "Proposal Sent", color: "bg-indigo-50 dark:bg-indigo-950" },
  { status: "NEGOTIATION", label: "Negotiation", color: "bg-pink-50 dark:bg-pink-950" },
  { status: "WON", label: "Won", color: "bg-emerald-50 dark:bg-emerald-950" },
  { status: "LOST", label: "Lost", color: "bg-red-50 dark:bg-red-950" },
] as const;

type LeadStatus = (typeof COLUMNS)[number]["status"];

const PRIORITY_VARIANT: Record<string, "hot" | "warm" | "cold"> = {
  HOT: "hot",
  WARM: "warm",
  COLD: "cold",
};

interface KanbanLead {
  id: string;
  businessName: string;
  contactPerson: string;
  mobile: string;
  status: LeadStatus;
  priority: string;
  dealValue: string | null;
  leadScore: number;
  createdAt: string;
  industry: { name: string } | null;
  assignedTo: { name: string } | null;
}

interface PipelineData {
  status: string;
  count: number;
  totalDealValue: number;
}

export function KanbanBoard() {
  const router = useRouter();
  const [leads, setLeads] = React.useState<KanbanLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pipelineData, setPipelineData] = React.useState<PipelineData[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function loadPipeline() {
      const params = new URLSearchParams();
      params.set("limit", "500");
      params.set("sort", "createdAt-desc");
      if (search) params.set("search", search);

      try {
        const [leadsRes, statsRes] = await Promise.all([
          fetch(`/api/leads?${params.toString()}`),
          fetch("/api/leads/stats"),
        ]);

        if (!leadsRes.ok || !statsRes.ok) throw new Error("Failed to fetch");

        const leadsData = await leadsRes.json();
        const statsData = await statsRes.json();

        if (!cancelled) {
          setLeads(leadsData.leads);
          setPipelineData(statsData);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load pipeline data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPipeline();
    return () => { cancelled = true; };
  }, [search]);

  const refetchData = React.useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", "500");
    params.set("sort", "createdAt-desc");
    if (search) params.set("search", search);

    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetch(`/api/leads?${params.toString()}`),
        fetch("/api/leads/stats"),
      ]);

      if (!leadsRes.ok || !statsRes.ok) throw new Error("Failed to fetch");

      const leadsData = await leadsRes.json();
      const statsData = await statsRes.json();

      setLeads(leadsData.leads);
      setPipelineData(statsData);
    } catch {
      toast.error("Failed to load pipeline data");
    }
  }, [search]);

  const getColumnLeads = (status: string) =>
    leads.filter((l) => l.status === status);

  const getColumnStats = (status: string) => {
    const stat = pipelineData.find((p) => p.status === status);
    return stat ?? { status, count: 0, totalDealValue: 0 };
  };

  const handleDragStart = (e: React.DragEvent, lead: KanbanLead) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lead.id);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, status: targetStatus as LeadStatus } : l
      )
    );

    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Lead moved to ${COLUMNS.find((c) => c.status === targetStatus)?.label}`);
      refetchData();
    } catch {
      toast.error("Failed to update lead status");
      refetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Pipeline</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Drag and drop leads between stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search pipeline..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Button onClick={() => router.push("/leads/new")}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colLeads = getColumnLeads(col.status);
          const stats = getColumnStats(col.status);

          return (
            <div
              key={col.status}
              className={`flex w-[300px] min-w-[300px] flex-col rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {col.label}
                  </h3>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-200 px-1.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {stats.count}
                  </span>
                </div>
                {stats.totalDealValue > 0 && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatINR(stats.totalDealValue)}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 280px)" }}>
                {colLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {lead.businessName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {lead.contactPerson}
                        </p>
                      </div>
                      <GripVertical className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={PRIORITY_VARIANT[lead.priority] ?? "default"} className="text-[10px]">
                        {lead.priority}
                      </Badge>
                      {lead.industry && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                          {lead.industry.name}
                        </span>
                      )}
                    </div>

                    {lead.dealValue && (
                      <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {formatINR(lead.dealValue)}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {lead.mobile}
                      </span>
                      {lead.assignedTo && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-700 text-[9px] font-semibold text-white" title={lead.assignedTo.name}>
                          {lead.assignedTo.name.split(" ").map((p) => p[0]).slice(0, 1).join("").toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {colLeads.length === 0 && (
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-8 dark:border-slate-700">
                    <p className="text-xs text-slate-400">Drop leads here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
