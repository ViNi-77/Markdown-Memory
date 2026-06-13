import { NextResponse } from "next/server";
import {
  createPrivateHealthPayload,
  summarizeOperationalStatus,
} from "@/lib/operational-health";
import {
  getRequestId,
  logInfo,
  logWarning,
  reportOperationalError,
} from "@/lib/monitoring";

export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);

  if (!process.env.CRON_SECRET?.trim()) {
    logWarning("cron.health.misconfigured", {
      route: "/api/cron/health",
      requestId,
      status: 503,
    });

    return NextResponse.json(
      {
        status: "degraded",
        service: "markdown-memory",
        error: "cron_secret_not_configured",
      },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  if (!isAuthorized(request)) {
    logWarning("cron.health.unauthorized", {
      route: "/api/cron/health",
      requestId,
      status: 401,
    });

    return NextResponse.json(
      {
        status: "unauthorized",
        service: "markdown-memory",
      },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  const payload = createPrivateHealthPayload();
  const summary = summarizeOperationalStatus(payload);
  const ms = Date.now() - startedAt;

  if (payload.status !== "ok") {
    await reportOperationalError(
      "cron.health.degraded",
      new Error("Operational health check degraded"),
      {
        route: "/api/cron/health",
        requestId,
        status: 503,
        ms,
        missingRequiredChecks: summary.missingRequiredChecks,
      },
    );

    return NextResponse.json(payload, {
      status: 503,
      headers: noStoreHeaders(),
    });
  }

  logInfo("cron.health.ok", {
    route: "/api/cron/health",
    requestId,
    status: 200,
    ms,
    optionalMissingChecks: summary.optionalMissingChecks,
  });

  return NextResponse.json(payload, {
    headers: noStoreHeaders(),
  });
}
