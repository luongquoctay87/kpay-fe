/** Generate a password that meets typical admin login policy (upper/lower/digit/special). */
export function generateLoginPassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "@$!%*?&";
  const all = upper + lower + digits + special;
  const pick = (alphabet: string) =>
    alphabet[crypto.getRandomValues(new Uint32Array(1))[0]! % alphabet.length]!;

  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = crypto.getRandomValues(new Uint32Array(Math.max(length - chars.length, 0)));
  for (const n of rest) {
    chars.push(all[n % all.length]!);
  }
  // Fisher–Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
