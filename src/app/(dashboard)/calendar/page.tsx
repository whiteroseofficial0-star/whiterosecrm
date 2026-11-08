import { CalendarPage } from "@/components/calendar/calendar-page";
import { requirePageAccess } from "@/lib/access";

export default async function CalendarRoute() {
  await requirePageAccess("/calendar");
  return <CalendarPage />;
}
