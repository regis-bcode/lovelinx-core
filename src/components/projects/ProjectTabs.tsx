import { TAPDetails } from './TAPDetails';

interface ProjectTabsProps {
  projectId: string;
}

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  return <TAPDetails projectId={projectId} />;
}