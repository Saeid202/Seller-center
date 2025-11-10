
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type MutableCookieStore = CookieStore & {
  set?: (options: { name: string; value: string } & Partial<CookieOptions>) => void;
};

type MaybePromise<T> = T | Promise<T>;

async function getMutableCookieStore(): Promise<MutableCookieStore> {
  const store = (await (cookies() as MaybePromise<CookieStore>)) as MutableCookieStore;
  return store;
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await getMutableCookieStore();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set?.({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set?.({ name, value: "", ...options, maxAge: 0 });
        },
      },
    },
  );
}