"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function AuthHeader() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (user === undefined) {
    return (
      <span className="ml-auto text-xs text-zinc-600" aria-hidden>
        …
      </span>
    );
  }

  if (!user) {
    return (
      <div className="ml-auto flex gap-2">
        <Link
          href="/login"
          className="rounded-md px-2.5 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-500"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="ml-auto flex max-w-[min(50%,14rem)] items-center gap-2">
      <span className="truncate text-xs text-zinc-500" title={user.email ?? ""}>
        {user.email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="shrink-0 rounded-md px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        Sign out
      </button>
    </div>
  );
}
