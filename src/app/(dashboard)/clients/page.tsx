import { ClientsPage } from "@/components/clients/clients-page";
import { requirePageAccess } from "@/lib/access";

export default async function ClientsRoute() {
  await requirePageAccess("/clients");
  return <ClientsPage />;
}
