-- ═══════════════════════════════════════════════════════════════
-- SHIFTING SHOURCE — Migration 004
-- Creates page_sections table, user_favorites table,
-- adds featured column, and seeds homepage + sample content
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. PAGE SECTIONS (CMS-driven homepage) ─────────────────
CREATE TABLE IF NOT EXISTS page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page TEXT NOT NULL DEFAULT 'home',
    section_type TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER page_sections_updated_at
    BEFORE UPDATE ON page_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: anyone can read enabled sections, admins can manage
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled page sections"
    ON page_sections FOR SELECT
    USING (enabled = true);

CREATE POLICY "Admins can manage page sections"
    ON page_sections FOR ALL
    USING (is_admin());

-- ─── 2. USER FAVORITES (code uses this table name) ──────────
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
    ON user_favorites FOR ALL
    USING (auth.uid() = user_id);

-- ─── 3. ADD FEATURED COLUMN to recipes & articles ───────────
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tips TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS original_published_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA: Homepage Sections
-- ═══════════════════════════════════════════════════════════════

INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES

-- Hero
('home', 'hero', 1, true, '{
    "tagline": {"da": "Keto & Faste — videnskabeligt funderet", "en": "Keto & Fasting — science-backed", "se": "Keto & Fasta — vetenskapligt baserat"},
    "title": {"da": "Dit keto-eventyr starter her", "en": "Your keto journey starts here", "se": "Din keto-resa börjar här"},
    "subtitle": {"da": "Beregn dit daglige kaloriebehov, få skræddersyede opskrifter og lær alt om keto og faste.", "en": "Calculate your daily calorie needs, get tailored recipes, and learn everything about keto and fasting.", "se": "Beräkna ditt dagliga kaloriebehov, få skräddarsydda recept och lär dig allt om keto och fasta."},
    "cta_link": "/calculator",
    "cta_text": {"da": "Beregn dit behov", "en": "Calculate your needs", "se": "Beräkna ditt behov"}
}'::jsonb),

-- About / Mission
('home', 'about', 2, true, '{
    "tagline": {"da": "Om Shifting Shource", "en": "About Shifting Shource", "se": "Om Shifting Shource"},
    "title": {"da": "Livsstil, ikke diæt", "en": "Lifestyle, not a diet", "se": "Livsstil, inte diet"},
    "description": {"da": "Shifting Shource hjælper dig med at finde den rette balance mellem keto og faste. Vi kombinerer videnskab med praktiske opskrifter og værktøjer, så du kan opnå dine mål på en bæredygtig måde. Vores keto-beregner giver dig et personligt kaloriemål baseret på din krop og aktivitetsniveau.", "en": "Shifting Shource helps you find the right balance between keto and fasting. We combine science with practical recipes and tools so you can achieve your goals sustainably. Our keto calculator gives you a personalized calorie target based on your body and activity level.", "se": "Shifting Shource hjälper dig att hitta rätt balans mellan keto och fasta. Vi kombinerar vetenskap med praktiska recept och verktyg så att du kan nå dina mål på ett hållbart sätt. Vår keto-kalkylator ger dig ett personligt kaloriemål baserat på din kropp och aktivitetsnivå."}
}'::jsonb),

-- Featured Recipes
('home', 'featured_recipes', 3, true, '{
    "count": 3
}'::jsonb),

-- Latest Articles
('home', 'latest_articles', 4, true, '{
    "count": 3
}'::jsonb),

