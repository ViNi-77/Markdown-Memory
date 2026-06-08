"use client";

/**
 * Workspace: 4 ペインの親コンポーネント。
 *
 * - Pane 1〜4 の state（candidates / selectedCandidateId / selectedDetail）を
 *   保持し、各ペインに props として渡す。
 *   `previousDetail` state は ADR-0011 §6 大決定 D で削除した（戻り先が候詳に固定
 *   されたため、直前の詳細を 1 段階覚える概念が不要になった）。
 * - Pane 3 = 候補者ダッシュボード（人物軸の編集: ヘッダー帯 + 採用条件 + 選考フロー）
 * - Pane 4 = ステージ軸の編集（選考ステージ詳細のみ）
 *   ADR-0015 §9 大決定 G により、Pane 4 のデフォルト state は `null`
 *   （ステージ未選択 = 畳み状態）。◀ ボタンは撤廃。
 *
 * レイアウト構造（shadcn/ui Sidebar を採用、ADR-0006 §3/§5 を本実装で改訂）:
 *
 * ```
 * <SidebarProvider> (h-screen, defaultOpen, Cmd+B でトグル)
 * ┌─ Sidebar (Pane 1) ─┬─ SidebarInset ─────────────────────┐
 * │ (画面最上端          │ ┌─ GlobalHeader (h-12) ─────────┐ │
 * │  〜最下端)           │ └─────────────────────────────────┘ │
 * │ collapsible="icon"  │ ┌─ Pane 2 ─┬─ Pane 3 ─┬─ Pane 4 ─┐ │
 * │ 240px ↔ 48px        │ │          │          │          │ │
 * └────────────────────┴─┴──────────┴──────────┴──────────┘
 * ```
 *
 * - Pane 1 のみ画面最上端〜最下端まで届く chrome（折りたたみ可）
 * - GlobalHeader は Pane 1 を除く右側全幅（Pane 2 / Pane 3 / Pane 4 の上）に渡る
 * - Pane 4 はヘッダー直下から最下端まで
 * - Pane 1 折りたたみトグルは Pane 1 ヘッダー右端の `Pane1Toggle` 1 箇所
 *   （ADR-0006 §5 で計画していた GlobalHeader 側の SidebarTrigger は本実装で撤回）
 *
 * 仕様の出典:
 *   - openspec/decision/0006-pane-background-hierarchy-and-shadcn-inset-header.md
 *     §2（4 段階背景色階層）/ §4（保存ステータス削除）はそのまま採用
 *     §3（Pane 4 = 画面最上端〜最下端 / ヘッダーは中央エリアのみ）は本実装で再改訂
 *     §5（SidebarTrigger は GlobalHeader）も本実装で再改訂（Pane 1 ヘッダー側に集約）
 *   - openspec/decision/0009-drilldown-card-affordance.md（Pane 3 ドリルダウンカードの ▶ 規律）
 *   - openspec/changes/add-4pane-workspace-template/specs/workspace-template/spec.md
 *   - openspec/changes/add-4pane-workspace-template/design.md D51〜D56 / D65
 */

import { useState, useCallback, useMemo } from "react";

import {
  type Profile,
  type AxisKey,
  type StageKey,
  type Department,
  type Candidate,
  type Group,
  type SelectedDetail,
  STAGE_ORDER,
} from "@/lib/schema";
import {
  createMinimalProfile,
  createMinimalScorecard,
} from "@/lib/data/factories";
import { getCandidateAverageScore } from "@/lib/computed/scorecards";
import { ARCHIVED_GROUP_LABEL, STAGE_LABELS } from "@/lib/labels";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { PositionPane } from "@/components/workspace/PositionPane";
import { CandidateListPane } from "@/components/workspace/CandidateListPane";
import { CandidateDashboardPane } from "@/components/workspace/CandidateDashboardPane";
import { CandidateDetailPane } from "@/components/workspace/CandidateDetailPane";

// ========== UI 内部型 ==========
//
// 種データは `data/*.json` → Server Component（app/page.tsx）で Zod parse → props で受け取る。
// ヘルパー関数（createMinimalProfile / createMinimalScorecard）は `lib/data/factories.ts`。
// Pane 2 の表示用派生型 (CandidateRow / Group) と `SelectedDetail` 型は
// `lib/schema.ts` に集約（複数ペインで共有するため）。
// Pane 4 モード 2 用の `EditableScorecardKey` は
// `components/workspace/CandidateDetailPane.tsx` 内部の閉じた型。

