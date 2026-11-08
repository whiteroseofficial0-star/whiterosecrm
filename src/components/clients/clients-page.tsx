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
  Phone,
  MessageCircle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";

const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "ON_HOLD"] as const;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_HOLD: "On Hold",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm"> = {
  ACTIVE: "success",
  INACTIVE: "default",
  ON_HOLD: "warm",
};

interface Client {
  id: string;
  businessName: string;
  contactPerson: string;
  mobile: string;
  whatsapp: string | null;
  email: string | null;
  finalDealValue: string | null;
  status: string;
  accountManager: { id: string; name: string; email: string } | null;
  _count: { projects: number; payments: number };
}

interface ClientsResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function ClientsPage() {
  const router = useRouter();
  const [data, setData] = React.useState<ClientsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);

  const filterKey = `${search}|${status}|${page}`;
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
    async function loadClients() {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      try {
        const res = await fetch(`/api/clients?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Failed to load clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadClients();
    return () => { cancelled = true; };
  }, [search, status, page]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Clients</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} total clients` : "Loading..."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, contact, mobile, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px] shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        </div>
      ) : !data || data.clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-20 dark:border-slate-700">
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No clients found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {search || status ? "Try adjusting your filters" : "Clients will appear here after converting leads"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                  <TableHead className="hidden lg:table-cell">Mobile</TableHead>
                  <TableHead className="hidden xl:table-cell">Deal Value</TableHead>
                  <TableHead className="hidden lg:table-cell">Account Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Projects</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {client.businessName}
                      </div>
                      <div className="text-xs text-slate-500 md:hidden">{client.contactPerson}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{client.contactPerson}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">
                      {client.mobile}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell font-medium">
                      {client.finalDealValue ? formatINR(client.finalDealValue) : "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {client.accountManager?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[client.status] ?? "default"}>
                        {STATUS_LABELS[client.status] ?? client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {client._count.projects}
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
                              router.push(`/clients/${client.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {client.whatsapp && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://wa.me/${client.whatsapp}`, "_blank");
                              }}
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`tel:${client.mobile}`, "_self");
                            }}
                          >
                            <Phone className="mr-2 h-4 w-4" />
                            Call
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
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} clients
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
