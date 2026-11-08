import { LeadsList } from "@/components/leads/leads-list";
import { requirePageAccess } from "@/lib/access";

export default async function LeadsPage() {
  await requirePageAccess("/leads");
  return <LeadsList />;
}
