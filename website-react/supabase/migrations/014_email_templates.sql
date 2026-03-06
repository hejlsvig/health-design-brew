-- Migration 014: Email templates + email sends
-- Creates tables for email template management and send tracking

-- ═══ EMAIL TEMPLATES ═══
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'transactional',
  subject JSONB NOT NULL DEFAULT '{}',      -- { "da": "...", "en": "...", "se": "..." }
  body_html JSONB NOT NULL DEFAULT '{}',    -- { "da": "...", "en": "...", "se": "..." }
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(email_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_email_templates_updated_at') THEN
    CREATE TRIGGER set_email_templates_updated_at
      BEFORE UPDATE ON email_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Admins manage email_templates') THEN
    CREATE POLICY "Admins manage email_templates" ON email_templates FOR ALL USING (is_admin());
  END IF;
END $$;

-- ═══ EMAIL SENDS (tracking) ═══
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email_address TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'transactional',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'failed'
  )),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounce_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_template ON email_sends(template_id);

-- RLS
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_sends' AND policyname = 'Admins manage email_sends') THEN
    CREATE POLICY "Admins manage email_sends" ON email_sends FOR ALL USING (is_admin());
  END IF;
END $$;

-- ═══ SEED: Starter email templates ═══
INSERT INTO email_templates (name, email_type, subject, body_html, variables, is_active) VALUES
(
  'Welcome New User',
  'onboarding',
  '{"da": "Velkommen til {{site_name}}! 🎉", "en": "Welcome to {{site_name}}! 🎉", "se": "Välkommen till {{site_name}}! 🎉"}',
  '{
    "da": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><div style=\"text-align: center; margin-bottom: 32px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 28px; margin: 0;\">Velkommen, {{first_name}}!</h1></div><p>Vi er glade for at have dig med hos {{site_name}}.</p><p>Her er hvad du kan komme i gang med:</p><ul><li><strong>Beregn dit daglige kaloriebehov</strong> med vores TDEE/BMR-beregner</li><li><strong>Udforsk opskrifter</strong> tilpasset din kost</li><li><strong>Læs vores guides</strong> om keto og faste</li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Start din beregning →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">Har du spørgsmål? Svar blot på denne email.</p></div>",
    "en": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><div style=\"text-align: center; margin-bottom: 32px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 28px; margin: 0;\">Welcome, {{first_name}}!</h1></div><p>We are thrilled to have you at {{site_name}}.</p><p>Here is what you can get started with:</p><ul><li><strong>Calculate your daily calorie needs</strong> with our TDEE/BMR calculator</li><li><strong>Explore recipes</strong> tailored to your diet</li><li><strong>Read our guides</strong> about keto and fasting</li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Start your calculation →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">Questions? Just reply to this email.</p></div>",
    "se": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><div style=\"text-align: center; margin-bottom: 32px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 28px; margin: 0;\">Välkommen, {{first_name}}!</h1></div><p>Vi är glada att ha dig med på {{site_name}}.</p><p>Här är vad du kan börja med:</p><ul><li><strong>Beräkna ditt dagliga kaloribehov</strong> med vår TDEE/BMR-kalkylator</li><li><strong>Utforska recept</strong> anpassade till din kost</li><li><strong>Läs våra guider</strong> om keto och fasta</li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Starta din beräkning →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">Har du frågor? Svara bara på detta email.</p></div>"
  }',
  ARRAY['first_name', 'site_name', 'site_url'],
  true
),
(
  'Coaching Welcome',
  'coaching',
  '{"da": "Dit coaching-forløb starter nu! 💪", "en": "Your coaching journey starts now! 💪", "se": "Din coachingresa börjar nu! 💪"}',
  '{
    "da": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 28px; text-align: center;\">Velkommen til coaching, {{first_name}}!</h1><p>Vi glæder os til at hjælpe dig med at nå dine mål.</p><p><strong>Sådan fungerer det:</strong></p><ol><li>Du modtager en ugentlig check-in hver <strong>{{checkin_day}}</strong></li><li>Udfyld dine fremskridt og mål</li><li>Din coach gennemgår og giver feedback</li></ol><p>Dit første check-in kommer om 7 dage. I mellemtiden kan du:</p><div style=\"text-align: center; margin: 24px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Opdater din profil →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">Din coach: {{coach_name}}</p></div>",
    "en": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 28px; text-align: center;\">Welcome to coaching, {{first_name}}!</h1><p>We are excited to help you reach your goals.</p><p><strong>How it works:</strong></p><ol><li>You will receive a weekly check-in every <strong>{{checkin_day}}</strong></li><li>Fill in your progress and goals</li><li>Your coach reviews and provides feedback</li></ol><p>Your first check-in arrives in 7 days. In the meantime:</p><div style=\"text-align: center; margin: 24px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Update your profile →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">Your coach: {{coach_name}}</p></div>",
    "se": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 28px; text-align: center;\">Välkommen till coaching, {{first_name}}!</h1><p>Vi ser fram emot att hjälpa dig nå dina mål.</p><p><strong>Så fungerar det:</strong></p><ol><li>Du får en veckovis check-in varje <strong>{{checkin_day}}</strong></li><li>Fyll i dina framsteg och mål</li><li>Din coach granskar och ger feedback</li></ol><p>Din första check-in kommer om 7 dagar. Under tiden:</p><div style=\"text-align: center; margin: 24px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Uppdatera din profil →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">Din coach: {{coach_name}}</p></div>"
  }',
  ARRAY['first_name', 'site_name', 'site_url', 'coach_name', 'checkin_day'],
  true
),
(
  'Check-in Reminder',
  'reminder',
  '{"da": "Husk dit ugentlige check-in ⏰", "en": "Time for your weekly check-in ⏰", "se": "Dags för din veckovisa check-in ⏰"}',
  '{
    "da": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">Hej {{first_name}} — tid til check-in!</h1><p>Det er tid til dit ugentlige check-in. Det tager kun 2-3 minutter, og det hjælper din coach med at følge dine fremskridt.</p><div style=\"background: #262626; border-radius: 8px; padding: 20px; margin: 20px 0;\"><p style=\"margin: 0; font-size: 14px;\">📊 <strong>Sidste check-in:</strong> {{last_checkin_date}}<br>📈 <strong>Uge nummer:</strong> {{week_number}}</p></div><div style=\"text-align: center; margin: 24px 0;\"><a href=\"{{site_url}}/profile\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Udfyld check-in →</a></div></div>",
    "en": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">Hey {{first_name}} — check-in time!</h1><p>It is time for your weekly check-in. It only takes 2-3 minutes and helps your coach track your progress.</p><div style=\"background: #262626; border-radius: 8px; padding: 20px; margin: 20px 0;\"><p style=\"margin: 0; font-size: 14px;\">📊 <strong>Last check-in:</strong> {{last_checkin_date}}<br>📈 <strong>Week number:</strong> {{week_number}}</p></div><div style=\"text-align: center; margin: 24px 0;\"><a href=\"{{site_url}}/profile\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Complete check-in →</a></div></div>",
    "se": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">Hej {{first_name}} — dags för check-in!</h1><p>Det är dags för din veckovisa check-in. Det tar bara 2-3 minuter och hjälper din coach följa dina framsteg.</p><div style=\"background: #262626; border-radius: 8px; padding: 20px; margin: 20px 0;\"><p style=\"margin: 0; font-size: 14px;\">📊 <strong>Senaste check-in:</strong> {{last_checkin_date}}<br>📈 <strong>Vecka nummer:</strong> {{week_number}}</p></div><div style=\"text-align: center; margin: 24px 0;\"><a href=\"{{site_url}}/profile\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Fyll i check-in →</a></div></div>"
  }',
  ARRAY['first_name', 'site_url', 'last_checkin_date', 'week_number'],
  true
),
(
  'Calculator Reminder',
  'engagement',
  '{"da": "Har du prøvet vores beregner? 🔢", "en": "Have you tried our calculator? 🔢", "se": "Har du testat vår kalkylator? 🔢"}',
  '{
    "da": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">Kend dit daglige behov, {{first_name}}</h1><p>Vi bemærkede at du endnu ikke har brugt vores keto-beregner. Den giver dig et præcist billede af:</p><ul><li>Dit daglige kaloriebehov (TDEE)</li><li>Optimal fordeling af makronæringsstoffer</li><li>Personlig keto-tilpasset kostplan</li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Prøv beregneren nu →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">Det tager kun 2 minutter.</p></div>",
    "en": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">Know your daily needs, {{first_name}}</h1><p>We noticed you have not tried our keto calculator yet. It gives you an accurate picture of:</p><ul><li>Your daily calorie needs (TDEE)</li><li>Optimal macronutrient distribution</li><li>Personalized keto-adapted meal plan</li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Try the calculator now →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">It only takes 2 minutes.</p></div>",
    "se": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">Känn ditt dagliga behov, {{first_name}}</h1><p>Vi märkte att du inte har testat vår keto-kalkylator än. Den ger dig en exakt bild av:</p><ul><li>Ditt dagliga kaloribehov (TDEE)</li><li>Optimal fördelning av makronäringsämnen</li><li>Personlig keto-anpassad kostplan</li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/calculator\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Testa kalkylatorn nu →</a></div><p style=\"color: #9ca3af; font-size: 13px;\">Det tar bara 2 minuter.</p></div>"
  }',
  ARRAY['first_name', 'site_url'],
  true
),
(
  'Upgrade Nudge',
  'upsell',
  '{"da": "Få mere ud af {{site_name}} ⭐", "en": "Get more from {{site_name}} ⭐", "se": "Få mer från {{site_name}} ⭐"}',
  '{
    "da": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">Du har været aktiv i {{days_active}} dage!</h1><p>Hej {{first_name}}, det ser ud til at du får god brug af {{site_name}}. Med en Premium-plan får du adgang til:</p><ul><li>🍽 <strong>Personlige kostplaner</strong> genereret af AI</li><li>💬 <strong>AI-chat assistent</strong> til dine keto-spørgsmål</li><li>📊 <strong>Avanceret makroberegning</strong></li><li>📱 <strong>Prioriteret support</strong></li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/profile\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Se Premium-fordele →</a></div></div>",
    "en": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">You have been active for {{days_active}} days!</h1><p>Hey {{first_name}}, it looks like you are getting great use of {{site_name}}. With a Premium plan you get access to:</p><ul><li>🍽 <strong>Personalized meal plans</strong> generated by AI</li><li>💬 <strong>AI chat assistant</strong> for your keto questions</li><li>📊 <strong>Advanced macro calculation</strong></li><li>📱 <strong>Priority support</strong></li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/profile\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">See Premium benefits →</a></div></div>",
    "se": "<div style=\"font-family: Nunito Sans, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e5e5e5; padding: 40px; border-radius: 12px;\"><h1 style=\"font-family: DM Serif Display, serif; color: #D97706; font-size: 24px; text-align: center;\">Du har varit aktiv i {{days_active}} dagar!</h1><p>Hej {{first_name}}, det ser ut som att du får bra nytta av {{site_name}}. Med en Premium-plan får du tillgång till:</p><ul><li>🍽 <strong>Personliga kostplaner</strong> genererade av AI</li><li>💬 <strong>AI-chattassistent</strong> för dina ketofrågor</li><li>📊 <strong>Avancerad makroberäkning</strong></li><li>📱 <strong>Prioriterad support</strong></li></ul><div style=\"text-align: center; margin: 32px 0;\"><a href=\"{{site_url}}/profile\" style=\"display: inline-block; background: #D97706; color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;\">Se Premium-fördelar →</a></div></div>"
  }',
  ARRAY['first_name', 'site_name', 'site_url', 'days_active'],
  true
)
ON CONFLICT DO NOTHING;
