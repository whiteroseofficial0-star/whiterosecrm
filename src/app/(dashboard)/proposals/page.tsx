import { ProposalsPage } from "@/components/proposals/proposals-page";
import { requirePageAccess } from "@/lib/access";

export default async function ProposalsListPage() {
  await requirePageAccess("/proposals");
  return <ProposalsPage />;
}
