import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Shield, User, Search, Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  email: string
  name: string | null
  created_at: string
  role: string | null
  active: boolean | null
}

export default function AdminUsers() {
  const { t } = useTranslation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/login')
  }, [user, isAdmin, authLoading, navigate])

  useEffect(() => {
    if (isAdmin) fetchUsers()
  }, [isAdmin])

  const fetchUsers = async () => {
    setLoading(true)
    // Fetch profiles (all registered users)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })

    // Fetch crm_users (role data)
    const { data: crmUsers } = await supabase
      .from('crm_users')
      .select('id, role, active')

    const crmMap = new Map<string, { role: string; active: boolean }>()
    ;(crmUsers ?? []).forEach(cu => crmMap.set(cu.id, { role: cu.role, active: cu.active }))

    const merged: UserRow[] = (profiles ?? []).map(p => {
      const crm = crmMap.get(p.id)
      return {
        id: p.id,
        email: p.email,
        name: p.name,
        created_at: p.created_at,
        role: crm?.role ?? 'user',
        active: crm?.active ?? true,
      }
    })

    setUsers(merged)
    setLoading(false)
  }

  const toggleRole = async (userId: string, currentRole: string) => {
    if (userId === user?.id) return // Can't change own role
    setSaving(userId)
    const newRole = currentRole === 'admin' ? 'user' : 'admin'

    // Check if user exists in crm_users
    const existing = users.find(u => u.id === userId)
    if (!existing) { setSaving(null); return }

    const { error } = await supabase
      .from('crm_users')
      .upsert({
        id: userId,
        email: existing.email,
        name: existing.name || '',
        role: newRole,
        active: existing.active ?? true,
      }, { onConflict: 'id' })

    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setSaving(null)
  }

  const toggleActive = async (userId: string, currentActive: boolean) => {
    if (userId === user?.id) return
    setSaving(userId)
    const existing = users.find(u => u.id === userId)
    if (!existing) { setSaving(null); return }

    const { error } = await supabase
      .from('crm_users')
      .upsert({
        id: userId,
        email: existing.email,
        name: existing.name || '',
        role: existing.role || 'user',
        active: !currentActive,
      }, { onConflict: 'id' })

    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !currentActive } : u))
    }
    setSaving(null)
  }

  const filtered = users.filter(u => {
    if (filter === 'admin' && u.role !== 'admin') return false
    if (filter === 'user' && u.role === 'admin') return false
    if (search) {
      const q = search.toLowerCase()
      return (u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q))
    }
    return true
  })

  if (authLoading) {
    return <div className="container py-20 text-center text-muted-foreground">{t('common.loading')}</div>
  }
  if (!isAdmin) return null

  const adminCount = users.filter(u => u.role === 'admin').length
  const userCount = users.filter(u => u.role !== 'admin').length

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Admin
        </button>
      </div>

      <h1 className="font-serif text-3xl font-bold text-primary mb-2">{t('admin.usersTitle')}</h1>
      <p className="text-muted-foreground mb-6">
        {adminCount} admin{adminCount !== 1 ? 's' : ''} · {userCount} {t('admin.userFilterUsers').toLowerCase()}
      </p>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2">
          {(['all', 'admin', 'user'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-bold transition-colors',
                filter === f
                  ? 'bg-accent text-accent-foreground'
                  : 'border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {f === 'all' ? t('admin.userFilterAll') : f === 'admin' ? t('admin.userFilterAdmins') : t('admin.userFilterUsers')}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('admin.searchUsers')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t('admin.noUsersFound')}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.fieldUser')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.fieldRole')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.fieldStatus')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('admin.fieldCreated')}</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t('admin.fieldActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isSelf = u.id === user?.id
                const isSaving = saving === u.id
                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold',
                          u.role === 'admin' ? 'bg-accent' : 'bg-gray-400'
                        )}>
                          {u.role === 'admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {u.name || t('admin.noName')}
                            {isSelf && <span className="ml-1.5 text-xs text-accent font-bold">({t('admin.currentUser')})</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                        u.role === 'admin'
                          ? 'bg-accent/10 text-accent'
                          : 'bg-gray-100 text-gray-600'
                      )}>
                        {u.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                        u.active !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      )}>
                        {u.active !== false ? <><Check className="h-3 w-3" /> {t('admin.statusActive')}</> : <><X className="h-3 w-3" /> {t('admin.statusInactive')}</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(u.created_at).toLocaleDateString('da-DK')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleRole(u.id, u.role || 'user')}
                            disabled={isSaving}
                            className="px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                          >
                            {isSaving ? '...' : u.role === 'admin' ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                          </button>
                          <button
                            onClick={() => toggleActive(u.id, u.active !== false)}
                            disabled={isSaving}
                            className="px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            {isSaving ? '...' : u.active !== false ? t('admin.deactivate') : t('admin.activate')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
