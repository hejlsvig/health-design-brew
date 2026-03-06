/**
 * Stripe Webhook Edge Function
 *
 * Listens for Stripe subscription events and updates the `subscriptions` table.
 *
 * Required Supabase secrets:
 *   STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
 *
 * Required admin_settings:
 *   stripe_secret_key — Stripe secret key (sk_...)
 *
 * Supported events:
 *   - checkout.session.completed → create/update subscription
 *   - customer.subscription.updated → update tier/status/period
 *   - customer.subscription.deleted → mark subscription cancelled
 *   - invoice.payment_failed → mark subscription past_due
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook
 *
 * Stripe CLI test:
 *   stripe listen --forward-to https://<project>.supabase.co/functions/v1/stripe-webhook
 *   stripe trigger checkout.session.completed
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

// Use service role to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─── Stripe signature verification ───

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!secret) return false

  const parts = signature.split(',')
  const timestampPart = parts.find((p) => p.startsWith('t='))
  const sigPart = parts.find((p) => p.startsWith('v1='))

  if (!timestampPart || !sigPart) return false

  const timestamp = timestampPart.split('=')[1]
  const expectedSig = sigPart.split('=')[1]

  // Create signed payload
  const signedPayload = `${timestamp}.${payload}`

  // HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))

  // Convert to hex
  const hexSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return hexSig === expectedSig
}

// ─── Tier mapping from Stripe price ───

async function getTierFromPriceId(priceId: string): Promise<string> {
  // Look up price → tier mapping from admin_settings
  const { data } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', ['stripe_price_premium', 'stripe_price_pro'])

  const priceMap: Record<string, string> = {}
  for (const row of data || []) {
    priceMap[row.value] = row.key.replace('stripe_price_', '')
  }

  return priceMap[priceId] || 'premium'
}

// ─── Event handlers ───

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const clientReferenceId = session.client_reference_id as string // profile_id

  if (!clientReferenceId) {
    console.error('No client_reference_id in checkout session')
    return
  }

  // Update or create subscription
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        profile_id: clientReferenceId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' }
    )

  if (error) console.error('Checkout update error:', error)
  else console.log(`Subscription created for profile ${clientReferenceId}`)
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>) {
  const stripeSubId = subscription.id as string
  const status = subscription.status as string
  const cancelAtPeriodEnd = subscription.cancel_at_period_end as boolean
  const currentPeriodStart = subscription.current_period_start as number
  const currentPeriodEnd = subscription.current_period_end as number

  // Get price ID from subscription items
  const items = subscription.items as Record<string, unknown>
  const itemData = (items?.data as Record<string, unknown>[]) || []
  const priceId = (itemData[0]?.price as Record<string, unknown>)?.id as string

  const tier = priceId ? await getTierFromPriceId(priceId) : null

  // Map Stripe status → our status
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    trialing: 'trialing',
    incomplete: 'past_due',
    incomplete_expired: 'cancelled',
    unpaid: 'past_due',
  }

  const updateData: Record<string, unknown> = {
    status: statusMap[status] || 'active',
    cancel_at_period_end: cancelAtPeriodEnd,
    current_period_start: currentPeriodStart
      ? new Date(currentPeriodStart * 1000).toISOString()
      : null,
    current_period_end: currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }

  if (tier) updateData.tier = tier
  if (priceId) updateData.stripe_price_id = priceId

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', stripeSubId)

  if (error) console.error('Subscription update error:', error)
  else console.log(`Subscription ${stripeSubId} updated: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  const stripeSubId = subscription.id as string

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      tier: 'free',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubId)

  if (error) console.error('Subscription delete error:', error)
  else console.log(`Subscription ${stripeSubId} cancelled → free tier`)
}

async function handlePaymentFailed(invoice: Record<string, unknown>) {
  const stripeSubId = invoice.subscription as string
  if (!stripeSubId) return

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubId)

  if (error) console.error('Payment failed update error:', error)
  else console.log(`Subscription ${stripeSubId} marked past_due`)
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'stripe-signature, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    // Verify webhook signature
    if (STRIPE_WEBHOOK_SECRET) {
      const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)
      if (!isValid) {
        console.error('Invalid Stripe signature')
        return new Response('Invalid signature', { status: 400 })
      }
    } else {
      console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification')
    }

    const event = JSON.parse(body)
    console.log(`Stripe event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Webhook handler error', { status: 500 })
  }
})
