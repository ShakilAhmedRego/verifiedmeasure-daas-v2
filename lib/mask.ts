// lib/mask.ts
export function maskCompany(name?: string | null): string {
  const s = (name ?? "").trim();
  if (!s) return "—";
  if (s.length <= 2) return s[0] + "*";
  if (s.length <= 5) return s.slice(0, 2) + "*".repeat(s.length - 2);
  return s.slice(0, 3) + "*".repeat(Math.min(6, s.length - 3));
}

export function maskEmail(email?: string | null): string {
  const s = (email ?? "").trim();
  if (!s) return "—";
  const at = s.indexOf("@");
  if (at <= 0) return "***@***";
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const domainName = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";

  const localMasked =
    local.length <= 2 ? local[0] + "*" : local[0] + "*".repeat(Math.min(4, local.length - 1));

  const domainMasked =
    domainName.length <= 2 ? domainName[0] + "*" : domainName[0] + "*".repeat(Math.min(6, domainName.length - 1));

  return `${localMasked}@${domainMasked}${tld}`;
}

export function maskPhone(phone?: string | null): string {
  const s = (phone ?? "").trim();
  if (!s) return "—";
  // keep last 2 digits visible; mask the rest digits
  const digits = s.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const last2 = digits.slice(-2);
  // create a masked pattern that still looks like a phone
  return `***-***-**${last2}`;
}

export function safeMetaString(meta: any, key: string): string {
  const v = meta?.[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  return "—";
}
