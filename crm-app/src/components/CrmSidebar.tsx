import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  BarChart3,
  UtensilsCrossed,
  Zap,
  Mail,
  Workflow,
  UserCog,
  Settings,
  Wrench,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  labelKey: string
  adminOnly?: boolean
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/leads', icon: Users, labelKey: 'nav.leads' },
  { to: '/coaching', icon: HeartPulse, labelKey: 'nav.coaching' },
  { to: '/checkins', icon: ClipboardCheck, labelKey: 'nav.checkins' },
  { to: '/analytics', icon: BarChart3, labelKey: 'nav.analytics' },
  { to: '/mealplans', icon: UtensilsCrossed, labelKey: 'nav.mealplans' },
  {
    to: '#automation',
    icon: Zap,
    labelKey: 'nav.automation',
    children: [
      { to: '/flows', icon: Workflow, labelKey: 'nav.flows' },
      { to: '/emails', icon: Mail, labelKey: 'nav.emails' },
      { to: '/newsletter', icon: Newspaper, labelKey: 'nav.newsletter' },
    ],
  },
  {
    to: '#setup',
    icon: Wrench,
    labelKey: 'nav.setup',
    children: [
      { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
      { to: '/users', icon: UserCog, labelKey: 'nav.users', adminOnly: true },
    ],
  },
]

export function CrmSidebar() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const location = useLocation()
  const { collapsed, toggle: toggleCollapsed } = useSidebar()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand group if a child route is currently active
    const expanded = new Set<string>()
    for (const item of navItems) {
      if (item.children?.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + '/'))) {
        expanded.add(item.to)
      }
    }
    return expanded
  })

  function toggleGroup(to: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(to)) next.delete(to)
      else next.add(to)
      return next
    })
  }

  // Check if any child route is active
  function isGroupActive(item: NavItem): boolean {
    // For dropdown-only parents (to starts with #), only check children
    if (item.to.startsWith('#')) {
      return item.children?.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + '/')) ?? false
    }
    if (location.pathname === item.to || location.pathname.startsWith(item.to + '/')) return true
    return item.children?.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + '/')) ?? false
  }

  // Filter out admin-only items
  function filterItems(items: NavItem[]): NavItem[] {
    return items
      .filter((item) => !item.adminOnly || isAdmin)
      .map((item) => {
        if (item.children) {
          return { ...item, children: item.children.filter((c) => !c.adminOnly || isAdmin) }
        }
        return item
      })
  }

  const filteredItems = filterItems(navItems)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 bg-sidebar text-sidebar-foreground flex flex-col z-30 transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Brand */}
      <div className="h-16 flex items-center px-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">CRM</span>
          </div>
          {!collapsed && (
            <span className="font-serif text-lg text-white tracking-wide truncate">
              {t('app.name')}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0
            const isExpanded = expandedGroups.has(item.to)
            const groupActive = isGroupActive(item)

            return (
              <li key={item.to}>
                {hasChildren ? (
                  <>
                    {/* Parent with children — click toggles dropdown */}
                    <button
                      onClick={() => toggleGroup(item.to)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        groupActive
                          ? 'bg-sidebar-active text-white'
                          : 'text-sidebar-foreground hover:bg-white/10 hover:text-white'
                      )}
                      title={collapsed ? t(item.labelKey) : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate flex-1 text-left">{t(item.labelKey)}</span>
                          <ChevronDown
                            className={cn(
                              'w-4 h-4 transition-transform duration-200 flex-shrink-0',
                              isExpanded && 'rotate-180'
                            )}
                          />
                        </>
                      )}
                    </button>

                    {/* Children */}
                    {!collapsed && isExpanded && (
                      <ul className="mt-0.5 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                        {item.children!.map((child) => (
                          <li key={child.to}>
                            <NavLink
                              to={child.to}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                                  isActive
                                    ? 'bg-sidebar-active text-white font-medium'
                                    : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-white'
                                )
                              }
                            >
                              <child.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{t(child.labelKey)}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  /* Regular nav item */
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
                    title={collapsed ? t(item.labelKey) : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                  </NavLink>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse toggle + footer */}
      <div className="border-t border-white/10">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sidebar-foreground/60 hover:text-white hover:bg-white/5 transition-colors"
          title={collapsed ? 'Udvid menu' : 'Minimer menu'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Minimer</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

/** Export collapsed state width for layout */
export const SIDEBAR_WIDTH = 256 // w-64
export const SIDEBAR_COLLAPSED_WIDTH = 64 // w-16
