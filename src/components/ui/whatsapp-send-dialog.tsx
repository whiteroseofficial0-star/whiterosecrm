"use client";

import * as React from "react";
import { Send, MessageSquare, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  message: string;
  isActive?: boolean;
}

interface WhatsAppSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientMobile: string;
  recipientCompany?: string;
  salespersonName?: string;
  templates?: WhatsAppTemplate[];
}

function personalizeMessage(
  template: string,
  vars: Record<string, string>
): string {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return msg;
}

export function WhatsAppSendDialog({
  open,
  onOpenChange,
  recipientName,
  recipientMobile,
  recipientCompany,
  salespersonName,
  templates = [],
}: WhatsAppSendDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [customMessage, setCustomMessage] = React.useState("");
  const [isCustom, setIsCustom] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const variables: Record<string, string> = {
    name: recipientName,
    company: recipientCompany ?? recipientName,
    salesperson: salespersonName ?? "WhiteRose Team",
  };

  const finalMessage = React.useMemo(() => {
    if (isCustom) return customMessage;
    if (selectedTemplate) {
      return personalizeMessage(selectedTemplate.message, variables);
    }
    return "";
  }, [isCustom, customMessage, selectedTemplate, variables]);

  const cleanedMobile = recipientMobile.replace(/[^0-9]/g, "");

  const handleSend = () => {
    if (!finalMessage.trim()) {
      toast.error("Please select a template or write a message");
      return;
    }
    const encoded = encodeURIComponent(finalMessage);
    window.open(`https://wa.me/${cleanedMobile}?text=${encoded}`, "_blank");
    toast.success("Opening WhatsApp...");
    onOpenChange(false);
  };

  const handleCopy = async () => {
    if (!finalMessage.trim()) return;
    await navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    toast.success("Message copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedTemplateId("");
      setCustomMessage("");
      setIsCustom(false);
      setCopied(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Send WhatsApp Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {recipientName}
            </p>
            <p className="text-xs text-slate-500 font-mono">
              {recipientMobile}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Message Template</Label>
            <div className="flex gap-2">
              <Button
                variant={!isCustom ? "default" : "outline"}
                size="sm"
                onClick={() => setIsCustom(false)}
              >
                Template
              </Button>
              <Button
                variant={isCustom ? "default" : "outline"}
                size="sm"
                onClick={() => setIsCustom(true)}
              >
                Custom Message
              </Button>
            </div>
          </div>

          {!isCustom && (
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No templates available
                    </SelectItem>
                  ) : (
                    templates
                      .filter((t) => t.isActive)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <span>{t.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {t.category}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {isCustom && (
            <div className="space-y-2">
              <Label>Custom Message</Label>
              <Textarea
                placeholder="Type your WhatsApp message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
              />
            </div>
          )}

          {finalMessage && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">
                  {finalMessage}
                </p>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                <span>Variables:</span>
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                  {"{{name}}"} → {recipientName}
                </code>
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                  {"{{company}}"} → {recipientCompany ?? recipientName}
                </code>
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                  {"{{salesperson}}"} → {salespersonName ?? "WhiteRose Team"}
                </code>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!finalMessage.trim()}
          >
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!finalMessage.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="mr-2 h-4 w-4" />
            Open in WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
