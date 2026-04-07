import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_MS = 1500;

const GAME_PREFIXES = [
  "/dashboard",
  "/stadium",
  "/squad",
  "/match",
  "/league",
] as const;

function needsTeam(path: string): boolean {
  return GAME_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const path = request.nextUrl.pathname;

  if (!url || !key) {
    return NextResponse.next();
  }

  let res = NextResponse.next({ request });

  let user: { id: string } | null = null;

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
          res = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    });

    const raced = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_MS)),
    ]);
    if (raced) {
      user = raced.data.user;
    }

    if (path.startsWith("/api")) {
      return res;
    }

    if (!user) {
      if (
        path === "/onboarding" ||
        needsTeam(path)
      ) {
        const login = new URL("/login", request.url);
        login.searchParams.set("next", path);
        return NextResponse.redirect(login);
      }
      return res;
    }

    if (path === "/login" || path === "/signup") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (path === "/onboarding") {
      if (team) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return res;
    }

    if (needsTeam(path) && !team) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  } catch {
    return NextResponse.next();
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
