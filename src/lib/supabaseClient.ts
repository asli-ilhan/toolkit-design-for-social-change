import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer explicit ANON_KEY, but fall back to publishable default if provided.
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // In dev we log a warning so it's obvious why Supabase calls fail.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY).",
  );
}

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY).",
      );
    }
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

