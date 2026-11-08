"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const STATUS_OPTIONS = [
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "INTERESTED", label: "Interested" },
  { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
  { value: "DEMO_COMPLETED", label: "Demo Completed" },
  { value: "PROPOSAL_REQUESTED", label: "Proposal Requested" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "ON_HOLD", label: "On Hold" },
];

const PRIORITY_OPTIONS = [
  { value: "HOT", label: "Hot" },
  { value: "WARM", label: "Warm" },
  { value: "COLD", label: "Cold" },
];

interface LeadFormData {
  businessName: string;
  contactPerson: string;
  position: string;
  mobile: string;
  alternateMobile: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  address: string;
  areaId: string;
  city: string;
  state: string;
  pinCode: string;
  googleMapsUrl: string;
  industryId: string;
  customIndustry: string;
  sourceId: string;
  status: string;
  priority: string;
  dealValue: string;
  probability: string;
  expectedCloseDate: string;
  notes: string;
  visitingCardUrl: string;
  assignedToId: string;
  serviceIds: string[];
}

interface LookupData {
  industries: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  areas: { id: string; name: string }[];
  services: { id: string; name: string; category: string }[];
  users: { id: string; name: string }[];
}

const INITIAL_FORM: LeadFormData = {
  businessName: "",
  contactPerson: "",
  position: "",
  mobile: "",
  alternateMobile: "",
  whatsapp: "",
  email: "",
  website: "",
  instagram: "",
  address: "",
  areaId: "",
  city: "",
  state: "",
  pinCode: "",
  googleMapsUrl: "",
  industryId: "",
  customIndustry: "",
  sourceId: "",
  status: "NEW_LEAD",
  priority: "WARM",
  dealValue: "",
  probability: "",
  expectedCloseDate: "",
  notes: "",
  visitingCardUrl: "",
  assignedToId: "",
  serviceIds: [],
};

export function LeadForm({ leadId, initialData }: { leadId?: string; initialData?: Partial<LeadFormData> }) {
  const router = useRouter();
  const [form, setForm] = React.useState<LeadFormData>({ ...INITIAL_FORM, ...initialData });
  const [lookup, setLookup] = React.useState<LookupData | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loadingLookup, setLoadingLookup] = React.useState(true);

  React.useEffect(() => {
    async function fetchLookup() {
      try {
        const res = await fetch("/api/leads/lookup");
        if (!res.ok) throw new Error("Failed to fetch lookup data");
        const data = await res.json();
        setLookup({
          industries: data.industries ?? [],
          sources: data.sources ?? [],
          areas: data.areas ?? [],
          services: data.services ?? [],
          users: data.users ?? [],
        });
      } catch {
        setLookup({ industries: [], sources: [], areas: [], services: [], users: [] });
      } finally {
        setLoadingLookup(false);
      }
    }
    fetchLookup();
  }, []);

  const updateField = (field: keyof LeadFormData, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleService = (serviceId: string) => {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        businessName: form.businessName,
        contactPerson: form.contactPerson,
        position: form.position || null,
        mobile: form.mobile,
        alternateMobile: form.alternateMobile || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        website: form.website || null,
        instagram: form.instagram || null,
        address: form.address || null,
        areaId: form.areaId || null,
        city: form.city || null,
        state: form.state || null,
        pinCode: form.pinCode || null,
        googleMapsUrl: form.googleMapsUrl || null,
        industryId: form.industryId || null,
        customIndustry: form.customIndustry || null,
        sourceId: form.sourceId || null,
        status: form.status,
        priority: form.priority,
        dealValue: form.dealValue ? parseFloat(form.dealValue) : null,
        probability: form.probability ? parseInt(form.probability) : null,
        expectedCloseDate: form.expectedCloseDate || null,
        visitingCardUrl: form.visitingCardUrl || null,
        assignedToId: form.assignedToId || null,
        serviceIds: form.serviceIds,
      };

      const url = leadId ? `/api/leads/${leadId}` : "/api/leads";
      const method = leadId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save lead");
      }

      const saved = await res.json();
      toast.success(leadId ? "Lead updated successfully" : "Lead created successfully");

      if (form.notes && !leadId) {
        await fetch(`/api/leads/${saved.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: form.notes }),
        });
      }

      router.push(`/leads/${saved.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leads">
            <Button type="button" variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {leadId ? "Edit Lead" : "New Lead"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {leadId ? "Update lead information" : "Add a new lead to your pipeline"}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Lead"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    value={form.contactPerson}
                    onChange={(e) => updateField("contactPerson", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={form.position}
                    onChange={(e) => updateField("position", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile *</Label>
                  <Input
                    id="mobile"
                    value={form.mobile}
                    onChange={(e) => updateField("mobile", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternateMobile">Alternate Mobile</Label>
                  <Input
                    id="alternateMobile"
                    value={form.alternateMobile}
                    onChange={(e) => updateField("alternateMobile", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={form.whatsapp}
                    onChange={(e) => updateField("whatsapp", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => updateField("website", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={form.instagram}
                    onChange={(e) => updateField("instagram", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Area</Label>
                  <Select value={form.areaId} onValueChange={(v) => updateField("areaId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookup?.areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => updateField("state", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pinCode">Pin Code</Label>
                  <Input
                    id="pinCode"
                    value={form.pinCode}
                    onChange={(e) => updateField("pinCode", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
                  <Input
                    id="googleMapsUrl"
                    value={form.googleMapsUrl}
                    onChange={(e) => updateField("googleMapsUrl", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required Services</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLookup ? (
                <p className="text-sm text-slate-400">Loading services...</p>
              ) : lookup?.services.length === 0 ? (
                <p className="text-sm text-slate-400">No services available</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {lookup?.services.map((svc) => (
                    <div key={svc.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`svc-${svc.id}`}
                        checked={form.serviceIds.includes(svc.id)}
                        onCheckedChange={() => toggleService(svc.id)}
                      />
                      <Label htmlFor={`svc-${svc.id}`} className="cursor-pointer font-normal">
                        {svc.name}
                        <span className="ml-1 text-xs text-slate-400">({svc.category})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any notes about this lead..."
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => updateField("priority", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="dealValue">Deal Value (INR)</Label>
                <Input
                  id="dealValue"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.dealValue}
                  onChange={(e) => updateField("dealValue", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={form.probability}
                  onChange={(e) => updateField("probability", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={form.expectedCloseDate}
                  onChange={(e) => updateField("expectedCloseDate", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={form.industryId} onValueChange={(v) => updateField("industryId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookup?.industries.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.industryId === "OTHER" && (
                <div className="space-y-2">
                  <Label htmlFor="customIndustry">Custom Industry</Label>
                  <Input
                    id="customIndustry"
                    value={form.customIndustry}
                    onChange={(e) => updateField("customIndustry", e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select value={form.sourceId} onValueChange={(v) => updateField("sourceId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookup?.sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={form.assignedToId} onValueChange={(v) => updateField("assignedToId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookup?.users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visiting Card</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                {form.visitingCardUrl && (
                  <span className="text-xs text-slate-500">Uploaded</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