-- FAQ
('home', 'faq', 5, true, '{
    "title": {"da": "Ofte stillede spørgsmål", "en": "Frequently Asked Questions", "se": "Vanliga frågor"},
    "items": [
        {
            "question": {"da": "Hvad er keto-diæten?", "en": "What is the keto diet?", "se": "Vad är keto-dieten?"},
            "answer": {"da": "Keto-diæten er en lavkulhydrat, højfedt kost der sætter kroppen i ketose — en tilstand hvor kroppen bruger fedt som primær energikilde i stedet for kulhydrater. Typisk spiser man under 20-50 gram netto kulhydrater om dagen.", "en": "The keto diet is a low-carb, high-fat diet that puts your body into ketosis — a state where your body uses fat as its primary energy source instead of carbohydrates. Typically you eat under 20-50 grams of net carbs per day.", "se": "Keto-dieten är en lågkolhydrat, högfett kost som sätter kroppen i ketos — ett tillstånd där kroppen använder fett som primär energikälla istället för kolhydrater. Typiskt äter man under 20-50 gram netto kolhydrater per dag."}
        },
        {
            "question": {"da": "Hvad er intermitterende faste?", "en": "What is intermittent fasting?", "se": "Vad är intermittent fasta?"},
            "answer": {"da": "Intermitterende faste (IF) er et spisemønster, hvor du veksler mellem perioder med faste og spisning. Den mest populære metode er 16:8, hvor du faster i 16 timer og spiser inden for et 8-timers vindue. Det kan kombineres effektivt med keto.", "en": "Intermittent fasting (IF) is an eating pattern where you alternate between fasting and eating periods. The most popular method is 16:8, where you fast for 16 hours and eat within an 8-hour window. It can be effectively combined with keto.", "se": "Intermittent fasta (IF) är ett ätmönster där du växlar mellan perioder av fasta och ätande. Den mest populära metoden är 16:8, där du fastar i 16 timmar och äter inom ett 8-timmarsfönster. Det kan kombineras effektivt med keto."}
        },
        {
            "question": {"da": "Hvor mange kalorier skal jeg spise på keto?", "en": "How many calories should I eat on keto?", "se": "Hur många kalorier ska jag äta på keto?"},
            "answer": {"da": "Det afhænger af din alder, vægt, højde, køn og aktivitetsniveau. Brug vores keto-beregner til at få et præcist dagligt kaloriemål tilpasset din krop og dine mål.", "en": "It depends on your age, weight, height, gender, and activity level. Use our keto calculator to get an accurate daily calorie target tailored to your body and goals.", "se": "Det beror på din ålder, vikt, längd, kön och aktivitetsnivå. Använd vår keto-kalkylator för att få ett exakt dagligt kaloriemål anpassat till din kropp och dina mål."}
        },
        {
            "question": {"da": "Kan jeg kombinere keto med faste?", "en": "Can I combine keto with fasting?", "se": "Kan jag kombinera keto med fasta?"},
            "answer": {"da": "Ja! Mange oplever, at keto og intermitterende faste supplerer hinanden godt. Keto reducerer sult og gør det lettere at faste, mens faste kan fremskynde ketose. Start langsomt og lyt til din krop.", "en": "Yes! Many people find that keto and intermittent fasting complement each other well. Keto reduces hunger and makes fasting easier, while fasting can accelerate ketosis. Start slowly and listen to your body.", "se": "Ja! Många upplever att keto och intermittent fasta kompletterar varandra bra. Keto minskar hunger och gör det lättare att fasta, medan fasta kan påskynda ketos. Börja långsamt och lyssna på din kropp."}
        }
    ]
}'::jsonb),

-- CTA Banner
('home', 'cta_banner', 6, true, '{
    "tagline": {"da": "Klar til at komme i gang?", "en": "Ready to get started?", "se": "Redo att komma igång?"},
    "title": {"da": "Beregn dit personlige keto-mål", "en": "Calculate your personal keto target", "se": "Beräkna ditt personliga keto-mål"},
    "text": {"da": "Vores gratis beregner giver dig et skræddersyet kalorie- og makromål på få minutter.", "en": "Our free calculator gives you a tailored calorie and macro target in minutes.", "se": "Vår gratis kalkylator ger dig ett skräddarsytt kalori- och makromål på några minuter."},
    "cta_link": "/calculator",
    "cta_text": {"da": "Start beregner", "en": "Start calculator", "se": "Starta kalkylator"}
}'::jsonb);


-- ═══════════════════════════════════════════════════════════════
-- SEED DATA: Sample Keto Recipes (6 recipes)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO recipes (slug, title, description, ingredients, instructions, calories, protein, fat, carbs, fiber, prep_time, cook_time, servings, difficulty, categories, tags, status, featured, published_at) VALUES

