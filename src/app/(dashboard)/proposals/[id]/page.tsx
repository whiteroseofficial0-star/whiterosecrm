"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Pencil,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const STATUS_VARIANT: Record<string, "default" | "cold" | "success" | "danger" | "warm" | "outline"> = {
  DRAFT: "default",
  SENT: "cold",
  VIEWED: "warm",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "outline",
};

interface CompanySetting {
  companyName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gstNumber: string | null;
}

interface ProposalDetail {
  id: string;
  proposalNumber: string;
  date: string;
  validUntil: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes: string | null;
  terms: string | null;
  status: string;
  lead: { id: string; businessName: string; contactPerson: string; mobile: string; email: string | null; address: string | null; city: string | null; state: string | null } | null;
  client: { id: string; businessName: string; contactPerson: string; mobile: string; email: string | null; address: string | null; city?: string | null; state?: string | null } | null;
  createdBy: { id: string; name: string; email: string };
  items: { id: string; name: string; quantity: number; price: string; total: string; service: { id: string; name: string } | null }[];
}

export default function ProposalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [proposal, setProposal] = React.useState<ProposalDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [company, setCompany] = React.useState<CompanySetting | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const [proposalRes, companyRes] = await Promise.all([
          fetch(`/api/proposals/${id}`),
          fetch("/api/company-setting").catch(() => null),
        ]);

        if (proposalRes.ok) {
          setProposal(await proposalRes.json());
        } else {
          toast.error("Proposal not found");
          router.push("/proposals");
          return;
        }

        if (companyRes && companyRes.ok) {
          setCompany(await companyRes.json());
        }
      } catch {
        toast.error("Failed to load proposal");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/proposals/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setProposal((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast.success(`Proposal marked as ${STATUS_LABELS[newStatus]?.toLowerCase()}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    if (!proposal) return;

    const entity = proposal.client ?? proposal.lead;
    const subtotal = parseFloat(proposal.subtotal);
    const discount = parseFloat(proposal.discount);
    const taxAmount = parseFloat(proposal.tax);
    const total = parseFloat(proposal.total);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Proposal ${proposal.proposalNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #be123c; padding-bottom: 20px; }
    .company h1 { font-size: 24px; color: #be123c; }
    .company p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .proposal-info { text-align: right; }
    .proposal-info h2 { font-size: 18px; color: #1e293b; }
    .proposal-info p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .section { margin-bottom: 30px; }
    .section h3 { font-size: 14px; text-transform: uppercase; color: #be123c; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .client-info p { font-size: 13px; line-height: 1.6; }
    .client-info strong { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; }
    td { border: 1px solid #e2e8f0; padding: 10px 12px; font-size: 13px; }
    .text-right { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-top: 20px; }
    .totals-table { width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-row.total { border-top: 2px solid #1e293b; font-weight: 700; font-size: 16px; padding-top: 10px; margin-top: 4px; }
    .notes, .terms { font-size: 12px; line-height: 1.6; color: #475569; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <h1>${company?.companyName ?? "WhiteRose"}</h1>
      ${company?.address ? `<p>${company.address}</p>` : ""}
      ${company?.phone ? `<p>${company.phone}</p>` : ""}
      ${company?.email ? `<p>${company.email}</p>` : ""}
      ${company?.gstNumber ? `<p>GST: ${company.gstNumber}</p>` : ""}
    </div>
    <div class="proposal-info">
      <h2>PROPOSAL</h2>
      <p><strong>${proposal.proposalNumber}</strong></p>
      <p>Date: ${formatDate(proposal.date)}</p>
      ${proposal.validUntil ? `<p>Valid Until: ${formatDate(proposal.validUntil)}</p>` : ""}
    </div>
  </div>

  <div class="section">
    <h3>Prepared For</h3>
    <div class="client-info">
      <p><strong>${entity?.businessName ?? "N/A"}</strong></p>
      <p>${entity?.contactPerson ?? ""}</p>
      ${entity?.address ? `<p>${entity.address}</p>` : ""}
      ${entity?.city || entity?.state ? `<p>${[entity?.city, entity?.state].filter(Boolean).join(", ")}</p>` : ""}
      ${entity?.mobile ? `<p>Phone: ${entity.mobile}</p>` : ""}
      ${entity?.email ? `<p>Email: ${entity.email}</p>` : ""}
    </div>
  </div>

  <div class="section">
    <h3>Items</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Service</th>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${proposal.items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.service?.name ?? "-"}</td>
          <td>${item.name}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">₹${parseFloat(item.price).toLocaleString("en-IN")}</td>
          <td class="text-right">₹${parseFloat(item.total).toLocaleString("en-IN")}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString("en-IN")}</span></div>
      ${discount > 0 ? `<div class="totals-row"><span>Discount</span><span>-₹${discount.toLocaleString("en-IN")}</span></div>` : ""}
      ${taxAmount > 0 ? `<div class="totals-row"><span>Tax</span><span>₹${taxAmount.toLocaleString("en-IN")}</span></div>` : ""}
      <div class="totals-row total"><span>Grand Total</span><span>₹${total.toLocaleString("en-IN")}</span></div>
    </div>
  </div>

  ${proposal.notes ? `
  <div class="section" style="margin-top: 30px;">
    <h3>Notes</h3>
    <p class="notes">${proposal.notes}</p>
  </div>
  ` : ""}

  ${proposal.terms ? `
  <div class="section">
    <h3>Terms & Conditions</h3>
    <p class="terms">${proposal.terms}</p>
  </div>
  ` : ""}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <p style="font-size: 11px; color: #94a3b8;">Generated by ${company?.companyName ?? "WhiteRose"} CRM</p>
  </div>
</body>
</html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  if (!proposal) return null;

  const entity = proposal.client ?? proposal.lead;
  const subtotal = parseFloat(proposal.subtotal);
  const discount = parseFloat(proposal.discount);
  const taxAmount = parseFloat(proposal.tax);
  const total = parseFloat(proposal.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {proposal.proposalNumber}
              </h1>
              <Badge variant={STATUS_VARIANT[proposal.status] ?? "default"}>
                {STATUS_LABELS[proposal.status]}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Created by {proposal.createdBy.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {proposal.status === "DRAFT" && (
            <>
              <Button variant="outline" onClick={() => router.push(`/proposals/new?edit=${proposal.id}`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={() => handleStatusChange("SENT")} disabled={updating}>
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </>
          )}
          {proposal.status === "SENT" && (
            <Button onClick={() => handleStatusChange("ACCEPTED")} disabled={updating}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Accepted
            </Button>
          )}
          {(proposal.status === "SENT" || proposal.status === "VIEWED") && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("REJECTED")}
              disabled={updating}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-rose-700">From</h3>
                <div className="text-sm">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {company?.companyName ?? "WhiteRose"}
                  </p>
                  {company?.address && <p className="text-slate-600 dark:text-slate-400">{company.address}</p>}
                  {company?.phone && <p className="text-slate-500">{company.phone}</p>}
                  {company?.email && <p className="text-slate-500">{company.email}</p>}
                  {company?.gstNumber && <p className="text-slate-500">GST: {company.gstNumber}</p>}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-rose-700">To</h3>
                {entity ? (
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900 dark:text-white">{entity.businessName}</p>
                    <p className="text-slate-600 dark:text-slate-400">{entity.contactPerson}</p>
                    {entity.address && <p className="text-slate-500">{entity.address}</p>}
                    {entity.city && <p className="text-slate-500">{entity.city}</p>}
                    {entity.mobile && <p className="text-slate-500">Phone: {entity.mobile}</p>}
                    {entity.email && <p className="text-slate-500">Email: {entity.email}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No client or lead assigned</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-slate-500">Date: </span>
                <span className="font-medium">{formatDate(proposal.date)}</span>
              </div>
              {proposal.validUntil && (
                <div>
                  <span className="text-slate-500">Valid Until: </span>
                  <span className="font-medium">{formatDate(proposal.validUntil)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[60px]">Qty</TableHead>
                  <TableHead className="text-right w-[100px]">Price</TableHead>
                  <TableHead className="text-right w-[100px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposal.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="text-sm">{item.service?.name ?? "-"}</TableCell>
                    <TableCell className="text-sm">{item.name}</TableCell>
                    <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-right text-sm">{formatINR(item.price)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatINR(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{formatINR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-red-600">-{formatINR(discount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax</span>
                  <span>{formatINR(taxAmount)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Grand Total</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{formatINR(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {proposal.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{proposal.notes}</p>
            </div>
          )}

          {proposal.terms && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Terms & Conditions</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{proposal.terms}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
