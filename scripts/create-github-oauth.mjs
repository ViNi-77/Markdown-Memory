/**
 * GitHub OAuth App を作成し、client id/secret を標準出力する。
 */
import { chromium } from "playwright";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const APP_NAME = "Markdown Memory";
const HOMEPAGE = "https://markdown-memory.vercel.app";
const CALLBACK = `${HOMEPAGE}/api/auth/callback/github`;

function cloneChromeProfile(targetDir) {
  const source = path.join(
    os.homedir(),
    "Library/Application Support/Google/Chrome",
  );
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of ["Default", "Local State"]) {
    fs.cpSync(path.join(source, entry), path.join(targetDir, entry), {
      recursive: true,
      force: true,
    });
  }
}

async function main() {
  const profileDir = path.join(os.tmpdir(), "mdmem-github-oauth");
  cloneChromeProfile(profileDir);
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    args: ["--profile-directory=Default"],
    viewport: { width: 1280, height: 900 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://github.com/settings/applications/new", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  const deadline = Date.now() + 180_000;
  while (page.url().includes("login") && Date.now() < deadline) {
    console.log("Waiting for GitHub sign-in...");
    await page.waitForTimeout(3000);
  }

  await page.getByLabel("Application name").fill(APP_NAME);
  await page.getByLabel("Homepage URL").fill(HOMEPAGE);
  await page.getByLabel("Authorization callback URL").fill(CALLBACK);
  await page.getByRole("button", { name: "Register application" }).click();
  await page.waitForURL(/\/settings\/applications\/\d+/, { timeout: 60000 });

  const clientId = await page
    .locator("#oauth_application_client_id")
    .inputValue();
  await page
    .getByRole("button", { name: "Generate a new client secret" })
    .click();
  await page.waitForTimeout(2000);
  const clientSecret = await page
    .locator("#oauth_application_client_secret")
    .inputValue()
    .catch(async () => {
      const text = await page
        .locator(".oauth-application-client-secret")
        .textContent();
      return text?.trim() ?? "";
    });

  console.log(JSON.stringify({ clientId, clientSecret }, null, 2));
  await context.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
