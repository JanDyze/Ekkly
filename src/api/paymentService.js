import { callPlatform } from './platformService'

// Paying by card, the browser's half (the server's is lib/platform/payments.js).
//
// The card itself goes from this page straight to PayMongo with the public
// key, so a card number never passes through Ekkly's server or its logs. The
// server only starts the subscription and, afterwards, asks PayMongo whether
// it was paid.

const PAYMONGO = 'https://api.paymongo.com/v1'
const publicKey = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY || ''

export const isCardPaymentAvailable = () => Boolean(publicKey)

const paymongo = async (path, attributes) => {
  const response = await fetch(`${PAYMONGO}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${publicKey}:`)}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ data: { attributes } }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.errors?.[0]?.detail || 'The card could not be used. Check the details and try again.')
  }
  return payload.data
}

/**
 * Starts card billing and pays the first charge.
 *
 * { cycle, card: { number, expMonth, expYear, cvc, name }, email, returnUrl }
 *   -> { status: 'succeeded' | 'processing' | 'redirect', redirectUrl? }
 *
 * 'redirect' means the bank wants 3-D Secure: the page leaves for the bank and
 * comes back to returnUrl, where syncCardBilling finishes the job.
 */
export async function payByCard({ cycle, card, email, returnUrl }) {
  const { paymentIntentId, clientKey } = await callPlatform('startCardBilling', { cycle })

  const method = await paymongo('/payment_methods', {
    type: 'card',
    details: {
      card_number: card.number.replace(/\s+/g, ''),
      exp_month: Number(card.expMonth),
      exp_year: Number(card.expYear),
      cvc: card.cvc,
    },
    billing: { name: card.name, email },
  })

  const intent = await paymongo(`/payment_intents/${paymentIntentId}/attach`, {
    payment_method: method.id,
    client_key: clientKey,
    return_url: returnUrl,
  })

  const status = intent.attributes?.status
  if (status === 'awaiting_next_action') {
    return { status: 'redirect', redirectUrl: intent.attributes?.next_action?.redirect?.url }
  }
  if (status === 'awaiting_payment_method') {
    throw new Error(intent.attributes?.last_payment_error?.failed_message || 'The card was declined. Try another card.')
  }
  return { status }
}

/** -> { card } after PayMongo's state is recorded. */
export const syncCardBilling = () => callPlatform('syncCardBilling')

/** -> { card }. Future charges stop; paid time stays. */
export const cancelCardBilling = () => callPlatform('cancelCardBilling')
