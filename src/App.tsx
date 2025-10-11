
import { TooltipProvider } from "@/components/ui/tooltip";

import { Routes, Route, Navigate } from "react-router-dom";
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
import Users from "./pages/Users";
import Clients from "./pages/Clients";
import Products from "./pages/Products";
import Services from "./pages/Services";
import Status from "./pages/Status";
import Modulos from "./pages/Modulos";
import Areas from "./pages/Areas";
import Categorias from "./pages/Categorias";
import TeamManagement from "./pages/TeamManagement";
import TeamAddMembers from "./pages/TeamAddMembers";
import NotFound from "./pages/NotFound";



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
            <div className="p-6">Calendar page - Em desenvolvimento</div>
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
        path="/users" 
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/clients" 
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/products" 
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services" 
        element={
          <ProtectedRoute>
            <Services />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/status" 
        element={
          <ProtectedRoute>
            <Status />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/modulos" 
        element={
          <ProtectedRoute>
            <Modulos />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/areas" 
        element={
          <ProtectedRoute>
            <Areas />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/categorias" 
        element={
          <ProtectedRoute>
            <Categorias />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <div className="p-6">Settings page - Em desenvolvimento</div>
          </ProtectedRoute>
        } 
      />
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
