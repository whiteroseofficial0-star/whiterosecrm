"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Eye, Send, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate, cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  category: string;
  defaultPrice: string | null;
}

interface LookupEntity {
  id: string;
  businessName: string;
  contactPerson: string;
  mobile?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

interface ProposalItem {
  id: string;
  serviceId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

function generateTempId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function NewProposalPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [services, setServices] = React.useState<Service[]>([]);
  const [leads, setLeads] = React.useState<LookupEntity[]>([]);
  const [clients, setClients] = React.useState<LookupEntity[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showPreview, setShowPreview] = React.useState(false);

  const today = new Date().toISOString().split("T")[0];
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [proposalDate, setProposalDate] = React.useState(today);
  const [validUntil, setValidUntil] = React.useState(thirtyDays);
  const [selectedEntityId, setSelectedEntityId] = React.useState("");
  const [entityType, setEntityType] = React.useState<"lead" | "client">("lead");
  const [items, setItems] = React.useState<ProposalItem[]>([
    { id: generateTempId(), serviceId: "", name: "", quantity: 1, price: 0, total: 0 },
  ]);
  const [discount, setDiscount] = React.useState(0);
  const [tax, setTax] = React.useState(18);
  const [notes, setNotes] = React.useState("");
  const [terms, setTerms] = React.useState("");

  React.useEffect(() => {
    async function load() {
      try {
        const [servicesRes, leadsRes, clientsRes] = await Promise.all([
          fetch("/api/leads/lookup"),
          fetch("/api/leads?limit=200"),
          fetch("/api/leads?limit=200"),
        ]);

        if (servicesRes.ok) {
          const sData = await servicesRes.json();
          setServices(sData.services ?? []);
        }

        if (leadsRes.ok) {
          const lData = await leadsRes.json();
          setLeads(lData.leads ?? []);
        }

        if (clientsRes.ok) {
          const cData = await clientsRes.json();
          setClients(cData.leads ?? []);
        }
      } catch {
        toast.error("Failed to load lookup data");
      }
    }
    load();
  }, []);

  const filteredEntities = React.useMemo(() => {
    const list = entityType === "lead" ? leads : clients;
    if (!searchQuery) return list.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return list
      .filter(
        (e) =>
          e.businessName.toLowerCase().includes(q) ||
          e.contactPerson.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [entityType, leads, clients, searchQuery]);

  const subtotal = React.useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }, [items]);

  const taxAmount = React.useMemo(() => {
    return ((subtotal - discount) * tax) / 100;
  }, [subtotal, discount, tax]);

  const total = React.useMemo(() => {
    return subtotal - discount + taxAmount;
  }, [subtotal, discount, taxAmount]);

