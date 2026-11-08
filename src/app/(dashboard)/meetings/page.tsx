import { MeetingsPage } from "@/components/meetings/meetings-page";
import { requirePageAccess } from "@/lib/access";

export default async function MeetingsRoute() {
  await requirePageAccess("/meetings");
  return <MeetingsPage />;
}
