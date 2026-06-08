/**
 * Google Cloud Console の OAuth クライアントに本番 redirect URI を追加する。
 */
import { chromium } from "playwright";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const PROJECT_ID = "aifes-jeiravinicius";
const CLIENT_ID =
  "293790248372-b5m92jflamoalir0c27isvh50oli5dlu.apps.googleusercontent.com";
const PROD_ORIGIN = "https://markdown-memory.vercel.app";
const PROD_CALLBACK = `${PROD_ORIGIN}/api/auth/callback/google`;

const editUrls = [
  `https://console.cloud.google.com/apis/credentials/oauthclient/${CLIENT_ID}?project=${PROJECT_ID}`,
  `https://console.cloud.google.com/auth/clients/${CLIENT_ID}?project=${PROJECT_ID}`,
];

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

async function waitForLogin(page) {
  const deadline = Date.now() + 180_000;
  while (page.url().includes("accounts.google.com") && Date.now() < deadline) {
    console.log("Waiting for Google sign-in in the opened browser...");
    await page.waitForTimeout(3000);
  }
  if (page.url().includes("accounts.google.com")) {
    throw new Error("Google login timed out");
  }
}

async function collectInputValues(page) {
  const inputs = page.locator("input:visible");
  const count = await inputs.count();
  const values = [];
  for (let i = 0; i < count; i++) {
    values.push((await inputs.nth(i).inputValue().catch(() => "")).trim());
  }
  return values;
}

async function addUri(page, uri) {
  const existing = await collectInputValues(page);
  if (existing.includes(uri)) {
    console.log(`Already set: ${uri}`);
    return false;
  }

  const addButtons = [
    page.getByRole("button", { name: /URI を追加|Add URI/i }),
    page.getByRole("button", { name: /\+ URI/i }),
    page.locator("button").filter({ hasText: /URI/i }),
  ];
  for (const btn of addButtons) {
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click();
      break;
    }
  }

  const inputs = page.locator("input:visible");
  const count = await inputs.count();
  for (let i = count - 1; i >= 0; i--) {
    const value = (await inputs.nth(i).inputValue().catch(() => "")).trim();
    if (!value) {
      await inputs.nth(i).fill(uri);
      console.log(`Added: ${uri}`);
      return true;
    }
  }

  const last = inputs.last();
  await last.fill(uri);
  console.log(`Filled last input: ${uri}`);
  return true;
}

async function main() {
  const profileDir = path.join(os.tmpdir(), "mdmem-oauth-profile");
  console.log("Cloning Chrome profile...");
  cloneChromeProfile(profileDir);

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless: false,
    args: ["--profile-directory=Default"],
    viewport: { width: 1400, height: 900 },
  });

  const page = context.pages()[0] ?? (await context.newPage());
  let opened = false;
  for (const url of editUrls) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
      opened = true;
      break;
    } catch (err) {
      console.warn(`Failed to open ${url}:`, err.message);
    }
  }
  if (!opened) throw new Error("Could not open OAuth client page");

  await waitForLogin(page);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: "/tmp/mdmem-oauth-before.png", fullPage: true });

  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  if (bodyText.includes("redirect") || bodyText.includes("リダイレクト")) {
    await addUri(page, PROD_CALLBACK);
  }
  if (bodyText.includes("javascript") || bodyText.includes("生成元")) {
    await addUri(page, PROD_ORIGIN);
  }

  const save = page.getByRole("button", { name: /^Save$|^保存$/i }).first();
  if (await save.isVisible().catch(() => false)) {
    await save.click();
    await page.waitForTimeout(4000);
    console.log("Saved.");
  }

  await page.screenshot({ path: "/tmp/mdmem-oauth-after.png", fullPage: true });
  await context.close();
  console.log("Done. Screenshots: /tmp/mdmem-oauth-before.png /tmp/mdmem-oauth-after.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
