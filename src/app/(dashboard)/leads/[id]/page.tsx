import { Suspense } from "react";
import { LeadDetailWrapper } from "@/components/leads/lead-detail-wrapper";
import { requirePageAccess } from "@/lib/access";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess("/leads");
  const { id } = await params;
  return (
    <div className="p-4 md:p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
          </div>
        }
      >
        <LeadDetailWrapper leadId={id} />
      </Suspense>
    </div>
  );
}
