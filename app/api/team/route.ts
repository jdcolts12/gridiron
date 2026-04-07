import { NextResponse } from "next/server";

/**
 * GET /api/team
 * Returns the authenticated user's team row (or 404).
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Not implemented" },
    { status: 501 }
  );
}

/**
 * PATCH /api/team
 * Partial update to team fields (name, cosmetics, etc.).
 */
export async function PATCH() {
  return NextResponse.json(
    { ok: false, message: "Not implemented" },
    { status: 501 }
  );
}
