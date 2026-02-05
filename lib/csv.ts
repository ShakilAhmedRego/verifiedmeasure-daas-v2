export type LeadRow = {
  company: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  meta?: Record<string, unknown> | null;
};

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseLeadsCSV(csvText: string): LeadRow[] {
  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows: LeadRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const obj: any = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = cols[j] ?? "";

    const company = String(obj.company ?? obj.company_name ?? obj.name ?? "").trim();
    if (!company) continue;

    const website = String(obj.website ?? obj.domain ?? "").trim() || null;
    const email = String(obj.email ?? "").trim() || null;
    const phone = String(obj.phone ?? obj.phone_number ?? "").trim() || null;

    let meta: Record<string, unknown> | null = null;
    const metaRaw = String(obj.meta ?? "").trim();
    if (metaRaw) {
      try {
        meta = JSON.parse(metaRaw);
      } catch {
        meta = { raw: metaRaw };
      }
    } else {
      // include any extra columns as meta (excluding base fields)
      const extras: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (["company", "company_name", "name", "website", "domain", "email", "phone", "phone_number", "meta"].includes(k)) continue;
        const vv = String(v ?? "").trim();
        if (vv) extras[k] = vv;
      }
      meta = Object.keys(extras).length ? extras : null;
    }

    rows.push({ company, website, email, phone, meta });
  }

  return rows;
}
