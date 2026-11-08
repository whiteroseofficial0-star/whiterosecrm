import { ReportsPage } from "@/components/reports/reports-page";
import { requirePageAccess } from "@/lib/access";

export default async function ReportsPageWrapper() {
  await requirePageAccess("/reports");
  return <ReportsPage />;
}
