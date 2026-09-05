/**
 * Utility functions for partner gateway codes.
 */

/**
 * Normalizes partner name to a clean, gateway-safe uppercase code containing strictly [A-Z0-9].
 * - Strips Vietnamese diacritics (đ -> D, é -> E, etc.)
 * - Strips all non-alphanumeric characters (no spaces, dashes, or underscores)
 * - Converts to uppercase
 * - Limits to 32 characters (database column limit)
 */
export function toGatewayCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

/**
 * Generates a fallback gateway code client-side containing strictly [A-Z0-9] (e.g. GWA7B9C2).
 */
export function generateClientGatewayCode(prefix = "GW"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}${rand}` : rand;
}