-- 1. Smørstegte laksebøffer
('smoerstegte-lakseboffer',
 '{"da": "Smørstegte laksebøffer med citron", "en": "Pan-Seared Salmon with Lemon Butter", "se": "Smörstekta laxfiléer med citron"}'::jsonb,
 '{"da": "Saftige laksebøffer stegt i rigelig smør med frisk citron og dild. Perfekt hverdagsmiddag på under 20 minutter.", "en": "Juicy salmon fillets pan-seared in generous butter with fresh lemon and dill. Perfect weeknight dinner in under 20 minutes.", "se": "Saftiga laxfiléer stekta i rikligt smör med färsk citron och dill. Perfekt vardagsmiddag på under 20 minuter."}'::jsonb,
 '[{"full_text": "2 laksebøffer à 150g", "amount": 2, "unit": "stk", "name": "laksebøffer"},
   {"full_text": "30g smør", "amount": 30, "unit": "g", "name": "smør"},
   {"full_text": "1 citron", "amount": 1, "unit": "stk", "name": "citron"},
   {"full_text": "2 spsk frisk dild", "amount": 2, "unit": "spsk", "name": "dild"},
   {"full_text": "Salt og peber", "name": "salt og peber"},
   {"full_text": "1 spsk olivenolie", "amount": 1, "unit": "spsk", "name": "olivenolie"}]'::jsonb,
 '[{"step_number": 1, "step_text": "Dup laksebøfferne tørre med køkkenrulle. Krydr med salt og peber."},
   {"step_number": 2, "step_text": "Opvarm olivenolie og halvdelen af smørret på medium-høj varme i en pande."},
   {"step_number": 3, "step_text": "Steg laksen med skindsiden nedad i 4 minutter. Vend og steg yderligere 3 minutter."},
   {"step_number": 4, "step_text": "Tilsæt resten af smørret, citronsaft og dild. Øs smørret over laksen i 1 minut."},
   {"step_number": 5, "step_text": "Server straks med en citronskal og frisk dild."}]'::jsonb,
 420, 35, 30, 1, 0, 5, 12, 2, 'easy',
 ARRAY['Fisk', 'Hovedret'], ARRAY['hurtig', 'laks', 'lavkulhydrat'],
 'published', true, NOW()),

-- 2. Avocado-æg-bådene
('avocado-aeg-baade',
 '{"da": "Avocado-æg-både med bacon", "en": "Avocado Egg Boats with Bacon", "se": "Avokado-ägg-båtar med bacon"}'::jsonb,
 '{"da": "Ovnbagte avocadohalvdele fyldt med æg og toppet med sprødt bacon. En mættende keto-morgenmad.", "en": "Oven-baked avocado halves filled with eggs and topped with crispy bacon. A satisfying keto breakfast.", "se": "Ugnsbakade avokadohalvor fyllda med ägg och toppade med krispig bacon. En mättande keto-frukost."}'::jsonb,
 '[{"full_text": "2 modne avocadoer", "amount": 2, "unit": "stk", "name": "avocado"},
   {"full_text": "4 æg", "amount": 4, "unit": "stk", "name": "æg"},
   {"full_text": "4 skiver bacon", "amount": 4, "unit": "skiver", "name": "bacon"},
   {"full_text": "Salt og peber", "name": "salt og peber"},
   {"full_text": "Frisk purløg til pynt", "name": "purløg"}]'::jsonb,
 '[{"step_number": 1, "step_text": "Forvarm ovnen til 200°C. Steg baconen sprød i en pande, og knus den groft."},
   {"step_number": 2, "step_text": "Halver avocadoerne og fjern stenen. Skrab lidt af hulrummet større med en ske."},
   {"step_number": 3, "step_text": "Placer avocadohalvdelene i et ovnfast fad. Knæk et æg ned i hver halvdel."},
   {"step_number": 4, "step_text": "Krydr med salt og peber. Bag i 15-18 minutter til æggene er sat."},
   {"step_number": 5, "step_text": "Top med sprødt bacon og frisk purløg. Server straks."}]'::jsonb,
 380, 22, 30, 4, 7, 5, 18, 2, 'easy',
 ARRAY['Morgenmad', 'Æg'], ARRAY['avocado', 'bacon', 'morgenmad'],
 'published', true, NOW()),

