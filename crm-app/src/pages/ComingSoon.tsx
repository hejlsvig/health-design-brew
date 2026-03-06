import { useTranslation } from 'react-i18next'
import { Construction } from 'lucide-react'

export default function ComingSoon({ title }: { title: string }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Construction className="w-12 h-12 text-muted-foreground mb-4" />
      <h1 className="font-serif text-2xl text-foreground mb-2">{t(`nav.${title}`)}</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  )
}
