import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { type FullProfile, updateProfile } from '@/lib/fullPersonView'
import { Pencil, Save, X, Loader2 } from 'lucide-react'

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active']
const GENDERS = ['male', 'female']
const FASTING_PROTOCOLS = ['none', '16:8', '18:6', '20:4', 'omad']
const PREP_TIMES = ['quick', 'medium', 'elaborate']
const PROFILE_TYPES = ['light', 'calculator', 'coaching']
const UNITS = ['metric', 'imperial']

interface Props {
  profile: FullProfile
  onUpdate: () => void
}

export default function EditableProfileForm({ profile, onUpdate }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<FullProfile>>({})

  function startEditing() {
    setForm({ ...profile })
    setEditing(true)
  }

  function cancelEditing() {
    setForm({})
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Only send changed fields
      const changes: Record<string, unknown> = {}
      for (const key of Object.keys(form) as (keyof FullProfile)[]) {
        if (form[key] !== profile[key] && key !== 'id' && key !== 'email' && key !== 'created_at' && key !== 'updated_at') {
          changes[key] = form[key]
        }
      }

      if (Object.keys(changes).length > 0) {
        await updateProfile(profile.id, changes as Partial<FullProfile>, user?.id)
      }
      setEditing(false)
      onUpdate()
    } catch (err) {
      console.error('Save profile error:', err)
    } finally {
      setSaving(false)
    }
  }

  function updateField(key: keyof FullProfile, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  if (!editing) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <button
            onClick={startEditing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t('common.edit')}
          </button>
        </div>
        <ReadOnlyProfile profile={profile} />
      </div>
    )
  }

  return (
    <div>
      {/* Action bar */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={cancelEditing}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {t('common.save')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Personal */}
        <TextInput label={t('editProfile.name')} value={form.name ?? ''} onChange={(v) => updateField('name', v || null)} />
        <ReadOnlyField label={t('editProfile.email')} value={profile.email} />
        <SelectInput label={t('editProfile.gender')} value={form.gender ?? ''} options={GENDERS} onChange={(v) => updateField('gender', v || null)} allowEmpty />
        <NumberInput label={t('editProfile.age')} value={form.age} onChange={(v) => updateField('age', v)} />
        <NumberInput label={t('editProfile.weight')} value={form.weight} onChange={(v) => updateField('weight', v)} suffix="kg" step={0.1} />
        <NumberInput label={t('editProfile.height')} value={form.height} onChange={(v) => updateField('height', v)} suffix="cm" />
        <SelectInput label={t('editProfile.activityLevel')} value={form.activity_level ?? ''} options={ACTIVITY_LEVELS} onChange={(v) => updateField('activity_level', v || null)} allowEmpty />
        <SelectInput label={t('editProfile.units')} value={form.units ?? ''} options={UNITS} onChange={(v) => updateField('units', v || null)} />
        <SelectInput label={t('editProfile.profileType')} value={form.profile_type ?? ''} options={PROFILE_TYPES} onChange={(v) => updateField('profile_type', v)} />
        <TextInput label={t('editProfile.language')} value={form.language ?? ''} onChange={(v) => updateField('language', v)} />

        {/* Nutrition */}
        <NumberInput label="BMR" value={form.bmr} onChange={(v) => updateField('bmr', v)} suffix="kcal" />
        <NumberInput label="TDEE" value={form.tdee} onChange={(v) => updateField('tdee', v)} suffix="kcal" />
        <NumberInput label={t('editProfile.dailyCalories')} value={form.daily_calories} onChange={(v) => updateField('daily_calories', v)} suffix="kcal" />
        <NumberInput label={t('editProfile.weightGoal')} value={form.weight_goal} onChange={(v) => updateField('weight_goal', v)} suffix="kg" step={0.1} />
        <TextInput label={t('editProfile.dietType')} value={form.diet_type ?? ''} onChange={(v) => updateField('diet_type', v || null)} />
        <SelectInput label={t('editProfile.fastingProtocol')} value={form.fasting_protocol ?? ''} options={FASTING_PROTOCOLS} onChange={(v) => updateField('fasting_protocol', v || null)} allowEmpty />
        <NumberInput label={t('editProfile.mealsPerDay')} value={form.meals_per_day} onChange={(v) => updateField('meals_per_day', v)} />
        <SelectInput label={t('editProfile.prepTime')} value={form.prep_time ?? ''} options={PREP_TIMES} onChange={(v) => updateField('prep_time', v || null)} allowEmpty />

        {/* Consent */}
        <CheckboxInput label={t('editProfile.gdprConsent')} checked={!!form.gdpr_consent} onChange={(v) => updateField('gdpr_consent', v)} />
        <CheckboxInput label={t('editProfile.marketingConsent')} checked={!!form.marketing_consent} onChange={(v) => updateField('marketing_consent', v)} />
        <CheckboxInput label={t('editProfile.newsletterConsent')} checked={!!form.newsletter_consent} onChange={(v) => updateField('newsletter_consent', v)} />
        <CheckboxInput label={t('editProfile.coachingConsent')} checked={!!form.coaching_contact_consent} onChange={(v) => updateField('coaching_contact_consent', v)} />
      </div>
    </div>
  )
}

