
// import { createBrowserClient, createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";

// export function createSupabaseServerClient() {
//   const cookieStore = cookies();
//   return createServerClient(
//    process.env.NEXT_PUBLIC_SUPABASE_URL!,
//    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//    {
//     cookies: {
//      getAll() {
//       // @ts-ignore
//       return cookieStore.getAll();
//      },
//      setAll(cookiesToSet) {
//       try {
//        cookiesToSet.forEach(({ name, value, options }) =>
//         // @ts-ignore
//         cookieStore.set(name, value, options),
//        );
//       } catch {
//        // The `setAll` method was called from a Server Component.
//       }
//      },
//     },
//    },
//   );
// }