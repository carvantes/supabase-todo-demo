import { createClient } from "@supabase/supabase-js";

// Browser Supabase client. Uses the publishable (anon-tier) key only — never a
// service-role/secret key, which must never reach the browser bundle.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.local.example).",
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Persist and refresh the anonymous session in the browser so a reload
    // keeps the same user (and therefore the same todos).
    persistSession: true,
    autoRefreshToken: true,
  },
});
