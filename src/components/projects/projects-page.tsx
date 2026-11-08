"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";

const PROJECT_STATUSES = [
  "PLANNING", "REQUIREMENT_GATHERING", "DESIGN", "DEVELOPMENT",
  "TESTING", "CLIENT_REVIEW", "DEPLOYMENT", "MAINTENANCE",
  "COMPLETED", "ON_HOLD", "CANCELLED",
] as const;

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  REQUIREMENT_GATHERING: "Requirement Gathering",
  DESIGN: "Design",
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  CLIENT_REVIEW: "Client Review",
  DEPLOYMENT: "Deployment",
  MAINTENANCE: "Maintenance",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm" | "cold"> = {
  PLANNING: "default",
  REQUIREMENT_GATHERING: "default",
  DESIGN: "cold",
  DEVELOPMENT: "warm",
  TESTING: "warm",
  CLIENT_REVIEW: "cold",
  DEPLOYMENT: "warm",
  MAINTENANCE: "default",
  COMPLETED: "success",
  ON_HOLD: "warm",
  CANCELLED: "danger",
};

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "PLANNING", label: "Planning" },
  { key: "DEVELOPMENT", label: "Development" },
  { key: "TESTING", label: "Testing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "ON_HOLD", label: "On Hold" },
] as const;

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

interface Client {
  id: string;
  businessName: string;
  contactPerson: string;
}

interface User {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  serviceType: string | null;
  projectValue: string | null;
  status: string;
  progress: number;
  deadline: string | null;
  priority: string;
  client: { id: string; businessName: string; contactPerson: string };
  projectManager: { id: string; name: string } | null;
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const emptyForm = {
  name: "",
  clientId: "",
  serviceType: "",
  description: "",
  projectValue: "",
  startDate: "",
  deadline: "",
  projectManagerId: "",
  priority: "MEDIUM",
};

export function ProjectsPage() {
  const router = useRouter();
  const [data, setData] = React.useState<ProjectsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<Project | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);

  const filterKey = `${tab}|${search}|${page}`;
  const prevFilterKeyRef = React.useRef(filterKey);

  React.useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      const prevParts = prevFilterKeyRef.current.split("|");
      const newParts = filterKey.split("|");
      if (newParts[0] !== prevParts[0] || newParts[1] !== prevParts[1]) {
        setPage(1);
      }
      prevFilterKeyRef.current = filterKey;
    }
  }, [filterKey]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadLookup() {
      try {
        const [clientsRes, usersRes] = await Promise.all([
          fetch("/api/clients?limit=500"),
          fetch("/api/leads/lookup"),
        ]);
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          if (!cancelled) setClients(clientsData.clients ?? []);
        }
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (!cancelled) setUsers(usersData.users ?? []);
        }
      } catch { /* empty */ }
    }
    loadLookup();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadProjects() {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (tab !== "all") params.set("status", tab);
      if (search) params.set("search", search);
      try {
        const res = await fetch(`/api/projects?${params.toString()}`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Failed to load projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProjects();
    return () => { cancelled = true; };
  }, [tab, search, page]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: Project) => {
    setEditItem(item);
    setForm({
      name: item.name,
      clientId: item.client.id,
      serviceType: item.serviceType ?? "",
      description: "",
      projectValue: item.projectValue ? String(Number(item.projectValue)) : "",
      startDate: "",
      deadline: item.deadline ? format(new Date(item.deadline), "yyyy-MM-dd") : "",
      projectManagerId: item.projectManager?.id ?? "",
      priority: item.priority,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.clientId) {
      toast.error("Project name and client are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        clientId: form.clientId,
        serviceType: form.serviceType || null,
        description: form.description || null,
        projectValue: form.projectValue ? Number(form.projectValue) : null,
        startDate: form.startDate || null,
        deadline: form.deadline || null,
        projectManagerId: form.projectManagerId || null,
        priority: form.priority,
      };

      const url = editItem ? `/api/projects/${editItem.id}` : "/api/projects";
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

      toast.success(editItem ? "Project updated" : "Project created");
      setDialogOpen(false);
      setPage(1);
    } catch {
      toast.error("Failed to save project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Project deleted");
      setPage(1);
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} total projects` : "Loading..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {STATUS_TABS.map((t) => (
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        </div>
      ) : !data || data.projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-20 dark:border-slate-700">
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No projects found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {tab === "all" ? "Create your first project to get started" : `No ${STATUS_LABELS[tab]?.toLowerCase() || tab} projects`}
          </p>
          <Button onClick={openCreate} className="mt-4">
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Client</TableHead>
                  <TableHead className="hidden md:table-cell">Service Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Value</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                  <TableHead className="hidden xl:table-cell">PM</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {project.name}
                      </div>
                      <div className="text-xs text-slate-500 sm:hidden">{project.client.businessName}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {project.client.businessName}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {project.serviceType ?? "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm font-medium">
                      {project.projectValue ? formatINR(project.projectValue) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-rose-600"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {project.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[project.status] ?? "default"}>
                        {STATUS_LABELS[project.status] ?? project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {formatDate(project.deadline)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {project.projectManager?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/projects/${project.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(project);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(project.id);
                            }}
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
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} projects
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
            <DialogTitle>{editItem ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Input
                id="serviceType"
                placeholder="e.g. Website, Mobile App"
                value={form.serviceType}
                onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Project description..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectValue">Project Value</Label>
                <Input
                  id="projectValue"
                  type="number"
                  placeholder="0"
                  value={form.projectValue}
                  onChange={(e) => setForm((f) => ({ ...f, projectValue: e.target.value }))}
                />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project Manager</Label>
              <Select value={form.projectManagerId} onValueChange={(v) => setForm((f) => ({ ...f, projectManagerId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PM" />
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
