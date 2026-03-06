import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchCrmUsers, updateCrmUser, toggleCrmUserActive,
  type CrmUserRow, type CrmRole, ROLE_LABELS, ROLE_COLORS,
} from '@/lib/crmUsers'
import {
  Loader2, UserCheck, UserX, Shield, Pencil, X, Save,
} from 'lucide-react'

const ROLES: CrmRole[] = ['light', 'medium', 'admin']

export default function CrmUsers() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<CrmUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<CrmUserRow>>({})

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const data = await fetchCrmUsers()
      setUsers(data)
    } catch (err) {
      console.error('Load CRM users error:', err)
    } finally {
      setLoading(false)
    }
  }

  function startEditing(user: CrmUserRow) {
    setEditingId(user.id)
    setEditForm({ name: user.name, role: user.role, language: user.language })
  }

  async function handleSave(userId: string) {
    try {
      await updateCrmUser(userId, editForm)
      setEditingId(null)
      await loadUsers()
    } catch (err) {
      console.error('Update user error:', err)
    }
  }

  async function handleToggleActive(userId: string, active: boolean) {
    try {
      await toggleCrmUserActive(userId, active)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, active } : u))
    } catch (err) {
      console.error('Toggle active error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const activeUsers = users.filter((u) => u.active)
  const inactiveUsers = users.filter((u) => !u.active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-foreground">{t('crmUsers.title')}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserCheck className="w-4 h-4 text-green-500" />
          {activeUsers.length} {t('crmUsers.active')}
          <UserX className="w-4 h-4 text-gray-400 ml-2" />
          {inactiveUsers.length} {t('crmUsers.inactive')}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.name')}</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.email')}</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.role')}</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.status')}</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  {editingId === user.id ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="px-2 py-1 rounded border border-border bg-background text-sm w-full"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{user.name || '—'}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  {editingId === user.id ? (
                    <select
                      value={editForm.role || 'light'}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as CrmRole })}
                      className="px-2 py-1 rounded border border-border bg-background text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(user.id, !user.active)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      user.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {user.active ? t('crmUsers.active') : t('crmUsers.inactive')}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === user.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleSave(user.id)}
                        className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(user)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t('crmUsers.noUsers')}</p>
        )}
      </div>
    </div>
  )
}
