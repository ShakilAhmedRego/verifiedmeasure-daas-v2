import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/app/api/admin/actions";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuth(request);
    await requireAdmin(supabase);

    const body = await request.json().catch(() => ({}));
    const user_id = String(body?.user_id ?? "").trim();
    const amount = Number(body?.amount);

    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "amount must be positive" }, { status: 400 });

    const { data: balBefore, error: balErr } = await supabase.rpc("get_user_balance", { in_user_id: user_id });
    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 400 });

    const { error: insErr } = await supabase.from("credit_ledger").insert({
      user_id,
      delta: Math.floor(amount),
      reason: "admin_grant",
      meta: { granted_by: user.id },
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

    const { data: balAfter, error: balAfterErr } = await supabase.rpc("get_user_balance", { in_user_id: user_id });
    if (balAfterErr) return NextResponse.json({ error: balAfterErr.message }, { status: 400 });

    const { error: auditErr } = await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "credit_grant",
      entity: "credit_ledger",
      entity_id: null,
      meta: { target_user_id: user_id, amount: Math.floor(amount) },
    });
    if (auditErr) return NextResponse.json({ error: auditErr.message }, { status: 400 });

    return NextResponse.json({ success: true, new_balance: balAfter ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 401 });
  }
}
