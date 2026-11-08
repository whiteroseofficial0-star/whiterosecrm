"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { signOut } from "next-auth/react";

const TABS = ["Company", "WhatsApp Templates", "Account"] as const;

interface SettingsData {
  company: {
    companyName?: string;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    gstNumber?: string | null;
    currency?: string;
  };
  whatsappTemplates: { id: string; name: string; category: string; message: string; isActive: boolean }[];
}

export function SettingsPage() {
  const [data, setData] = React.useState<SettingsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<string>("Company");
  const [companyForm, setCompanyForm] = React.useState({
    companyName: "", logoUrl: "", address: "", phone: "", email: "", website: "", gstNumber: "", currency: "INR",
  });
  const [savingCompany, setSavingCompany] = React.useState(false);

  // Template dialog states
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [templateName, setTemplateName] = React.useState("");
  const [templateCategory, setTemplateCategory] = React.useState("");
  const [templateMessage, setTemplateMessage] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setCompanyForm({
            companyName: json.company?.companyName ?? "WhiteRose",
            logoUrl: json.company?.logoUrl ?? "",
            address: json.company?.address ?? "",
            phone: json.company?.phone ?? "",
            email: json.company?.email ?? "",
            website: json.company?.website ?? "",
            gstNumber: json.company?.gstNumber ?? "",
            currency: json.company?.currency ?? "INR",
          });
        }
      } catch {
        if (!cancelled) toast.error("Failed to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...companyForm,
          logoUrl: companyForm.logoUrl || null,
          address: companyForm.address || null,
          phone: companyForm.phone || null,
          email: companyForm.email || null,
          website: companyForm.website || null,
          gstNumber: companyForm.gstNumber || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Company settings saved");
    } catch {
      toast.error("Failed to save company settings");
    } finally {
      setSavingCompany(false);
    }
  };

  const handleTemplateSave = async () => {
    if (!templateName || !templateCategory || !templateMessage) { toast.error("All fields required"); return; }
    setSaving(true);
    try {
      const url = "/api/settings/whatsapp-templates";
      const method = editId ? "PUT" : "POST";
      const body = editId
        ? { id: editId, name: templateName, category: templateCategory, message: templateMessage }
        : { name: templateName, category: templateCategory, message: templateMessage };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      toast.success(editId ? "Template updated" : "Template added");
      const settingsRes = await fetch("/api/settings");
      const settingsData = await settingsRes.json();
      setData((prev) => prev ? { ...prev, whatsappTemplates: settingsData.whatsappTemplates } : prev);
      setTemplateDialogOpen(false);
      setEditId(null);
      setTemplateName("");
      setTemplateCategory("");
      setTemplateMessage("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/settings/whatsapp-templates?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Template deleted");
      const settingsRes = await fetch("/api/settings");
      const settingsData = await settingsRes.json();
      setData((prev) => prev ? { ...prev, whatsappTemplates: settingsData.whatsappTemplates } : prev);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your CRM configuration</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Company Tab */}
      {activeTab === "Company" && (
        <Card>
          <CardHeader><CardTitle>Company Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Company Name</Label>
                <Input value={companyForm.companyName} onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input value={companyForm.logoUrl} onChange={(e) => setCompanyForm({ ...companyForm, logoUrl: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} />
              </div>
              <div>
                <Label>GST Number</Label>
                <Input value={companyForm.gstNumber} onChange={(e) => setCompanyForm({ ...companyForm, gstNumber: e.target.value })} />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={companyForm.currency} onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveCompany} disabled={savingCompany}>
                {savingCompany ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Templates Tab */}
      {activeTab === "WhatsApp Templates" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>WhatsApp Templates</CardTitle>
            <Button size="sm" onClick={() => { setEditId(null); setTemplateName(""); setTemplateCategory(""); setTemplateMessage(""); setTemplateDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Message</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.whatsappTemplates.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-6">No templates</TableCell></TableRow>
                ) : (
                  data.whatsappTemplates.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell><Badge variant="default">{item.category}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500 max-w-xs truncate">{item.message}</TableCell>
                      <TableCell><Badge variant={item.isActive ? "success" : "default"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditId(item.id); setTemplateName(item.name); setTemplateCategory(item.category); setTemplateMessage(item.message); setTemplateDialogOpen(true);
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleTemplateDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Account Tab */}
      {activeTab === "Account" && (
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Sign Out</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sign out of your account. You will need to log in again to access the dashboard.
              </p>
              <Button
                variant="destructive"
                className="mt-3"
                disabled={loggingOut}
                onClick={() => {
                  setLoggingOut(true);
                  signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {loggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Template" : "Add Template"}</DialogTitle>
            <DialogDescription>{editId ? "Update WhatsApp template." : "Create a new WhatsApp template."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)} placeholder="e.g. Follow-up, After Meeting" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={templateMessage} onChange={(e) => setTemplateMessage(e.target.value)} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTemplateSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
