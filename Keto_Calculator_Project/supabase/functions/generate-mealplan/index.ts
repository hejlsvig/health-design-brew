// Supabase Edge Function: generate-mealplan
// Accepts meal plan parameters, builds the OpenAI prompt server-side,
// and returns the generated meal plan.
// Deploy: supabase functions deploy generate-mealplan
// Set secret: supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ── Helper: build the meal plan prompt from user parameters ──

function buildMealPlanPrompt(params: Record<string, unknown>): string {
  const lang = params.language === 'en' ? 'English' : params.language === 'se' ? 'Swedish' : 'Danish'
  const gender = params.gender === 'male' ? 'mand' : 'kvinde'
  const units = params.units === 'imperial' ? 'imperial (lbs/inches)' : 'metrisk (kg/cm)'

  const excludedRaw = params.excluded_ingredients
  let excludedList = ''
  if (excludedRaw) {
    try {
      const parsed = typeof excludedRaw === 'string' ? JSON.parse(excludedRaw) : excludedRaw
      if (Array.isArray(parsed) && parsed.length > 0) {
        excludedList = parsed.join(', ')
      }
    } catch {
      excludedList = String(excludedRaw)
    }
  }

  const healthNotes: string[] = []
  if (params.health_anti_inflammatory) healthNotes.push('Focus on anti-inflammatory ingredients')
  if (params.health_avoid_processed) healthNotes.push('Avoid processed ingredients')

  return `Generate a personalized keto meal plan with the following specifications:

**Person:**
- Name: ${params.name || 'Client'}
- Gender: ${gender}
- Age: ${params.age || 30}
- Weight: ${params.weight || 70} kg
- Height: ${params.height || 170} cm
- Activity level: ${params.activity || 'moderate'}
- Daily calories: ${params.daily_calories || 1800} kcal
- Unit system: ${units}

**Meal Plan Preferences:**
- Meals per day: ${params.meals_per_day || 3}
- Number of days: ${params.num_days || 7}
- Preparation time: ${params.prep_time || 'medium'}
- Budget: ${params.budget || 'medium'}
- Leftovers strategy: ${params.leftovers_strategy || 'daily'}
- Diet type: ${params.diet_type || 'Custom Keto'}
${params.weight_goal ? `- Weight goal adjustment: ${params.weight_goal} kg` : ''}

${excludedList ? `**Excluded ingredients:** ${excludedList}` : ''}
${healthNotes.length > 0 ? `**Health preferences:** ${healthNotes.join(', ')}` : ''}

**Instructions:**
1. Create a detailed meal plan for ${params.num_days || 7} days
2. Each day should have ${params.meals_per_day || 3} meals
3. Include macro breakdown (protein, fat, carbs) for each meal
4. Include a shopping list organized by category
5. Keep total daily calories close to ${params.daily_calories || 1800} kcal
6. All recipes should be keto-friendly (< 20g net carbs per day)
7. Respond in ${lang}
8. Use markdown formatting with headers (##, ###), bold, and lists
9. Include preparation time estimates for each meal`
}

// ── Main handler ──

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify authentication (any authenticated user, not just admin)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Ingen autorisering' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Ikke autoriseret — log ind for at generere en kostplan' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Get the OpenAI API key from secrets
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API nøgle er ikke konfigureret på serveren. Kontakt administrator.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse request body (meal plan parameters)
    const body = await req.json()

    // Support both formats:
    // A) New format: flat meal plan params (name, language, daily_calories, etc.)
    // B) Legacy format: OpenAI messages array
    let messages: Array<{ role: string; content: string }>

    if (body.messages && Array.isArray(body.messages)) {
      // Legacy format — pass through
      messages = body.messages
    } else if (body.name || body.daily_calories || body.meals_per_day) {
      // New format — build prompt from parameters
      const prompt = buildMealPlanPrompt(body)
      messages = [
        {
          role: 'system',
          content: 'You are a professional nutritionist specializing in ketogenic diets. You create detailed, practical meal plans with accurate macro calculations. Always respond in the language requested by the user.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]
    } else {
      return new Response(JSON.stringify({ error: 'Ugyldigt request — send enten kostplan-parametre eller messages-array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Call OpenAI API
    const model = body.model || 'gpt-4o-mini'
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: body.max_completion_tokens || 16000,
        ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      return new Response(JSON.stringify({
        error: (err as Record<string, Record<string, string>>).error?.message || `OpenAI API fejl (${openaiRes.status})`,
      }), {
        status: openaiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const completion = await openaiRes.json()
    const mealPlanContent = completion.choices?.[0]?.message?.content || ''

    // 5. Save the generated meal plan to the user's profile
    if (mealPlanContent && user.id) {
      try {
        await supabase
          .from('profiles')
          .update({
            latest_meal_plan: mealPlanContent,
            meal_plan_generated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      } catch (saveErr) {
        // Non-fatal — log but don't fail the request
        console.warn('[generate-mealplan] Failed to save meal plan to profile:', saveErr)
      }
    }

    // 6. Return the meal plan
    return new Response(JSON.stringify({
      mealPlan: mealPlanContent,
      model,
      usage: completion.usage,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Ukendt fejl' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
