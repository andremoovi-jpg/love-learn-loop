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

  console.log('🛡️ ProtectedRoute check:', {
    loading,
    user: !!user,
    userEmail: user?.email,
    isAdmin: user?.is_admin,
    requireAdmin,
    path: location.pathname
  });

  if (loading) {
    console.log('⏳ Still loading, showing spinner...');
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
    console.log('❌ No user found, redirecting to login from:', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !user.is_admin) {
    console.log('🚫 User not admin, redirecting to dashboard. User admin status:', user.is_admin);
    return <Navigate to="/dashboard" replace />;
  }

  console.log('✅ Access granted to:', location.pathname);
  return <>{children}</>;
}