import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Do not block navigation longer than this waiting on Supabase (offline / bad URL). */
const AUTH_MIDDLEWARE_MS = 1500;

/**
 * Refreshes the Supabase auth session when env is configured.
 * Skips when vars are unset. Times out quickly so a dead Supabase URL cannot freeze the site.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    await Promise.race([
      supabase.auth.getUser(),
      new Promise<void>((resolve) =>
        setTimeout(resolve, AUTH_MIDDLEWARE_MS)
      ),
    ]);
  } catch {
    return NextResponse.next();
  }

  return supabaseResponse;
}

/**
 * Only run auth refresh where sessions matter. Skips `/`, `/api/health`, and static assets
 * so the root page cannot be affected by middleware edge cases.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stadium/:path*",
    "/squad/:path*",
    "/match/:path*",
    "/league/:path*",
    "/api/match",
    "/api/team",
    "/api/upgrade",
    "/api/league",
  ],
};
