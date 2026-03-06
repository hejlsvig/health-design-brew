import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  ClipboardCheck,
  UtensilsCrossed,
  Zap,
  Mail,
  StickyNote,
  UserCog,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/leads', icon: Users, labelKey: 'nav.leads' },
  { to: '/coaching', icon: HeartPulse, labelKey: 'nav.coaching' },
  { to: '/checkins', icon: ClipboardCheck, labelKey: 'nav.checkins' },
  { to: '/mealplans', icon: UtensilsCrossed, labelKey: 'nav.mealplans' },
  { to: '/automation', icon: Zap, labelKey: 'nav.automation' },
  { to: '/emails', icon: Mail, labelKey: 'nav.emails' },
  { to: '/notes', icon: StickyNote, labelKey: 'nav.notes' },
  { to: '/users', icon: UserCog, labelKey: 'nav.users', adminOnly: true },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

export function CrmSidebar() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col z-30">
      {/* Logo / Brand */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">CRM</span>
          </div>
          <span className="font-serif text-lg text-white tracking-wide">
            {t('app.name')}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {filteredItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-active text-white'
                      : 'text-sidebar-foreground hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-sidebar-foreground/50 text-center">
          Shifting Source CRM
        </p>
      </div>
    </aside>
  )
}