-- 3. Keto-broccoli-suppe
('keto-broccoli-suppe',
 '{"da": "Cremet keto broccoli-ost-suppe", "en": "Creamy Keto Broccoli Cheese Soup", "se": "Krämig keto broccoli-ostsoppa"}'::jsonb,
 '{"da": "En tyk, fløjlsblød suppe med broccoli, cheddar og fløde. Perfekt comfort food med minimal kulhydrat.", "en": "A thick, velvety soup with broccoli, cheddar, and cream. Perfect comfort food with minimal carbs.", "se": "En tjock, sammetslen soppa med broccoli, cheddar och grädde. Perfekt comfort food med minimala kolhydrater."}'::jsonb,
 '[{"full_text": "400g broccoli-buketter", "amount": 400, "unit": "g", "name": "broccoli"},
   {"full_text": "200ml piskefløde", "amount": 200, "unit": "ml", "name": "piskefløde"},
   {"full_text": "150g revet cheddar", "amount": 150, "unit": "g", "name": "cheddar"},
   {"full_text": "500ml kyllingebouillon", "amount": 500, "unit": "ml", "name": "kyllingebouillon"},
   {"full_text": "30g smør", "amount": 30, "unit": "g", "name": "smør"},
   {"full_text": "1 lille løg, hakket", "amount": 1, "unit": "stk", "name": "løg"},
   {"full_text": "2 fed hvidløg", "amount": 2, "unit": "fed", "name": "hvidløg"},
   {"full_text": "Salt, peber og muskatnød", "name": "krydderier"}]'::jsonb,
 '[{"step_number": 1, "step_text": "Smelt smør i en gryde. Svits løg og hvidløg i 3 minutter."},
   {"step_number": 2, "step_text": "Tilsæt broccoli og bouillon. Kog op og simre i 15 minutter til broccoli er blød."},
   {"step_number": 3, "step_text": "Blend suppen glat med en stavblender. Tilsæt fløde og ost, rør til osten er smeltet."},
   {"step_number": 4, "step_text": "Krydr med salt, peber og muskatnød. Server med ekstra revet ost på toppen."}]'::jsonb,
 350, 18, 28, 8, 3, 10, 20, 4, 'easy',
 ARRAY['Suppe', 'Hovedret'], ARRAY['broccoli', 'ost', 'comfort'],
 'published', false, NOW()),

-- 4. Keto-bøf med svampe
('keto-boef-med-svampe',
 '{"da": "Keto-bøf med champignon-flødesauce", "en": "Keto Steak with Mushroom Cream Sauce", "se": "Keto-biff med champinjon-gräddsås"}'::jsonb,
 '{"da": "Saftig oksebøf med en rig champignon-flødesauce. Restaurant-kvalitet på under 30 minutter.", "en": "Juicy beef steak with a rich mushroom cream sauce. Restaurant quality in under 30 minutes.", "se": "Saftig oxbiff med en rik champinjon-gräddsås. Restaurangkvalitet på under 30 minuter."}'::jsonb,
 '[{"full_text": "2 oksebøffer à 200g", "amount": 2, "unit": "stk", "name": "oksebøf"},
   {"full_text": "200g champignon, i skiver", "amount": 200, "unit": "g", "name": "champignon"},
   {"full_text": "150ml piskefløde", "amount": 150, "unit": "ml", "name": "piskefløde"},
   {"full_text": "30g smør", "amount": 30, "unit": "g", "name": "smør"},
   {"full_text": "2 fed hvidløg", "amount": 2, "unit": "fed", "name": "hvidløg"},
   {"full_text": "1 spsk frisk timian", "amount": 1, "unit": "spsk", "name": "timian"},
   {"full_text": "Salt og peber", "name": "salt og peber"}]'::jsonb,
 '[{"step_number": 1, "step_text": "Tag bøfferne ud af køleskabet 30 min før. Krydr godt med salt og peber."},
   {"step_number": 2, "step_text": "Opvarm en pande til høj varme. Steg bøfferne i smør 3-4 min per side (medium). Lad dem hvile."},
   {"step_number": 3, "step_text": "I samme pande: steg champignon i 5 minutter. Tilsæt hvidløg og timian."},
   {"step_number": 4, "step_text": "Tilsæt fløde, kog op og lad simre 3-4 min til saucen er reduceret."},
   {"step_number": 5, "step_text": "Server bøfferne med champignon-flødesauce hældt over."}]'::jsonb,
 550, 42, 40, 4, 1, 5, 20, 2, 'medium',
 ARRAY['Kød', 'Hovedret'], ARRAY['bøf', 'champignon', 'fløde'],
 'published', true, NOW()),

