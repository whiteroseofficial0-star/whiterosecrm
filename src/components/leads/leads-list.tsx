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
  Pencil,
  Trash2,
  Eye,
  ArrowUpDown,
  Filter,
  MessageCircle,
} from "lucide-react";
import { WhatsAppSendDialog } from "@/components/ui/whatsapp-send-dialog";
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

const STATUS_OPTIONS = [
  "NEW_LEAD",
  "CONTACTED",
  "FOLLOW_UP",
  "INTERESTED",
  "DEMO_SCHEDULED",
  "DEMO_COMPLETED",
  "PROPOSAL_REQUESTED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ON_HOLD",
];

const PRIORITY_OPTIONS = ["HOT", "WARM", "COLD"];

const STATUS_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow Up",
  INTERESTED: "Interested",
  DEMO_SCHEDULED: "Demo Scheduled",
  DEMO_COMPLETED: "Demo Completed",
  PROPOSAL_REQUESTED: "Proposal Requested",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  ON_HOLD: "On Hold",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "hot" | "warm" | "cold"> = {
  NEW_LEAD: "default",
  CONTACTED: "default",
  FOLLOW_UP: "warm",
  INTERESTED: "warm",
  DEMO_SCHEDULED: "default",
  DEMO_COMPLETED: "success",
  PROPOSAL_REQUESTED: "default",
  PROPOSAL_SENT: "default",
  NEGOTIATION: "warm",
  WON: "success",
  LOST: "danger",
  ON_HOLD: "cold",
};

const PRIORITY_VARIANT: Record<string, "hot" | "warm" | "cold"> = {
  HOT: "hot",
  WARM: "warm",
  COLD: "cold",
};

interface Lead {
  id: string;
  businessName: string;
  contactPerson: string;
  mobile: string;
  whatsapp: string | null;
  email: string | null;
  status: string;
  priority: string;
  dealValue: string | null;
  leadScore: number;
  createdAt: string;
  industry: { id: string; name: string } | null;
  source: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  services: { service: { id: string; name: string } }[];
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterData {
  industries: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  areas: { id: string; name: string }[];
  users: { id: string; name: string }[];
}

function buildLeadsParams(
  search: string,
  status: string,
  priority: string,
  industryId: string,
  sourceId: string,
  areaId: string,
  assignedToId: string,
  page: number,
  sort: string
) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  if (industryId) params.set("industryId", industryId);
  if (sourceId) params.set("sourceId", sourceId);
  if (areaId) params.set("areaId", areaId);
  if (assignedToId) params.set("assignedToId", assignedToId);
  params.set("page", page.toString());
  params.set("limit", "20");
  params.set("sort", sort);
  return params;
}