  const handleServiceSelect = (itemId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              serviceId,
              name: service?.name ?? item.name,
              price: service?.defaultPrice ? parseFloat(service.defaultPrice) : item.price,
              total: item.quantity * (service?.defaultPrice ? parseFloat(service.defaultPrice) : item.price),
            }
          : item
      )
    );
  };

  const handleItemChange = (itemId: string, field: keyof ProposalItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "price") {
          updated.total = (field === "quantity" ? (value as number) : item.quantity) *
            (field === "price" ? (value as number) : item.price);
        }
        return updated;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: generateTempId(), serviceId: "", name: "", quantity: 1, price: 0, total: 0 },
    ]);
  };

  const removeItem = (itemId: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const buildPayload = () => ({
    leadId: entityType === "lead" ? selectedEntityId || null : null,
    clientId: entityType === "client" ? selectedEntityId || null : null,
    date: proposalDate,
    validUntil: validUntil || null,
    discount,
    tax,
    notes: notes || null,
    terms: terms || null,
    items: items.map((item) => ({
      serviceId: item.serviceId || null,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  });

  const handleSave = async (action: "draft" | "send") => {
    if (items.length === 0 || items.every((i) => !i.name)) {
      toast.error("Please add at least one item with a name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create proposal");
      }

      const proposal = await res.json();

      if (action === "send") {
        await fetch(`/api/proposals/${proposal.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SENT" }),
        });
      }

      toast.success(action === "send" ? "Proposal sent!" : "Proposal saved as draft");
      router.push(`/proposals/${proposal.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save proposal");
    } finally {
      setLoading(false);
    }
  };

  const selectedEntity = entityType === "lead"
    ? leads.find((l) => l.id === selectedEntityId)
    : clients.find((c) => c.id === selectedEntityId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">New Proposal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create a new proposal</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date</Label>
            <Input
              type="date"
              value={proposalDate}
              onChange={(e) => setProposalDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Valid Until</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Proposal To</Label>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v as "lead" | "client"); setSelectedEntityId(""); setSearchQuery(""); }}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Search {entityType === "lead" ? "Lead" : "Client"}
          </Label>
          <Input
            placeholder={`Search by name or contact person...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-1"
          />
          {selectedEntity && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="font-medium text-slate-900 dark:text-white">{selectedEntity.businessName}</p>
              <p className="text-sm text-slate-500">{selectedEntity.contactPerson}</p>
              {selectedEntity.mobile && (
                <p className="text-xs text-slate-400">{selectedEntity.mobile}</p>
              )}
            </div>
          )}
          {!selectedEntity && filteredEntities.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              {filteredEntities.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => setSelectedEntityId(entity.id)}
                  className="flex w-full flex-col border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{entity.businessName}</span>
                  <span className="text-xs text-slate-500">{entity.contactPerson}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Items</h2>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Service</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead className="w-[140px]">Price</TableHead>
                <TableHead className="w-[140px]">Total</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Select
                      value={item.serviceId}
                      onValueChange={(val) => handleServiceSelect(item.id, val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Description"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, "price", parseFloat(e.target.value) || 0)}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{formatINR(item.total)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</Label>
            <Textarea
              placeholder="Additional notes for the client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Terms & Conditions</Label>
            <Textarea
              placeholder="Terms and conditions..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Summary</h3>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium">{formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Discount</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="h-8 w-24 text-right text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Tax %</span>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="h-8 w-24 text-right text-sm"
              />
            </div>
            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{formatINR(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSave("draft")}
              disabled={loading}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              className="w-full"
              onClick={() => handleSave("send")}
              disabled={loading}
            >
              <Send className="mr-2 h-4 w-4" />
              Save & Send
            </Button>
          </div>
        </div>
      </div>

      <ProposalPreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        proposalNumber="WR-PROP-XXXX-0001"
        date={proposalDate}
        validUntil={validUntil}
        entity={selectedEntity}
        entityType={entityType}
        items={items.map((item, idx) => ({
          ...item,
          index: idx + 1,
          serviceName: item.name,
        }))}
        subtotal={subtotal}
        discount={discount}
        tax={tax}
        taxAmount={taxAmount}
        total={total}
        notes={notes}
        terms={terms}
      />
    </div>
  );
}

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  proposalNumber: string;
  date: string;
  validUntil: string;
  entity: LookupEntity | undefined;
  entityType: "lead" | "client";
  items: { id: string; name: string; serviceName: string; quantity: number; price: number; total: number; index: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  taxAmount: number;
  total: number;
  notes: string;
  terms: string;
}

function ProposalPreviewDialog({
  open,
  onClose,
  proposalNumber,
  date,
  validUntil,
  entity,
  entityType,
  items,
  subtotal,
  discount,
  tax,
  taxAmount,
  total,
  notes,
  terms,
}: PreviewDialogProps) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Proposal ${proposalNumber}</title>
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
      <h1>WhiteRose</h1>
      <p>Technology Solutions</p>
    </div>
    <div class="proposal-info">
      <h2>PROPOSAL</h2>
      <p><strong>${proposalNumber}</strong></p>
      <p>Date: ${date}</p>
      ${validUntil ? `<p>Valid Until: ${validUntil}</p>` : ""}
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
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => `
        <tr>
          <td>${item.index}</td>
          <td>${item.name}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">₹${item.price.toLocaleString("en-IN")}</td>
          <td class="text-right">₹${item.total.toLocaleString("en-IN")}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString("en-IN")}</span></div>
      ${discount > 0 ? `<div class="totals-row"><span>Discount</span><span>-₹${discount.toLocaleString("en-IN")}</span></div>` : ""}
      ${tax > 0 ? `<div class="totals-row"><span>Tax (${tax}%)</span><span>₹${taxAmount.toLocaleString("en-IN")}</span></div>` : ""}
      <div class="totals-row total"><span>Grand Total</span><span>₹${total.toLocaleString("en-IN")}</span></div>
    </div>
  </div>

  ${notes ? `
  <div class="section" style="margin-top: 30px;">
    <h3>Notes</h3>
    <p class="notes">${notes}</p>
  </div>
  ` : ""}

  ${terms ? `
  <div class="section">
    <h3>Terms & Conditions</h3>
    <p class="terms">${terms}</p>
  </div>
  ` : ""}
</body>
</html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proposal Preview</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          <div className="mb-6 flex items-start justify-between border-b-2 border-rose-700 pb-4">
            <div>
              <h1 className="text-xl font-bold text-rose-700">WhiteRose</h1>
              <p className="text-xs text-slate-500">Technology Solutions</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold">PROPOSAL</h2>
              <p className="text-sm font-medium">{proposalNumber}</p>
              <p className="text-xs text-slate-500">Date: {formatDate(date)}</p>
              {validUntil && (
                <p className="text-xs text-slate-500">Valid Until: {formatDate(validUntil)}</p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-700">Prepared For</h3>
            {entity ? (
              <div className="text-sm">
                <p className="font-semibold">{entity.businessName}</p>
                <p className="text-slate-600">{entity.contactPerson}</p>
                {entity.address && <p className="text-slate-500">{entity.address}</p>}
                {entity.mobile && <p className="text-slate-500">Phone: {entity.mobile}</p>}
                {entity.email && <p className="text-slate-500">Email: {entity.email}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No {entityType} selected</p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-700">Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[60px]">Qty</TableHead>
                  <TableHead className="text-right w-[100px]">Price</TableHead>
                  <TableHead className="text-right w-[100px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-slate-400">{item.index}</TableCell>
                    <TableCell>{item.name || <span className="text-slate-300 italic">No description</span>}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatINR(item.price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatINR(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mb-6 flex justify-end">
            <div className="w-[280px] space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-red-600">-{formatINR(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax ({tax}%)</span>
                  <span>{formatINR(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold dark:border-slate-700">
                <span>Grand Total</span>
                <span className="text-lg">{formatINR(total)}</span>
              </div>
            </div>
          </div>

          {notes && (
            <div className="mb-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose-700">Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{notes}</p>
            </div>
          )}
          {terms && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose-700">Terms & Conditions</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{terms}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint}>Print / Save PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
