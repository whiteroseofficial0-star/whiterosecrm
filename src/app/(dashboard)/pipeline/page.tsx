import { KanbanBoard } from "@/components/leads/kanban-board";
import { requirePageAccess } from "@/lib/access";

export default async function PipelinePage() {
  await requirePageAccess("/pipeline");
  return (
    <div className="p-4 md:p-6">
      <KanbanBoard />
    </div>
  );
}
