import { createClient, SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function createBrowserSupabaseClient(): SupabaseClient {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let _browserClient: SupabaseClient | null = null;
export function supabaseBrowser(): SupabaseClient {
  if (!_browserClient) _browserClient = createBrowserSupabaseClient();
  return _browserClient;
}
