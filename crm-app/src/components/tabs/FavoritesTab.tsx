import { useTranslation } from 'react-i18next'
import { type UserFavorite } from '@/lib/fullPersonView'
import { Heart, UtensilsCrossed } from 'lucide-react'

interface Props {
  favorites: UserFavorite[]
}

export default function FavoritesTab({ favorites }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'da' | 'en' | 'se'

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <Heart className="w-8 h-8" />
        <p>{t('favorites.noFavorites')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        {t('favorites.total', { count: favorites.length })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {favorites.map((fav) => {
          const title = fav.recipe?.title?.[lang] || fav.recipe?.title?.da || fav.recipe?.title?.en || 'Unknown recipe'
          return (
            <div
              key={fav.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              {fav.recipe?.image_url ? (
                <img
                  src={fav.recipe.image_url}
                  alt={title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{title}</p>
                {fav.recipe?.calories && (
                  <p className="text-xs text-muted-foreground">{fav.recipe.calories} kcal</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(fav.created_at).toLocaleDateString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
