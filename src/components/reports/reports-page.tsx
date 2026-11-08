"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { formatINR, formatDate } from "@/lib/utils";

const COLORS = ["#be123c", "#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#fecdd3", "#0f172a", "#334155", "#64748b", "#94a3b8"];

const STATUS_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow Up",
  INTERESTED: "Interested",
  DEMO_SCHEDULED: "Demo Scheduled",
  DEMO_COMPLETED: "Demo Completed",
  PROPOSAL_REQUESTED: "Proposal Requested",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  ON_HOLD: "On Hold",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const TABS = ["Overview", "Leads", "Revenue", "Team", "Payments"] as const;

/** Local YYYY-MM-DD, matching what <input type="date"> works with. */
function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const RANGE_PRESETS: { label: string; build: () => { from: string; to: string } }[] = [
  {
    label: "Today",
    build: () => {
      const today = toDateInput(new Date());
      return { from: today, to: today };
    },
  },
  {
    label: "7D",
    build: () => {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return { from: toDateInput(from), to: toDateInput(new Date()) };
    },
  },
  {
    label: "30D",
    build: () => {
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: toDateInput(from), to: toDateInput(new Date()) };
    },
  },
  {
    label: "This month",
    build: () => {
      const now = new Date();
      return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInput(now) };
    },
  },
];

type SortKey =
  | "name"
  | "totalLeads"
  | "won"
  | "lost"
  | "conv"
  | "totalDealValue"
  | "followUps"
  | "tasks"
  | "meetings"
  | "activities";

interface ReportData {
  leadsByStatus: { status: string; count: number }[];
  leadsByIndustry: { name: string; count: number }[];
  leadsBySource: { name: string; count: number }[];
  leadsByArea: { name: string; count: number }[];
  conversionFunnel: { status: string; count: number }[];
  revenueTrend: { month: string; amount: number }[];
  topPerformers: {
    id: string;
    name: string;
    role: string;
    department: string | null;
    totalLeads: number;
    won: number;
    lost: number;
    totalDealValue: number;
    followUps: number;
    followUpsDone: number;
    tasks: number;
    tasksDone: number;
    meetings: number;
    meetingsDone: number;
    activities: number;
  }[];
  paymentSummary: { total: number; paid: number; outstanding: number; overdue: number };
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  paymentStatusBreakdown: Record<string, number>;
  outstandingPayments: {
    id: string;
    client: string;
    totalAmount: number;
    paidAmount: number;
    outstanding: number;
    status: string;
    dueDate: string | null;
  }[];
  revenueByClient: { client: string; total: number; paid: number }[];
}

