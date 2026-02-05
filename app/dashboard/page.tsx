"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

type Lead = {
  id: string;
  company: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  meta: any;
  created_at: string;
};

type LeadAccessRow = { lead_id: string };

export default function DashboardPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [entitled, setEntitled] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const claimTypeRef = useRef<HTMLSelectElement | null>(null);

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

      const uid = sessionData.session.user.id;
      setUserId(uid);
      setToken(sessionData.session.access_token);

      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadsError) {
        setErr(leadsError.message);
        setLoading(false);
        return;
      }

      const { data: accessData, error: accessError } = await supabase
        .from("lead_access")
        .select("lead_id")
        .eq("user_id", uid);

      if (accessError) {
        setErr(accessError.message);
        setLoading(false);
        return;
      }

      const setIds = new Set<string>((accessData ?? []).map((r: LeadAccessRow) => r.lead_id));
      setEntitled(setIds);

      const { data: balData, error: balError } = await supabase.rpc("get_user_balance", { in_user_id: uid });
      if (balError) {
        setErr(balError.message);
        setLoading(false);
        return;
      }
      setBalance(Number(balData ?? 0));

      setLeads((leadsData ?? []) as Lead[]);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = leads.filter((l) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = `${l.company ?? ""} ${l.website ?? ""} ${l.email ?? ""} ${l.phone ?? ""} ${JSON.stringify(l.meta ?? {})}`.toLowerCase();
    return hay.includes(q);
  });

  const downloadedCount = entitled.size;
  const availableCount = Math.max(0, leads.length - downloadedCount);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllAvailable() {
    const ids = filtered.filter((l) => !entitled.has(l.id)).map((l) => l.id);
    setSelected(new Set(ids));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function claimSelected() {
    setErr(null);
    if (!token || !userId) return;

    const leadIds = Array.from(selected);
    if (leadIds.length === 0) {
      setErr("Select at least one lead.");
      return;
    }

    const accessType = claimTypeRef.current?.value || "download";
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ lead_ids: leadIds, access_type: accessType }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json?.error || "Claim failed.");
      return;
    }

    const newlyClaimed: string[] = json?.newly_claimed_ids ?? [];
    setEntitled((prev) => {
      const next = new Set(prev);
      for (const id of newlyClaimed) next.add(id);
      return next;
    });
    setBalance(Number(json?.new_balance ?? balance));
    setSelected(new Set());
  }

  if (loading) return <div className="text-sm text-neutral-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-neutral-300">
              Preview pool: {leads.length}
            </span>
            <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-neutral-300">
              Entitled: {downloadedCount}
            </span>
            <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-neutral-300">
              Available: {availableCount}
            </span>
            <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-neutral-300">
              Credits: {balance}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={signOut} className="rounded-xl border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900">
            Sign out
          </button>
        </div>
      </div>

      {err ? <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">{err}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 md:col-span-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-semibold">Preview pool</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600 md:max-w-sm"
              placeholder="Search company, email, meta…"
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-neutral-950">
                  <tr className="border-b border-neutral-800 text-xs text-neutral-400">
                    <th className="px-3 py-2">Select</th>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Website</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const isEntitled = entitled.has(l.id);
                    const isChecked = selected.has(l.id);
                    return (
                      <tr key={l.id} className="border-b border-neutral-900 hover:bg-neutral-950/40">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            disabled={isEntitled}
                            checked={isChecked}
                            onChange={() => toggleSelect(l.id)}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{l.company}</td>
                        <td className="px-3 py-2 text-neutral-300">{l.website || "-"}</td>
                        <td className="px-3 py-2 text-neutral-300">{l.email || "-"}</td>
                        <td className="px-3 py-2 text-neutral-300">{l.phone || "-"}</td>
                        <td className="px-3 py-2">
                          {isEntitled ? (
                            <span className="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-200">
                              Entitled
                            </span>
                          ) : (
                            <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-400">
                              Available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-neutral-500" colSpan={6}>
                        No leads match your search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <div className="text-sm font-semibold">Entitlement</div>
          <div className="mt-2 text-sm text-neutral-400">
            Claim creates entitlement records (lead_access). Cost applies only to NEW entitlement inserts.
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs text-neutral-500">Selected</div>
            <div className="text-2xl font-semibold">{selected.size}</div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs text-neutral-500">Access type</div>
            <select
              ref={claimTypeRef}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-600"
              defaultValue="download"
            >
              <option value="download">download</option>
              <option value="export">export</option>
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button onClick={selectAllAvailable} className="rounded-xl border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900">
              Select all available (filtered)
            </button>
            <button onClick={clearSelection} className="rounded-xl border border-neutral-800 px-4 py-2 text-sm hover:bg-neutral-900">
              Clear selection
            </button>
            <button
              onClick={claimSelected}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-60"
              disabled={selected.size === 0}
            >
              Claim selected
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-500">
            <div className="font-semibold text-neutral-300">Policy</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Preview: authenticated users may read all leads.</li>
              <li>Entitlement: created only via lead_access rows.</li>
              <li>Credits: enforced via append-only credit_ledger.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