// ─── Read-only display ───

function ReadOnlyProfile({ profile }: { profile: FullProfile }) {
  const sections = [
    {
      title: 'Personal',
      fields: [
        ['Name', profile.name],
        ['Email', profile.email],
        ['Language', profile.language],
        ['Gender', profile.gender],
        ['Age', profile.age],
        ['Weight', profile.weight ? `${profile.weight} kg` : null],
        ['Height', profile.height ? `${profile.height} cm` : null],
        ['Activity Level', profile.activity_level],
        ['Units', profile.units],
        ['Profile Type', profile.profile_type],
        ['Source', profile.source],
      ],
    },
    {
      title: 'Nutrition',
      fields: [
        ['BMR', profile.bmr ? `${profile.bmr} kcal` : null],
        ['TDEE', profile.tdee ? `${profile.tdee} kcal` : null],
        ['Daily Calories', profile.daily_calories ? `${profile.daily_calories} kcal` : null],
        ['Weight Goal', profile.weight_goal ? `${profile.weight_goal} kg` : null],
        ['Diet Type', profile.diet_type],
        ['Fasting Protocol', profile.fasting_protocol],
        ['Meals Per Day', profile.meals_per_day],
        ['Prep Time', profile.prep_time],
      ],
    },
    {
      title: 'Consent',
      fields: [
        ['GDPR', profile.gdpr_consent ? 'Yes' : 'No'],
        ['Marketing', profile.marketing_consent ? 'Yes' : 'No'],
        ['Newsletter', profile.newsletter_consent ? 'Yes' : 'No'],
        ['Coaching Contact', profile.coaching_contact_consent ? 'Yes' : 'No'],
        ['Email Frequency', profile.email_frequency_preference],
      ],
    },
    {
      title: 'Metadata',
      fields: [
        ['Last Login', profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : null],
        ['Created', profile.created_at ? new Date(profile.created_at).toLocaleString() : null],
        ['Updated', profile.updated_at ? new Date(profile.updated_at).toLocaleString() : null],
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {section.title}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {section.fields.map(([label, value]) => (
              <div key={label as string} className="p-2.5 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-0.5">{label as string}</p>
                <p className="text-sm font-medium text-foreground">{String(value ?? '—')}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Input components ───

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  )
}

function NumberInput({ label, value, onChange, suffix, step = 1 }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void; suffix?: string; step?: number }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value ?? ''}
          step={step}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function SelectInput({ label, value, options, onChange, allowEmpty }: { label: string; value: string; options: string[]; onChange: (v: string) => void; allowEmpty?: boolean }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {allowEmpty && <option value="">—</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

function CheckboxInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <p className="px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">{value}</p>
    </div>
  )
}
