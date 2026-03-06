import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Globe } from 'lucide-react'

const languages = [
  { code: 'da', label: 'DA' },
  { code: 'en', label: 'EN' },
  { code: 'se', label: 'SE' },
]

export function CrmTopbar() {
  const { t, i18n } = useTranslation()
  const { crmUser, signOut } = useAuth()

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Left: empty or breadcrumb slot */}
      <div />

      {/* Right: language + user + logout */}
      <div className="flex items-center gap-4">
        {/* Language selector */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Globe className="w-4 h-4 text-muted-foreground mr-1" />
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                i18n.language === lang.code
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* User info */}
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {crmUser?.name || crmUser?.email || ''}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {crmUser?.role || ''}
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          className="p-2 rounded-lg text-muted-foreground hover:text-danger hover:bg-muted transition-colors"
          title={t('nav.logout')}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
