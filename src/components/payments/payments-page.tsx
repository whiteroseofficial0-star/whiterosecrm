"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle2,
  X,
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

const PAYMENT_STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm" | "cold"> = {
  PENDING: "warm",
  PARTIALLY_PAID: "cold",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "default",
};

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PARTIALLY_PAID", label: "Partial" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue" },
] as const;

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "RAZORPAY", "OTHER"] as const;

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CARD: "Card",
  RAZORPAY: "Razorpay",
  OTHER: "Other",
};

interface Client {
  id: string;
  businessName: string;
  contactPerson: string;
}

interface Project {
  id: string;
  name: string;
}

interface Installment {
  id: string;
  label: string;
  amount: string;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
}

interface Payment {
  id: string;
  totalAmount: string;
  paidAmount: string;
  dueDate: string | null;
  method: string | null;
  status: string;
  notes: string | null;
  client: { id: string; businessName: string; contactPerson: string };
  project: { id: string; name: string } | null;
  installments: Installment[];
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface InstallmentRow {
  label: string;
  amount: string;
  dueDate: string;
}

const emptyForm = {
  clientId: "",
  projectId: "",
  totalAmount: "",
  dueDate: "",
  method: "",
  transactionId: "",
  notes: "",
};

export function PaymentsPage() {
  const router = useRouter();
  const [data, setData] = React.useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [installments, setInstallments] = React.useState<InstallmentRow[]>([]);

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
        const [clientsRes, projectsRes] = await Promise.all([
          fetch("/api/clients?limit=500"),
          fetch("/api/projects?limit=500"),
        ]);
        if (clientsRes.ok) {
          const d = await clientsRes.json();
          if (!cancelled) setClients(d.clients ?? []);
        }
        if (projectsRes.ok) {
          const d = await projectsRes.json();
          if (!cancelled) setProjects(d.projects ?? []);
        }
      } catch { /* empty */ }
    }
    loadLookup();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadPayments() {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (tab !== "all") params.set("status", tab);
      if (search) params.set("search", search);
      try {
        const res = await fetch(`/api/payments?${params.toString()}`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Failed to load payments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPayments();
    return () => { cancelled = true; };
  }, [tab, search, page]);

  const openCreate = () => {
    setForm(emptyForm);
    setInstallments([]);
    setDialogOpen(true);
  };

  const addInstallment = () => {
    setInstallments((prev) => [...prev, { label: "", amount: "", dueDate: "" }]);
  };

  const updateInstallment = (index: number, field: keyof InstallmentRow, value: string) => {
    setInstallments((prev) => prev.map((inst, i) => (i === index ? { ...inst, [field]: value } : inst)));
  };

  const removeInstallment = (index: number) => {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.totalAmount) {
      toast.error("Client and total amount are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        clientId: form.clientId,
        projectId: form.projectId || null,
        totalAmount: Number(form.totalAmount),
        dueDate: form.dueDate || null,
        method: form.method || null,
        transactionId: form.transactionId || null,
        notes: form.notes || null,
      };

      if (installments.length > 0) {
        payload.installments = installments
          .filter((inst) => inst.label && inst.amount)
          .map((inst) => ({
            label: inst.label,
            amount: Number(inst.amount),
            dueDate: inst.dueDate || null,
          }));
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      toast.success("Payment created");
      setDialogOpen(false);
      setPage(1);
    } catch {
      toast.error("Failed to create payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/payments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Payment marked as paid");
      setPage(page);
    } catch {
      toast.error("Failed to update payment");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;
    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Payment deleted");
      setPage(1);
    } catch {
      toast.error("Failed to delete payment");
    }
  };

  const filteredProjects = form.clientId
    ? projects.filter((p) => {
        const client = clients.find((c) => c.id === form.clientId);
        return client;
      })
    : projects;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Payments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} total payments` : "Loading..."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Payment
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
          placeholder="Search payments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        </div>
      ) : !data || data.payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-20 dark:border-slate-700">
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No payments found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {tab === "all" ? "Create your first payment to get started" : `No ${STATUS_LABELS[tab]?.toLowerCase() || tab} payments`}
          </p>
          <Button onClick={openCreate} className="mt-4">
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Project</TableHead>
                  <TableHead className="hidden md:table-cell">Total</TableHead>
                  <TableHead className="hidden md:table-cell">Paid</TableHead>
                  <TableHead className="hidden lg:table-cell">Outstanding</TableHead>
                  <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Method</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.map((payment) => {
                  const outstanding = Number(payment.totalAmount) - Number(payment.paidAmount);
                  return (
                    <TableRow
                      key={payment.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/payments/${payment.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {payment.client.businessName}
                        </div>
                        <div className="text-xs text-slate-500 sm:hidden">
                          {payment.project?.name ?? "General"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {payment.project?.name ?? "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm font-medium">
                        {formatINR(payment.totalAmount)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {formatINR(payment.paidAmount)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm font-medium text-amber-600 dark:text-amber-400">
                        {formatINR(outstanding)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {formatDate(payment.dueDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[payment.status] ?? "default"}>
                          {STATUS_LABELS[payment.status] ?? payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">
                        {payment.method ? METHOD_LABELS[payment.method] ?? payment.method : "-"}
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
                                router.push(`/payments/${payment.id}`);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {payment.status !== "PAID" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkPaid(payment.id);
                                }}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(payment.id);
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
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} payments
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
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>Project (optional)</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  placeholder="0"
                  value={form.totalAmount}
                  onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionId">Transaction ID</Label>
                <Input
                  id="transactionId"
                  placeholder="Transaction ID"
                  value={form.transactionId}
                  onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Payment notes..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Installments</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>
              {installments.length > 0 && (
                <div className="space-y-2">
                  {installments.map((inst, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder="Label"
                          value={inst.label}
                          onChange={(e) => updateInstallment(index, "label", e.target.value)}
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={inst.amount}
                          onChange={(e) => updateInstallment(index, "amount", e.target.value)}
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <Input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => updateInstallment(index, "dueDate", e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => removeInstallment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
