import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseBrowserClient } from "./lib/supabase/browser-client";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // const supabase = createServerClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  //   {
  //     cookies: {
  //       get(name) {
  //         return request.cookies.get(name)?.value;
  //       },
  //       set(name, value, options) {
  //         response.cookies.set({ name, value, ...options });
  //       },
  //       remove(name, options) {
  //         response.cookies.set({ name, value: "", ...options });
  //       },
  //     },
  //   },
  // );

   const supabase=createSupabaseBrowserClient()

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  if (!session && isDashboardRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  if (session && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard/products", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

