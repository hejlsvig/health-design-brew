import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { CrmLayout } from '@/components/CrmLayout'

// Eager load
import Login from '@/pages/Login'

// Lazy load CRM pages
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Leads = lazy(() => import('@/pages/Leads'))
const LeadDetail = lazy(() => import('@/pages/LeadDetail'))
const Coaching = lazy(() => import('@/pages/Coaching'))
const CoachingDetail = lazy(() => import('@/pages/CoachingDetail'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const FlowsPage = lazy(() => import('@/pages/Flows'))
const EmailsPage = lazy(() => import('@/pages/Emails'))
const Notes = lazy(() => import('@/pages/Notes'))
const CrmUsers = lazy(() => import('@/pages/CrmUsers'))
const CrmSettings = lazy(() => import('@/pages/CrmSettings'))
const Newsletter = lazy(() => import('@/pages/Newsletter'))
const ComingSoon = lazy(() => import('@/pages/ComingSoon'))

const LoadingFallback = (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
        <Suspense fallback={LoadingFallback}>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected CRM routes */}
            <Route element={<CrmLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/coaching" element={<Coaching />} />
              <Route path="/coaching/:id" element={<CoachingDetail />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/mealplans" element={<ComingSoon title="mealplans" />} />
              <Route path="/flows" element={<FlowsPage />} />
              <Route path="/emails" element={<EmailsPage />} />
              <Route path="/newsletter" element={<Newsletter />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/users" element={<CrmUsers />} />
              <Route path="/settings" element={<CrmSettings />} />
            </Route>
          </Routes>
        </Suspense>
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
