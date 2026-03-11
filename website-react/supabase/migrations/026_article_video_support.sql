-- 026: Add video support to articles (language-specific explainer videos)
-- video_url: JSONB with per-language URLs, e.g. { "da": "https://…/video-da.mp4", "en": "…" }
-- video_type: how the video was added (none, upload, ai, external)

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS video_url   JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS video_type  TEXT  DEFAULT 'none';

-- Add comment for documentation
COMMENT ON COLUMN articles.video_url IS 'Per-language video URLs as JSONB: { "da": "url", "en": "url", "se": "url" }';
COMMENT ON COLUMN articles.video_type IS 'How video was added: none, upload, ai, external';
