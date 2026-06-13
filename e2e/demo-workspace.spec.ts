import { expect, test, type Page } from "playwright/test";

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
      page.getByRole("link", { name: "フィードバックを送る" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/ViNi-77/Markdown-Memory/issues/new/choose",
    );

    await page
      .getByRole("button", { name: /Markdown Memory の使い方/ })
      .click();

    await expectWorkspaceScrolledPast(page, 300);
    await expect(
      page.getByRole("heading", { name: "Markdown Memory", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("できること")).toBeVisible();

    await page.getByRole("button", { name: "詳細ペインを表示" }).click();
    await expectWorkspaceScrolledPast(page, 700);
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
    await expect(
      page.getByTestId("details-pane").getByRole("button", { name: "全画面" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Claude を開く" }),
    ).toBeVisible();

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
  });
});
