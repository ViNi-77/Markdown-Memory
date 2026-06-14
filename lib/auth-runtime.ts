const LOCAL_AUTH_SECRET = "markdown-memory-local-development-secret";

export function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : LOCAL_AUTH_SECRET)
  );
}

export function isGoogleOAuthConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function isAuthRuntimeConfigured() {
  return Boolean(getAuthSecret() && isGoogleOAuthConfigured());
}

export function isWorkspaceRuntimeConfigured() {
  return Boolean(process.env.DATABASE_URL && isAuthRuntimeConfigured());
}
