"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Building2, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const PAYMENT_STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm" | "cold"> = {
  PENDING: "warm",
  PARTIALLY_PAID: "cold",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "default",
};

const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

const INSTALLMENT_STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm"> = {
  PENDING: "warm",
  PAID: "success",
  OVERDUE: "danger",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CARD: "Card",
  RAZORPAY: "Razorpay",
  OTHER: "Other",
};

interface Installment {
  id: string;
  label: string;
  amount: string;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
}

interface PaymentDetail {
  id: string;
  totalAmount: string;
  paidAmount: string;
  dueDate: string | null;
  method: string | null;
  transactionId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  client: { id: string; businessName: string; contactPerson: string; mobile: string };
  project: { id: string; name: string } | null;
  installments: Installment[];
}

export default function PaymentDetailClient({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [payment, setPayment] = React.useState<PaymentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function loadPayment() {
      try {
        const res = await fetch(`/api/payments/${paymentId}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) setPayment(data);
      } catch {
        if (!cancelled) toast.error("Failed to load payment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPayment();
    return () => { cancelled = true; };
  }, [paymentId]);

  const handleMarkInstallmentPaid = async (installmentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentId }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setPayment(updated);
      toast.success("Installment marked as paid");
    } catch {
      toast.error("Failed to mark installment");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setPayment(updated);
      toast.success(`Payment status updated to ${PAYMENT_STATUS_LABELS[newStatus] ?? newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-slate-500">Payment not found</p>
        <Button variant="ghost" onClick={() => router.push("/payments")} className="mt-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payments
        </Button>
      </div>
    );
  }

  const outstanding = Number(payment.totalAmount) - Number(payment.paidAmount);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/payments")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Payment Detail
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {payment.client.businessName}
          </p>
        </div>
        <Badge variant={PAYMENT_STATUS_VARIANT[payment.status] ?? "default"}>
          {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Amount</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {formatINR(payment.totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Paid Amount</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(payment.paidAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatINR(outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {payment.status !== "PAID" && (
          <Button size="sm" onClick={() => handleStatusChange("PAID")}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as Paid
          </Button>
        )}
        {payment.status === "PAID" && (
          <Button size="sm" variant="outline" onClick={() => handleStatusChange("PENDING")}>
            Mark as Pending
          </Button>
        )}
        {payment.status !== "OVERDUE" && payment.status !== "PAID" && (
          <Button size="sm" variant="outline" onClick={() => handleStatusChange("OVERDUE")}>
            Mark as Overdue
          </Button>
        )}
        {payment.status !== "CANCELLED" && (
          <Button size="sm" variant="outline" onClick={() => handleStatusChange("CANCELLED")}>
            Cancel
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Client</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {payment.client.businessName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Contact</dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                {payment.client.contactPerson} &middot; {payment.client.mobile}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Project</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                {payment.project?.name ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Payment Method</dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                {payment.method ? METHOD_LABELS[payment.method] ?? payment.method : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Transaction ID</dt>
              <dd className="mt-1 font-mono text-sm text-slate-900 dark:text-white">
                {payment.transactionId ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Due Date</dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                {formatDate(payment.dueDate)}
              </dd>
            </div>
            {payment.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900 dark:text-white">
                  {payment.notes}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installments ({payment.installments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payment.installments.length === 0 ? (
            <p className="text-sm text-slate-500">No installments</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Paid Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payment.installments.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-white">
                      {inst.label}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatINR(inst.amount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {formatDate(inst.dueDate)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {formatDate(inst.paidDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={INSTALLMENT_STATUS_VARIANT[inst.status] ?? "default"}>
                        {INSTALLMENT_STATUS_LABELS[inst.status] ?? inst.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {inst.status !== "PAID" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleMarkInstallmentPaid(inst.id)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
