import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useFolders } from "@/hooks/useFolders";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

export function TestUpdateDialog() {
  const { workspaces, updateWorkspace } = useWorkspaces();
  const { folders, updateFolder } = useFolders(workspaces[0]?.id);
  const { projects, updateProject } = useProjects();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const testUpdates = async () => {
    setTesting(true);
    
    try {
      // Test workspace update
      if (workspaces.length > 0) {
        const testWorkspace = workspaces[0];
        const originalName = testWorkspace.nome;
        const testName = `TEST_${Date.now()}`;
        
        console.log('Testing workspace update:', testWorkspace.id, testName);
        const updatedWorkspace = await updateWorkspace(testWorkspace.id, { nome: testName });
        
        if (updatedWorkspace) {
          console.log('Workspace updated successfully:', updatedWorkspace);
          // Revert back
          await updateWorkspace(testWorkspace.id, { nome: originalName });
          console.log('Workspace reverted successfully');
        } else {
          console.error('Failed to update workspace');
        }
      }

      // Test folder update
      if (folders.length > 0) {
        const testFolder = folders[0];
        const originalName = testFolder.nome;
        const testName = `TEST_FOLDER_${Date.now()}`;
        
        console.log('Testing folder update:', testFolder.id, testName);
        const updatedFolder = await updateFolder(testFolder.id, { nome: testName });
        
        if (updatedFolder) {
          console.log('Folder updated successfully:', updatedFolder);
          // Revert back
          await updateFolder(testFolder.id, { nome: originalName });
          console.log('Folder reverted successfully');
        } else {
          console.error('Failed to update folder');
        }
      }

      // Test project update
      if (projects.length > 0) {
        const testProject = projects[0];
        const originalName = testProject.nome_projeto;
        const testName = `TEST_PROJECT_${Date.now()}`;
        
        console.log('Testing project update:', testProject.id, testName);
        const updatedProject = await updateProject(testProject.id, { nome_projeto: testName });
        
        if (updatedProject) {
          console.log('Project updated successfully:', updatedProject);
          // Revert back
          await updateProject(testProject.id, { nome_projeto: originalName });
          console.log('Project reverted successfully');
        } else {
          console.error('Failed to update project');
        }
      }

      toast({
        title: "Teste concluído",
        description: "Verifique o console para detalhes dos testes de update no Supabase.",
      });

    } catch (error) {
      console.error('Error during testing:', error);
      toast({
        title: "Erro no teste",
        description: "Ocorreu um erro durante o teste. Verifique o console.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Testar Updates Supabase
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Testar Updates no Supabase</DialogTitle>
          <DialogDescription>
            Este teste irá verificar se os updates de workspaces, folders e projects estão funcionando corretamente no Supabase.
            Os nomes serão temporariamente alterados e depois revertidos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm">
            <p><strong>Workspaces:</strong> {workspaces.length}</p>
            <p><strong>Folders:</strong> {folders.length}</p>
            <p><strong>Projects:</strong> {projects.length}</p>
          </div>
          
          <Button 
            onClick={testUpdates} 
            disabled={testing || (workspaces.length === 0 && folders.length === 0 && projects.length === 0)}
            className="w-full"
          >
            {testing ? "Testando..." : "Executar Teste"}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Abra o console do navegador (F12) para ver os logs detalhados dos testes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}