-- 5. Keto-pandekager
('keto-pandekager',
 '{"da": "Keto-pandekager med flødeost", "en": "Keto Cream Cheese Pancakes", "se": "Keto-pannkakor med färskost"}'::jsonb,
 '{"da": "Lette, luftige pandekager lavet med flødeost og mandelmel. Kun 2g netto kulhydrater per portion.", "en": "Light, fluffy pancakes made with cream cheese and almond flour. Only 2g net carbs per serving.", "se": "Lätta, luftiga pannkakor gjorda med färskost och mandelmjöl. Bara 2g netto kolhydrater per portion."}'::jsonb,
 '[{"full_text": "100g flødeost", "amount": 100, "unit": "g", "name": "flødeost"},
   {"full_text": "4 æg", "amount": 4, "unit": "stk", "name": "æg"},
   {"full_text": "40g mandelmel", "amount": 40, "unit": "g", "name": "mandelmel"},
   {"full_text": "1 tsk vaniljeekstrakt", "amount": 1, "unit": "tsk", "name": "vaniljeekstrakt"},
   {"full_text": "1 tsk bagepulver", "amount": 1, "unit": "tsk", "name": "bagepulver"},
   {"full_text": "Smør til stegning", "name": "smør"},
   {"full_text": "Bær til topping (valgfrit)", "name": "bær"}]'::jsonb,
 '[{"step_number": 1, "step_text": "Blend flødeost, æg, mandelmel, vanilje og bagepulver glat i en blender."},
   {"step_number": 2, "step_text": "Lad dejen hvile 2 minutter, så bagepulveren aktiveres."},
   {"step_number": 3, "step_text": "Opvarm en pande med smør på medium varme. Hæld ca. 3 spsk dej per pandekage."},
   {"step_number": 4, "step_text": "Steg 2-3 minutter per side til de er gyldne. Gentag med resten af dejen."},
   {"step_number": 5, "step_text": "Server med et par friske bær eller et drys kanel."}]'::jsonb,
 280, 18, 22, 3, 1, 5, 10, 2, 'easy',
 ARRAY['Morgenmad', 'Dessert'], ARRAY['pandekager', 'flødeost', 'hurtig'],
 'published', false, NOW()),

-- 6. Keto Cæsarsalat
('keto-caesarsalat',
 '{"da": "Keto Cæsarsalat med kylling", "en": "Keto Caesar Salad with Chicken", "se": "Keto Caesarsallad med kyckling"}'::jsonb,
 '{"da": "Klassisk cæsarsalat med grillet kylling, parmesan og hjemmelavet keto-dressing uden croutoner.", "en": "Classic Caesar salad with grilled chicken, parmesan, and homemade keto dressing without croutons.", "se": "Klassisk caesarsallad med grillad kyckling, parmesan och hemlagad keto-dressing utan krutonger."}'::jsonb,
 '[{"full_text": "2 kyllingebryster", "amount": 2, "unit": "stk", "name": "kyllingebryst"},
   {"full_text": "1 stort romainhjerte", "amount": 1, "unit": "stk", "name": "romaine"},
   {"full_text": "50g revet parmesan", "amount": 50, "unit": "g", "name": "parmesan"},
   {"full_text": "3 spsk mayonnaise", "amount": 3, "unit": "spsk", "name": "mayonnaise"},
   {"full_text": "1 spsk citronsaft", "amount": 1, "unit": "spsk", "name": "citronsaft"},
   {"full_text": "1 fed hvidløg, presset", "amount": 1, "unit": "fed", "name": "hvidløg"},
   {"full_text": "1 tsk dijon-sennep", "amount": 1, "unit": "tsk", "name": "dijon"},
   {"full_text": "Salt og peber", "name": "salt og peber"}]'::jsonb,
 '[{"step_number": 1, "step_text": "Krydr kyllingebrysterne med salt og peber. Gril eller steg dem 6-7 min per side. Lad dem hvile og skær i skiver."},
   {"step_number": 2, "step_text": "Lav dressing: Bland mayonnaise, citronsaft, hvidløg, dijon og halvdelen af parmesanen."},
   {"step_number": 3, "step_text": "Riv romaine i mundfulde stykker. Vend med dressingen."},
   {"step_number": 4, "step_text": "Anret med kyllingeskiver og drys med resten af parmesanen."}]'::jsonb,
 450, 45, 28, 3, 1, 10, 15, 2, 'easy',
 ARRAY['Salat', 'Hovedret'], ARRAY['kylling', 'salat', 'klassiker'],
 'published', false, NOW());


