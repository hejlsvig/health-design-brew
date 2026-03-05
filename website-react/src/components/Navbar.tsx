import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flame, Search, Menu, X, ChevronDown, Settings, Share2, Target } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const languages = [
  { code: 'da', label: 'DA' },
  { code: 'se', label: 'SV' },
  { code: 'en', label: 'EN' },
]

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { user, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/recipes', label: t('nav.recipes') },
    { to: '/guides', label: t('nav.guides') },
    { to: '/blog', label: t('nav.blog') },
    { to: '/calculator', label: t('nav.calculator') },
  ]

  const isActive = (path: string) => location.pathname === path

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    setLangOpen(false)
  }

  const currentLang = languages.find(l => l.code === i18n.language) || languages[2]

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-accent" />
          <span className="font-sans text-xl font-bold tracking-tight text-primary uppercase">
            Shifting Source
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'transition-colors hover:text-foreground',
                isActive(link.to) ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{currentLang.label}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors',
                        i18n.language === lang.code && 'text-primary font-semibold'
                      )}
                    >
                      <span className="font-mono text-xs w-5">{lang.label}</span>
                      {t(`languages.${lang.code}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Search */}
          {searchOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('nav.search')}
                className="h-8 w-40 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
              />
              <button onClick={() => setSearchOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
            </button>
          )}

          {/* Auth */}
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    className="text-sm text-accent font-medium hover:text-accent/80 transition-colors"
                  >
                    {t('nav.admin')}
                  </Link>
                  <Link
                    to="/admin/crm"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="CRM"
                  >
                    <Target className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/admin/social-publisher"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Social Publisher"
                  >
                    <Share2 className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/admin/settings"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </>
              )}
              <Link
                to="/profile"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.profile')}
              </Link>
              <button
                onClick={signOut}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:inline-flex h-8 items-center px-4 rounded-md bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/90 transition-colors"
            >
              {t('nav.login')}
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden text-muted-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container py-4 flex flex-col gap-3">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'text-sm font-medium py-2 transition-colors',
                  isActive(link.to) ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-border" />
            {user ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-sm text-accent font-medium py-2">
                      {t('nav.admin')}
                    </Link>
                    <Link to="/admin/crm" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground py-2 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      CRM
                    </Link>
                    <Link to="/admin/social-publisher" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground py-2 flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5" />
                      Social Publisher
                    </Link>
                    <Link to="/admin/settings" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground py-2 flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                  </>
                )}
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="text-sm text-muted-foreground py-2">
                  {t('nav.profile')}
                </Link>
                <button onClick={() => { signOut(); setMobileOpen(false) }} className="text-sm text-muted-foreground py-2 text-left">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-md bg-accent text-accent-foreground text-sm font-bold"
              >
                {t('nav.login')}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
