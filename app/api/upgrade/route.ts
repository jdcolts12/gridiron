import { NextResponse } from "next/server";

/**
 * POST /api/upgrade
 * Starts an upgrade if affordable and slot available; returns upgrade row.
 */
export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Not implemented" },
    { status: 501 }
  );
}

/**
 * GET /api/upgrade
 * Returns active upgrades and whether each has completed (for client polling).
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Not implemented" },
    { status: 501 }
  );
}
