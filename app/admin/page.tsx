"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { parseLeadsCSV, LeadRow } from "@/lib/csv";

export default function AdminPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [targetUserId, setTargetUserId] = useState("");
  const [amount, setAmount] = useState<number>(100);

  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<LeadRow[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setErr(sessionError.message);
        setLoading(false);
        return;
      }
      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }
      setToken(sessionData.session.access_token);

      const { data: adminData, error: adminError } = await supabase.rpc("is_admin");
      if (adminError) {
        setErr(adminError.message);
        setLoading(false);
        return;
      }
      setIsAdmin(Boolean(adminData));
      setLoading(false);
    })();
  }, [supabase]);

  useEffect(() => {
    const rows = parseLeadsCSV(csvText);
    setPreviewRows(rows.slice(0, 25));
  }, [csvText]);

  async function grantCredit() {
    setErr(null);
    if (!token) return;

    const uid = targetUserId.trim();
    if (!uid) {
      setErr("user_id required.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("amount must be a positive number.");
      return;
    }

    const res = await fetch("/api/admin/grant-credit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: uid, amount: amt }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json?.error || "Grant failed.");
      return;
    }
    alert(`Credit granted. New balance: ${json?.new_balance}`);
  }

  async function importLeads() {
    setErr(null);
    if (!token) return;

    const allRows = parseLeadsCSV(csvText);
    if (allRows.length === 0) {
      setErr("No rows parsed from CSV.");
      return;
    }

    setImporting(true);
    const res = await fetch("/api/admin/import-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rows: allRows }),
    });
    setImporting(false);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json?.error || "Import failed.");
      return;
    }
    alert(`Imported: ${json?.imported}`);
    setCsvText("");
  }

  if (loading) return <div className="text-sm text-neutral-400">Loading...</div>;
  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <div className="text-sm font-semibold">Admin</div>
        <div className="mt-2 text-sm text-neutral-400">You are not authorized to view this page.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-neutral-400">Admin actions are enforced via SECURITY DEFINER is_admin() + RLS.</p>
      </div>

      {err ? <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">{err}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <div className="text-sm font-semibold">Grant credit</div>
          <div className="mt-2 text-sm text-neutral-400">Creates an append-only credit_ledger entry for the target user.</div>

          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <div className="mb-1 text-neutral-300">Target user_id (uuid)</div>
              <input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-600"
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </label>

            <label className="block text-sm">
              <div className="mb-1 text-neutral-300">Amount</div>
              <input
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                type="number"
                min={1}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-600"
              />
            </label>

            <button onClick={grantCredit} className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950">
              Grant credit
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <div className="text-sm font-semibold">Import leads</div>
          <div className="mt-2 text-sm text-neutral-400">Paste CSV. Server route inserts into leads and writes audit_log.</div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="mt-4 h-40 w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-3 text-sm outline-none focus:border-neutral-600"
            placeholder="CSV headers example: company,website,email,phone,meta"
          />

          <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
            <div>Previewing first {previewRows.length} rows.</div>
            <button
              onClick={importLeads}
              disabled={importing}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800">
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-950">
                  <tr className="border-b border-neutral-800 text-xs text-neutral-400">
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Website</th>
                    <th className="px-3 py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, idx) => (
                    <tr key={idx} className="border-b border-neutral-900">
                      <td className="px-3 py-2 font-medium">{r.company}</td>
                      <td className="px-3 py-2 text-neutral-300">{r.website || "-"}</td>
                      <td className="px-3 py-2 text-neutral-300">{r.email || "-"}</td>
                    </tr>
                  ))}
                  {previewRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-neutral-500">
                        Paste CSV to preview.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 text-xs text-neutral-500">
            Note: company is required. Extra columns are preserved into meta.
          </div>
        </div>
      </div>
    </div>
  );
}
