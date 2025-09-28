import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Login from "./pages/Login";
import Cadastrar from "./pages/Cadastrar";
import Dashboard from "./pages/Dashboard";
import MeusProdutos from "./pages/MeusProdutos";
import Produto from "./pages/Produto";
import Ofertas from "./pages/Ofertas";
import Perfil from "./pages/Perfil";
import Conquistas from "./pages/Conquistas";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminProdutos from "./pages/admin/AdminProdutos";
import AdminUpsells from "./pages/admin/AdminUpsells";
import AdminRelatorios from "./pages/admin/AdminRelatorios";
import AdminWebhooks from "./pages/admin/AdminWebhooks";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastrar" element={<Cadastrar />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/meus-produtos" element={
              <ProtectedRoute>
                <MeusProdutos />
              </ProtectedRoute>
            } />
            <Route path="/produto/:slug" element={
              <ProtectedRoute>
                <Produto />
              </ProtectedRoute>
            } />
            <Route path="/ofertas" element={
              <ProtectedRoute>
                <Ofertas />
              </ProtectedRoute>
            } />
            <Route path="/perfil" element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            } />
            <Route path="/conquistas" element={
              <ProtectedRoute>
                <Conquistas />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes - ESTRUTURA CORRIGIDA */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/usuarios" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminUsuarios />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/produtos" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminProdutos />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/upsells" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminUpsells />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/relatorios" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminRelatorios />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/webhooks" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminWebhooks />
                </AdminRoute>
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
