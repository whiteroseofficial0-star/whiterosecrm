import { ProjectsPage } from "@/components/projects/projects-page";
import { requirePageAccess } from "@/lib/access";

export default async function ProjectsRoute() {
  await requirePageAccess("/projects");
  return <ProjectsPage />;
}
