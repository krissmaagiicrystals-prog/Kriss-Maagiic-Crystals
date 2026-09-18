import crypto from 'crypto';

const CF_APP_ID  = process.env.CASHFREE_APP_ID || '';
const CF_SECRET  = process.env.CASHFREE_SECRET_KEY || '';
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'production';

const CASHFREE_BASE_URL = CASHFREE_ENV.toLowerCase() === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const API_VERSION = '2023-08-01';

function getHeaders() {
  return {
    'x-api-version': API_VERSION,
    'x-client-id': CF_APP_ID,
    'x-client-secret': CF_SECRET,
    'Content-Type': 'application/json',
  };
}

export function isCashfreeConfigured(): boolean {
  return !!CF_APP_ID && !!CF_SECRET;
}

export interface CashfreeOrderParams {
  orderId: string;       // our internal order/booking number used as CF order_id
  amount: number;        // INR or USD
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl?: string;
  meta?: Record<string, string>;
  currency?: string;
}

export interface CashfreeOrderResult {
  cfOrderId: string;
  paymentSessionId: string;
}

export function sanitizePhoneForCashfree(phone: string): string {
  if (!phone) return '9999999999';
  
  // Keep only digits and '+'
  let cleaned = phone.replace(/[^0-9+]/g, '');
  
  // If it starts with +, ensure it has a reasonable length
  if (cleaned.startsWith('+')) {
    if (cleaned.length >= 8) return cleaned;
    cleaned = cleaned.substring(1); // remove +
  }
  
  // If it's less than 10 digits, pad it with 0s (e.g. 987654321 -> 9876543210)
  if (cleaned.length < 10) {
    cleaned = cleaned.padEnd(10, '0');
  }
  
  // If it's a standard 10 digit number
  if (cleaned.length === 10) {
    return cleaned;
  }
  
  // If it's 11 digits starting with 0, strip leading 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.substring(1);
  }
  
  // If it's 12 digits starting with 91, convert to +91...
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  }
  
  // Default fallback (truncate if too long)
  return cleaned.substring(0, 15);
}

/** Creates a Cashfree order and returns the payment_session_id for the JS SDK. */
export async function createCashfreeOrder(
  params: CashfreeOrderParams,
): Promise<CashfreeOrderResult> {
  const body = {
    order_id: params.orderId,
    order_amount: params.amount,
    order_currency: params.currency || 'INR',
    customer_details: {
      customer_id: params.customerId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: sanitizePhoneForCashfree(params.customerPhone),
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
    },
    order_tags: params.meta,
  };

  const res = await fetch(`${CASHFREE_BASE_URL}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Cashfree order creation failed: ${JSON.stringify(data)}`);
  }

  return {
    cfOrderId: data.cf_order_id,
    paymentSessionId: data.payment_session_id,
  };
}

/** Fetches the Cashfree order and returns its status. */
export async function getCashfreeOrderStatus(
  cfOrderId: string,
): Promise<{ orderStatus: string; cfPaymentId?: string }> {
  const res = await fetch(`${CASHFREE_BASE_URL}/orders/${cfOrderId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Cashfree order fetch failed: ${JSON.stringify(data)}`);
  }

  return {
    orderStatus: data.order_status, // PAID | ACTIVE | EXPIRED | etc.
    cfPaymentId: data.cf_payment_id ?? undefined,
  };
}

/** Fetches payments for an order and returns the first successful cf_payment_id. */
export async function getCashfreePaymentId(cfOrderId: string): Promise<string | undefined> {
  const res = await fetch(`${CASHFREE_BASE_URL}/orders/${cfOrderId}/payments`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  // data is an array of payment objects
  const paid = Array.isArray(data)
    ? data.find((p: { payment_status: string }) => p.payment_status === 'SUCCESS')
    : null;
  return paid?.cf_payment_id ? String(paid.cf_payment_id) : undefined;
}

/**
 * Verifies the Cashfree webhook signature.
 * Signature = HMAC-SHA256(timestamp + rawBody, secretKey) as base64
 */
export function verifyCashfreeWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
): boolean {
  const secret = CF_SECRET;
  if (!secret) return false;
  const message = timestamp + rawBody;
  const expected = crypto.createHmac('sha256', secret).update(message).digest('base64');
  return expected === signature;
}
