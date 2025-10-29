
import { TooltipProvider } from "@/components/ui/tooltip";

import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Folders from "./pages/Folders";
import FolderProjects from "./pages/FolderProjects";
import Projects from "./pages/Projects";
import ProjectsNew from "./pages/ProjectsNew";
import ProjectDetails from "./pages/ProjectDetails";
import ProjectOnePage from "./pages/ProjectOnePage";
import TaskManagementPage from "./pages/TaskManagement";
import Users from "./pages/Users";
import AuditLogsPage from "./pages/audit-logs";
import Clients from "./pages/Clients";
import Products from "./pages/Products";
import Services from "./pages/Services";
import Status from "./pages/Status";
import Modulos from "./pages/Modulos";
import Areas from "./pages/Areas";
import Categorias from "./pages/Categorias";
import ProjectStages from "./pages/ProjectStages";
import Settings from "./pages/Settings";
import TeamManagement from "./pages/TeamManagement";
import TeamAddMembers from "./pages/TeamAddMembers";
import NotFound from "./pages/NotFound";
import CalendarPage from "./pages/CalendarPage";



// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ProjectTasksRedirect() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  if (!id) {
    return <Navigate to="/projects-tap" replace />;
  }

  const params = new URLSearchParams(location.search);
  params.set("tab", "tasks");

  const search = params.toString();
  const target = `/projects-tap/${id}${search ? `?${search}` : ""}`;

  return <Navigate to={target} replace />;
}

function LegacyProjectRedirect() {
  const { projectId, tab } = useParams<{ projectId: string; tab?: string }>();
  const location = useLocation();

  if (!projectId) {
    return <Navigate to="/projects-tap" replace />;
  }

  const params = new URLSearchParams(location.search);
  const validTabs = new Set([
    "tap",
    "stakeholders",
    "tasks",
    "time",
    "communication",
    "risks",
    "gaps",
    "turnover",
    "documents",
  ]);

  const requestedTab = tab ?? params.get("tab") ?? undefined;
  const normalizedTab = requestedTab && validTabs.has(requestedTab) ? requestedTab : "tap";
  params.set("tab", normalizedTab);

  const search = params.toString();
  const target = `/projects-tap/${projectId}${search ? `?${search}` : ""}`;

  return <Navigate to={target} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/workspaces" 
        element={
          <ProtectedRoute>
            <Workspaces />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/workspaces/:workspaceId/folders" 
        element={
          <ProtectedRoute>
            <Folders />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/workspaces/:workspaceId/folders/:folderId/projects" 
        element={
          <ProtectedRoute>
            <FolderProjects />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/task-management"
        element={
          <ProtectedRoute>
            <TaskManagementPage />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/projects-tap" 
        element={
          <ProtectedRoute>
            <ProjectsNew />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/projects-tap/new" 
        element={
          <ProtectedRoute>
            <ProjectsNew />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/projects-tap/:id"
        element={
          <ProtectedRoute>
            <ProjectDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects-tap/:id/tasks"
        element={
          <ProtectedRoute>
            <ProjectTasksRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/tabs/:tab"
        element={
          <ProtectedRoute>
            <LegacyProjectRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/tabs"
        element={
          <ProtectedRoute>
            <LegacyProjectRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <LegacyProjectRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects-tap/:id/onepage"
        element={
          <ProtectedRoute>
            <ProjectOnePage />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/projects-tap/:id/edit" 
        element={
          <ProtectedRoute>
            <ProjectsNew />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/team" 
        element={
          <ProtectedRoute>
            <TeamManagement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/team/:teamId/add-members" 
        element={
          <ProtectedRoute>
            <TeamAddMembers />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute>
            <div className="p-6">Reports page - Em desenvolvimento</div>
          </ProtectedRoute>
        } 
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <div className="p-6">Documents page - Em desenvolvimento</div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <AuditLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/clients"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/products"
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/services"
        element={
          <ProtectedRoute>
            <Services />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/status"
        element={
          <ProtectedRoute>
            <Status />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/modulos"
        element={
          <ProtectedRoute>
            <Modulos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/areas"
        element={
          <ProtectedRoute>
            <Areas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/categorias"
        element={
          <ProtectedRoute>
            <Categorias />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/project-stages"
        element={
          <ProtectedRoute>
            <ProjectStages />
          </ProtectedRoute>
        }
      />
      <Route path="/users" element={<Navigate to="/settings/users" replace />} />
      <Route path="/clients" element={<Navigate to="/settings/clients" replace />} />
      <Route path="/products" element={<Navigate to="/settings/products" replace />} />
      <Route path="/services" element={<Navigate to="/settings/services" replace />} />
      <Route path="/status" element={<Navigate to="/settings/status" replace />} />
      <Route path="/modulos" element={<Navigate to="/settings/modulos" replace />} />
      <Route path="/areas" element={<Navigate to="/settings/areas" replace />} />
      <Route path="/categorias" element={<Navigate to="/settings/categorias" replace />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <TooltipProvider>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </TooltipProvider>
);

export default App;
