import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuth()
  const [checkComplete, setCheckComplete] = useState(false)

  useEffect(() => {
    // Aguardar um pouco para garantir que o perfil foi carregado
    if (!loading) {
      const timer = setTimeout(() => {
        setCheckComplete(true)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [loading])

  console.log('🔐 AdminRoute check:', {
    loading,
    checkComplete,
    isAdmin: user?.is_admin,
    userEmail: user?.email,
    hasUser: !!user
  })

  // Aguardar loading E check completo
  if (loading || !checkComplete) {
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
    console.log('❌ AdminRoute: Acesso negado:', {
      hasUser: !!user,
      isAdmin: user?.is_admin,
      userEmail: user?.email
    })
    return <Navigate to="/dashboard" replace />
  }

  console.log('✅ AdminRoute: Acesso permitido para:', user.email)
  return <>{children}</>
}