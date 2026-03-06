import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchCrmUsers, updateCrmUser, toggleCrmUserActive, createCrmUser,
  fetchAllPermissions, upsertPermission, setDefaultPermissions,
  type CrmUserRow, type CrmRole, type CrmPermission, type CrmSection,
  ROLE_LABELS, ROLE_COLORS, CRM_SECTIONS,
} from '@/lib/crmUsers'
import {
  Loader2, UserCheck, UserX, Shield, Pencil, X, Save,
  Plus, ChevronDown, ChevronRight, Eye, Edit3, Mail,
} from 'lucide-react'

const ROLES: CrmRole[] = ['light', 'medium', 'admin']

const SECTION_LABELS: Record<CrmSection, string> = {
  leads: 'Leads',
  coaching: 'Coaching',
  automation: 'Automation',
  settings: 'Indstillinger',
  analytics: 'Analyse',
  emails: 'Emails',
  mealplans: 'Kostplaner',
}

export default function CrmUsers() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<CrmUserRow[]>([])
  const [permissions, setPermissions] = useState<CrmPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<CrmUserRow>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', name: '', role: 'medium' as CrmRole, language: 'da', sender_email: '' })
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [usersData, permsData] = await Promise.all([
        fetchCrmUsers(),
        fetchAllPermissions(),
      ])
      setUsers(usersData)
      setPermissions(permsData)
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
      const oldUser = users.find((u) => u.id === userId)
      await updateCrmUser(userId, editForm)
      // If role changed, update default permissions
      if (editForm.role && oldUser && editForm.role !== oldUser.role) {
        await setDefaultPermissions(userId, editForm.role)
        const permsData = await fetchAllPermissions()
        setPermissions(permsData)
      }
      setEditingId(null)
      await loadData()
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

  async function handleTogglePermission(userId: string, section: CrmSection, field: 'can_view' | 'can_edit') {
    const perm = permissions.find((p) => p.crm_user_id === userId && p.section === section)
    const currentView = perm?.can_view ?? false
    const currentEdit = perm?.can_edit ?? false
    const newView = field === 'can_view' ? !currentView : currentView
    let newEdit = field === 'can_edit' ? !currentEdit : currentEdit
    // If turning off view, also turn off edit
    if (!newView) newEdit = false
    // If turning on edit, also turn on view
    const finalView = newEdit ? true : newView

    try {
      await upsertPermission(userId, section, finalView, newEdit)
      setPermissions((prev) => {
        const filtered = prev.filter((p) => !(p.crm_user_id === userId && p.section === section))
        return [...filtered, {
          id: perm?.id || '',
          crm_user_id: userId,
          section,
          can_view: finalView,
          can_edit: newEdit,
        }]
      })
    } catch (err) {
      console.error('Toggle permission error:', err)
    }
  }

  async function handleCreate() {
    setCreateError('')
    setCreateLoading(true)
    try {
      await createCrmUser(createForm)
      setShowCreate(false)
      setCreateForm({ email: '', name: '', role: 'medium', language: 'da', sender_email: '' })
      await loadData()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Kunne ikke oprette bruger')
    } finally {
      setCreateLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  const activeUsers = users.filter((u) => u.active)
  const inactiveUsers = users.filter((u) => !u.active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-foreground">{t('crmUsers.title')}</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCheck className="w-4 h-4 text-green-500" />
            {activeUsers.length} {t('crmUsers.active')}
            <UserX className="w-4 h-4 text-gray-400 ml-2" />
            {inactiveUsers.length} {t('crmUsers.inactive')}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t('crmUsers.addUser')}
          </button>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-foreground">{t('crmUsers.addUser')}</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('crmUsers.email')}</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="bruger@example.com" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('crmUsers.name')}</label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Fulde navn" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t('crmUsers.role')}</label>
                  <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as CrmRole })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t('crmUsers.language')}</label>
                  <select value={createForm.language} onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                    <option value="da">Dansk</option>
                    <option value="en">English</option>
                    <option value="se">Svenska</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />
                  {t('crmUsers.senderEmail')}
                </label>
                <input type="email" value={createForm.sender_email} onChange={(e) => setCreateForm({ ...createForm, sender_email: e.target.value })}
                  placeholder="anders@shiftingsource.com" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                <p className="text-xs text-muted-foreground mt-1">{t('crmUsers.senderEmailHelp')}</p>
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading || !createForm.email || !createForm.name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t('crmUsers.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8" />
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.name')}</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.email')}</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.role')}</th>
              <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.status')}</th>
              <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase tracking-wider">{t('crmUsers.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              const isExpanded = expandedId === user.id
              const userPerms = permissions.filter((p) => p.crm_user_id === user.id)
              const isAdmin = user.role === 'admin'

              return (
                <>{/* Main row */}
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="pl-3 py-3">
                      <button onClick={() => setExpandedId(isExpanded ? null : user.id)} className="text-muted-foreground hover:text-foreground">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="px-2 py-1 rounded border border-border bg-background text-sm w-full" />
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
                        <select value={editForm.role || 'light'} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as CrmRole })}
                          className="px-2 py-1 rounded border border-border bg-background text-sm">
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(user.id, !user.active)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          user.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {user.active ? t('crmUsers.active') : t('crmUsers.inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === user.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleSave(user.id)} className="p-1.5 rounded hover:bg-green-50 text-green-600"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => startEditing(user)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>

                  {/* Permissions row */}
                  {isExpanded && (
                    <tr key={`${user.id}-perms`} className="bg-muted/30">
                      <td colSpan={6} className="px-6 py-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          {t('crmUsers.permissions')}
                          {isAdmin && <span className="ml-2 text-purple-600 normal-case">(Admin — alle rettigheder)</span>}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {CRM_SECTIONS.map((section) => {
                            const perm = userPerms.find((p) => p.section === section)
                            const canView = isAdmin || (perm?.can_view ?? false)
                            const canEdit = isAdmin || (perm?.can_edit ?? false)
                            return (
                              <div key={section} className="bg-card rounded-lg border border-border p-3">
                                <p className="text-sm font-medium text-foreground mb-2">{SECTION_LABELS[section]}</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => !isAdmin && handleTogglePermission(user.id, section, 'can_view')}
                                    disabled={isAdmin}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      canView ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                                    } ${isAdmin ? 'opacity-70 cursor-default' : 'hover:opacity-80'}`}
                                  >
                                    <Eye className="w-3 h-3" />
                                    {t('crmUsers.view')}
                                  </button>
                                  <button
                                    onClick={() => !isAdmin && handleTogglePermission(user.id, section, 'can_edit')}
                                    disabled={isAdmin}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      canEdit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                                    } ${isAdmin ? 'opacity-70 cursor-default' : 'hover:opacity-80'}`}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    {t('crmUsers.editPerm')}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t('crmUsers.noUsers')}</p>
        )}
      </div>
    </div>
  )
}
