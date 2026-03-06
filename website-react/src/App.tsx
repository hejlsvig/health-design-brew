import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { initSEO } from '@/lib/seo'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Calculator from '@/pages/Calculator'
import Recipes from '@/pages/Recipes'
import Blog from '@/pages/Blog'
import BlogPost from '@/pages/BlogPost'
import Login from '@/pages/Login'
import Profile from '@/pages/Profile'
import Guides from '@/pages/Guides'
import GuidePost from '@/pages/GuidePost'
import About from '@/pages/About'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import NotFound from '@/pages/NotFound'

// Lazy-load admin pages (they use Tiptap which may not be installed yet)
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'))
const AdminBlog = lazy(() => import('@/pages/AdminBlog'))
const AdminRecipes = lazy(() => import('@/pages/AdminRecipes'))
const AdminUsers = lazy(() => import('@/pages/AdminUsers'))
const AdminHomepage = lazy(() => import('@/pages/AdminHomepage'))
const AdminSettings = lazy(() => import('@/pages/AdminSettings'))
const AdminGuides = lazy(() => import('@/pages/AdminGuides'))
const AdminAbout = lazy(() => import('@/pages/AdminAbout'))
const AdminPrivacy = lazy(() => import('@/pages/AdminPrivacy'))
const AdminTerms = lazy(() => import('@/pages/AdminTerms'))
const AdminCRM = lazy(() => import('@/pages/AdminCRM'))
const AdminCRMDetail = lazy(() => import('@/pages/AdminCRMDetail'))
const AdminSocialPublisher = lazy(() => import('@/pages/AdminSocialPublisher'))

const AdminFallback = (
  <div className="container py-20 text-center text-muted-foreground">Loading…</div>
)

export default function App() {
  // Load SEO config (site URL, GA, etc.) from database on boot
  useEffect(() => { initSEO() }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
      <SubscriptionProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/guides/:slug" element={<GuidePost />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route
              path="/admin"
              element={<Suspense fallback={AdminFallback}><AdminDashboard /></Suspense>}
            />
            <Route
              path="/admin/blog"
              element={<Suspense fallback={AdminFallback}><AdminBlog /></Suspense>}
            />
            <Route
              path="/admin/recipes"
              element={<Suspense fallback={AdminFallback}><AdminRecipes /></Suspense>}
            />
            <Route
              path="/admin/guides"
              element={<Suspense fallback={AdminFallback}><AdminGuides /></Suspense>}
            />
            <Route
              path="/admin/about"
              element={<Suspense fallback={AdminFallback}><AdminAbout /></Suspense>}
            />
            <Route
              path="/admin/privacy"
              element={<Suspense fallback={AdminFallback}><AdminPrivacy /></Suspense>}
            />
            <Route
              path="/admin/terms"
              element={<Suspense fallback={AdminFallback}><AdminTerms /></Suspense>}
            />
            <Route
              path="/admin/homepage"
              element={<Suspense fallback={AdminFallback}><AdminHomepage /></Suspense>}
            />
            <Route
              path="/admin/users"
              element={<Suspense fallback={AdminFallback}><AdminUsers /></Suspense>}
            />
            <Route
              path="/admin/settings"
              element={<Suspense fallback={AdminFallback}><AdminSettings /></Suspense>}
            />
            <Route
              path="/admin/social-publisher"
              element={<Suspense fallback={AdminFallback}><AdminSocialPublisher /></Suspense>}
            />
            <Route
              path="/admin/social-publisher/callback"
              element={<Suspense fallback={AdminFallback}><AdminSocialPublisher /></Suspense>}
            />
            <Route
              path="/admin/crm"
              element={<Suspense fallback={AdminFallback}><AdminCRM /></Suspense>}
            />
            <Route
              path="/admin/crm/:userId"
              element={<Suspense fallback={AdminFallback}><AdminCRMDetail /></Suspense>}
            />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
