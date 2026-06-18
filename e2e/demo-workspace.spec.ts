import { expect, test, type Page } from "playwright/test";

test.describe("PWA下地", () => {
  test.describe.configure({ mode: "serial" });

  function readPngSize(buffer: Buffer) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  async function registerServiceWorkerForTest(page: Page) {
    await page.goto("/demo");
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller) return;
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
      });
    });
    if (
      !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    ) {
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
    }
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);
    await expect
      .poll(() => cachedPathnames(page))
      .toEqual(expect.arrayContaining(["/offline"]));
  }

  async function cachedPathnames(page: Page) {
    return page.evaluate(async () => {
      const cacheName = (await caches.keys()).find((name) =>
        name.startsWith("markdown-memory-shell-"),
      );
      if (!cacheName) return [];
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      return requests.map((request) => new URL(request.url).pathname).sort();
    });
  }

  test("manifestがワークスペース起動と安全なショートカットを定義している", async ({
    request,
  }) => {
    const response = await request.get("/manifest.webmanifest");

    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toBe("Markdown Memory");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.scope).toBe("/");
    expect(manifest.theme_color).toBe("#2d3b56");
    expect(manifest.background_color).toBe("#f8f7f4");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/icons/maskable-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        }),
      ]),
    );
    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "ワークスペースを開く",
          url: "/",
          icons: expect.arrayContaining([
            expect.objectContaining({ src: "/icons/icon-192.png" }),
          ]),
        }),
        expect.objectContaining({
          name: "デモを開く",
          url: "/demo",
          icons: expect.arrayContaining([
            expect.objectContaining({ src: "/icons/icon-192.png" }),
          ]),
        }),
      ]),
    );
  });

  test("ホーム画面追加向けPNGアイコンを配信している", async ({ request }) => {
    const iconCases = [
      { path: "/icons/icon-192.png", width: 192, height: 192 },
      { path: "/icons/icon-512.png", width: 512, height: 512 },
      { path: "/icons/maskable-icon-512.png", width: 512, height: 512 },
      { path: "/icons/apple-touch-icon.png", width: 180, height: 180 },
    ];

    for (const icon of iconCases) {
      const response = await request.get(icon.path);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()["content-type"]).toContain("image/png");
      expect(readPngSize(await response.body())).toEqual({
        width: icon.width,
        height: icon.height,
      });
    }
  });

  test("Service Workerが安全なアプリシェルだけをキャッシュする", async ({
    page,
  }) => {
    await registerServiceWorkerForTest(page);
    await page.route("**/share/not-a-real-token", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "text/html; charset=utf-8",
        body: "share route is intentionally not cached",
      });
    });
    await page.route("**/view/not-a-real-id", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "text/html; charset=utf-8",
        body: "view route is intentionally not cached",
      });
    });

    await page.goto("/");
    await page.goto("/login");
    await page.goto("/api/health");
    await page.goto("/share/not-a-real-token");
    await page.goto("/view/not-a-real-id");

    await expect
      .poll(() => cachedPathnames(page))
      .toEqual(
        expect.arrayContaining([
          "/demo",
          "/offline",
          "/icons/icon.svg",
          "/icons/icon-192.png",
          "/icons/icon-512.png",
          "/icons/maskable-icon.svg",
          "/icons/maskable-icon-512.png",
          "/icons/apple-touch-icon.png",
        ]),
      );
    await expect
      .poll(() => cachedPathnames(page))
      .not.toEqual(
        expect.arrayContaining([
          "/",
          "/login",
          "/api/health",
          "/share/not-a-real-token",
          "/view/not-a-real-id",
        ]),
      );
  });

  test("Service Worker制御下のオフライン確認パスはオフライン画面を表示する", async ({
    page,
  }) => {
    await registerServiceWorkerForTest(page);

    await page.goto("/offline-check", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", {
        name: "Markdown Memory に接続できません",
      }),
    ).toBeVisible();
    await expect(page.getByText("非公開のMarkdown本文")).toBeVisible();
  });

  test("オフライン画面で復帰先とキャッシュ方針を確認できる", async ({
    page,
  }) => {
    await page.goto("/offline");

    await expect(
      page.getByRole("heading", {
        name: "Markdown Memory に接続できません",
      }),
    ).toBeVisible();
    await expect(page.getByText("非公開のMarkdown本文")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "ワークスペースを開く" }),
    ).toHaveAttribute("href", "/");
    await expect(
      page.getByRole("link", { name: "デモを開く" }),
    ).toHaveAttribute("href", "/demo");
  });
});