-- ═══════════════════════════════════════════════════════════════
-- SEED DATA: Sample Articles (4 articles)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO articles (slug, title, content, summary, source_url, source_title, category, tags, status, featured, published_at, original_published_at) VALUES

-- 1. Keto & hjernefunktion
('keto-og-hjernefunktion',
 '{"da": "Ketose og hjernefunktion: Hvad forskningen viser", "en": "Ketosis and Brain Function: What Research Shows", "se": "Ketos och hjärnfunktion: Vad forskningen visar"}'::jsonb,
 '{"da": "<h2>Ketoner som brændstof for hjernen</h2><p>Hjernen er et af de mest energikrævende organer i kroppen. Normalt bruger den glukose, men under ketose kan hjernen bruge ketoner (beta-hydroxybutyrat) som en effektiv alternativ energikilde.</p><p>Forskning fra Journal of Cerebral Blood Flow & Metabolism viser, at ketoner kan levere op til 60-70% af hjernens energibehov under ketose. Dette er særligt interessant, fordi ketoner synes at være en mere effektiv energikilde end glukose for neuroner.</p><h2>Kognitive fordele</h2><p>Flere studier peger på, at ketose kan forbedre kognitiv funktion. En systematisk gennemgang publiceret i Nutrients fandt forbedringer i opmærksomhed, hukommelse og mental klarhed hos personer i ernæringsketose.</p><p>Mekanismerne inkluderer øget mitokondriefunktion, reduceret oxidativt stress og forbedret neuronal signalering. BHB (beta-hydroxybutyrat) fungerer også som en signalmolekyle, der kan aktivere gener involveret i neuroprotection.</p><h2>Keto og neurodegenerative sygdomme</h2><p>Ketogendiæten blev oprindeligt udviklet i 1920erne til behandling af epilepsi, og den bruges stadig klinisk i dag. Nyere forskning undersøger dens potentiale ved Alzheimers, Parkinsons og andre neurodegenerative tilstande.</p>", "en": "<h2>Ketones as Brain Fuel</h2><p>The brain is one of the most energy-demanding organs in the body. Normally it uses glucose, but during ketosis the brain can use ketones (beta-hydroxybutyrate) as an efficient alternative energy source.</p><p>Research from the Journal of Cerebral Blood Flow & Metabolism shows that ketones can provide up to 60-70% of the brain''s energy needs during ketosis. This is particularly interesting because ketones appear to be a more efficient energy source than glucose for neurons.</p><h2>Cognitive Benefits</h2><p>Several studies suggest that ketosis can improve cognitive function. A systematic review published in Nutrients found improvements in attention, memory, and mental clarity in individuals in nutritional ketosis.</p>", "se": "<h2>Ketoner som bränsle för hjärnan</h2><p>Hjärnan är ett av de mest energikrävande organen i kroppen. Normalt använder den glukos, men under ketos kan hjärnan använda ketoner (beta-hydroxybutyrat) som en effektiv alternativ energikälla.</p>"}'::jsonb,
 '{"da": "Forskning viser, at ketoner kan levere op til 70% af hjernens energibehov og potentielt forbedre kognitiv funktion, hukommelse og mental klarhed.", "en": "Research shows that ketones can provide up to 70% of the brain''s energy needs and potentially improve cognitive function, memory, and mental clarity.", "se": "Forskning visar att ketoner kan leverera upp till 70% av hjärnans energibehov och potentiellt förbättra kognitiv funktion, minne och mental klarhet."}'::jsonb,
 'https://pubmed.ncbi.nlm.nih.gov/33440168/', 'Journal of Cerebral Blood Flow & Metabolism',
 'keto', ARRAY['hjerne', 'ketoner', 'kognitiv'], 'published', true, NOW() - INTERVAL '2 days', '2024-06-15'),

