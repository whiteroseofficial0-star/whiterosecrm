import { TasksPage } from "@/components/tasks/tasks-page";
import { requirePageAccess } from "@/lib/access";

export default async function TasksRoute() {
  await requirePageAccess("/tasks");
  return <TasksPage />;
}
