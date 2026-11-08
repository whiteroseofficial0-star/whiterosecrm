import { FollowUpsPage } from "@/components/followups/follow-ups-page";
import { requirePageAccess } from "@/lib/access";

export default async function FollowUpsRoute() {
  await requirePageAccess("/follow-ups");
  return <FollowUpsPage />;
}