test.describe("デモワークスペース", () => {
  test("未ログインでもMarkdownの作成・編集・プレビューができる", async ({
    page,
  }) => {
    await page.goto("/demo");

    await expect(page.getByText("Markdown Memory").first()).toBeVisible();
    await expect(page.getByText("デモモード")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "フィードバック" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/ViNi-77/Markdown-Memory/issues/new/choose",
    );

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(page.locator("header h1")).toContainText("無題.md");

    await page.getByRole("button", { name: "編集" }).click();
    await page
      .getByPlaceholder("# Markdown を入力...")
      .fill("# E2E確認\n\n本文テスト");

    await page.getByRole("button", { name: "プレビュー" }).click();
    await expect(page.getByRole("heading", { name: "E2E確認" })).toBeVisible();
    await expect(page.getByText("本文テスト")).toBeVisible();
  });

  test("複合Markdown表現をプレビューで読みやすく表示できる", async ({
    page,
  }) => {
    await page.goto("/demo");

    await page.getByRole("button", { name: "新規作成" }).click();
    await page.getByRole("button", { name: "編集" }).click();
    await page
      .getByPlaceholder("# Markdown を入力...")
      .fill(
        [
          "# 表示確認",
          "",
          "【ライティング推奨ワークフロー】",
          "（全体構成・アイデア抽出）",
          "|",
          "▼",
          "[Claude]（詳細な本文執筆・肉付け）",
          "",
          '**"重要"** と ~~古い表現~~ を確認します。',
          "",
          "- [x] チェック済み",
          "  - ネストした補足",
          "",
          "> [!NOTE]",
          "> 読みやすい補足です。",
          "",
          "| 長いリンク | 状態 |",
          "| --- | --- |",
          "| https://example.com/some/really/long/path | OK |",
          "",
          "```ts",
          "const answer: number = 42;",
          "```",
          "",
          "脚注つきの本文です[^1]",
          "",
          "[^1]: 補足説明です。",
        ].join("\n"),
      );

    await page.getByRole("button", { name: "プレビュー" }).click();

    await expect(page.getByRole("heading", { name: "表示確認" })).toBeVisible();
    const workflowParagraph = page.locator(".markdown-body p").filter({
      hasText: "ライティング推奨ワークフロー",
    });
    await expect
      .poll(() =>
        workflowParagraph.evaluate(
          (element) => getComputedStyle(element).whiteSpace,
        ),
      )
      .toBe("pre-line");
    await expect
      .poll(() => workflowParagraph.evaluate((element) => element.textContent))
      .toContain("|\n▼");
    await expect(page.locator(".markdown-body strong")).toHaveText('"重要"');
    await expect(page.locator(".markdown-body del")).toHaveText("古い表現");
    await expect(
      page.locator('.task-list-item input[type="checkbox"]'),
    ).toBeChecked();
    await expect(page.locator(".task-list-item ul")).toContainText(
      "ネストした補足",
    );
    await expect
      .poll(() =>
        page
          .locator(".task-list-item")
          .evaluate((element) => getComputedStyle(element).display),
      )
      .not.toBe("flex");
    await expect(page.locator(".markdown-alert-note")).toContainText("Note");
    await expect(page.locator(".markdown-alert-note")).toContainText(
      "読みやすい補足です。",
    );
    await expect(page.locator(".markdown-table-wrapper table")).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "https://example.com/some/really/long/path",
      }),
    ).toHaveAttribute("target", "_blank");
    await expect(page.locator(".markdown-code-language")).toHaveText("ts");
    await expect(
      page.getByRole("button", { name: "ts コードをコピー" }),
    ).toBeVisible();
    await expect(page.locator(".markdown-code-block code")).toContainText(
      "const answer: number = 42;",
    );
    await expect(page.getByRole("heading", { name: "脚注" })).toBeVisible();
    await expect(page.locator("section[data-footnotes]")).toContainText(
      "補足説明です。",
    );
  });

  test("ペイン調整ハンドルとデモ制限の案内が表示される", async ({ page }) => {
    await page.goto("/demo");

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(
      page.getByRole("separator", { name: "ファイル一覧ペインの幅を調整" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "全画面" }).first().click();
    await expect(
      page.getByText(
        "デモでは全画面表示を開けません。ログイン後に利用できます。",
      ),
    ).toBeVisible();
  });
});

