import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server actions that must write to Supabase Storage.
 * Bypasses RLS, so only call it after requireAdmin(). Never import from client code.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