-- 2. Intermitterende faste og metabolisme
('intermitterende-faste-metabolisme',
 '{"da": "Intermitterende faste: Effekter på metabolisme og vægttab", "en": "Intermittent Fasting: Effects on Metabolism and Weight Loss", "se": "Intermittent fasta: Effekter på metabolism och viktminskning"}'::jsonb,
 '{"da": "<h2>Hvad sker der i kroppen under faste?</h2><p>Når du faster, gennemgår kroppen en række metaboliske ændringer. Efter 12-16 timers faste falder insulinniveauet markant, hvilket sætter gang i fedtforbrændingen. Kroppen skifter fra at bruge glukose til at mobilisere fedtlagre.</p><p>En meta-analyse publiceret i Annual Review of Nutrition analyserede 27 studier og fandt, at intermitterende faste var lige så effektivt som traditionel kalorirestriktion til vægttab, men med bedre bevaring af muskelmasse.</p><h2>16:8-metoden</h2><p>Den mest populære fasteprotokol er 16:8, hvor man faster i 16 timer og spiser inden for et 8-timers vindue. Studier viser, at dette mønster kan reducere kropsfedt med 3-8% over 3-12 uger.</p><h2>Faste og autophagy</h2><p>En af de mest fascinerende aspekter af faste er autophagy — kroppens naturlige celleoprydningsproces. Under faste begynder cellerne at nedbryde og genbruge beskadigede proteiner og organeller, hvilket er blevet forbundet med anti-aging-effekter.</p>", "en": "<h2>What Happens in Your Body During Fasting?</h2><p>When you fast, your body undergoes a series of metabolic changes. After 12-16 hours of fasting, insulin levels drop significantly, kickstarting fat burning. Your body shifts from using glucose to mobilizing fat stores.</p>", "se": "<h2>Vad händer i kroppen under fasta?</h2><p>När du fastar genomgår kroppen en rad metaboliska förändringar. Efter 12-16 timmars fasta sjunker insulinnivån markant, vilket sätter igång fettförbränningen.</p>"}'::jsonb,
 '{"da": "Forskning viser, at intermitterende faste kan være lige så effektivt som kalorirestriktion til vægttab — med bedre bevaring af muskelmasse og aktivering af autophagy.", "en": "Research shows intermittent fasting can be as effective as calorie restriction for weight loss — with better muscle preservation and autophagy activation.", "se": "Forskning visar att intermittent fasta kan vara lika effektivt som kalorierestriktion för viktminskning — med bättre bevarande av muskelmassa."}'::jsonb,
 'https://pubmed.ncbi.nlm.nih.gov/34633860/', 'Annual Review of Nutrition',
 'fasting', ARRAY['faste', 'metabolisme', 'vægttab', 'autophagy'], 'published', true, NOW() - INTERVAL '5 days', '2024-04-20'),

