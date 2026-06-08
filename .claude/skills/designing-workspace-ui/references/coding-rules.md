# コーディングルール詳細

このプロジェクト固有の Incorrect/Correct ペアを収録する。shadcn スキルの `rules/` にある汎用例とは異なり、workspace-ui-kit の実コードに基づく固有パターンを扱う。

## 目次

- base（Base UI）固有のパターン
- スペーシング
- タイポグラフィ
- セマンティックカラー
- アイコン
- コンポジション
- フォーム
- components/ui/ 編集の具体例

---

## base（Base UI）固有のパターン

このプロジェクトは base（Base UI）を使用している（`components.json` の `style` フィールドで確認できる）。AI は radix の API をデフォルトで生成しやすいので、特に注意する。

**Incorrect:**

```tsx
<DialogTrigger asChild>
  <Button variant="outline">設定を開く</Button>
</DialogTrigger>
```

**Correct:**

```tsx
<DialogTrigger render={<Button variant="outline" />}>設定を開く</DialogTrigger>
```

ポイント: base では `asChild` ではなく `render` を使う。`render` は JSX 要素を受け取り、そのまま描画する。

**Incorrect:**

```tsx
<SelectTrigger asChild>
  <Button variant="outline">{selectedValue}</Button>
</SelectTrigger>
```

**Correct:**

```tsx
<SelectTrigger>
  <SelectValue placeholder="選択してください" />
</SelectTrigger>
```

ポイント: base の Select は `items` prop でオプションを渡す方式もある。`components.json` の `base` フィールドを確認して API を選ぶ。

---

## スペーシング

**Incorrect — Pane4 のセクション内で子要素に余白を持たせている:**

```tsx
<section>
  <h2 className="...">プロフィール</h2>
  <div className="space-y-3">
    <Row label="氏名">...</Row>
    <Row label="生年月日">...</Row>
    {showSource && <Row label="応募経路">...</Row>}
  </div>
</section>
```

**Correct — 入れ物が子同士の隙間を管理:**

```tsx
<section>
  <h2 className="...">プロフィール</h2>
  <div className="flex flex-col gap-3">
    <Row label="氏名">...</Row>
    <Row label="生年月日">...</Row>
    {showSource && <Row label="応募経路">...</Row>}
  </div>
</section>
```

`showSource` が `false` になったとき、`space-y-3` だと最後の `Row` に余計な `margin-top` が残ることがある。`gap-3` なら親が管理するので子が何個でも崩れない。

---

## タイポグラフィ

**Incorrect — 呼び出し側で見た目を毎回打ち消す（コピペ蔓延の原因）:**

```tsx
<CardTitle className="text-sm font-semibold text-foreground">
  評価サマリ
</CardTitle>
```

**Correct — 部品側にサイズ展開を用意して、呼び出し側はシンプルに:**

```tsx
<CardTitle data-size="sm">評価サマリ</CardTitle>
```

`components/ui/card.tsx` に `data-size="sm"` の variant を追加する（components/ui/ 編集の具体例を参照）。

**Incorrect — Pane4 セクション見出しを h2 + className で毎回書く:**

```tsx
<h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
  基本情報
</h2>
```

この h2 + className の組み合わせが 11 セクション分コピペされているのが前回の監査で発見された。

**Correct — 見出し用のプリミティブを抽出:**

```tsx
<SectionLabel>基本情報</SectionLabel>
```

共通の見出しプリミティブ `<SectionLabel>` を `components/primitives/` に作り、内部で h2 + スタイルを持たせる。

---

## セマンティックカラー

**Incorrect — 生の色クラスで状態を表す:**

```tsx
<span className="text-emerald-600">通過</span>
<span className="text-red-600">不合格</span>
```

**Correct — semantic token または Badge variant:**

```tsx
<Badge variant="secondary">通過</Badge>
<span className="text-destructive">不合格</span>
```

このプロジェクトのサーフェス階層は `openspec/decision/` の配色 ADR で定義されている。`app/globals.css` の `@theme` セクションと ADR を読み、既存トークンで表現できるか確認する。

---

## アイコン

**Incorrect — Button 内のアイコンにサイジングクラスを付ける:**

```tsx
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

**Correct — 部品が CSS でアイコンサイズを制御:**

```tsx
<Button variant="ghost" size="icon">
  <Settings />
</Button>
```

shadcn の Button は内部でアイコンのサイズを制御している。サイジングクラスを付けると二重制御になり、サイズ変更時に壊れる。

正方形のアイコンコンテナには `size-*` を使う:

```tsx
<span className="flex size-8 items-center justify-center rounded-md bg-muted">
  <Mail />
</span>
```

---

## コンポジション

**Card は Header / Title / Content のフル構成で使う。** 中身を全部 CardContent に詰めない:

```tsx
<Card>
  <CardHeader>
    <CardTitle>評価サマリ</CardTitle>
    <CardDescription>最新の面接評価</CardDescription>
  </CardHeader>
  <CardContent>{/* 本文 */}</CardContent>
</Card>
```

**Dialog / Sheet / Drawer には Title が必須。** 視覚的に不要でも `sr-only` で付ける:

```tsx
<Dialog>
  <DialogContent>
    <DialogTitle className="sr-only">候補者を追加</DialogTitle>
    {/* 本文 */}
  </DialogContent>
</Dialog>
```

**Avatar には AvatarFallback が必須。** 画像が読み込めなかった場合の代替表示:

```tsx
<Avatar className="size-10">
  <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
  <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
</Avatar>
```

---

## フォーム

shadcn の Forms ルールに従い、`FieldGroup` + `Field` + `FieldLabel` で構成する。生の `div` + `Label` で組まない。

```tsx
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="name">氏名</FieldLabel>
    <Input id="name" />
  </Field>
  <Field>
    <FieldLabel htmlFor="email">メールアドレス</FieldLabel>
    <Input id="email" type="email" />
  </Field>
</FieldGroup>
```

2〜7 択の選択肢には `ToggleGroup` を使う。`Button` をループして独自の active state を管理しない。

---

## components/ui/ 編集の具体例

### variant を追加する手順

例: `CardTitle` に `data-size="sm"` variant を追加する。

`components/ui/card.tsx` を開き、`CardTitle` の定義に data 属性によるスタイル切替を追加:

```tsx
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base leading-none font-medium",
        "data-[size=sm]:text-sm data-[size=sm]:font-semibold",
        className,
      )}
      {...props}
    />
  );
}
```

呼び出し側:

```tsx
<CardTitle data-size="sm">評価サマリ</CardTitle>
```

### upstream の更新を取り込む手順

1. `npx shadcn@latest add card --dry-run` で影響範囲を確認
2. `npx shadcn@latest add card --diff card.tsx` で自分の変更と公式の変更を比較
3. 差分を見て、自分の variant 追加を保持しつつ公式の修正を取り込む
4. `--overwrite` はユーザーの明示的な承認なしに使わない
