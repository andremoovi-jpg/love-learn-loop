import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuth()

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // User not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check admin using ONLY is_admin from useAuth - NO new database query here
  if (!user.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  // User is admin, render content
  return <>{children}</>
}
