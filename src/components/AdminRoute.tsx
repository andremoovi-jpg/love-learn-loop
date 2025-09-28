import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuth()

  console.log('🔐 AdminRoute check:', {
    loading,
    isAdmin: user?.is_admin,
    userEmail: user?.email,
    hasUser: !!user
  })

  // IMPORTANTE: Aguardar o loading completo
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando permissões de administrador...</p>
        </div>
      </div>
    )
  }

  // Se não tem usuário ou não é admin, redirecionar
  if (!user || !user.is_admin) {
    console.log('❌ AdminRoute: Acesso negado - não é admin:', { 
      hasUser: !!user, 
      isAdmin: user?.is_admin,
      userEmail: user?.email 
    })
    return <Navigate to="/dashboard" replace />
  }

  console.log('✅ AdminRoute: Acesso admin permitido para:', user.email)
  return <>{children}</>
}