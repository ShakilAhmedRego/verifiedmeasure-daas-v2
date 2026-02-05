export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-8 shadow">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-neutral-100" />
            Preview + entitlement • Ledger-based credits • RLS defense-in-depth
          </div>

          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            A modern control plane for secure data access.
          </h1>

          <p className="text-neutral-300 md:text-lg">
            Authenticated users can preview the full dataset. Entitlement is granted explicitly via access records, and credits
            are enforced with an append-only ledger.
          </p>

          <div className="flex flex-wrap gap-3">
            <a className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950" href="/signup">
              Create account
            </a>
            <a className="rounded-xl border border-neutral-800 px-4 py-2 text-sm font-semibold hover:bg-neutral-900" href="/login">
              Sign in
            </a>
            <a className="rounded-xl border border-neutral-800 px-4 py-2 text-sm font-semibold hover:bg-neutral-900" href="/dashboard">
              Open dashboard
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Preview pool", desc: "All authenticated users may read all leads for evaluation and discovery." },
          { title: "Entitlement records", desc: "Entitlement is created only via lead_access rows." },
          { title: "Ledger-based credits", desc: "Credits are append-only in credit_ledger; no mutable balance column." },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-sm font-semibold">{c.title}</div>
            <div className="mt-2 text-sm text-neutral-400">{c.desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
