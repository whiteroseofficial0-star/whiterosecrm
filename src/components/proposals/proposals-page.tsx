"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatINR, formatDate } from "@/lib/utils";

const TABS = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
] as const;

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

interface Proposal {
  id: string;
  proposalNumber: string;
  date: string;
  validUntil: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  status: string;
  lead: { id: string; businessName: string; contactPerson: string } | null;
  client: { id: string; businessName: string; contactPerson: string } | null;
  createdBy: { id: string; name: string; email: string };
  createdAt: string;
}

interface ProposalsResponse {
  proposals: Proposal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function ProposalsPage() {
  const router = useRouter();
  const [data, setData] = React.useState<ProposalsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("all");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [activeTab]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      params.set("page", page.toString());
      params.set("limit", "20");

      try {
        const res = await fetch(`/api/proposals?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Failed to load proposals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeTab, page]);

  const getEntityName = (proposal: Proposal) => {
    if (proposal.client) return proposal.client.businessName;
    if (proposal.lead) return proposal.lead.businessName;
    return "-";
  };

  const getEntitySubtext = (proposal: Proposal) => {
    if (proposal.client) return proposal.client.contactPerson;
    if (proposal.lead) return proposal.lead.contactPerson;
    return "-";
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Proposals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} total proposals` : "Loading..."}
          </p>
        </div>
        <Link href="/proposals/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Proposal
          </Button>
        </Link>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        </div>
      ) : !data || data.proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-20 dark:border-slate-700">
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No proposals found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {activeTab !== "all" ? "Try a different filter" : "Create your first proposal to get started"}
          </p>
          {activeTab === "all" && (
            <Link href="/proposals/new" className="mt-4">
              <Button>
                <Plus className="h-4 w-4" />
                New Proposal
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposal #</TableHead>
                  <TableHead>Client / Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Valid Until</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Created By</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.proposals.map((proposal) => (
                  <TableRow
                    key={proposal.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/proposals/${proposal.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {proposal.proposalNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {getEntityName(proposal)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {getEntitySubtext(proposal)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {formatDate(proposal.date)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {proposal.validUntil ? formatDate(proposal.validUntil) : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatINR(proposal.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[proposal.status] ?? "default"}>
                        {STATUS_LABELS[proposal.status] ?? proposal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {proposal.createdBy.name}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/proposals/${proposal.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} proposals
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
    </div>
  );
}
