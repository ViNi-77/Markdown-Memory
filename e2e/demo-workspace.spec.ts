import { expect, test } from "playwright/test";

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

  test("スマホ幅でもファイル一覧から本文ペインへ移動して内容を読める", async ({
    page,
  }) => {
    await page.goto("/demo");

    const workspace = page.getByTestId("markdown-workspace");
    await expect(page.getByTestId("file-list-pane")).toBeVisible();
    await page
      .getByRole("button", { name: /Markdown Memory の使い方/ })
      .click();

    await workspace.evaluate((element) => {
      const documentPane = document.querySelector<HTMLElement>(
        '[data-testid="document-pane"]',
      );
      if (!documentPane) throw new Error("document pane not found");
      element.scrollLeft = documentPane.offsetLeft;
    });

    await expect(
      page.getByRole("heading", { name: "Markdown Memory", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("できること")).toBeVisible();
  });
});
