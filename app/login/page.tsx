"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { isWorkEmail } from "@/lib/emailValidator";

export default function LoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) window.location.href = "/dashboard";
    })();
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    const em = email.trim();
    if (!isWorkEmail(em)) {
      setErr("Use a work email address.");
      return;
    }
    if (!password.trim()) {
      setErr("Password required.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: em, password: password.trim() });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }
    if (data.session) window.location.href = "/dashboard";
    else setOk("Signed in.");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-neutral-400">Sign in to access the preview pool and your entitled records.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <label className="block text-sm">
          <div className="mb-1 text-neutral-300">Work Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-600"
            placeholder="name@company.com"
          />
        </label>

        <label className="block text-sm">
          <div className="mb-1 text-neutral-300">Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-600"
            placeholder="••••••••"
          />
        </label>

        {err ? <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{err}</div> : null}
        {ok ? <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-3 text-sm text-emerald-200">{ok}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-center text-xs text-neutral-500">
          Need an account?{" "}
          <a className="underline hover:text-neutral-300" href="/signup">
            Create one
          </a>
        </div>
      </form>
    </div>
  );
}
