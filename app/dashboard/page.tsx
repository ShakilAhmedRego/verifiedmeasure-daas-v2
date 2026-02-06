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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <div className="text-sm text-neutral-400">Loading...</div>;

  return (
    <div className="space-y
