type HealthStatus = "ok" | "degraded";
type CheckStatus = "ok" | "missing" | "optional-missing";

export type OperationalHealthCheck = {
  name: string;
  label: string;
  required: boolean;
  status: CheckStatus;
};

export type PublicHealthPayload = {
  status: "ok";
  service: "markdown-memory";
  version: string;
  environment: string;
  timestamp: string;
};

export type PrivateHealthPayload = {
  status: HealthStatus;
  service: "markdown-memory";
  version: string;
  environment: string;
  timestamp: string;
  checks: OperationalHealthCheck[];
};

const REQUIRED_ENV_GROUPS = [
  {
    name: "database",
    label: "DATABASE_URL",
    keys: ["DATABASE_URL"],
  },
  {
    name: "auth_secret",
    label: "AUTH_SECRET or NEXTAUTH_SECRET",
    keys: ["AUTH_SECRET", "NEXTAUTH_SECRET"],
  },
  {
    name: "google_oauth_id",
    label: "AUTH_GOOGLE_ID",
    keys: ["AUTH_GOOGLE_ID"],
  },
  {
    name: "google_oauth_secret",
    label: "AUTH_GOOGLE_SECRET",
    keys: ["AUTH_GOOGLE_SECRET"],
  },
  {
    name: "production_url",
    label: "AUTH_URL or NEXTAUTH_URL",
    keys: ["AUTH_URL", "NEXTAUTH_URL"],
  },
] as const;

const OPTIONAL_ENV_GROUPS = [
  {
    name: "ai_gateway_auth",
    label: "AI_GATEWAY_API_KEY or Vercel OIDC",
    keys: ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"],
  },
  {
    name: "gemini_legacy_api",
    label: "GEMINI_API_KEY (legacy fallback)",
    keys: ["GEMINI_API_KEY"],
  },
  {
    name: "error_webhook",
    label: "ERROR_REPORT_WEBHOOK_URL",
    keys: ["ERROR_REPORT_WEBHOOK_URL"],
  },
] as const;

function appVersion(): string {
  return process.env.npm_package_version ?? "1.0.0";
}

function appEnvironment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
}

function hasAnyConfigured(keys: readonly string[]): boolean {
  return keys.some((key) => Boolean(process.env[key]?.trim()));
}

function createCheck(input: {
  name: string;
  label: string;
  required: boolean;
  keys: readonly string[];
}): OperationalHealthCheck {
  const configured = hasAnyConfigured(input.keys);
  return {
    name: input.name,
    label: input.label,
    required: input.required,
    status: configured ? "ok" : input.required ? "missing" : "optional-missing",
  };
}

export function createPublicHealthPayload(): PublicHealthPayload {
  return {
    status: "ok",
    service: "markdown-memory",
    version: appVersion(),
    environment: appEnvironment(),
    timestamp: new Date().toISOString(),
  };
}

export function createPrivateHealthPayload(): PrivateHealthPayload {
  const checks = [
    ...REQUIRED_ENV_GROUPS.map((group) =>
      createCheck({ ...group, required: true }),
    ),
    ...OPTIONAL_ENV_GROUPS.map((group) =>
      createCheck({ ...group, required: false }),
    ),
  ];

  return {
    status: checks.some((check) => check.required && check.status !== "ok")
      ? "degraded"
      : "ok",
    service: "markdown-memory",
    version: appVersion(),
    environment: appEnvironment(),
    timestamp: new Date().toISOString(),
    checks,
  };
}

export function summarizeOperationalStatus(payload: PrivateHealthPayload) {
  return {
    status: payload.status,
    missingRequiredChecks: payload.checks
      .filter((check) => check.required && check.status !== "ok")
      .map((check) => check.name)
      .join(","),
    optionalMissingChecks: payload.checks
      .filter((check) => !check.required && check.status !== "ok")
      .map((check) => check.name)
      .join(","),
  };
}
