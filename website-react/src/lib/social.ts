/**
 * Social media integration — settings and link management.
 *
 * Social media URLs are stored in admin_settings with keys:
 *   social_instagram, social_youtube, social_tiktok, social_facebook
 *
 * Future: Blotato or similar unified API for cross-posting content.
 */

import { getSettings, saveSetting } from './openai'

export interface SocialLinks {
  instagram: string
  youtube: string
  tiktok: string
  facebook: string
}

const SOCIAL_KEYS = {
  instagram: 'social_instagram',
  youtube: 'social_youtube',
  tiktok: 'social_tiktok',
  facebook: 'social_facebook',
} as const

/**
 * Fetch all social media links from admin_settings.
 */
export async function getSocialLinks(): Promise<SocialLinks> {
  const settings = await getSettings()
  return {
    instagram: settings[SOCIAL_KEYS.instagram] || '',
    youtube: settings[SOCIAL_KEYS.youtube] || '',
    tiktok: settings[SOCIAL_KEYS.tiktok] || '',
    facebook: settings[SOCIAL_KEYS.facebook] || '',
  }
}

/**
 * Save a social media link.
 */
export async function saveSocialLink(
  platform: keyof SocialLinks,
  url: string,
  userId?: string,
) {
  await saveSetting(SOCIAL_KEYS[platform], url, userId)
}
