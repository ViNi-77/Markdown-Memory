type LogLevel = "info" | "warning" | "error";
type LogFields = Record<string, string | number | boolean | null | undefined>;
type ErrorReportFields = LogFields & {
  route?: string | null;
  requestId?: string | null;
  status?: number;
  ms?: number;
};

export function redactSensitiveText(value: string): string {
  return value
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, "[REDACTED_API_KEY]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, "Bearer [REDACTED_TOKEN]");
}

function writeLog(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    service: "markdown-memory",
    timestamp: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warning") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function getRequestId(request: Request): string | null {
  return (
    request.headers.get("x-vercel-id") ?? request.headers.get("x-request-id")
  );
}

export function logInfo(event: string, fields?: LogFields) {
  writeLog("info", event, fields);
}

export function logWarning(event: string, fields?: LogFields) {
  writeLog("warning", event, fields);
}

function getErrorDetails(error: unknown) {
  return {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage:
      error instanceof Error
        ? redactSensitiveText(error.message)
        : "Unknown server error",
  };
}

export function logError(
  event: string,
  error: unknown,
  fields: LogFields = {},
) {
  writeLog("error", event, { ...fields, ...getErrorDetails(error) });
}

export function createErrorReportPayload(
  event: string,
  error: unknown,
  fields: ErrorReportFields = {},
) {
  return {
    service: "markdown-memory",
    event,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
    ...fields,
    ...getErrorDetails(error),
  };
}

function getErrorReportWebhookUrl(): URL | null {
  const raw = process.env.ERROR_REPORT_WEBHOOK_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") {
      logWarning("error_report.webhook_ignored", {
        reason: "webhook_url_must_use_https",
      });
      return null;
    }
    return url;
  } catch {
    logWarning("error_report.webhook_ignored", {
      reason: "webhook_url_invalid",
    });
    return null;
  }
}

export async function reportOperationalError(
  event: string,
  error: unknown,
  fields: ErrorReportFields = {},
) {
  logError(event, error, fields);

  const webhookUrl = getErrorReportWebhookUrl();
  if (!webhookUrl) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createErrorReportPayload(event, error, fields)),
      signal: controller.signal,
    });
  } catch (reportError) {
    logWarning("error_report.delivery_failed", {
      errorName:
        reportError instanceof Error ? reportError.name : "UnknownError",
    });
  } finally {
    clearTimeout(timeout);
  }
}