// `updateScorecardField` の field 引数で使う key の union 型。Pane 4 内部の
// `EditableScorecardKey` と同形。CandidateDetailPane 内部に閉じた型として扱い
// たいため export せず、親側で同じ形を再宣言して持つ。
//
// ADR-0014「shadcn 標準フォームによる Pane 4 編集 UI」で `comment` / `summary`
// を `InlineTextareaField` で編集対象に追加したため、旧 4 フィールドから 6 フィールド
// に拡張。CandidateDetailPane.tsx 側の同型宣言（line 70-76）と同期させる。
// `onUpdateScorecardField` 実装本体は `[field]: value` のスプレッドで
// 動作するため、ロジックの追加修正は不要。
type EditableScorecardKey =
  | "date"
  | "format"
  | "interviewer"
  | "decision"
  | "comment"
  | "summary";

type WorkspaceProps = {
  initialDepartments: Department[];
  initialCandidates: Candidate[];
  workspace: { name: string; icon: string };
};

export function Workspace({
  initialDepartments,
  initialCandidates,
  workspace,
}: WorkspaceProps) {
  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("c2");
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail>(null);
  const [scrollAnchor, setScrollAnchor] = useState<string | null>(null);
  // ユーザーが手動で Pane 4 を畳んだか。ステージ選択は保持しつつ畳む用途。
  const [pane4ManuallyClosed, setPane4ManuallyClosed] = useState(false);
  // Pane 3 ヘッダー帯（Collapsible）の開閉。候補者切替で閉じ、新規追加で開く。
  const [applicationInfoOpen, setApplicationInfoOpen] = useState(false);

  // Pane 4 の展開状態を派生計算（ADR-0015 §9 大決定 G）。
  // selectedDetail !== null かつ手動で畳んでいない → 開いている。
  const pane4Open = selectedDetail !== null && !pane4ManuallyClosed;

  // アクティブ候補者を取得。`INITIAL_CANDIDATES` が常に最低 1 名持つ前提だが、
  // 万一 find が undefined を返す（未来に candidates の削除機能が入った場合等）
  // ケースに備えて先頭候補者にフォールバックする。
  const activeCandidate =
    candidates.find((c) => c.id === selectedCandidateId) ?? candidates[0];
  const profile = activeCandidate.profile;
  const scorecards = activeCandidate.scorecards;

  // Mode1ProfileDetail は `setProfile: React.Dispatch<React.SetStateAction<Profile>>`
  // を期待している（採用案 X）。子コンポーネント側の signature を変えないために、
  // candidates 配列を更新するアダプタをここで作る。
  // 関数形 (p => next) と値形 (next) の両方に対応する。
  const setProfile = useCallback<React.Dispatch<React.SetStateAction<Profile>>>(
    (action) => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== selectedCandidateId) return c;
          const next =
            typeof action === "function" ? action(c.profile) : action;
          return { ...c, profile: next };
        }),
      );
    },
    [selectedCandidateId],
  );

  const openDetail = useCallback(
    (next: SelectedDetail, anchor?: string) => {
      if (next?.type === "stage") {
        setCandidates((prev) =>
          prev.map((c) => {
            if (c.id !== selectedCandidateId) return c;
            if (c.scorecards.some((s) => s.stage === next.stage)) return c;
            return {
              ...c,
              scorecards: [...c.scorecards, createMinimalScorecard(next.stage)],
            };
          }),
        );
      }
      setSelectedDetail(next);
      setScrollAnchor(anchor ?? null);
      setPane4ManuallyClosed(false);
    },
    [selectedCandidateId],
  );

  // Pane 2 の候補者行クリックでアクティブ候補者を切り替える。
  // - selectedDetail が「ステージ詳細」だった場合、新候補者にそのステージの
  //   scorecard が無ければ Pane 4 を **候補者詳細にフォールバック**する
  //   （ADR-0011 §7 大決定 E、旧 null フォールバックを撤回）。c2 以外は
  //   scorecards: [] のため、c2 → 別候補者の切替時はほぼ常に候詳へフォールバック。
  // - selectedDetail が「候補者詳細」のときは維持してよい（profile はどの候補者にも
  //   必ず存在する）。
  // - previousDetail state は ADR-0011 §6 大決定 D で削除済みのため、リセット不要。
  const selectCandidate = useCallback((id: string) => {
    setSelectedCandidateId(id);
    setSelectedDetail(null);
    setApplicationInfoOpen(false);
    setPane4ManuallyClosed(false);
  }, []);

  const addCandidate = useCallback((stage: StageKey, name: string) => {
    const newId = `c-${Date.now()}`;
    const newCandidate: Candidate = {
      id: newId,
      profile: createMinimalProfile(name),
      scorecards: [],
      stage,
      archived: false,
    };
    setCandidates((prev) => [...prev, newCandidate]);
    setSelectedCandidateId(newId);
    setSelectedDetail(null);
    setApplicationInfoOpen(true);
    setPane4ManuallyClosed(false);
  }, []);

  // 候補者をアーカイブ（論理削除）する。データは残し `archived: true` を立てる。
  // 復元は `restoreCandidate` から、もしくは Pane 2「アーカイブ済み」グループの
  // 「復元」ボタン経由。アクティブ候補者をアーカイブした場合は、非 archived の
  // 先頭候補者にフォールバックし、ステージ詳細（Pane 4）はクリアする。
  const archiveCandidate = useCallback((id: string) => {
    setCandidates((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, archived: true } : c,
      );
      setSelectedCandidateId((prevId) => {
        if (prevId !== id) return prevId;
        const fallback = next.find((c) => !c.archived);
        return fallback ? fallback.id : "";
      });
      return next;
    });
    setSelectedDetail(null);
    setPane4ManuallyClosed(false);
  }, []);

  // アーカイブ済み候補者を元のステージに復元する。`stage` は archived 中も保持
  // しているので、そのステージへ戻すだけでよい。
  const restoreCandidate = useCallback((id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: false } : c)),
    );
  }, []);

  // 候補者を別ステージへ移動 / 同ステージ内で並び替え。
  //
  // `toStage` は移動先のステージキー。`toIndex` はそのステージグループ内での
  // 0-origin の挿入位置。配列順を SSoT としているため、candidates 配列上の
  // 絶対インデックスに変換して `splice` 相当の挿入を行う。
  //
  // 同ステージ内ドラッグ・別ステージへのドラッグの両方をこの 1 関数で扱う。
  // archived 候補者は対象外（DnD はアクティブな候補者のみ可能）。
  const moveCandidate = useCallback(
    (id: string, toStage: StageKey, toIndex: number) => {
      setCandidates((prev) => {
        const subjectIndex = prev.findIndex((c) => c.id === id);
        if (subjectIndex < 0) return prev;
        const subject = prev[subjectIndex];
        if (subject.archived) return prev;

        const without = prev.filter((_, i) => i !== subjectIndex);
        const updated: Candidate = { ...subject, stage: toStage };

        let count = 0;
        let absInsertAt = without.length;
        for (let i = 0; i < without.length; i++) {
          const c = without[i];
          if (!c.archived && c.stage === toStage) {
            if (count === toIndex) {
              absInsertAt = i;
              break;
            }
            count++;
          }
        }
        return [
          ...without.slice(0, absInsertAt),
          updated,
          ...without.slice(absInsertAt),
        ];
      });
    },
    [],
  );

  const addDepartment = useCallback((name: string) => {
    setDepartments((prev) => [
      ...prev,
      { id: `d-${Date.now()}`, name, positions: [] },
    ]);
  }, []);

  const deleteDepartment = useCallback((deptId: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
  }, []);

  const addPosition = useCallback((deptId: string, posName: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? {
              ...d,
              positions: [
                ...d.positions,
                { id: `p-${Date.now()}`, name: posName, count: 0 },
              ],
            }
          : d,
      ),
    );
  }, []);

  const deletePosition = useCallback((deptId: string, posId: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? { ...d, positions: d.positions.filter((p) => p.id !== posId) }
          : d,
      ),
    );
  }, []);

  // 評価観点 ★ の編集ハンドラ。フェーズ 3A から「アクティブ候補者」の
  // scorecards を更新する形に変更（candidates 配列の中の該当候補者だけを差し替え）。
  const updateAxisScore = useCallback(
    (stage: StageKey, axis: AxisKey, value: number | null) => {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selectedCandidateId
            ? {
                ...c,
                scorecards: c.scorecards.map((s) =>
                  s.stage === stage
                    ? { ...s, axisScores: { ...s.axisScores, [axis]: value } }
                    : s,
                ),
              }
            : c,
        ),
      );
    },
    [selectedCandidateId],
  );

  // Pane 4 モード 2「メタ情報」の inline edit から呼ばれる。
  // `decision` だけ undefined を許すため、空文字は undefined として扱う
  // （`MetaRow` 廃止前の "未判定" 表示の代替: `EditableFieldRow` 側で空 = "未設定"）。
  // フェーズ 3A: アクティブ候補者の scorecards を更新する形に変更。
  const updateScorecardField = useCallback(
    (stage: StageKey, field: EditableScorecardKey, value: string) => {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === selectedCandidateId
            ? {
                ...c,
                scorecards: c.scorecards.map((s) => {
                  if (s.stage !== stage) return s;
                  if (field === "decision") {
                    const trimmed = value.trim();
                    return {
                      ...s,
                      decision: trimmed === "" ? undefined : trimmed,
                    };
                  }
                  return { ...s, [field]: value };
                }),
              }
            : c,
        ),
      );
    },
    [selectedCandidateId],
  );

  // Pane 4 内の `useEffect` 依存安定化のため、Workspace 側でメモ化して props で渡す。
  const consumeScrollAnchor = useCallback(() => setScrollAnchor(null), []);
  const togglePane4 = useCallback(() => setPane4ManuallyClosed((v) => !v), []);

  const positionTitle = "フロントエンドエンジニア";
  const departmentTitle = "プロダクト開発";

  const candidateGroups: Group[] = useMemo(() => {
    // ステージグループは常に 4 段階すべて表示する。空ステージも残すことで、
    // 「最後の 1 名を別ステージへ動かしたら戻し先が消える」事故を防ぐ
    // （ADR-006 §2-2 の補足）。
    const stageGroups: Group[] = STAGE_ORDER.map((stage) => ({
      kind: "stage" as const,
      stage,
      label: STAGE_LABELS[stage],
      items: candidates
        .filter((c) => !c.archived && c.stage === stage)
        .map((c) => ({
          id: c.id,
          name: c.profile.name,
          averageScore: getCandidateAverageScore(c),
        })),
    }));

    const archivedItems = candidates
      .filter((c) => c.archived)
      .map((c) => ({
        id: c.id,
        name: c.profile.name,
        averageScore: getCandidateAverageScore(c),
      }));

    if (archivedItems.length === 0) return stageGroups;
    return [
      ...stageGroups,
      { kind: "archived" as const, label: ARCHIVED_GROUP_LABEL, items: archivedItems },
    ];
  }, [candidates]);

  return (
    // shadcn/ui の SidebarProvider が外側を取り、Pane 1 (`<Sidebar>`) を全高で固定
    // 表示する。SidebarInset が右側ブロック（GlobalHeader + Pane 2/3/4）を担う。
    // Cmd+B のキーバインドは SidebarProvider 側で標準実装されている。
    // SidebarProvider のラッパー div は既定 `min-h-svh w-full`。雛形では
    // ビューポート高に固定したいので h-screen を併記し、ペイン内で min-h-0 が
    // 効くようにする（既存 ScrollArea の挙動と整合）。
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <PositionPane
        workspaceName={workspace.name}
        departments={departments}
        selectedPositionName={positionTitle}
        onAddPosition={addPosition}
        onDeletePosition={deletePosition}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          departmentTitle={departmentTitle}
          positionTitle={positionTitle}
          candidateName={profile.name}
          departments={departments}
          onAddDepartment={addDepartment}
          onDeleteDepartment={deleteDepartment}
        />
        {/* SidebarInset 自体が <main> を出すので、内側は <div> で組み、
            Pane 2 / Pane 3 / Pane 4 を横並びにする。 */}
        <div className="flex min-h-0 flex-1">
          <CandidateListPane
            groups={candidateGroups}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={selectCandidate}
            onAddCandidate={addCandidate}
            onArchiveCandidate={archiveCandidate}
            onRestoreCandidate={restoreCandidate}
            onMoveCandidate={moveCandidate}
          />
          <CandidateDashboardPane
            profile={profile}
            scorecards={scorecards}
            selectedDetail={selectedDetail}
            onOpenDetail={openDetail}
            setProfile={setProfile}
            applicationInfoOpen={applicationInfoOpen}
            onApplicationInfoOpenChange={setApplicationInfoOpen}
            selectedCandidateId={selectedCandidateId}
          />
          <CandidateDetailPane
            selectedCandidateId={selectedCandidateId}
            scorecards={scorecards}
            selectedDetail={selectedDetail}
            scrollAnchor={scrollAnchor}
            onScrollAnchorConsumed={consumeScrollAnchor}
            onUpdateAxis={updateAxisScore}
            onUpdateScorecardField={updateScorecardField}
            pane4Open={pane4Open}
            onTogglePane4={togglePane4}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
