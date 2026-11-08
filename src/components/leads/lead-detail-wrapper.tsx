"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { LeadDetail } from "./lead-detail";
import { LeadForm } from "./lead-form";

export function LeadDetailWrapper({ leadId }: { leadId: string }) {
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("edit") === "true";

  if (isEdit) {
    return <EditLead leadId={leadId} />;
  }

  return <LeadDetail leadId={leadId} />;
}

function EditLead({ leadId }: { leadId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [initialData, setInitialData] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    async function fetchLead() {
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) throw new Error("Failed to fetch lead");
        const data = await res.json();
        setInitialData({
          businessName: data.businessName,
          contactPerson: data.contactPerson,
          position: data.position ?? "",
          mobile: data.mobile,
          alternateMobile: data.alternateMobile ?? "",
          whatsapp: data.whatsapp ?? "",
          email: data.email ?? "",
          website: data.website ?? "",
          instagram: data.instagram ?? "",
          address: data.address ?? "",
          areaId: data.areaId ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          pinCode: data.pinCode ?? "",
          googleMapsUrl: data.googleMapsUrl ?? "",
          industryId: data.industryId ?? "",
          customIndustry: data.customIndustry ?? "",
          sourceId: data.sourceId ?? "",
          status: data.status,
          priority: data.priority,
          dealValue: data.dealValue ?? "",
          probability: data.probability?.toString() ?? "",
          expectedCloseDate: data.expectedCloseDate
            ? new Date(data.expectedCloseDate).toISOString().split("T")[0]
            : "",
          notes: "",
          visitingCardUrl: data.visitingCardUrl ?? "",
          assignedToId: data.assignedToId ?? "",
          serviceIds: data.services?.map((s: { serviceId: string }) => s.serviceId) ?? [],
        });
      } catch {
        // Redirect back on error
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return <LeadForm leadId={leadId} initialData={initialData as Record<string, unknown>} />;
}
