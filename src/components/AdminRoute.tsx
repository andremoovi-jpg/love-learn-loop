import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuth()

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Not admin - use ONLY is_admin from useAuth, no additional queries
  if (!user.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  // Is admin, render content
  return <>{children}</>
}