import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/app/api/admin/actions";

type IncomingRow = {
  company?: unknown;
  website?: unknown;
  email?: unknown;
  phone?: unknown;
  meta?: unknown;
};

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeRow(r: IncomingRow) {
  const company = toText(r.company);
  if (!company) return null;

  const website = toText(r.website);
  const email = toText(r.email);
  const phone = toText(r.phone);

  let meta: any = {};
  if (r.meta && typeof r.meta === "object") meta = r.meta;
  else if (typeof r.meta === "string") {
    try {
      meta = JSON.parse(r.meta);
    } catch {
      meta = { raw: r.meta };
    }
  } else meta = {};

  return { company, website, email, phone, meta };
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth(request);
    await requireAdmin(supabase);

    const body = await request.json().catch(() => ({}));
    const rows = Array.isArray(body?.rows) ? (body.rows as IncomingRow[]) : [];
    if (rows.length === 0) return NextResponse.json({ error: "rows required" }, { status: 400 });

    const normalized = rows.map(normalizeRow).filter(Boolean) as any[];
    if (normalized.length === 0) return NextResponse.json({ error: "no valid rows" }, { status: 400 });

    const { data: inserted, error: insErr } = await supabase.from("leads").insert(normalized).select("id");
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

    const imported = inserted?.length ?? normalized.length;

    const { error: auditErr } = await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "import_leads",
      entity: "leads",
      entity_id: null,
      meta: { imported },
    });
    if (auditErr) return NextResponse.json({ error: auditErr.message }, { status: 400 });

    return NextResponse.json({ success: true, imported });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 401 });
  }
}
