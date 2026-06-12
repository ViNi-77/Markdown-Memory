#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildDatabaseEnv } from "./neon-env.mjs";

const backupFile = process.env.BACKUP_FILE
  ? resolve(process.env.BACKUP_FILE)
  : "";
const shouldRunRestore = process.env.RUN_RESTORE === "1";

if (!backupFile) {
  console.error("BACKUP_FILE is required");
  process.exit(1);
}

if (!existsSync(backupFile)) {
  console.error(`Backup file not found: ${backupFile}`);
  process.exit(1);
}

const restoreEnv = buildDatabaseEnv("RESTORE_DATABASE_URL");
const args = [
  "--dbname",
  restoreEnv.PGDATABASE,
  "--clean",
  "--if-exists",
  "--no-owner",
  "--no-acl",
  backupFile,
];

if (!shouldRunRestore) {
  console.log("Restore preflight passed.");
  console.log(
    "Set RUN_RESTORE=1 to execute pg_restore against RESTORE_DATABASE_URL.",
  );
  process.exit(0);
}

const result = spawnSync("pg_restore", args, {
  env: restoreEnv,
  stdio: "inherit",
});

if (result.error) {
  console.error(`pg_restore failed: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
