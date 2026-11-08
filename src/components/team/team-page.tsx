"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

const ROLE_BADGE_VARIANT: Record<string, "hot" | "default" | "cold" | "warm"> = {
  SUPER_ADMIN: "hot",
  ADMIN: "warm",
  SALES_EXECUTIVE: "cold",
  DEVELOPER: "default",
};

const STATUS_BADGE_VARIANT: Record<string, "success" | "default" | "danger"> = {
  ACTIVE: "success",
  INACTIVE: "default",
  SUSPENDED: "danger",
};

interface TeamUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  status: string;
  joinDate: string;
  avatarUrl: string | null;
  role: { id: string; name: string; label: string };
  _count: { leadsAssigned: number; projectsManaged: number };
}

interface Role {
  id: string;
  name: string;
  label: string;
}

export function TeamPage() {
  const [users, setUsers] = React.useState<TeamUser[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addPreset, setAddPreset] = React.useState<"sales" | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<TeamUser | null>(null);
  const [removeUser, setRemoveUser] = React.useState<TeamUser | null>(null);
  const [removing, setRemoving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
    department: "",
  });

  const [editForm, setEditForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    roleId: "",
    department: "",
    status: "",
  });

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          fetch("/api/team"),
          fetch("/api/leads/lookup"),
        ]);
        const usersData = await usersRes.json();
        const lookupData = await rolesRes.json();
        if (!cancelled) {
          setUsers(usersData.users ?? []);
          setRoles(lookupData.roles ?? []);
        }
      } catch {
        toast.error("Failed to load team data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const salesRole = roles.find((r) => r.name === "SALES_EXECUTIVE");

  const openAdd = (preset: "sales" | null = null) => {
    setAddPreset(preset);
    setForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      roleId: preset === "sales" ? salesRole?.id ?? "" : "",
      department: preset === "sales" ? "Sales" : "",
    });
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password || !form.roleId) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.email?.[0] || "Failed to create user");
      }
      const newUser = await res.json();
      setUsers((prev) => [newUser, ...prev]);
      setAddOpen(false);
      setForm({ name: "", email: "", phone: "", password: "", roleId: "", department: "" });
      toast.success(addPreset === "sales" ? "Sales user added successfully" : "Team member added successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add team member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/team/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.email?.[0] || "Failed to update user");
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditOpen(false);
      setEditUser(null);
      toast.success("Team member updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update team member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeUser) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/team/${removeUser.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to remove team member");
      }
      setUsers((prev) => prev.filter((u) => u.id !== removeUser.id));
      setRemoveUser(null);
      toast.success(`${removeUser.name} removed from the team`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove team member");
    } finally {
      setRemoving(false);
    }
  };

  const openEdit = (user: TeamUser) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      roleId: user.role.id,
      department: user.department ?? "",
      status: user.status,
    });
    setEditOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Team</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} team members</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => openAdd("sales")}>
            <Plus className="h-4 w-4" />
            Add Sales User
          </Button>
          <Button onClick={() => openAdd()}>
            <Plus className="h-4 w-4" />
            Add Team Member
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="hidden xl:table-cell text-center">Leads</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500 py-10">No team members found</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{user.email}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{user.phone ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGE_VARIANT[user.role.name] ?? "default"}>
                        {user.role.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{user.department ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[user.status] ?? "default"}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{formatDate(user.joinDate)}</TableCell>
                    <TableCell className="hidden xl:table-cell text-center">{user._count.leadsAssigned}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {user.id !== currentUserId && (
                            <DropdownMenuItem
                              onClick={() => setRemoveUser(user)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Remove member
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{addPreset === "sales" ? "Add Sales User" : "Add Team Member"}</DialogTitle>
            <DialogDescription>
              {addPreset === "sales"
                ? "Create a sales login. The Sales Executive role is pre-selected — this user only sees leads, follow-ups, tasks, meetings, proposals, clients and reports."
                : "Create a new team member account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-name">Name *</Label>
              <Input id="add-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="add-email">Email *</Label>
              <Input id="add-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="add-phone">Phone</Label>
              <Input id="add-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="add-password">Password *</Label>
              <Input id="add-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-dept">Department</Label>
              <Input id="add-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeUser !== null} onOpenChange={(open) => { if (!open) setRemoveUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {removeUser?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the team member and their login. Leads or
              proposals they created, and their notes, are transferred to you.
              Their assigned follow-ups, tasks and meetings are unassigned.
              Notifications and activity history of this user are deleted. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p><span className="font-medium">Name:</span> {removeUser?.name}</p>
            <p><span className="font-medium">Email:</span> {removeUser?.email}</p>
            <p><span className="font-medium">Role:</span> {removeUser?.role?.label}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing ? "Removing..." : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Update team member details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.roleId} onValueChange={(v) => setEditForm({ ...editForm, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-dept">Department</Label>
              <Input id="edit-dept" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
