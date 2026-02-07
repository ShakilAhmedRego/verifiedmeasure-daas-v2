"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { maskCompany, maskEmail, maskPhone, safeMetaString } from "@/lib/mask";

type Lead = {
  id: string;
  company: string;
  email: string | null;
  phone: string | null;
  meta: any;
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

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        window.location.href = "/login";
        return;
      }

      const uid = session.session.user.id;
      setUserId(uid);
      setToken(session.session.access_token);

      const { data: leadsData } = await supabase.from("leads").select("*");
      const { data: accessData } = await supabase
        .from("lead_access")
        .select("lead_id")
        .eq("user_id", uid);

      const { data: bal } = await supabase.rpc("get_user_balance", {
        in_user_id: uid,
      });

      setLeads(leadsData ?? []);
      setEntitled(new Set((accessData ?? []).map((r: LeadAccessRow) => r.lead_id)));
      setBalance(Number(bal ?? 0));
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) {
    return <div className="text-sm text-neutral-400">Loading…</div>;
  }

  const filtered = leads.filter((l) =>
    JSON.stringify(l).toLowerCase().includes(query.toLowerCase())
  );

  async function claimSelected() {
    if (!token || selected.size === 0) return;

    const res = await fetch("/api/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        lead_ids: Array.from(selected),
        access_type: claimTypeRef.current?.value || "download",
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Claim failed");
      return;
    }

    setEntitled((prev) => new Set([...prev, ...json.newly_claimed_ids]));
    setBalance(json.new_balance);
    setSelected(new Set());
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {err && (
        <div className="rounded-xl border border-red-800 bg-red-950 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <input
        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
        placeholder="Search preview…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <table className="w-full text-sm">
        <thead className="text-xs text-neutral-400">
          <tr>
            <th />
            <th>Company</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Industry</th>
            <th>Time Zone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => {
            const isEntitled = entitled.has(l.id);
            return (
              <tr key={l.id} className="border-t border-neutral-800">
                <td>
                  <input
                    type="checkbox"
                    disabled={isEntitled}
                    checked={selected.has(l.id)}
                    onChange={() =>
                      setSelected((p) => {
                        const n = new Set(p);
                        n.has(l.id) ? n.delete(l.id) : n.add(l.id);
                        return n;
                      })
                    }
                  />
                </td>
                <td>{isEntitled ? l.company : maskCompany(l.company)}</td>
                <td>{isEntitled ? l.email : maskEmail(l.email)}</td>
                <td>{isEntitled ? l.phone : maskPhone(l.phone)}</td>
                <td>{safeMetaString(l.meta, "industry")}</td>
                <td>{safeMetaString(l.meta, "time_zone")}</td>
                <td className="text-xs">
                  {isEntitled ? "Entitled" : "Unlock with credits"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center gap-3">
        <select ref={claimTypeRef} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm">
          <option value="download">download</option>
          <option value="export">export</option>
        </select>

        <button
          disabled={selected.size === 0 || balance <= 0}
          onClick={claimSelected}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Unlock selected
        </button>

        <div className="text-xs text-neutral-400">
          Credits: {balance}
        </div>
      </div>
    </div>
  );
}
