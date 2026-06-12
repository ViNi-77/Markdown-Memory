export function requireConnectionEnv(name) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    throw new Error(`${name} is required`);
  }

  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error(`${name} must include a database name`);
  }

  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: database,
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get("sslmode") || "require",
  };
}

export function buildDatabaseEnv(name) {
  return {
    ...process.env,
    ...requireConnectionEnv(name),
  };
}

export function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}
