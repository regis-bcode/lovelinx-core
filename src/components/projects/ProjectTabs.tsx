import { TAPDetails } from './TAPDetails';
import type { Project } from '@/types/project';

interface ProjectTabsProps {
  projectId: string;
  project?: Project | null;
}

export function ProjectTabs({ projectId, project }: ProjectTabsProps) {
  return <TAPDetails projectId={projectId} project={project} />;
}
