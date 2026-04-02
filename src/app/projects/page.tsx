import { getPublishedProjects } from '@/lib/notion';
import ProjectsPageClient from './ProjectsPageClient';

export default async function ProjectsPage() {
  const projects = await getPublishedProjects();
  return <ProjectsPageClient projects={projects} />;
}
