#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildDatabaseEnv, timestampForFile } from "./neon-env.mjs";

const outputDir = resolve(process.env.BACKUP_DIR || "backups");
const outputFile = resolve(
  outputDir,
  `markdown-memory-${timestampForFile()}.dump`,
);

mkdirSync(outputDir, { recursive: true });

const result = spawnSync(
  "pg_dump",
  ["--format=custom", "--no-owner", "--no-acl", "--file", outputFile],
  {
    env: buildDatabaseEnv("DATABASE_URL"),
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`pg_dump failed: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Backup written: ${outputFile}`);
