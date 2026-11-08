"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  User,
  FileText,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Video,
  MessageSquare,
  StickyNote,
  ExternalLink,
  Edit,
  MessageCircle,
} from "lucide-react";
import { WhatsAppSendDialog } from "@/components/ui/whatsapp-send-dialog";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const STATUS_OPTIONS = [
  "NEW_LEAD", "CONTACTED", "FOLLOW_UP", "INTERESTED",
  "DEMO_SCHEDULED", "DEMO_COMPLETED", "PROPOSAL_REQUESTED",
  "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "ON_HOLD",
];

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

interface LeadDetail {
  id: string;
  businessName: string;
  contactPerson: string;
  position: string | null;
  mobile: string;
  alternateMobile: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  googleMapsUrl: string | null;
  status: string;
  priority: string;
  leadScore: number;
  dealValue: string | null;
  probability: number | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  lostNotes: string | null;
  visitingCardUrl: string | null;
  customIndustry: string | null;
  createdAt: string;
  updatedAt: string;
  industry: { id: string; name: string } | null;
  source: { id: string; name: string } | null;
  area: { id: string; name: string } | null;
  assignedTo: { id: string; name: string; email: string; phone: string | null; avatarUrl: string | null } | null;
  createdBy: { id: string; name: string; email: string };
  services: { id: string; service: { id: string; name: string } }[];
  activities: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    createdBy: { id: string; name: string } | null;
  }[];
  followUps: {
    id: string;
    date: string;
    time: string;
    type: string;
    purpose: string;
    status: string;
    notes: string | null;
    assignedTo: { id: string; name: string } | null;
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    assignedTo: { id: string; name: string } | null;
  }[];
  meetings: {
    id: string;
    type: string;
    date: string;
    time: string;
    status: string;
    location: string | null;
    purpose: string | null;
    notes: string | null;
    assignedTo: { id: string; name: string } | null;
  }[];
  proposals: {
    id: string;
    proposalNumber: string;
    total: string;
    status: string;
    createdAt: string;
    createdBy: { id: string; name: string };
  }[];
  documents: {
    id: string;
    name: string;
    fileType: string;
    createdAt: string;
    uploadedBy: { id: string; name: string } | null;
  }[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string };
  }[];
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  created: CheckCircle2,
  status_change: ArrowLeft,
  call: Phone,
  whatsapp: MessageSquare,
  note: StickyNote,
  email: Mail,
  meeting: Video,
  deleted: XCircle,
};

const FOLLOWUP_TYPE_LABELS: Record<string, string> = {
  PHONE_CALL: "Phone Call",
  WHATSAPP: "WhatsApp",
  VISIT: "Visit",
  EMAIL: "Email",
  DEMO: "Demo",
  MEETING: "Meeting",
  PROPOSAL_DISCUSSION: "Proposal Discussion",
  PAYMENT_FOLLOW_UP: "Payment Follow-up",
  OTHER: "Other",
};

const TASK_STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm"> = {
  PENDING: "default",
  IN_PROGRESS: "warm",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const MEETING_STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm"> = {
  SCHEDULED: "default",
  COMPLETED: "success",
  CANCELLED: "danger",
  RESCHEDULED: "warm",
};

const PROPOSAL_STATUS_VARIANT: Record<string, "default" | "success" | "danger" | "warm"> = {
  DRAFT: "default",
  SENT: "default",
  VIEWED: "warm",
  ACCEPTED: "success",
  REJECTED: "danger",
  EXPIRED: "danger",
};

