import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MISSING_SUPABASE_MESSAGE =
  "Supabase ist noch nicht verbunden. Prüfe deine .env.local Datei.";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(MISSING_SUPABASE_MESSAGE);
  }

  return supabase;
}
