/**
 * Supabase Edge Function: generate-mealplan
 * Generates a personalised keto meal plan using OpenAI.
 *
 * - Reads the system prompt from admin_settings ('mealplan_system_prompt')
 * - Reads the OpenAI API key from admin_settings ('openai_api_key')
 * - Reads the AI model from admin_settings ('ai_model')
 * - Accepts user profile data as POST body
 * - Returns the generated meal plan text (Markdown)
 *
 * POST body:
 * {
 *   name, language, gender, age, weight, height, activity,
 *   daily_calories, meals_per_day, num_days, prep_time,
 *   leftovers, leftovers_strategy, excluded_ingredients, diet_type,
 *   budget, health_anti_inflammatory, health_avoid_processed,
 *   weight_goal, units
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Read a setting from admin_settings */
async function getSetting(supabase: ReturnType<typeof createClient>, key: string): Promise<string | null> {
  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .single()
  return data?.value || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return jsonResponse({ error: 'Ikke autoriseret' }, 401)
    }

    // Parse request body
    const body = await req.json()
    const {
      name = 'Klient',
      language = 'da',
      gender,
      age,
      weight,
      height,
      activity,
      daily_calories,
      meals_per_day = 3,
      num_days = 7,
      prep_time,
      leftovers = false,
      leftovers_strategy = '',
      excluded_ingredients = '',
      diet_type = 'Custom Keto',
      budget = 'medium',
      health_anti_inflammatory = false,
      health_avoid_processed = false,
      weight_goal = 0,
      units = 'metric',
    } = body

    if (!daily_calories) {
      return jsonResponse({ error: 'daily_calories er påkrævet' }, 400)
    }

    // Fetch settings from admin_settings
    const [openaiKey, aiModel, systemPromptRaw] = await Promise.all([
      getSetting(supabase, 'openai_api_key'),
      getSetting(supabase, 'ai_model'),
      getSetting(supabase, 'mealplan_system_prompt'),
    ])

    if (!openaiKey) {
      return jsonResponse({ error: 'OpenAI API key er ikke konfigureret. Gå til Admin → Indstillinger.' }, 500)
    }

    const model = aiModel || 'gpt-5.2-chat-latest'

    // ---------- Build the user prompt ----------
    const langMap: Record<string, string> = { da: 'dansk', en: 'engelsk', se: 'svensk' }
    const activityMap: Record<string, string> = {
      sedentary: 'stillesiddende',
      light: 'let aktiv',
      moderate: 'moderat aktiv',
      active: 'meget aktiv',
      very_active: 'ekstrem aktiv',
    }
    const prepTimeMap: Record<string, string> = {
      quick: 'hurtige retter (15-20 min)',
      medium: 'medium (20-40 min)',
      long: 'ingen tidsbegrænsning (40+ min)',
      mix: 'blandet',
    }
    const budgetMap: Record<string, string> = {
      cheap: 'billigt (fokusér på prisbillige ingredienser som hakket kød, kyllingelår, æg, sæsongrøntsager)',
      medium: 'moderat budget (god variation, blandede udskæringer)',
      expensive: 'højt budget (premium ingredienser, fisk, oksemørbrad, lam tilladt)',
      mixed: 'blandet (variér mellem budget- og premium-dage)',
    }
    const leftoversMap: Record<string, string> = {
      daily: 'Lav frisk mad hver dag',
      batch: 'Batch-cooking: Lav større portioner til aftensmad og brug resterne som frokost/næste dags måltid',
      mixed: 'Blandet: Nogle dage frisk, andre dage med rester',
    }
    const weightGoalMap = (goal: number): string => {
      if (goal < -0.3) return 'Vægttab (kalorieunderskud)'
      if (goal > 0.3) return 'Vægtøgning (kalorieoverskud)'
      return 'Vægtvedligehold'
    }
    const countryMap: Record<string, string> = {
      da: 'Danmark — brug ingredienser der typisk kan købes i danske supermarkeder (Netto, Føtex, Rema 1000, Bilka)',
      en: 'International/UK/US — brug ingredienser der typisk kan købes i engelsktalende lande',
      se: 'Sverige — brug ingredienser der typisk kan købes i svenske supermarkeder (ICA, Coop, Hemköp)',
    }

    // Parse excluded ingredients
    let excludedList = 'ingen'
    if (excluded_ingredients) {
      try {
        const parsed = typeof excluded_ingredients === 'string'
          ? JSON.parse(excluded_ingredients)
          : excluded_ingredients
        if (Array.isArray(parsed) && parsed.length > 0) {
          excludedList = parsed.join(', ')
        }
      } catch {
        if (typeof excluded_ingredients === 'string' && excluded_ingredients.length > 0) {
          excludedList = excluded_ingredients
        }
      }
    }

    const measurementNote = units === 'imperial'
      ? 'Brug IMPERIALE mål i opskrifter (oz, lbs, cups, tbsp, tsp). Temperaturer i °F.'
      : 'Brug METRISKE mål i opskrifter (gram, dl, ml, spsk, tsk). Temperaturer i °C.'

    const healthNotes: string[] = []
    if (health_anti_inflammatory) {
      healthNotes.push('Anti-inflammatorisk fokus: Prioritér omega-3 rige fødevarer (fed fisk, valnødder, hørfrø), gurkemeje, ingefær. Undgå forarbejdede fedtstoffer og raffinerede olier.')
    }
    if (health_avoid_processed) {
      healthNotes.push('Undgå forarbejdede fødevarer: Ingen pølser, bacon-erstatninger, protein-barer, kunstige sødestoffer. Kun hele, uforarbejdede ingredienser.')
    }

    const userPrompt = `Lav en personlig ${num_days}-dages keto madplan på ${langMap[language] || 'dansk'}.

PERSON PROFIL:
- Navn: ${name}
- Køn: ${gender === 'male' ? 'Mand' : 'Kvinde'}
- Alder: ${age} år
- Vægt: ${weight} ${units === 'imperial' ? 'lbs' : 'kg'}
- Højde: ${height} ${units === 'imperial' ? 'inches' : 'cm'}
- Aktivitetsniveau: ${activityMap[activity] || activity}
- Mål: ${weightGoalMap(weight_goal)}
- Dagligt kaloriebehov: ${daily_calories} kcal (SKAL overholdes ±50 kcal per dag)
- Antal måltider per dag: ${meals_per_day}
- Tilberedningstid: ${prepTimeMap[prep_time] || prep_time}
- Budget: ${budgetMap[budget] || budget}
- Rester-strategi: ${leftovers_strategy ? (leftoversMap[leftovers_strategy] || leftovers_strategy) : (leftovers ? 'Batch-cooking med rester' : 'Frisk mad hver dag')}
- Ekskluderede ingredienser: ${excludedList}
- Diet type: ${diet_type}
- Land/tilgængelighed: ${countryMap[language] || countryMap['da']}
- Måleenheder: ${measurementNote}
${healthNotes.length > 0 ? '\nSUNDHEDSPRÆFERENCER:\n' + healthNotes.map(n => `- ${n}`).join('\n') : ''}

VIGTIGE REGLER FOR MÅLTIDER:
1. MORGENMAD skal være morgenmads-passende retter: æg, omeletter, pandekager (keto), smoothies, yoghurt-skåle, chia-puddinger, granola (keto). ALDRIG tungt kød (bøffer, entrecôte, lam), supper eller gryderet til morgenmad.
2. FROKOST kan være lettere retter: salater, wraps (salatblade), supper, rester fra aftensmad, omeletter.
3. AFTENSMAD er hovedmåltidet: Her må tungere retter bruges: bøffer, stege, gratiner, gryderetter, helstegt fisk.
4. Hvert måltid skal have KORREKT kaloriefordeling så dagens total matcher ${daily_calories} kcal.
5. Variér proteinkilder — brug ikke den samme protein (f.eks. kylling) mere end 2 dage i træk.
6. INGEN snacks — planen skal KUN indeholde de ${meals_per_day} hovedmåltider per dag. Fordel alle kalorier jævnt mellem hovedmåltiderne.

Lav ALLE ${num_days} dage med komplette opskrifter.${
  excludedList !== 'ingen'
    ? `\n\n⚠️ KRITISK: Du må ALDRIG bruge disse ingredienser: ${excludedList}. Brug alternativer!`
    : ''
}`

    // Default system prompt if none in admin_settings
    const defaultSystemPrompt =
      'Du er en professionel keto ernæringsekspert og kok. Du laver personlige, detaljerede madplaner med nøjagtige opskrifter, ingredienslister og næringsværdier.'

    const systemPrompt = systemPromptRaw || defaultSystemPrompt

    // Excluded ingredients warning appended to system prompt
    const excludedWarning =
      excludedList !== 'ingen'
        ? `\n\nKRITISK REGEL: Klienten har allergier/præferencer. Du må ALDRIG bruge disse ingredienser: ${excludedList}. Brug alternativer i stedet!`
        : ''

    console.log(`[generate-mealplan] model=${model}, calories=${daily_calories}, days=${num_days}`)

    // ---------- Call OpenAI ----------
    const startTime = Date.now()

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt + excludedWarning },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 16000,
      }),
    })

    if (!openaiResponse.ok) {
      const err = await openaiResponse.json().catch(() => ({}))
      const msg = (err as any)?.error?.message || `OpenAI API fejl: ${openaiResponse.status}`
      console.error('[generate-mealplan] OpenAI error:', msg)
      return jsonResponse({ error: msg }, 502)
    }

    const data = await openaiResponse.json()
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const mealPlanText = data.choices?.[0]?.message?.content?.trim()

    if (!mealPlanText) {
      return jsonResponse({ error: 'Tom respons fra OpenAI' }, 502)
    }

    console.log(`[generate-mealplan] Done in ${elapsed}s, tokens: ${JSON.stringify(data.usage)}`)

    return jsonResponse({
      mealPlan: mealPlanText,
      model,
      tokens: data.usage?.total_tokens || 0,
      elapsed: parseFloat(elapsed),
    })
  } catch (err) {
    console.error('[generate-mealplan] Error:', err)
    return jsonResponse({ error: (err as Error).message || 'Intern server fejl' }, 500)
  }
})
