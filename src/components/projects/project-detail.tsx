"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  DollarSign,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";

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

const PROJECT_STATUS_FLOW = [
  "PLANNING",
  "REQUIREMENT_GATHERING",
  "DESIGN",
  "DEVELOPMENT",
  "TESTING",
  "CLIENT_REVIEW",
  "DEPLOYMENT",
  "MAINTENANCE",
  "COMPLETED",
] as const;

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

interface ProjectDetail {
  id: string;
  name: string;
  serviceType: string | null;
  description: string | null;
  projectValue: string | null;
  startDate: string | null;
  deadline: string | null;
  status: string;
  progress: number;
  priority: string;
  client: { id: string; businessName: string; contactPerson: string; mobile: string };
  projectManager: { id: string; name: string; email: string } | null;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    assignedTo: { id: string; name: string } | null;
  }[];
}

interface User {
  id: string;
  name: string;
}

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = React.useState<ProjectDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [editOpen, setEditOpen] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [users, setUsers] = React.useState<User[]>([]);
  const [form, setForm] = React.useState({
    name: "",
    serviceType: "",
    description: "",
    projectValue: "",
    deadline: "",
    projectManagerId: "",
    priority: "MEDIUM",
  });
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      try {
        const [projRes, usersRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch("/api/leads/lookup"),
        ]);
        if (!projRes.ok) throw new Error("Failed");
        const projData = await projRes.json();
        if (!cancelled) {
          setProject(projData);
          setProgress(projData.progress);
          setForm({
            name: projData.name,
            serviceType: projData.serviceType ?? "",
            description: projData.description ?? "",
            projectValue: projData.projectValue ? String(Number(projData.projectValue)) : "",
            deadline: projData.deadline ? new Date(projData.deadline).toISOString().split("T")[0] : "",
            projectManagerId: projData.projectManager?.id ?? "",
            priority: projData.priority,
          });
        }
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (!cancelled) setUsers(usersData.users ?? []);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load project");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProject();
    return () => { cancelled = true; };
  }, [projectId]);

  const handleProgressUpdate = async (newProgress: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: newProgress }),
      });
      if (!res.ok) throw new Error("Failed");
      setProgress(newProgress);
      setProject((p) => p ? { ...p, progress: newProgress } : null);
      toast.success("Progress updated");
    } catch {
      toast.error("Failed to update progress");
    }
  };

  const handleStatusAdvance = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      setProject((p) => p ? { ...p, status: newStatus } : null);
      toast.success(`Status changed to ${STATUS_LABELS[newStatus] ?? newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          serviceType: form.serviceType || null,
          description: form.description || null,
          projectValue: form.projectValue ? Number(form.projectValue) : null,
          deadline: form.deadline || null,
          projectManagerId: form.projectManagerId || null,
          priority: form.priority,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Project updated");
      setEditOpen(false);
      const updated = await res.json();
      setProject((p) => p ? { ...p, ...updated } : null);
    } catch {
      toast.error("Failed to update project");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-slate-500">Project not found</p>
        <Button variant="ghost" onClick={() => router.push("/projects")} className="mt-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const currentStatusIndex = PROJECT_STATUS_FLOW.indexOf(project.status as typeof PROJECT_STATUS_FLOW[number]);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < PROJECT_STATUS_FLOW.length - 1
    ? PROJECT_STATUS_FLOW[currentStatusIndex + 1]
    : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{project.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {project.client.businessName}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[project.status] ?? "default"}>
          {STATUS_LABELS[project.status] ?? project.status}
        </Badge>
        <Badge variant={project.priority === "URGENT" ? "danger" : project.priority === "HIGH" ? "warm" : "default"}>
          {PRIORITY_LABELS[project.priority] ?? project.priority}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Progress</span>
                <span className="font-medium text-slate-900 dark:text-white">{progress}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-rose-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="flex gap-1">
              {[25, 50, 75, 100].map((p) => (
                <Button
                  key={p}
                  variant={progress === p ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleProgressUpdate(p)}
                >
                  {p}%
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {nextStatus && (
          <Button size="sm" onClick={() => handleStatusAdvance(nextStatus)}>
            Advance to {STATUS_LABELS[nextStatus]}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
        {project.status === "ON_HOLD" && (
          <Button size="sm" variant="outline" onClick={() => handleStatusAdvance("PLANNING")}>
            Resume
          </Button>
        )}
        {project.status !== "ON_HOLD" && project.status !== "COMPLETED" && project.status !== "CANCELLED" && (
          <Button size="sm" variant="outline" onClick={() => handleStatusAdvance("ON_HOLD")}>
            Put On Hold
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Project Value</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {project.projectValue ? formatINR(project.projectValue) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Start Date</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(project.startDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Deadline</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(project.deadline)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Project Manager</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {project.projectManager?.name ?? "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {project.serviceType && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Service Type</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-white">{project.serviceType}</p>
          </CardContent>
        </Card>
      )}

      {project.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900 dark:text-white">
              {project.description}
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Tasks ({project.tasks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          {project.tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">No tasks yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.priority === "URGENT" ? "danger" : task.priority === "HIGH" ? "warm" : "default"}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {formatDate(task.dueDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.status === "COMPLETED" ? "success" : "default"}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {task.assignedTo?.name ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-serviceType">Service Type</Label>
              <Input
                id="edit-serviceType"
                value={form.serviceType}
                onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-projectValue">Project Value</Label>
                <Input
                  id="edit-projectValue"
                  type="number"
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
            <div className="space-y-2">
              <Label htmlFor="edit-deadline">Deadline</Label>
              <Input
                id="edit-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
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
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