export function LeadDetail({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [lead, setLead] = React.useState<LeadDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusUpdating, setStatusUpdating] = React.useState(false);
  const [newNote, setNewNote] = React.useState("");
  const [newActivityType, setNewActivityType] = React.useState("call");
  const [newActivityDesc, setNewActivityDesc] = React.useState("");
  const [addNoteLoading, setAddNoteLoading] = React.useState(false);
  const [addActivityLoading, setAddActivityLoading] = React.useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = React.useState(false);
  const [whatsappTemplates, setWhatsappTemplates] = React.useState<{ id: string; name: string; category: string; message: string; isActive: boolean }[]>([]);

  const refetchLead = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Lead not found");
      const data = await res.json();
      setLead(data);
    } catch {
      toast.error("Failed to load lead details");
    }
  }, [leadId]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadLead() {
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) throw new Error("Lead not found");
        const data = await res.json();
        if (!cancelled) setLead(data);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load lead details");
          router.push("/leads");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadLead();
    return () => { cancelled = true; };
  }, [leadId, router]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Status updated");
      refetchLead();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddNoteLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      setNewNote("");
      toast.success("Note added");
      refetchLead();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAddNoteLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivityDesc.trim()) return;
    setAddActivityLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newActivityType, description: newActivityDesc }),
      });
      if (!res.ok) throw new Error("Failed to add activity");
      setNewActivityDesc("");
      toast.success("Activity logged");
      refetchLead();
    } catch {
      toast.error("Failed to log activity");
    } finally {
      setAddActivityLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {lead.businessName}
              </h1>
              <Badge variant={STATUS_VARIANT[lead.status] ?? "default"}>
                {STATUS_LABELS[lead.status]}
              </Badge>
              <Badge variant={PRIORITY_VARIANT[lead.priority] ?? "default"}>
                {lead.priority}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {lead.contactPerson} &middot; {lead.industry?.name ?? lead.customIndustry ?? "No Industry"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lead.status} onValueChange={handleStatusChange} disabled={statusUpdating}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {lead.whatsapp && (
            <Button
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
              onClick={() => setWhatsappDialogOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          )}
          <Link href={`/leads/${lead.id}?edit=true`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <WhatsAppSendDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        recipientName={lead.contactPerson}
        recipientMobile={lead.whatsapp || lead.mobile}
        recipientCompany={lead.businessName}
        salespersonName={lead.assignedTo?.name}
        templates={whatsappTemplates}
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm">{lead.contactPerson}</span>
                      {lead.position && (
                        <span className="text-xs text-slate-400">({lead.position})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-mono">{lead.mobile}</span>
                    </div>
                    {lead.alternateMobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-mono">{lead.alternateMobile}</span>
                        <span className="text-xs text-slate-400">(Alt)</span>
                      </div>
                    )}
                    {lead.whatsapp && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-mono">{lead.whatsapp}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">{lead.email}</span>
                      </div>
                    )}
                    {lead.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-400" />
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm text-rose-700 hover:underline flex items-center gap-1">
                          {lead.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  {(lead.address || lead.city || lead.state) && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-slate-400" />
                        <div className="text-sm">
                          {lead.address && <p>{lead.address}</p>}
                          <p>{[lead.area?.name, lead.city, lead.state, lead.pinCode].filter(Boolean).join(", ")}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Services Required</CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.services.length === 0 ? (
                    <p className="text-sm text-slate-400">No services selected</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {lead.services.map((ls) => (
                        <Badge key={ls.id} variant="default">{ls.service.name}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Deal Value</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">
                      {lead.dealValue ? formatINR(lead.dealValue) : "-"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Probability</span>
                    <span className="text-sm font-medium">{lead.probability ?? 0}%</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Lead Score</span>
                    <span className="text-sm font-medium">{lead.leadScore}/100</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Expected Close</span>
                    <span className="text-sm">{formatDate(lead.expectedCloseDate)}</span>
                  </div>
                  {lead.source && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Source</span>
                        <span className="text-sm">{lead.source.name}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assigned To</CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.assignedTo ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-700 text-sm font-semibold text-white">
                        {lead.assignedTo.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{lead.assignedTo.name}</p>
                        <p className="text-xs text-slate-500">{lead.assignedTo.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Unassigned</p>
                  )}
                  <Separator className="my-3" />
                  <div className="space-y-1 text-xs text-slate-500">
                    <p>Created by: {lead.createdBy.name}</p>
                    <p>Created: {formatDate(lead.createdAt)}</p>
                    <p>Updated: {formatDate(lead.updatedAt)}</p>
                  </div>
                </CardContent>
              </Card>

              {lead.lostReason && (
                <Card>
                  <CardHeader>
                    <CardTitle>Lost Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-500">Reason</p>
                      <p className="text-sm">{lead.lostReason}</p>
                    </div>
                    {lead.lostNotes && (
                      <div>
                        <p className="text-xs text-slate-500">Notes</p>
                        <p className="text-sm">{lead.lostNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Log Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select value={newActivityType} onValueChange={setNewActivityType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Describe the activity..."
                  value={newActivityDesc}
                  onChange={(e) => setNewActivityDesc(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddActivity} disabled={addActivityLoading || !newActivityDesc.trim()}>
                  <Send className="h-4 w-4" />
                  Log
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {lead.activities.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.type] ?? Clock;
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-slate-400">
                      {activity.createdBy?.name ?? "System"} &middot;{" "}
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
            {lead.activities.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No activities yet</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Note</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Textarea
                  placeholder="Write a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} disabled={addNoteLoading || !newNote.trim()} className="self-end">
                  <Plus className="h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {lead.notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {note.author.name} &middot; {formatDate(note.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
            {lead.notes.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No notes yet</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="followups" className="space-y-4">
          {lead.followUps.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Phone className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No follow-ups scheduled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lead.followUps.map((fu) => (
                <Card key={fu.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={fu.status === "COMPLETED" ? "success" : fu.status === "CANCELLED" ? "danger" : "default"}>
                            {fu.status}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {FOLLOWUP_TYPE_LABELS[fu.type] ?? fu.type}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium">{fu.purpose}</p>
                        {fu.notes && <p className="mt-1 text-sm text-slate-500">{fu.notes}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <p>{formatDate(fu.date)}</p>
                        <p>{fu.time}</p>
                      </div>
                    </div>
                    {fu.assignedTo && (
                      <p className="mt-2 text-xs text-slate-400">
                        Assigned to: {fu.assignedTo.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {lead.tasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No tasks for this lead</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lead.tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Badge variant={task.priority === "URGENT" || task.priority === "HIGH" ? "danger" : task.priority === "MEDIUM" ? "warm" : "default"}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={TASK_STATUS_VARIANT[task.status] ?? "default"}>
                          {task.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{formatDate(task.dueDate)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{task.assignedTo?.name ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          {lead.meetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No meetings scheduled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lead.meetings.map((m) => (
                <Card key={m.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={MEETING_STATUS_VARIANT[m.status] ?? "default"}>
                            {m.status}
                          </Badge>
                          <span className="text-xs text-slate-400">{m.type.replace(/_/g, " ")}</span>
                        </div>
                        {m.purpose && <p className="mt-1 text-sm font-medium">{m.purpose}</p>}
                        {m.location && (
                          <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {m.location}
                          </p>
                        )}
                        {m.notes && <p className="mt-1 text-sm text-slate-500">{m.notes}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <p>{formatDate(m.date)}</p>
                        <p>{m.time}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          {lead.proposals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No proposals created</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposal #</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Created By</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lead.proposals.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.proposalNumber}</TableCell>
                      <TableCell className="font-medium">{formatINR(p.total)}</TableCell>
                      <TableCell>
                        <Badge variant={PROPOSAL_STATUS_VARIANT[p.status] ?? "default"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{p.createdBy.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{formatDate(p.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {lead.documents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No documents uploaded</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Uploaded By</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lead.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{doc.fileType}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{doc.uploadedBy?.name ?? "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{formatDate(doc.createdAt)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
