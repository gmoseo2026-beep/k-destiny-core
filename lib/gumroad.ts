/**
 * Centralized Gumroad product links + email-prefill helper.
 *
 * WHY THIS EXISTS (revenue-critical):
 * The Gumroad webhook (`app/api/webhooks/gumroad/route.ts`) matches a purchase
 * to a K-Destiny account by EMAIL. If the buyer pays with a different email than
 * their account email, the webhook can't find the user and the purchase never
 * activates — the customer pays and gets nothing.
 *
 * By prefilling `?email=<accountEmail>` on every checkout link, we force the
 * Gumroad checkout to default to the account email, making webhook matching
 * reliable. `wanted=true` opens the Gumroad overlay/checkout directly to reduce
 * friction. Never send a user to a raw product URL without going through
 * `gumroadUrl()` while they are logged in.
 */

export const GUMROAD_PRODUCTS = {
  single: "https://moseo.gumroad.com/l/zmqhr", // Single Report — $2.99
  monthly: "https://moseo.gumroad.com/l/ykcjwk", // Monthly — $7.99
  annual: "https://moseo.gumroad.com/l/gywfqd", // Annual — $49.99
} as const;

export type GumroadProduct = keyof typeof GUMROAD_PRODUCTS;

/**
 * Build a checkout URL. When `email` is present, prefill it so the Gumroad
 * purchase email matches the account email (reliable webhook matching).
 */
export function gumroadUrl(
  product: GumroadProduct,
  email?: string | null
): string {
  const base = GUMROAD_PRODUCTS[product];
  const params = new URLSearchParams({ wanted: "true" });
  if (email) params.set("email", email.trim().toLowerCase());
  return `${base}?${params.toString()}`;
}
