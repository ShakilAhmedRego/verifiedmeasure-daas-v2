const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "live.com",
]);

export function isWorkEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  const m = e.match(/^[^@]+@([^@]+)$/);
  if (!m) return false;
  const domain = m[1];
  return !PERSONAL_DOMAINS.has(domain);
}
