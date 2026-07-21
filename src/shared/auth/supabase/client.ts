import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/shared/config/env";

export function createSupabaseBrowserClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv();

  return createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
