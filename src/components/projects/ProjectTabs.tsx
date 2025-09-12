import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Users, Settings, BarChart3, CheckSquare, MessageSquare, AlertTriangle } from 'lucide-react';
import { useTAP } from '@/hooks/useTAP';
import { useCommunicationPlan } from '@/hooks/useCommunicationPlan';
import { useStakeholders } from '@/hooks/useStakeholders';
import { useRisks } from '@/hooks/useRisks';
import { useTasks } from '@/hooks/useTasks';
import { useTeams } from '@/hooks/useTeams';
import { TaskList } from './TaskList';
import { TAPDetails } from './TAPDetails';
import { TeamsManager } from './TeamsManager';

interface ProjectTabsProps {
  projectId: string;
}

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const { tap } = useTAP(projectId);
  const { communicationPlans } = useCommunicationPlan(projectId);
  const { stakeholders } = useStakeholders(projectId);
  const { risks } = useRisks(projectId);
  const { tasks } = useTasks(projectId);
  const { teams } = useTeams(projectId);

  const tabs = [
    {
      value: 'tasks',
      label: 'Tarefas',
      icon: CheckSquare,
      count: tasks.length,
      content: <TaskList 
        tasks={tasks} 
        onTaskCreate={() => {}} 
        onTaskUpdate={() => {}} 
        onTaskDelete={() => {}} 
      />
    },
    {
      value: 'teams',
      label: 'Equipe',
      icon: Users,
      count: teams.length,
      content: <TeamsManager projectId={projectId} />
    },
    {
      value: 'tap',
      label: 'TAP',
      icon: FileText,
      count: tap ? 1 : 0,
      content: <TAPDetails projectId={projectId} />
    },
    {
      value: 'communication',
      label: 'Comunicação',
      icon: MessageSquare,
      count: communicationPlans.length,
      content: <div className="text-center py-12 text-muted-foreground">Planos de comunicação serão implementados em breve</div>
    },
    {
      value: 'stakeholders',
      label: 'Stakeholders',
      icon: Users,
      count: stakeholders.length,
      content: <div className="text-center py-12 text-muted-foreground">Stakeholders serão implementados em breve</div>
    },
    {
      value: 'risks',
      label: 'Riscos',
      icon: AlertTriangle,
      count: risks.length,
      content: <div className="text-center py-12 text-muted-foreground">Riscos serão implementados em breve</div>
    },
    {
      value: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      count: 0,
      content: <div className="text-center py-12 text-muted-foreground">Analytics serão implementados em breve</div>
    },
    {
      value: 'calendar',
      label: 'Cronograma',
      icon: Calendar,
      count: 0,
      content: <div className="text-center py-12 text-muted-foreground">Cronograma será implementado em breve</div>
    }
  ];

  return (
    <Card className="w-full shadow-lg border-0 bg-card/50 backdrop-blur-sm">
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-2 bg-muted/30 rounded-xl border border-border/40">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative flex flex-col items-center gap-1.5 py-3 px-2 text-xs font-medium transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md hover:bg-background/60 hover:text-primary/80 hover:scale-105 rounded-lg"
            >
              <div className="flex items-center gap-1.5">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">{tab.label}</span>
              </div>
              {tab.count > 0 && (
                <Badge variant="secondary" className="text-xs h-5 min-w-5 rounded-full bg-primary/10 text-primary border-0">
                  {tab.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="p-6">
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0 focus-visible:outline-none">
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </Card>
  );
}