import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Utensils, Settings, ArrowRight, Users, LayoutDashboard, Info, FileText, Lock, Scale, Target, Share2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Stats {
  articles: number
  recipes: number
  publishedArticles: number
  publishedRecipes: number
  users: number
  admins: number
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ articles: 0, recipes: 0, publishedArticles: 0, publishedRecipes: 0, users: 0, admins: 0 })

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/login')
  }, [user, isAdmin, authLoading, navigate])

  useEffect(() => {
    if (!isAdmin) return
    const fetchStats = async () => {
      const [articles, recipes, pubArticles, pubRecipes, allUsers, adminUsers] = await Promise.all([
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('crm_users').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
      ])
      setStats({
        articles: articles.count ?? 0,
        recipes: recipes.count ?? 0,
        publishedArticles: pubArticles.count ?? 0,
        publishedRecipes: pubRecipes.count ?? 0,
        users: allUsers.count ?? 0,
        admins: adminUsers.count ?? 0,
      })
    }
    fetchStats()
  }, [isAdmin])

  if (authLoading) {
    return <div className="container py-20 text-center text-muted-foreground">{t('common.loading')}</div>
  }
  if (!isAdmin) return null

  interface CardItem {
    title: string
    description: string
    icon: typeof BookOpen
    to: string
    stats: string
    color: string
  }

  interface CardGroup {
    label: string
    cards: CardItem[]
  }

  const groups: CardGroup[] = [
    {
      label: 'Indhold',
      cards: [
        {
          title: t('admin.cardArticles'),
          description: t('admin.cardArticlesDesc'),
          icon: BookOpen,
          to: '/admin/blog',
          stats: `${stats.publishedArticles} ${t('admin.statusPublished').toLowerCase()} · ${stats.articles} total`,
          color: 'bg-blue-500',
        },
        {
          title: t('admin.cardRecipes'),
          description: t('admin.cardRecipesDesc'),
          icon: Utensils,
          to: '/admin/recipes',
          stats: `${stats.publishedRecipes} ${t('admin.statusPublished').toLowerCase()} · ${stats.recipes} total`,
          color: 'bg-accent',
        },
        {
          title: t('admin.cardGuides'),
          description: t('admin.cardGuidesDesc'),
          icon: FileText,
          to: '/admin/guides',
          stats: '',
          color: 'bg-emerald-500',
        },
      ],
    },
    {
      label: 'Sider',
      cards: [
        {
          title: t('admin.cardHomepage'),
          description: t('admin.cardHomepageDesc'),
          icon: LayoutDashboard,
          to: '/admin/homepage',
          stats: '',
          color: 'bg-teal-500',
        },
        {
          title: t('admin.cardAbout'),
          description: t('admin.cardAboutDesc'),
          icon: Info,
          to: '/admin/about',
          stats: '',
          color: 'bg-indigo-500',
        },
        {
          title: t('admin.cardPrivacy'),
          description: t('admin.cardPrivacyDesc'),
          icon: Lock,
          to: '/admin/privacy',
          stats: '',
          color: 'bg-rose-500',
        },
        {
          title: t('admin.cardTerms'),
          description: t('admin.cardTermsDesc'),
          icon: Scale,
          to: '/admin/terms',
          stats: '',
          color: 'bg-orange-500',
        },
      ],
    },
    {
      label: 'Marketing & Social',
      cards: [
        {
          title: 'Social Publisher',
          description: 'Del indhold på Instagram, Facebook, YouTube og TikTok',
          icon: Share2,
          to: '/admin/social-publisher',
          stats: '',
          color: 'bg-pink-500',
        },
      ],
    },
    {
      label: 'Brugere & CRM',
      cards: [
        {
          title: t('admin.cardUsers'),
          description: t('admin.cardUsersDesc'),
          icon: Users,
          to: '/admin/users',
          stats: `${stats.admins} admin${stats.admins !== 1 ? 's' : ''} · ${stats.users} ${t('admin.userFilterUsers').toLowerCase()}`,
          color: 'bg-purple-500',
        },
        {
          title: t('admin.cardCrm'),
          description: t('admin.cardCrmDesc'),
          icon: Target,
          to: '__external_crm__',
          stats: '',
          color: 'bg-cyan-600',
        },
      ],
    },
    {
      label: 'System',
      cards: [
        {
          title: t('admin.cardSettings'),
          description: t('admin.cardSettingsDesc'),
          icon: Settings,
          to: '/admin/settings',
          stats: '',
          color: 'bg-gray-500',
        },
      ],
    },
  ]

  const renderCard = (card: CardItem) => {
    const inner = (
      <>
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${card.color} text-white`}>
            <card.icon className="h-5 w-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-foreground group-hover:text-accent transition-colors">
            {card.title}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground flex-1">{card.description}</p>
        {card.stats && (
          <p className="mt-3 text-xs font-medium text-muted-foreground">{card.stats}</p>
        )}
        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-accent group-hover:text-accent/80">
          {t('admin.open')} <ArrowRight className="h-4 w-4" />
        </div>
      </>
    )

    if (card.to === '__external_crm__') {
      return (
        <a
          key={card.to}
          href="/crm/admin.html"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col rounded-md border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-accent/50 transition-all"
        >
          {inner}
        </a>
      )
    }

    return (
      <Link
        key={card.to}
        to={card.to}
        className="group flex flex-col rounded-md border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-accent/50 transition-all"
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="font-serif text-3xl font-bold text-primary mb-2">{t('admin.pageTitle')}</h1>
      <p className="text-muted-foreground mb-8">{t('admin.pageDescription')}</p>

      {groups.map(group => (
        <section key={group.label} className="mb-8">
          <h2 className="font-serif text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">
            {group.label}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.cards.map(renderCard)}
          </div>
        </section>
      ))}
    </div>
  )
}
