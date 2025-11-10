import { cache } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export const getCurrentSession = cache(async () => {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
});

