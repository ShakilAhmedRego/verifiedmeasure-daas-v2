import { NextResponse } from "next/server";
import { requireAuth } from "@/app/api/admin/actions";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth(request);

    const body = await request.json().catch(() => ({}));
    const lead_ids = Array.isArray(body?.lead_ids) ? body.lead_ids.map((x: any) => String(x)) : [];
    const access_type = String(body?.access_type ?? "download");

    const cleaned = lead_ids.filter((id: string) => /^[0-9a-fA-F-]{36}$/.test(id));
    if (cleaned.length === 0) return NextResponse.json({ error: "lead_ids required" }, { status: 400 });

    // Determine NEW leads only (not already entitled)
    const { data: existing, error: existErr } = await supabase
      .from("lead_access")
      .select("lead_id")
      .eq("user_id", user.id)
      .in("lead_id", cleaned);

    if (existErr) return NextResponse.json({ error: existErr.message }, { status: 400 });

    const existingSet = new Set<string>((existing ?? []).map((r: any) => r.lead_id));
    const newLeadIds = cleaned.filter((id: string) => !existingSet.has(id));

    const cost = newLeadIds.length;

    const { data: bal, error: balErr } = await supabase.rpc("get_user_balance", { in_user_id: user.id });
    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 400 });

    const balance = Number(bal ?? 0);
    if (balance < cost) return NextResponse.json({ error: "Insufficient credits." }, { status: 402 });

    if (cost > 0) {
      const accessRows = newLeadIds.map((lead_id: string) => ({ user_id: user.id, lead_id }));
      const { error: insAccessErr } = await supabase.from("lead_access").insert(accessRows);
      if (insAccessErr) return NextResponse.json({ error: insAccessErr.message }, { status: 400 });

      const { error: insLedgerErr } = await supabase.from("credit_ledger").insert({
        user_id: user.id,
        delta: -cost,
        reason: "claim_leads",
        meta: { access_type },
      });
      if (insLedgerErr) return NextResponse.json({ error: insLedgerErr.message }, { status: 400 });
    }

    const { data: newBal, error: newBalErr } = await supabase.rpc("get_user_balance", { in_user_id: user.id });
    if (newBalErr) return NextResponse.json({ error: newBalErr.message }, { status: 400 });

    const { error: auditErr } = await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "claim",
      entity: "lead_access",
      entity_id: null,
      meta: { requested: cleaned.length, newly_entitled: cost, access_type },
    });
    if (auditErr) return NextResponse.json({ error: auditErr.message }, { status: 400 });

    return NextResponse.json({
      success: true,
      cost,
      claimed: cleaned.length,
      newly_claimed_ids: newLeadIds,
      new_balance: newBal ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 401 });
  }
}
