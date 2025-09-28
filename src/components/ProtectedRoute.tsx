import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 ProtectedRoute: Usuário não encontrado, redirecionando para login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !user.is_admin) {
    console.log('🚫 ProtectedRoute: Usuário não é admin:', { 
      requireAdmin, 
      userIsAdmin: user.is_admin, 
      userEmail: user.email,
      path: location.pathname 
    });
    return <Navigate to="/" replace />;
  }

  console.log('✅ ProtectedRoute: Acesso permitido para:', location.pathname, { 
    requireAdmin, 
    userIsAdmin: user.is_admin 
  });
  return <>{children}</>;
}