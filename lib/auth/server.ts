import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const getCurrentServerSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
});

export const getCurrentServerUser = cache(async () => {
  const session = await getCurrentServerSession();
  return session?.user ?? null;
});
