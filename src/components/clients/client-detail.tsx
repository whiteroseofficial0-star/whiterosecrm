"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Mail,
  Building2,
  User,
  Calendar,
  DollarSign,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { WhatsAppSendDialog } from "@/components/ui/whatsapp-send-dialog";

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

const PROJECT_STATUS_LABELS: Record<string, string> = {
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

const PROJECT_STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm" | "cold"> = {
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

interface Project {
  id: string;
  name: string;
  serviceType: string | null;
  projectValue: string | null;
  status: string;
  progress: number;
  deadline: string | null;
  projectManager: { id: string; name: string } | null;
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
  installments: Installment[];
  project: { id: string; name: string } | null;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
}

interface ClientDetail {
  id: string;
  leadId: string | null;
  businessName: string;
  contactPerson: string;
  mobile: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  finalDealValue: string | null;
  startDate: string | null;
  status: string;
  accountManager: { id: string; name: string; email: string; phone: string | null; avatarUrl: string | null } | null;
  projects: Project[];
  payments: Payment[];
  notes: Note[];
}

export default function ClientDetailClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = React.useState<ClientDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [whatsappDialogOpen, setWhatsappDialogOpen] = React.useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = React.useState<{ id: string; name: string; category: string; message: string; isActive: boolean }[]>([]);

  React.useEffect(() => {
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
    async function loadClient() {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!cancelled) setClient(data);
      } catch {
        if (!cancelled) toast.error("Failed to load client");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadClient();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-slate-500">Client not found</p>
        <Button variant="ghost" onClick={() => router.push("/clients")} className="mt-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const totalPaid = client.payments.reduce((sum, p) => sum + Number(p.paidAmount), 0);
  const totalDue = client.payments.reduce((sum, p) => sum + (Number(p.totalAmount) - Number(p.paidAmount)), 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {client.businessName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{client.contactPerson}</p>
        </div>
        <Badge variant={STATUS_VARIANT[client.status] ?? "default"}>
          {STATUS_LABELS[client.status] ?? client.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Deal Value</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {client.finalDealValue ? formatINR(client.finalDealValue) : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Paid</p>
                <p className="font-semibold text-slate-900 dark:text-white">{formatINR(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Outstanding</p>
                <p className="font-semibold text-slate-900 dark:text-white">{formatINR(totalDue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Projects</p>
                <p className="font-semibold text-slate-900 dark:text-white">{client.projects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`tel:${client.mobile}`, "_self")}
        >
          <Phone className="mr-2 h-4 w-4" />
          Call
        </Button>
        {client.whatsapp && (
          <Button
            variant="outline"
            size="sm"
            className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
            onClick={() => setWhatsappDialogOpen(true)}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
        )}
        {client.email && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`mailto:${client.email}`, "_self")}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
        )}
      </div>

      <WhatsAppSendDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        recipientName={client.contactPerson}
        recipientMobile={client.whatsapp || client.mobile}
        recipientCompany={client.businessName}
        salespersonName={client.accountManager?.name}
        templates={whatsappTemplates}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects ({client.projects.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({client.payments.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({client.notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Business Name</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white">{client.businessName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Contact Person</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {client.contactPerson}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Mobile</dt>
                  <dd className="mt-1 font-mono text-sm text-slate-900 dark:text-white">{client.mobile}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">WhatsApp</dt>
                  <dd className="mt-1 font-mono text-sm text-slate-900 dark:text-white">{client.whatsapp ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Email</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white">{client.email ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Address</dt>
                  <dd className="mt-1 flex items-start gap-2 text-sm text-slate-900 dark:text-white">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {client.address ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Deal Value</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {client.finalDealValue ? formatINR(client.finalDealValue) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Start Date</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(client.startDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Account Manager</dt>
                  <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                    {client.accountManager?.name ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={STATUS_VARIANT[client.status] ?? "default"}>
                      {STATUS_LABELS[client.status] ?? client.status}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          {client.projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">No projects yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Service Type</TableHead>
                    <TableHead className="hidden md:table-cell">Value</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                    <TableHead className="hidden lg:table-cell">PM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {project.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {project.serviceType ?? "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm font-medium">
                        {project.projectValue ? formatINR(project.projectValue) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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
                        <Badge variant={PROJECT_STATUS_VARIANT[project.status] ?? "default"}>
                          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {formatDate(project.deadline)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {project.projectManager?.name ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {client.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {client.payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {payment.project?.name ?? "General Payment"}
                        </span>
                        {payment.method && (
                          <span className="ml-2 text-xs text-slate-500">via {payment.method}</span>
                        )}
                      </div>
                      <Badge variant={PAYMENT_STATUS_VARIANT[payment.status] ?? "default"}>
                        {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                      </Badge>
                    </div>
                    <div className="mb-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatINR(payment.totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Paid</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatINR(payment.paidAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Outstanding</p>
                        <p className="font-semibold text-amber-600 dark:text-amber-400">
                          {formatINR(Number(payment.totalAmount) - Number(payment.paidAmount))}
                        </p>
                      </div>
                    </div>
                    {payment.installments.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                            <TableHead className="hidden sm:table-cell">Paid Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payment.installments.map((inst) => (
                            <TableRow key={inst.id}>
                              <TableCell className="text-sm">{inst.label}</TableCell>
                              <TableCell className="text-sm font-medium">{formatINR(inst.amount)}</TableCell>
                              <TableCell className="hidden sm:table-cell text-sm">{formatDate(inst.dueDate)}</TableCell>
                              <TableCell className="hidden sm:table-cell text-sm">{formatDate(inst.paidDate)}</TableCell>
                              <TableCell>
                                <Badge variant={INSTALLMENT_STATUS_VARIANT[inst.status] ?? "default"}>
                                  {INSTALLMENT_STATUS_LABELS[inst.status] ?? inst.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          {client.notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {client.notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {note.author.name} &middot; {formatDate(note.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
