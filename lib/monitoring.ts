type LogFields = Record<string, string | number | boolean | null | undefined>;

function redactSensitiveText(value: string): string {
  return value
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, "[REDACTED_API_KEY]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, "Bearer [REDACTED_TOKEN]");
}

function writeLog(
  level: "info" | "error",
  event: string,
  fields: LogFields = {},
) {
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

export function logError(
  event: string,
  error: unknown,
  fields: LogFields = {},
) {
  writeLog("error", event, {
    ...fields,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage:
      error instanceof Error
        ? redactSensitiveText(error.message)
        : "Unknown server error",
  });
}