export function LeadsList() {
  const router = useRouter();
  const [data, setData] = React.useState<LeadsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [priority, setPriority] = React.useState("");
  const [industryId, setIndustryId] = React.useState("");
  const [sourceId, setSourceId] = React.useState("");
  const [areaId, setAreaId] = React.useState("");
  const [assignedToId, setAssignedToId] = React.useState("");
  const [sort, setSort] = React.useState("createdAt-desc");
  const [page, setPage] = React.useState(1);
  const [filterData, setFilterData] = React.useState<FilterData | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = React.useState(false);
  const [whatsappTarget, setWhatsappTarget] = React.useState<{ name: string; mobile: string; company: string } | null>(null);
  const [whatsappTemplates, setWhatsappTemplates] = React.useState<{ id: string; name: string; category: string; message: string; isActive: boolean }[]>([]);

  const filterKey = `${search}|${status}|${priority}|${industryId}|${sourceId}|${areaId}|${assignedToId}|${page}|${sort}`;
  const prevFilterKeyRef = React.useRef(filterKey);

  React.useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      const [, , , , , , , prevPage] = prevFilterKeyRef.current.split("|");
      const filterParts = filterKey.split("|");
      const newSearch = filterParts[0];
      const newStatus = filterParts[1];
      const newPriority = filterParts[2];
      const newIndustryId = filterParts[3];
      const newSourceId = filterParts[4];
      const newAreaId = filterParts[5];
      const newAssignedToId = filterParts[6];
      const oldSearch = prevFilterKeyRef.current.split("|")[0];
      const oldStatus = prevFilterKeyRef.current.split("|")[1];
      const oldPriority = prevFilterKeyRef.current.split("|")[2];
      const oldIndustryId = prevFilterKeyRef.current.split("|")[3];
      const oldSourceId = prevFilterKeyRef.current.split("|")[4];
      const oldAreaId = prevFilterKeyRef.current.split("|")[5];
      const oldAssignedToId = prevFilterKeyRef.current.split("|")[6];
      const filtersChanged =
        newSearch !== oldSearch ||
        newStatus !== oldStatus ||
        newPriority !== oldPriority ||
        newIndustryId !== oldIndustryId ||
        newSourceId !== oldSourceId ||
        newAreaId !== oldAreaId ||
        newAssignedToId !== oldAssignedToId;
      if (filtersChanged && prevPage !== "1") {
        setPage(1);
      }
      prevFilterKeyRef.current = filterKey;
    }
  }, [filterKey]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadLeads() {
      const params = buildLeadsParams(search, status, priority, industryId, sourceId, areaId, assignedToId, page, sort);
      try {
        const res = await fetch(`/api/leads?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch leads");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Failed to load leads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadLeads();
    return () => { cancelled = true; };
  }, [search, status, priority, industryId, sourceId, areaId, assignedToId, page, sort]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setWhatsappTemplates(data.whatsappTemplates ?? []);
        }
      } catch { /* empty */ }
    }
    loadTemplates();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadFilters() {
      try {
        const res = await fetch("/api/leads/lookup");
        if (!res.ok) throw new Error("Failed to fetch lookup data");
        const lookupData = await res.json();
        if (!cancelled) {
          setFilterData({
            industries: lookupData.industries ?? [],
            sources: lookupData.sources ?? [],
            areas: lookupData.areas ?? [],
            users: lookupData.users ?? [],
          });
        }
      } catch {
        if (!cancelled) {
          setFilterData({ industries: [], sources: [], areas: [], users: [] });
        }
      }
    }
    loadFilters();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Lead deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  const activeFilters = [status, priority, industryId, sourceId, areaId, assignedToId].filter(Boolean).length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Leads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} total leads` : "Loading..."}
          </p>
        </div>
        <Link href="/leads/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </Link>
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
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && (
              <Badge variant="hot" className="ml-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                {activeFilters}
              </Badge>
            )}
          </Button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px] shrink-0">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="businessName-asc">Business Name A-Z</SelectItem>
              <SelectItem value="businessName-desc">Business Name Z-A</SelectItem>
              <SelectItem value="dealValue-desc">Highest Deal Value</SelectItem>
              <SelectItem value="dealValue-asc">Lowest Deal Value</SelectItem>
              <SelectItem value="leadScore-desc">Highest Score</SelectItem>
              <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={industryId} onValueChange={setIndustryId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                {filterData?.industries.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {filterData?.sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                {filterData?.areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                {filterData?.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatus("");
                  setPriority("");
                  setIndustryId("");
                  setSourceId("");
                  setAreaId("");
                  setAssignedToId("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        </div>
      ) : !data || data.leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-20 dark:border-slate-700">
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No leads found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {search || activeFilters > 0 ? "Try adjusting your filters" : "Create your first lead to get started"}
          </p>
          {!search && activeFilters === 0 && (
            <Link href="/leads/new" className="mt-4">
              <Button>
                <Plus className="h-4 w-4" />
                Add Lead
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
                  <TableHead>Business Name</TableHead>
                  <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                  <TableHead className="hidden lg:table-cell">Mobile</TableHead>
                  <TableHead className="hidden xl:table-cell">Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Priority</TableHead>
                  <TableHead className="hidden lg:table-cell">Deal Value</TableHead>
                  <TableHead className="hidden xl:table-cell">Assigned To</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {lead.businessName}
                      </div>
                      <div className="text-xs text-slate-500 md:hidden">{lead.contactPerson}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{lead.contactPerson}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">
                      {lead.mobile}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {lead.industry?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[lead.status] ?? "default"}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={PRIORITY_VARIANT[lead.priority] ?? "default"}>
                        {lead.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-medium">
                      {lead.dealValue ? formatINR(lead.dealValue) : "-"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {lead.assignedTo?.name ?? "-"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-slate-500">
                      {formatDate(lead.createdAt)}
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
                              router.push(`/leads/${lead.id}`);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/leads/${lead.id}?edit=true`);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {lead.whatsapp && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setWhatsappTarget({
                                  name: lead.contactPerson,
                                  mobile: lead.whatsapp || lead.mobile,
                                  company: lead.businessName,
                                });
                                setWhatsappDialogOpen(true);
                              }}
                            >
                              <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                              WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(lead.id);
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
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} leads
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

      {whatsappTarget && (
        <WhatsAppSendDialog
          open={whatsappDialogOpen}
          onOpenChange={setWhatsappDialogOpen}
          recipientName={whatsappTarget.name}
          recipientMobile={whatsappTarget.mobile}
          recipientCompany={whatsappTarget.company}
          templates={whatsappTemplates}
        />
      )}
    </div>
  );
}
