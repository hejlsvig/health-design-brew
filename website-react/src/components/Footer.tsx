import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flame, Instagram, Youtube, Facebook } from 'lucide-react'
import NewsletterSignup from './NewsletterSignup'
import { getSocialLinks, type SocialLinks } from '@/lib/social'

// TikTok icon (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.48a8.2 8.2 0 004.76 1.52V7.56a4.84 4.84 0 01-1-.87z" />
    </svg>
  )
}

export default function Footer() {
  const { t } = useTranslation()
  const [social, setSocial] = useState<SocialLinks>({ instagram: '', youtube: '', tiktok: '', facebook: '' })

  useEffect(() => {
    getSocialLinks().then(setSocial).catch(() => {})
  }, [])

  const socialIcons = [
    { key: 'instagram', url: social.instagram, icon: <Instagram className="h-5 w-5" />, label: 'Instagram' },
    { key: 'youtube', url: social.youtube, icon: <Youtube className="h-5 w-5" />, label: 'YouTube' },
    { key: 'tiktok', url: social.tiktok, icon: <TikTokIcon className="h-5 w-5" />, label: 'TikTok' },
    { key: 'facebook', url: social.facebook, icon: <Facebook className="h-5 w-5" />, label: 'Facebook' },
  ].filter(s => s.url)

  return (
    <footer className="bg-charcoal text-charcoal-foreground mt-20">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-accent" />
              <span className="font-sans font-bold text-lg uppercase tracking-tight">
                Shifting Source
              </span>
            </div>
            <p className="text-sm text-charcoal-foreground/70">
              {t('footer.description')}
            </p>
            {socialIcons.length > 0 && (
              <div className="flex gap-3">
                {socialIcons.map(s => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-charcoal-foreground/60 hover:text-accent transition-colors"
                    aria-label={s.label}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="font-serif font-bold">{t('footer.quickLinks')}</h5>
            <div className="text-sm text-charcoal-foreground/70 space-y-2">
              <Link to="/" className="block hover:text-charcoal-foreground transition-colors">{t('nav.home')}</Link>
              <Link to="/recipes" className="block hover:text-charcoal-foreground transition-colors">{t('nav.recipes')}</Link>
              <Link to="/guides" className="block hover:text-charcoal-foreground transition-colors">{t('nav.guides')}</Link>
              <Link to="/blog" className="block hover:text-charcoal-foreground transition-colors">{t('nav.blog')}</Link>
              <Link to="/calculator" className="block hover:text-charcoal-foreground transition-colors">{t('nav.calculator')}</Link>
              <Link to="/about" className="block hover:text-charcoal-foreground transition-colors">{t('nav.about')}</Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h5 className="font-serif font-bold">{t('footer.newsletter')}</h5>
            <NewsletterSignup variant="footer" />
          </div>
        </div>

        <hr className="my-8 border-charcoal-foreground/20" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-charcoal-foreground/50">
          <p>{t('footer.copyright')}</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-charcoal-foreground transition-colors">{t('footer.privacy')}</Link>
            <Link to="/terms" className="hover:text-charcoal-foreground transition-colors">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
