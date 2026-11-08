import { TeamPage } from "@/components/team/team-page";
import { requirePageAccess } from "@/lib/access";

export default async function TeamPageWrapper() {
  await requirePageAccess("/team");
  return <TeamPage />;
}
