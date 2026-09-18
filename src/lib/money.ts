/**
 * Currency-aware money formatting for orders (admin + customer views).
 * Orders store their own `currency` ('INR' | 'USD' | …) and amounts already in that
 * currency — so we must format with the matching symbol, never a hardcoded ₹.
 */

export function currencySymbol(currency?: string | null): string {
  const c = (currency || 'INR').toUpperCase();
  if (c === 'INR') return '₹';
  if (c === 'USD') return '$';
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  if (c === 'CAD') return 'C$';
  if (c === 'AUD') return 'A$';
  if (c === 'SGD') return 'S$';
  if (c === 'AED') return 'د.إ';
  if (c === 'MYR') return 'RM';
  if (['NPR', 'LKR', 'PKR', 'BDT', 'BTN'].includes(c)) return 'Rs.';
  return c + ' ';
}

export const EXCHANGE_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 85,
  GBP: 110,
  EUR: 92,
  CAD: 62,
  AUD: 56,
  AED: 23,
  SGD: 64,
  MYR: 19,
  NPR: 1,
  LKR: 1,
  PKR: 1,
  BDT: 1,
  BTN: 1,
};

/**
 * Returns the amount converted into Indian Rupees (INR).
 * Prioritizes a saved INR amount (from payment gateway settlement if available),
 * then checks if currency is already INR, or converts using standard exchange rate table.
 */
export function getInrEquivalent(
  amount: number | null | undefined,
  currency?: string | null,
  savedInrAmount?: number | null
): number {
  if (savedInrAmount !== undefined && savedInrAmount !== null && savedInrAmount > 0) {
    return savedInrAmount;
  }
  const n = Number(amount) || 0;
  const c = (currency || 'INR').toUpperCase();
  const rate = EXCHANGE_RATES_TO_INR[c] || 85;
  return Math.round(n * rate);
}

/** "₹1,499" / "$30" — symbol + locale-grouped amount in the order's own currency. */
export function formatMoney(amount: number | null | undefined, currency?: string | null): string {
  const c = (currency || 'INR').toUpperCase();
  const n = Number(amount) || 0;
  const locale = c === 'INR' ? 'en-IN' : 'en-US';
  return currencySymbol(c) + n.toLocaleString(locale, { maximumFractionDigits: 2 });
}
