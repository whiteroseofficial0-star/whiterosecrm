"use client";

import * as React from "react";
import {
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ArrowUpCircle,
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

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const TABS = [
  { key: "all", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
] as const;

interface Task {
  id: string;
  title: string;
  description: string | null;
  leadId: string | null;
  clientId: string | null;
  assignedToId: string | null;
  priority: string;
  dueDate: string | null;
  dueTime: string | null;
  status: string;
  lead: { id: string; businessName: string; contactPerson: string } | null;
  client: { id: string; businessName: string; contactPerson: string } | null;
  assignedTo: { id: string; name: string } | null;
}

interface TasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LeadOption {
  id: string;
  businessName: string;
  contactPerson: string;
}

interface UserOption {
  id: string;
  name: string;
}

const emptyForm = {
  title: "",
  description: "",
  leadId: "",
  clientId: "",
  priority: "MEDIUM",
  dueDate: "",
  dueTime: "",
  assignedToId: "",
};

export function TasksPage() {
  const [data, setData] = React.useState<TasksResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Task | null>(null);
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
          l.contactPerson.toLowerCase().includes(q)
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
            (data.leads ?? []).map((l: { id: string; businessName: string; contactPerson: string }) => ({
              id: l.id,
              businessName: l.businessName,
              contactPerson: l.contactPerson,
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
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (tab !== "all") params.set("status", tab);
      try {
        const res = await fetch(`/api/tasks?${params.toString()}`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Failed to load tasks");
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

  const openEdit = (item: Task) => {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description ?? "",
      leadId: item.leadId ?? "",
      clientId: item.clientId ?? "",
      priority: item.priority,
      dueDate: item.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : "",
      dueTime: item.dueTime ?? "",
      assignedToId: item.assignedToId ?? "",
    });
    setLeadSearch(item.lead?.businessName ?? "");
    setShowLeadDropdown(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        leadId: form.leadId || null,
        clientId: form.clientId || null,
        priority: form.priority,
        dueDate: form.dueDate || null,
        dueTime: form.dueTime || null,
        assignedToId: form.assignedToId || null,
      };

      const url = editItem ? `/api/tasks/${editItem.id}` : "/api/tasks";
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

      toast.success(editItem ? "Task updated" : "Task created");
      setDialogOpen(false);
      setPage(1);
    } catch {
      toast.error("Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Task deleted");
      setPage(1);
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleQuickStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Task marked as ${STATUS_LABELS[newStatus]?.toLowerCase()}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} total tasks` : "Loading..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Task
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
      ) : !data || data.tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-20 dark:border-slate-700">
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No tasks found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {tab === "all" ? "Create your first task to get started" : `No ${STATUS_LABELS[tab]?.toLowerCase() || tab} tasks`}
          </p>
          <Button onClick={openCreate} className="mt-4">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Lead / Client</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden md:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-slate-500 max-w-[200px] truncate">{task.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {task.lead?.businessName || task.client?.businessName || "-"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority] || ""}`}>
                        {PRIORITY_LABELS[task.priority] || task.priority}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {task.dueDate ? formatDate(task.dueDate) : "-"}
                      {task.dueTime && (
                        <span className="ml-1 font-mono text-xs text-slate-500">{task.dueTime}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(v) => handleQuickStatus(task.id, v)}
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
                    <TableCell className="hidden lg:table-cell text-sm">
                      {task.assignedTo?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(task.id)}
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
            <DialogTitle>{editItem ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Task title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Task description..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

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
                          <div className="text-xs text-slate-500">{l.contactPerson}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueTime">Due Time</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={form.dueTime}
                  onChange={(e) => setForm((f) => ({ ...f, dueTime: e.target.value }))}
                />
              </div>
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
