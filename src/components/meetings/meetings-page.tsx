"use client";

import * as React from "react";
import {
  MapPin,
  Video,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

const MEETING_TYPES = [
  "PHYSICAL_MEETING",
  "ONLINE_MEETING",
  "PRODUCT_DEMO",
  "REQUIREMENT_DISCUSSION",
  "PROPOSAL_DISCUSSION",
  "PROJECT_MEETING",
] as const;

const TYPE_LABELS: Record<string, string> = {
  PHYSICAL_MEETING: "Physical Meeting",
  ONLINE_MEETING: "Online Meeting",
  PRODUCT_DEMO: "Product Demo",
  REQUIREMENT_DISCUSSION: "Requirement Discussion",
  PROPOSAL_DISCUSSION: "Proposal Discussion",
  PROJECT_MEETING: "Project Meeting",
};

const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"] as const;

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  RESCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

const TABS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

interface Meeting {
  id: string;
  type: string;
  date: string;
  time: string;
  durationMins: number | null;
  location: string | null;
  meetUrl: string | null;
  purpose: string | null;
  notes: string | null;
  status: string;
  leadId: string | null;
  clientId: string | null;
  assignedToId: string | null;
  lead: { id: string; businessName: string; contactPerson: string; mobile: string } | null;
  client: { id: string; businessName: string; contactPerson: string } | null;
  assignedTo: { id: string; name: string } | null;
}

interface MeetingsResponse {
  meetings: Meeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LeadOption {
  id: string;
  businessName: string;
  contactPerson: string;
  mobile: string;
}

interface UserOption {
  id: string;
  name: string;
}

const emptyForm: {
  leadId: string;
  clientId: string;
  type: string;
  date: string;
  time: string;
  durationMins: number | null;
  location: string;
  meetUrl: string;
  purpose: string;
  notes: string;
  assignedToId: string;
} = {
  leadId: "",
  clientId: "",
  type: "PHYSICAL_MEETING",
  date: format(new Date(), "yyyy-MM-dd"),
  time: "09:00",
  durationMins: 60,
  location: "",
  meetUrl: "",
  purpose: "",
  notes: "",
  assignedToId: "",
};

export function MeetingsPage() {
  const [data, setData] = React.useState<MeetingsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Meeting | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [leads, setLeads] = React.useState<LeadOption[]>([]);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [leadSearch, setLeadSearch] = React.useState("");
  const [showLeadDropdown, setShowLeadDropdown] = React.useState(false);

  const filteredLeads = React.useMemo(() => {
    if (!leadSearch) return leads.slice(0, 10);
    const q = leadSearch.toLowerCase();
    return leads
      .filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          l.contactPerson.toLowerCase().includes(q) ||
          l.mobile.includes(q)
      )
      .slice(0, 10);
  }, [leads, leadSearch]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadLookup() {
      try {
        const res = await fetch("/api/leads/lookup");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUsers(data.users ?? []);
      } catch { /* empty */ }
    }
    loadLookup();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadLeads() {
      try {
        const res = await fetch("/api/leads?limit=500");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setLeads(
            (data.leads ?? []).map((l: { id: string; businessName: string; contactPerson: string; mobile: string }) => ({
              id: l.id,
              businessName: l.businessName,
              contactPerson: l.contactPerson,
              mobile: l.mobile,
            }))
          );
        }
      } catch { /* empty */ }
    }
    loadLeads();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ tab, page: page.toString(), limit: "20" });
      try {
        const res = await fetch(`/api/meetings?${params.toString()}`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Failed to load meetings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab, page]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setLeadSearch("");
    setShowLeadDropdown(false);
    setDialogOpen(true);
  };

  const openEdit = (item: Meeting) => {
    setEditItem(item);
    setForm({
      leadId: item.leadId ?? "",
      clientId: item.clientId ?? "",
      type: item.type,
      date: format(new Date(item.date), "yyyy-MM-dd"),
      time: item.time,
      durationMins: item.durationMins ?? 60,
      location: item.location ?? "",
      meetUrl: item.meetUrl ?? "",
      purpose: item.purpose ?? "",
      notes: item.notes ?? "",
      assignedToId: item.assignedToId ?? "",
    });
    setLeadSearch(item.lead?.businessName ?? "");
    setShowLeadDropdown(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time) {
      toast.error("Please fill in required fields");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        leadId: form.leadId || null,
        clientId: form.clientId || null,
        type: form.type,
        date: form.date,
        time: form.time,
        durationMins: form.durationMins ? Number(form.durationMins) : null,
        location: form.location || null,
        meetUrl: form.meetUrl || null,
        purpose: form.purpose || null,
        notes: form.notes || null,
        assignedToId: form.assignedToId || null,
      };

      const url = editItem ? `/api/meetings/${editItem.id}` : "/api/meetings";
      const method = editItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      toast.success(editItem ? "Meeting updated" : "Meeting created");
      setDialogOpen(false);
      setPage(1);
    } catch {
      toast.error("Failed to save meeting");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Meeting deleted");
      setPage(1);
    } catch {
      toast.error("Failed to delete meeting");
    }
  };

  const handleQuickStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Meeting marked as ${STATUS_LABELS[newStatus]?.toLowerCase()}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Meetings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} total meetings` : "Loading..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Meeting
        </Button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        </div>
      ) : !data || data.meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-20 dark:border-slate-700">
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No meetings found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {tab === "all" ? "Create your first meeting to get started" : `No ${tab} meetings`}
          </p>
          <Button onClick={openCreate} className="mt-4">
            <Plus className="h-4 w-4" />
            Add Meeting
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead / Business</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Time</TableHead>
                  <TableHead className="hidden lg:table-cell">Duration</TableHead>
                  <TableHead className="hidden xl:table-cell">Location / URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.meetings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {m.lead?.businessName || m.client?.businessName || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {m.lead?.contactPerson || m.client?.contactPerson || ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{TYPE_LABELS[m.type] || m.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {formatDate(m.date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-mono">
                      {m.time}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {m.durationMins ? `${m.durationMins} mins` : "-"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {m.meetUrl ? (
                        <a
                          href={m.meetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Video className="h-3 w-3" />
                          Join
                        </a>
                      ) : m.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {m.location}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.status}
                        onValueChange={(v) => handleQuickStatus(m.id, v)}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {m.meetUrl && (
                            <DropdownMenuItem onClick={() => window.open(m.meetUrl!, "_blank")}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Join Meeting
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEdit(m)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(m.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Meeting" : "Add Meeting"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Lead / Business</Label>
              <div className="relative">
                <Input
                  placeholder="Search leads..."
                  value={leadSearch}
                  onChange={(e) => {
                    setLeadSearch(e.target.value);
                    setShowLeadDropdown(true);
                    if (!e.target.value) setForm((f) => ({ ...f, leadId: "" }));
                  }}
                  onFocus={() => setShowLeadDropdown(true)}
                />
                {showLeadDropdown && filteredLeads.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {filteredLeads.map((l) => (
                      <button
                        type="button"
                        key={l.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => {
                          setForm((f) => ({ ...f, leadId: l.id }));
                          setLeadSearch(l.businessName);
                          setShowLeadDropdown(false);
                        }}
                      >
                        <div>
                          <div className="font-medium">{l.businessName}</div>
                          <div className="text-xs text-slate-500">{l.contactPerson} - {l.mobile}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={0}
                value={form.durationMins ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Meeting location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetUrl">Meeting URL</Label>
              <Input
                id="meetUrl"
                placeholder="https://meet.google.com/..."
                value={form.meetUrl}
                onChange={(e) => setForm((f) => ({ ...f, meetUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                placeholder="Meeting purpose"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assignedToId} onValueChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Meeting notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editItem ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
