import { NextResponse } from "next/server";
import { createPublicHealthPayload } from "@/lib/operational-health";

export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

export function GET() {
  return NextResponse.json(createPublicHealthPayload(), {
    headers: noStoreHeaders(),
  });
}

export function HEAD() {
  return new Response(null, {
    status: 204,
    headers: noStoreHeaders(),
  });
}