test.describe("デモワークスペース: モバイル前段確認", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  async function expectWorkspaceScrolledPast(
    page: Page,
    minScrollLeft: number,
  ) {
    await expect
      .poll(async () =>
        page
          .getByTestId("markdown-workspace")
          .evaluate((element) => Math.round(element.scrollLeft)),
      )
      .toBeGreaterThanOrEqual(minScrollLeft);
  }

  test("スマホ幅でもファイル一覧から本文ペインへ移動して内容を読める", async ({
    page,
  }) => {
    await page.goto("/demo");

    await expect(page.getByTestId("file-list-pane")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "フォルダ管理を開く" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "アカウントメニューを開く" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "フィードバックを送る" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/ViNi-77/Markdown-Memory/issues/new/choose",
    );
    await expect(
      page.getByRole("button", { name: "ファイル一覧ペインを表示" }),
    ).toHaveAttribute("aria-current", "page");

    await page
      .getByRole("button", { name: /Markdown Memory の使い方/ })
      .click();

    await expectWorkspaceScrolledPast(page, 300);
    await expect(
      page.getByRole("button", { name: "本文ペインを表示" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", { name: "Markdown Memory", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("できること")).toBeVisible();

    await page.getByRole("button", { name: "詳細ペインを表示" }).click();
    await expectWorkspaceScrolledPast(page, 700);
    await expect(
      page.getByRole("button", { name: "詳細ペインを表示" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("details-pane")).toBeVisible();
  });

  test("スマホ幅のPhase 6前準備として作成・編集・詳細操作の導線を固定する", async ({
    page,
  }) => {
    await page.goto("/demo");

    await expect(
      page.getByRole("button", { name: "本文ペインを表示" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "詳細ペインを表示" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "新規作成" }).click();
    await expectWorkspaceScrolledPast(page, 300);

    await page
      .getByPlaceholder("# Markdown を入力...")
      .fill("# スマホ確認\n\nPhase 6 の前準備");

    await page.getByRole("button", { name: "プレビュー" }).click();
    await expect(
      page.getByRole("heading", { name: "スマホ確認" }),
    ).toBeVisible();
    await expect(page.getByText("Phase 6 の前準備")).toBeVisible();

    await page.getByRole("button", { name: "詳細ペインを表示" }).click();
    await expectWorkspaceScrolledPast(page, 700);
    await expect(
      page.getByRole("button", { name: "公開リンクを作成" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "ファイル操作" }).click();
    await expect(
      page.getByTestId("details-pane").getByRole("button", { name: "全画面" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "AIへ渡す" }).click();
    await expect(
      page.getByRole("button", { name: "Claude を開く" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "アプリ内AI" }).click();
    await expect(page.getByRole("button", { name: "AIで整形" })).toBeVisible();

    await page
      .getByRole("button", { name: "ファイル一覧ペインを表示" })
      .click();
    await expect
      .poll(async () =>
        page
          .getByTestId("markdown-workspace")
          .evaluate((element) => Math.round(element.scrollLeft)),
      )
      .toBeLessThanOrEqual(50);

    await expect(page.getByTestId("mobile-current-document")).toContainText(
      "無題.md",
    );
    await page.getByRole("button", { name: "選択中の本文を開く" }).click();
    await expectWorkspaceScrolledPast(page, 300);
    await page.getByRole("button", { name: "一覧に戻る" }).click();
    await expect
      .poll(async () =>
        page
          .getByTestId("markdown-workspace")
          .evaluate((element) => Math.round(element.scrollLeft)),
      )
      .toBeLessThanOrEqual(50);
  });

  test("スマホ幅でもフォルダ作成・選択・名前変更・削除とアカウント導線を使える", async ({
    page,
  }) => {
    await page.goto("/demo");
    let nativeDialogCount = 0;
    page.on("dialog", async (dialog) => {
      nativeDialogCount += 1;
      await dialog.dismiss();
    });

    await page.getByRole("button", { name: "フォルダ管理を開く" }).click();
    await expect(page.getByRole("dialog", { name: "フォルダ" })).toBeVisible();

    await page.getByRole("button", { name: "フォルダを追加" }).click();
    await page.locator('input[placeholder="例: 仕事メモ"]').fill("スマホ確認");
    await page.getByRole("button", { name: "追加" }).click();
    await page.getByRole("button", { name: "フォルダ管理を開く" }).click();
    await expect(
      page.getByRole("button", { name: "スマホ確認 0" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "スマホ確認 の名前を変更" }).click();
    await page.locator('input[placeholder="例: 仕事メモ"]').fill("スマホ整理");
    await page.getByRole("button", { name: "変更" }).click();
    await page.getByRole("button", { name: "フォルダ管理を開く" }).click();
    await expect(
      page.getByRole("button", { name: "スマホ整理 0" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "スマホ整理 0" }).click();
    await page.getByRole("button", { name: "新規作成" }).click();
    await expectWorkspaceScrolledPast(page, 300);

    await page.getByRole("button", { name: "詳細ペインを表示" }).click();
    await expectWorkspaceScrolledPast(page, 700);
    await expect
      .poll(async () =>
        page
          .getByTestId("details-pane")
          .locator("select")
          .evaluate(
            (element) =>
              (element as HTMLSelectElement).selectedOptions[0]?.textContent,
          ),
      )
      .toContain("スマホ整理");

    await page
      .getByRole("button", { name: "ファイル一覧ペインを表示" })
      .click();
    await expect
      .poll(async () =>
        page
          .getByTestId("markdown-workspace")
          .evaluate((element) => Math.round(element.scrollLeft)),
      )
      .toBeLessThanOrEqual(50);

    await page.getByRole("button", { name: "フォルダ管理を開く" }).click();
    await page.getByRole("button", { name: "スマホ整理 を削除" }).click();
    await expect(page.getByText("フォルダを削除")).toBeVisible();
    await page.getByRole("button", { name: "削除" }).click();
    await expect(page.getByRole("button", { name: /スマホ整理/ })).toHaveCount(
      0,
    );

    await expect(page.getByRole("dialog", { name: "フォルダ" })).toBeHidden();
    await page
      .getByRole("button", { name: "アカウントメニューを開く" })
      .click();
    const accountDialog = page.getByRole("dialog", { name: "アカウント" });
    await expect(accountDialog).toBeVisible();
    await expect(accountDialog.getByText("デモモード")).toBeVisible();
    await expect(
      accountDialog.getByRole("link", { name: "ログイン" }),
    ).toHaveAttribute("href", "/login");
    expect(nativeDialogCount).toBe(0);
  });

  test("長いファイル名と長文Markdownでもスマホ幅で本文を読める", async ({
    page,
  }) => {
    await page.goto("/demo");

    const longFileName =
      "phase6-mobile-reading-check-with-very-long-markdown-title-for-real-device.md";
    const longContent = [
      "# スマホ実機前チェック",
      "",
      ...Array.from(
        { length: 24 },
        (_, index) =>
          `スマホ実機確認用の長文 ${String(index + 1).padStart(2, "0")}。本文をスクロールしながら読めるか確認するための段落です。`,
      ),
    ].join("\n\n");

    await page.locator('input[type="file"]').setInputFiles({
      name: longFileName,
      mimeType: "text/markdown",
      buffer: Buffer.from(longContent),
    });

    await expectWorkspaceScrolledPast(page, 300);
    await expect(page.getByTestId("document-header")).toContainText(
      longFileName,
    );
    await expect(
      page.getByRole("heading", { name: "スマホ実機前チェック" }),
    ).toBeVisible();

    await expect
      .poll(async () =>
        page
          .getByTestId("document-header")
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      )
      .toBeTruthy();

    await page.getByTestId("document-scroll-area").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(page.getByText("スマホ実機確認用の長文 24")).toBeVisible();

    await page.getByRole("button", { name: "詳細ペインを表示" }).click();
    await expectWorkspaceScrolledPast(page, 700);
    await expect(page.getByTestId("details-pane")).toContainText(longFileName);
    await expect(
      page.getByRole("button", { name: "公開リンクを作成" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "本文に戻る" }).click();
    await expectWorkspaceScrolledPast(page, 300);
  });

  test("スマホ幅でも表とコードが本文全体を横に押し出さない", async ({
    page,
  }) => {
    await page.goto("/demo");

    await page.getByRole("button", { name: "新規作成" }).click();
    await page.getByRole("button", { name: "編集" }).click();
    await page
      .getByPlaceholder("# Markdown を入力...")
      .fill(
        [
          "# 横スクロール確認",
          "",
          "スマホでも本文全体ではなく、表とコードブロックだけが横スクロールします。",
          "",
          "単独の長いURLも本文ペインを横に押し出しません。",
          "https://example.com/really/long/path/for/mobile/reading/check/as/a/standalone/link/that/should/wrap/inside/the/paragraph/without/page-overflow",
          "",
          "| 種類 | 長い内容 |",
          "| --- | --- |",
          "| URL | https://example.com/really/long/path/for/mobile/reading/check/without/page-overflow |",
          "",
          "```ts",
          'const veryLongLine = "https://example.com/really/long/path/for/mobile/reading/check/inside/code/block";',
          "```",
        ].join("\n"),
      );

    await page.getByRole("button", { name: "プレビュー" }).click();
    await expect(
      page.getByRole("heading", { name: "横スクロール確認" }),
    ).toBeVisible();

    await expect
      .poll(async () =>
        page
          .getByTestId("document-scroll-area")
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      )
      .toBeTruthy();
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.scrollWidth),
      )
      .toBeLessThanOrEqual(390);
    await expect
      .poll(async () =>
        page
          .getByRole("link", {
            name: /standalone\/link\/that\/should\/wrap/,
          })
          .evaluate((element) => {
            const elementRect = element.getBoundingClientRect();
            const paneRect = element
              .closest("[data-testid='document-pane']")
              ?.getBoundingClientRect();
            return Boolean(
              paneRect &&
              elementRect.left >= paneRect.left - 1 &&
              elementRect.right <= paneRect.right + 1,
            );
          }),
      )
      .toBeTruthy();
    await expect
      .poll(async () =>
        page
          .locator(".markdown-table-wrapper")
          .evaluate((element) => element.scrollWidth > element.clientWidth),
      )
      .toBeTruthy();
    await expect
      .poll(async () =>
        page
          .locator(".markdown-code-block pre")
          .evaluate((element) => element.scrollWidth > element.clientWidth),
      )
      .toBeTruthy();
    await expect
      .poll(async () =>
        page
          .locator(".markdown-code-block pre")
          .evaluate((element) => getComputedStyle(element).overflowX),
      )
      .toBe("auto");
  });
});
