import { LeadForm } from "@/components/leads/lead-form";
import { requirePageAccess } from "@/lib/access";

export default async function NewLeadPage() {
  await requirePageAccess("/leads/new");
  return (
    <div className="p-4 md:p-6">
      <LeadForm />
    </div>
  );
}
