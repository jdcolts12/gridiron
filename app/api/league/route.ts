import { NextResponse } from "next/server";

/**
 * GET /api/league
 * Returns ordered standings for the user's league season.
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Not implemented" },
    { status: 501 }
  );
}
