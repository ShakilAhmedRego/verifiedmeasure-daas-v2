import { createClient, SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function createSupabaseClient(token?: string): SupabaseClient {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anon, {
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function requireAuth(request: Request): Promise<{ supabase: SupabaseClient; user: any; token: string }> {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing Authorization header.");
  }
  const token = authHeader.slice("bearer ".length).trim();
  if (!token) throw new Error("Missing bearer token.");

  const supabase = createSupabaseClient(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error) throw new Error(error.message);
  if (!data?.user) throw new Error("Invalid session.");

  return { supabase, user: data.user, token };
}

export async function requireAdmin(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin required.");
}
