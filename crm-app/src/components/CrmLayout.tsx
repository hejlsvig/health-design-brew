import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { CrmSidebar } from './CrmSidebar'
import { CrmTopbar } from './CrmTopbar'
import { cn } from '@/lib/utils'

export function CrmLayout() {
  const { user, crmUser, loading } = useAuth()
  const { collapsed } = useSidebar()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && (!user || !crmUser)) {
      navigate('/login')
    }
  }, [user, crmUser, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user || !crmUser) return null

  return (
    <div className="min-h-screen flex bg-background">
      <CrmSidebar />
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-[margin] duration-200',
          collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <CrmTopbar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