-- 3. Keto og kolesterol
('keto-og-kolesterol',
 '{"da": "Keto og kolesterol: Fakta vs. myter", "en": "Keto and Cholesterol: Facts vs. Myths", "se": "Keto och kolesterol: Fakta vs. myter"}'::jsonb,
 '{"da": "<h2>Kolesterol-frygten</h2><p>En af de mest almindelige bekymringer ved keto-diæten er dens effekt på kolesterol. Mange frygter, at det høje fedtindtag vil øge kolesterolet markant. Virkeligheden er mere nuanceret.</p><p>En stor meta-analyse publiceret i British Journal of Nutrition, der omfattede over 1.200 deltagere, fandt at lavkulhydrat-diæter typisk fører til en stigning i HDL (det gode kolesterol) og et fald i triglycerider — begge positive markører for hjertesundhed.</p><h2>LDL-partikler er ikke ens</h2><p>LDL-kolesterol stiger hos nogle på keto, men forskningen skelner mellem store, bløde LDL-partikler (type A) og små, tætte partikler (type B). Keto-diæter synes primært at øge type A, som anses for at være mindre aterosklerotiske.</p><h2>Den samlede risikoprofil</h2><p>Når man ser på den samlede kardiovaskulære risikoprofil — triglycerider, HDL, blodsukker, insulinresistens og blodtryk — forbedrer keto-diæten typisk flere af disse markører samtidig.</p>", "en": "<h2>The Cholesterol Fear</h2><p>One of the most common concerns about the keto diet is its effect on cholesterol. Many fear that the high fat intake will significantly raise cholesterol. The reality is more nuanced.</p>", "se": "<h2>Kolesterolrädslan</h2><p>En av de vanligaste oron kring keto-dieten är dess effekt på kolesterol.</p>"}'::jsonb,
 '{"da": "Meta-analyser viser, at keto typisk øger HDL og sænker triglycerider. LDL kan stige, men primært den mindre skadelige type A.", "en": "Meta-analyses show keto typically increases HDL and lowers triglycerides. LDL may rise, but primarily the less harmful type A particles.", "se": "Meta-analyser visar att keto typiskt ökar HDL och sänker triglycerider."}'::jsonb,
 'https://pubmed.ncbi.nlm.nih.gov/33264437/', 'British Journal of Nutrition',
 'keto', ARRAY['kolesterol', 'hjertesundhed', 'fedt'], 'published', true, NOW() - INTERVAL '8 days', '2024-03-10'),

-- 4. Faste og inflammation
('faste-og-inflammation',
 '{"da": "Faste reducerer inflammation: Ny forskning", "en": "Fasting Reduces Inflammation: New Research", "se": "Fasta minskar inflammation: Ny forskning"}'::jsonb,
 '{"da": "<h2>Kronisk inflammation og sundhed</h2><p>Kronisk lavgradig inflammation er knyttet til en lang række sygdomme, herunder type 2-diabetes, hjertesygdomme, cancer og Alzheimers. Nyere forskning peger på, at intermitterende faste kan reducere inflammationsmarkører betydeligt.</p><p>Et studie fra Cell Research viste, at faste aktiverer en anti-inflammatorisk respons ved at reducere produktionen af inflammatoriske monocytter. Forskerne fandt, at blot 19 timers faste markant reducerede antallet af cirkulerende monocytter.</p><h2>NLRP3-inflammasomet</h2><p>Faste synes også at hæmme NLRP3-inflammasomet — et proteinkompleks i immunsystemet, der driver inflammation. BHB (beta-hydroxybutyrat), som produceres under faste og ketose, er vist at direkte hæmme NLRP3.</p><h2>Praktiske anbefalinger</h2><p>For anti-inflammatoriske fordele anbefaler forskningen en fasteperiode på mindst 16-18 timer. Kombineret med en anti-inflammatorisk kost rig på omega-3 fedtsyrer og antioxidanter kan effekten forstærkes.</p>", "en": "<h2>Chronic Inflammation and Health</h2><p>Chronic low-grade inflammation is linked to a wide range of diseases, including type 2 diabetes, heart disease, cancer, and Alzheimer''s. Recent research suggests that intermittent fasting can significantly reduce inflammation markers.</p>", "se": "<h2>Kronisk inflammation och hälsa</h2><p>Kronisk låggradig inflammation är kopplad till en lång rad sjukdomar.</p>"}'::jsonb,
 '{"da": "Studier viser, at faste kan reducere kronisk inflammation ved at hæmme NLRP3-inflammasomet og reducere inflammatoriske monocytter.", "en": "Studies show fasting can reduce chronic inflammation by inhibiting the NLRP3 inflammasome and reducing inflammatory monocytes.", "se": "Studier visar att fasta kan minska kronisk inflammation genom att hämma NLRP3-inflammasomen."}'::jsonb,
 'https://pubmed.ncbi.nlm.nih.gov/31230828/', 'Cell Research',
 'fasting', ARRAY['inflammation', 'immunsystem', 'faste'], 'published', false, NOW() - INTERVAL '12 days', '2024-02-28');
