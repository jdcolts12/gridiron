import { NextResponse } from "next/server";

/** GET /api/health — no auth; use to confirm the dev server is running. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "gridiron-dynasty" });
}
