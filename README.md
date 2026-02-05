# VerifiedMeasure — DaaS Control Plane (Next.js + Supabase)

## Deploy (Vercel)

1. Create a new Supabase project.
2. In Supabase SQL Editor, run `DATABASE_SETUP.sql` **as-is**.
3. In Supabase Auth settings, configure email/password auth as desired.
4. In Vercel, set the environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. Deploy.

## Local dev

```bash
npm install
npm run dev
```

Set the same env vars in your shell before running:

```bash
export NEXT_PUBLIC_SUPABASE_URL="..."
export NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
npm run dev
```

## Notes

- UI is read-only; all mutations happen in server API routes.
- Leads are previewable for all authenticated users (PREVIEW + ENTITLEMENT).
- Entitlement is created only via `lead_access`.
- Credits are ledger-based (`credit_ledger` append-only).
