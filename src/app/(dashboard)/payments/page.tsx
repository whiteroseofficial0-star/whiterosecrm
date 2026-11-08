import { PaymentsPage } from "@/components/payments/payments-page";
import { requirePageAccess } from "@/lib/access";

export default async function PaymentsRoute() {
  await requirePageAccess("/payments");
  return <PaymentsPage />;
}
