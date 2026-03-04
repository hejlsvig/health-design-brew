import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import CookieBanner from './CookieBanner'
import ChatWidget from './ChatWidget'
import { CookieConsentProvider } from '@/contexts/CookieConsentContext'
import { initAnalytics } from '@/lib/analytics'

export default function Layout() {
  // Initialize analytics (consent-gated)
  useEffect(() => {
    initAnalytics()
  }, [])

  return (
    <CookieConsentProvider>
      <div className="min-h-screen flex flex-col bg-charcoal">
        {/* Boxed layout — entire site maxes out at 1440px and centers on ultra-wide screens */}
        <div className="relative w-full max-w-[1440px] mx-auto min-h-screen flex flex-col bg-background shadow-2xl">
          {/* Background overlays for texture */}
          <div className="absolute inset-0 overlay-dots opacity-[0.02] pointer-events-none z-0" />
          <div className="absolute inset-0 overlay-grain opacity-[0.015] pointer-events-none z-0 overflow-hidden" />

          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <Outlet />
            </main>
            <Footer />
          </div>
        </div>

        {/* Chat widget — floating bottom-right */}
        <ChatWidget />

        {/* Cookie consent banner — full viewport width, above everything */}
        <CookieBanner />
      </div>
    </CookieConsentProvider>
  )
}