export function ReportsPage() {
  const [data, setData] = React.useState<ReportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<string>("Overview");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "totalLeads",
    dir: "desc",
  });

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    // Debounced so picking both dates only triggers one request.
    const timer = setTimeout(async () => {
      setRefreshing(true);
      try {
        const params = new URLSearchParams();
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        const query = params.toString();
        const res = await fetch(`/api/reports${query ? `?${query}` : ""}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch reports");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (error) {
        if (!cancelled && (error as Error).name !== "AbortError") {
          toast.error("Failed to load reports");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [fromDate, toDate]);

  const sortedPerformers = React.useMemo(() => {
    if (!data) return [];
    const rows = [...data.topPerformers];
    const value = (row: ReportData["topPerformers"][number]) => {
      switch (sort.key) {
        case "name":
          return row.name.toLowerCase();
        case "conv":
          return row.totalLeads > 0 ? row.won / row.totalLeads : 0;
        case "totalDealValue":
          return row.totalDealValue;
        case "totalLeads":
          return row.totalLeads;
        case "won":
          return row.won;
        case "lost":
          return row.lost;
        case "followUps":
          return row.followUps;
        case "tasks":
          return row.tasks;
        case "meetings":
          return row.meetings;
        case "activities":
          return row.activities;
      }
    };
    rows.sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [data, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    );
  }

  function sortHead(label: string, key: SortKey, align: "left" | "center" | "right" = "center") {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={align === "left" ? "" : align === "right" ? "text-right" : "text-center"}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          aria-label={`Sort by ${label}`}
          className={`inline-flex items-center gap-1 ${
            active
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {label}
          <Icon className={`h-3 w-3 ${active ? "" : "opacity-40"}`} />
        </button>
      </TableHead>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  const conversionRate = data.totalLeads > 0 ? ((data.wonLeads / data.totalLeads) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {fromDate || toDate
              ? `Showing ${fromDate || "start"} to ${toDate || "today"}`
              : "Analytics and insights"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {RANGE_PRESETS.map((preset) => {
              const presetRange = preset.build();
              const active = fromDate === presetRange.from && toDate === presetRange.to;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setFromDate(presetRange.from);
                    setToDate(presetRange.to);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[150px]"
            />
            <span className="text-sm text-slate-500">to</span>
            <Input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[150px]"
            />
          </div>
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              Clear
            </Button>
          )}
          {refreshing && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Updating" />}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "Overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardContent className="p-4"><div><p className="text-xs text-slate-500">Total Leads</p><p className="text-xl font-bold text-slate-900 dark:text-white">{data.totalLeads}</p></div></CardContent>
            </Card>
            <Card>
              <CardContent className="p-4"><div><p className="text-xs text-slate-500">Won</p><p className="text-xl font-bold text-emerald-600">{data.wonLeads}</p></div></CardContent>
            </Card>
            <Card>
              <CardContent className="p-4"><div><p className="text-xs text-slate-500">Lost</p><p className="text-xl font-bold text-red-600">{data.lostLeads}</p></div></CardContent>
            </Card>
            <Card>
              <CardContent className="p-4"><div><p className="text-xs text-slate-500">Conversion</p><p className="text-xl font-bold text-rose-600">{conversionRate}%</p></div></CardContent>
            </Card>
            <Card>
              <CardContent className="p-4"><div><p className="text-xs text-slate-500">Revenue</p><p className="text-xl font-bold text-slate-900 dark:text-white">{formatINR(data.paymentSummary.paid)}</p></div></CardContent>
            </Card>
            <Card>
              <CardContent className="p-4"><div><p className="text-xs text-slate-500">Outstanding</p><p className="text-xl font-bold text-amber-600">{formatINR(data.paymentSummary.outstanding)}</p></div></CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Leads by Status</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.leadsByStatus.map((d) => ({ name: STATUS_LABELS[d.status] ?? d.status, count: d.count }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#be123c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Leads by Industry</CardTitle></CardHeader>
              <CardContent className="h-[420px]">
                {data.leadsByIndustry.length > 0 ? (
                  <div className="flex h-full flex-col">
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data.leadsByIndustry} dataKey="count" nameKey="name" outerRadius={110} innerRadius={50} paddingAngle={2}>
                            {data.leadsByIndustry.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value} leads`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                      {data.leadsByIndustry.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="truncate text-slate-600 dark:text-slate-400">{item.name}</span>
                          <span className="ml-auto font-medium text-slate-900 dark:text-white">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Revenue Trend (Last 6 Months)</CardTitle></CardHeader>
            <CardContent className="h-80">
              {data.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatINR(Number(value))} />
                    <Line type="monotone" dataKey="amount" stroke="#be123c" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No revenue data</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === "Leads" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Leads by Source</CardTitle></CardHeader>
              <CardContent className="h-80">
                {data.leadsBySource.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.leadsBySource}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#e11d48" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Leads by Area</CardTitle></CardHeader>
              <CardContent className="h-80">
                {data.leadsByArea.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.leadsByArea}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.conversionFunnel.map((stage) => {
                  const maxCount = Math.max(...data.conversionFunnel.map((s) => s.count), 1);
                  const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                  return (
                    <div key={stage.status} className="flex items-center gap-3">
                      <div className="w-40 text-right text-sm text-slate-600 dark:text-slate-300">
                        {STATUS_LABELS[stage.status] ?? stage.status}
                      </div>
                      <div className="flex-1">
                        <div className="h-6 rounded-md bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-6 rounded-md bg-rose-600 transition-all"
                            style={{ width: `${Math.max(width, 2)}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 text-right text-sm font-medium text-slate-900 dark:text-white">
                        {stage.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === "Revenue" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
            <CardContent className="h-80">
              {data.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatINR(Number(value))} />
                    <Bar dataKey="amount" fill="#be123c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No revenue data</div>
              )}
            </CardContent>
          </Card>

          {data.revenueByClient.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Revenue by Client</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Total Billed</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.revenueByClient.map((row) => (
                      <TableRow key={row.client}>
                        <TableCell className="font-medium">{row.client}</TableCell>
                        <TableCell className="text-right">{formatINR(row.total)}</TableCell>
                        <TableCell className="text-right">{formatINR(row.paid)}</TableCell>
                        <TableCell className="text-right">{formatINR(row.total - row.paid)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "Team" && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">Per-person workload and results</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sortHead("Name", "name", "left")}
                    {sortHead("Leads", "totalLeads")}
                    {sortHead("Won", "won")}
                    {sortHead("Lost", "lost")}
                    {sortHead("Conv. Rate", "conv")}
                    {sortHead("Won Value", "totalDealValue", "right")}
                    {sortHead("Follow-ups", "followUps")}
                    {sortHead("Tasks", "tasks")}
                    {sortHead("Meetings", "meetings")}
                    {sortHead("Activities", "activities")}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPerformers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-slate-500">No team members</TableCell>
                    </TableRow>
                  ) : (
                    sortedPerformers.map((exec) => {
                      const convRate = exec.totalLeads > 0 ? ((exec.won / exec.totalLeads) * 100).toFixed(1) : "0";
                      return (
                        <TableRow key={exec.id}>
                          <TableCell>
                            <p className="font-medium">{exec.name}</p>
                            <p className="text-xs text-slate-500">
                              {[exec.role, exec.department].filter(Boolean).join(" · ")}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">{exec.totalLeads}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="success">{exec.won}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="danger">{exec.lost}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{convRate}%</TableCell>
                          <TableCell className="text-right font-medium">{formatINR(exec.totalDealValue)}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {exec.followUpsDone}/{exec.followUps}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {exec.tasksDone}/{exec.tasks}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {exec.meetingsDone}/{exec.meetings}
                          </TableCell>
                          <TableCell className="text-center">{exec.activities}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Follow-ups, tasks and meetings show completed / total assigned.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payments Tab */}
      {activeTab === "Payments" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Payment Status Breakdown</CardTitle></CardHeader>
              <CardContent className="h-80">
                {Object.keys(data.paymentStatusBreakdown).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(data.paymentStatusBreakdown).map(([status, count]) => ({
                          name: PAYMENT_STATUS_LABELS[status] ?? status,
                          value: count,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        innerRadius={45}
                        paddingAngle={2}
                      >
                        {Object.keys(data.paymentStatusBreakdown).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No payment data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payment Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Total Billed</span>
                  <span className="font-medium">{formatINR(data.paymentSummary.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Total Paid</span>
                  <span className="font-medium text-emerald-600">{formatINR(data.paymentSummary.paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Outstanding</span>
                  <span className="font-medium text-amber-600">{formatINR(data.paymentSummary.outstanding)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Overdue</span>
                  <span className="font-medium text-red-600">{formatINR(data.paymentSummary.overdue)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {data.outstandingPayments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Outstanding Payments</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.outstandingPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.client}</TableCell>
                        <TableCell className="text-right">{formatINR(p.totalAmount)}</TableCell>
                        <TableCell className="text-right">{formatINR(p.paidAmount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatINR(p.outstanding)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "OVERDUE" ? "danger" : "default"}>
                            {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(p.dueDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
