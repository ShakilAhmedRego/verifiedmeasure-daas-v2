"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { maskCompany, maskEmail, maskPhone, safeMetaString } from "@/lib/mask";

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
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {err ? <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">{err}</div> : null}

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-4 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
          placeholder="Search preview…"
        />

        <table className="w-full text-sm">
          <thead className="text-xs text-neutral-400">
            <tr>
              <th className="px-2 py-1">Select</th>
              <th className="px-2 py-1">Company</th>
              <th className="px-2 py-1">Email</th>
              <th className="px-2 py-1">Phone</th>
              <th className="px-2 py-1">Industry</th>
              <th className="px-2 py-1">Time Zone</th>
              <th className="px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const isEntitled = entitled.has(l.id);
              return (
                <tr key={l.id} className="border-t border-neutral-800">
                  <td className="px-2 py-1">
                    <input type="checkbox" disabled={isEntitled} checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                  </td>
                  <td className="px-2 py-1 font-medium">
                    {isEntitled ? l.company : maskCompany(l.company)}
                  </td>
                  <td className="px-2 py-1">
                    {isEntitled ? l.email || "-" : maskEmail(l.email)}
                  </td>
                  <td className="px-2 py-1">
                    {isEntitled ? l.phone || "-" : maskPhone(l.phone)}
                  </td>
                  <td className="px-2 py-1 text-neutral-300">
                    {safeMetaString(l.meta, "industry")}
                  </td>
                  <td className="px-2 py-1 text-neutral-300">
                    {safeMetaString(l.meta, "time_zone")}
                  </td>
                  <td className="px-2 py-1">
                    {isEntitled ? "Entitled" : "Available"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
