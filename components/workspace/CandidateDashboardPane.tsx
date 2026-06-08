"use client";

/**
 * Pane 3: 候補者ダッシュボード（ADR-0015 §19 で再設計）。
 *
 * 「人物軸の編集」として、ヘッダー帯（Collapsible）+ 採用条件カード + 選考フローカード
 * の 3 要素で構成。判断の 3 問い（Q1: 採る価値 / Q2: 採れるか / Q3: 手遅れか）に
 * スクロールなしで即答できることが目標。
 *
 * セクション順序: ヘッダー帯 → 採用条件 → 選考フロー
 *
 * `AxisScoreRow` は Pane 4 モード 2 評価セクションでも使うため引き続き export する。
 */

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Circle,
  CircleDot,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  X,
  Star,
  StarHalf,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Profile,
  type StageStatus,
  type Scorecard,
  type SelectedDetail,
  STAGE_ORDER,
} from "@/lib/schema";
import { STAGE_LABELS, PANE3_SECTION, PANE4_SECTION_IDS } from "@/lib/labels";
import {
  getScorecardsAverageScore,
  deriveStageStatus,
} from "@/lib/computed/scorecards";
import { calculateAge } from "@/lib/computed/profile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  InlineTextField,
  InlineDateField,
  InlineComboboxField,
  InlineTextareaField,
  InlineFieldRow,
  ScoreLabel,
  SectionLabel,
  type ComboOption,
} from "@/components/primitives";

// ===== AxisScoreRow（Pane 4 モード 2 でも使う、export） =====

export function AxisScoreRow({
  label,
  value,
  bold = false,
  editable = false,
  onChange,
  onReset,
}: {
  label: string;
  value: number | null;
  bold?: boolean;
  editable?: boolean;
  onChange?: (value: number) => void;
  onReset?: () => void;
}) {
  if (value === null && !editable) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <span
          className={cn(
            "text-muted-foreground",
            bold && "font-medium text-foreground",
          )}
        >
          {label}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="tabular-nums">—</span>
          <span className="text-[11px]">未評価</span>
        </span>
      </div>
    );
  }
  const v = value ?? 0;
  const floor = Math.floor(v);
  const hasHalf = !editable && v - floor >= 0.5;
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span
        className={cn(
          "text-muted-foreground",
          bold && "font-medium text-foreground",
        )}
      >
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const isFull = n <= floor;
            const isHalf = hasHalf && n === floor + 1;
            const StarComp = isHalf ? StarHalf : Star;
            const filled = isFull || isHalf;
            const starEl = (
              <StarComp
                className={cn(
                  "size-3",
                  filled
                    ? "fill-primary text-primary"
                    : "fill-muted-foreground/20 text-muted-foreground/30",
                )}
                aria-hidden="true"
              />
            );
            if (editable && onChange) {
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className="rounded-sm transition-opacity outline-none hover:opacity-70 focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={`${label} を ${n} に設定`}
                >
                  {starEl}
                </button>
              );
            }
            return <span key={n}>{starEl}</span>;
          })}
        </span>
        <span
          className={cn(
            "min-w-[2.25rem] text-right text-foreground tabular-nums",
            bold && "font-medium",
            value === null && "text-muted-foreground",
          )}
        >
          {value !== null ? value.toFixed(1) : "—"}
        </span>
        {editable && onReset && value !== null && (
          <button
            type="button"
            onClick={onReset}
            className="ml-1 inline-flex size-5 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`${label} の評価をリセット`}
          >
            <X className="size-3" />
          </button>
        )}
      </span>
    </div>
  );
}

// ===== ↗ ジャンプアイコン（ADR-0014 §4、常時表示） =====

function JumpIcon({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <ArrowUpRight
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0",
        selected ? "text-primary" : "text-muted-foreground",
        className,
      )}
    />
  );
}

// ===== ステージアイコン（状態軸、ADR-0014 §7） =====

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "done") {
    return (
      <span
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        aria-label="完了"
      >
        <Check className="size-3" />
      </span>
    );
  }
  if (status === "planned") {
    return (
      <span
        className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground"
        aria-label="予定"
      >
        <CircleDot className="size-4" />
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground"
      aria-label="未着手"
    >
      <Circle className="size-4" />
    </span>
  );
}

// ===== Card: 採用条件（ADR-0015 §19.4 追加決定 M） =====

function RecruitingConditionsCard({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}) {
  const updateField = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent">
          {PANE3_SECTION.recruitingConditions}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="希望年収">
            <div className="flex items-center gap-1.5">
              <div className="w-20">
                <InlineTextField
                  value={profile.desiredSalaryMin}
                  onSave={(v) => updateField("desiredSalaryMin", v)}
                  ariaLabel="希望年収（下限）"
                  placeholder="—"
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">〜</span>
              <div className="w-20">
                <InlineTextField
                  value={profile.desiredSalaryMax}
                  onSave={(v) => updateField("desiredSalaryMax", v)}
                  ariaLabel="希望年収（上限）"
                  placeholder="—"
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                万円
              </span>
            </div>
          </InlineFieldRow>
          <InlineFieldRow label="入社可能日">
            <InlineDateField
              value={profile.availableStartDate}
              onSave={(v) => updateField("availableStartDate", v)}
              ariaLabel="入社可能日"
            />
          </InlineFieldRow>
        </dl>
      </CardContent>
    </Card>
  );
}

// ===== Card: 選考フロー（ADR-0015 §19.5 担当者コメント統合版） =====

function ScreeningFlowListCard({
  scorecards,
  selectedDetail,
  onOpenDetail,
}: {
  scorecards: Scorecard[];
  selectedDetail: SelectedDetail;
  onOpenDetail: (next: SelectedDetail, scrollAnchor?: string) => void;
}) {
  const allStages: Scorecard[] = STAGE_ORDER.map(
    (stage) =>
      scorecards.find((s) => s.stage === stage) ?? {
        stage,
        label: STAGE_LABELS[stage],
        date: "",
        format: "",
        interviewer: "",
        axisScores: {
          achievements: null,
          thinkingAbility: null,
          communication: null,
          cultureFit: null,
        },
        attachments: [],
      },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle emphasis="prominent">
          {PANE3_SECTION.screeningFlow}
        </CardTitle>
        <CardDescription>
          {PANE3_SECTION.screeningFlowDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          {allStages.map((s, idx) => {
            const selected =
              selectedDetail?.type === "stage" &&
              selectedDetail.stage === s.stage;
            const status = deriveStageStatus(s.date, s.decision);
            const showComment = status === "done" && !!s.comment;

            return (
              <div key={s.stage}>
                {idx > 0 && <Separator className="my-1" />}
                <button
                  type="button"
                  onClick={() =>
                    onOpenDetail(
                      { type: "stage", stage: s.stage },
                      PANE4_SECTION_IDS.m2.info,
                    )
                  }
                  aria-label={`Pane 4 で ${s.label} を開く`}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/40",
                  )}
                >
                  <StageIcon status={status} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {s.label}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {s.date && (
                          <span className="text-xs text-muted-foreground">
                            {s.date}
                          </span>
                        )}
                        {s.decision && (
                          <Badge variant="outline" size="xs">
                            {s.decision}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.interviewer || "未予定"}
                    </p>
                    {showComment && (
                      <p className="mt-0.5 line-clamp-2 border-l-2 border-primary/20 pl-2 text-xs leading-relaxed text-foreground/80">
                        &quot;{s.comment}&quot;
                      </p>
                    )}
                  </div>
                  <JumpIcon selected={selected} className="mt-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ===== 応募経路の選択肢（Pane 3 ヘッダー帯トグル内で使用） =====

const INITIAL_SOURCE_OPTIONS: ComboOption[] = [
  { value: "社員リファラル", description: "既存社員からの紹介で応募" },
  { value: "Wantedly", description: "Wantedly 経由の応募" },
  { value: "LinkedIn", description: "LinkedIn 経由の応募" },
  { value: "直接応募", description: "自社採用ページから直接応募" },
  { value: "エージェント経由", description: "採用エージェントを介した応募" },
];

// ===== ヘッダー帯トグル内の連絡先行 =====

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="sr-only">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

// ===== Card: 応募情報（折りたたみ可能） =====

function ApplicationInfoCardContent({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}) {
  const [sourceOptions, setSourceOptions] = useState<ComboOption[]>(
    INITIAL_SOURCE_OPTIONS,
  );

  const updateField = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const handleAddSource = (newOpt: ComboOption) =>
    setSourceOptions((prev) =>
      prev.find((o) => o.value === newOpt.value) ? prev : [...prev, newOpt],
    );

  return (
    <div className="flex flex-col">
      {/* 基本（名前 / 生年月日 / 応募経路 / 採用担当） — Card タイトル「応募情報」が見出しを兼ねる */}
      <section className="flex flex-col gap-3 pb-4">
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="名前">
            <InlineTextField
              value={profile.name}
              onSave={(v) => updateField("name", v)}
              ariaLabel="名前"
            />
          </InlineFieldRow>
          <InlineFieldRow label="生年月日">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <InlineDateField
                  value={profile.birthday}
                  onSave={(v) => updateField("birthday", v)}
                  ariaLabel="生年月日"
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {calculateAge(profile.birthday)}
              </span>
            </div>
          </InlineFieldRow>
          <InlineFieldRow label="応募経路">
            <InlineComboboxField
              value={profile.source}
              options={sourceOptions}
              onSave={(v) => updateField("source", v)}
              onCreate={handleAddSource}
              ariaLabel="応募経路"
            />
          </InlineFieldRow>
          <InlineFieldRow label="採用担当">
            <InlineTextField
              value={profile.recruiter}
              onSave={(v) => updateField("recruiter", v)}
              ariaLabel="採用担当"
            />
          </InlineFieldRow>
        </dl>
      </section>

      <Separator />

      {/* 連絡先 */}
      <section className="flex flex-col gap-3 py-4">
        <SectionLabel>連絡先</SectionLabel>
        <ul className="flex flex-col gap-2.5">
          <ContactRow
            icon={<Mail className="size-3.5" />}
            label="メールアドレス"
          >
            <InlineTextField
              value={profile.email}
              onSave={(v) => updateField("email", v)}
              ariaLabel="メールアドレス"
              inputType="email"
            />
          </ContactRow>
          <ContactRow icon={<Phone className="size-3.5" />} label="電話番号">
            <InlineTextField
              value={profile.phone}
              onSave={(v) => updateField("phone", v)}
              ariaLabel="電話番号"
              inputType="tel"
            />
          </ContactRow>
          <ContactRow icon={<MapPin className="size-3.5" />} label="住所">
            <InlineTextField
              value={profile.address}
              onSave={(v) => updateField("address", v)}
              ariaLabel="住所"
            />
          </ContactRow>
        </ul>
      </section>

      <Separator />

      {/* 職務経歴 */}
      <section className="flex flex-col gap-2 py-4">
        <SectionLabel>職務経歴</SectionLabel>
        <InlineTextareaField
          value={profile.careerText}
          onSave={(v) => updateField("careerText", v)}
          ariaLabel="職務経歴"
        />
      </section>

      <Separator />

      {/* 志望動機 */}
      <section className="flex flex-col gap-2 pt-4">
        <SectionLabel>志望動機</SectionLabel>
        <InlineTextareaField
          value={profile.motivationFull}
          onSave={(v) => updateField("motivationFull", v)}
          ariaLabel="志望動機"
        />
      </section>
    </div>
  );
}

function ApplicationInfoCard({
  profile,
  setProfile,
  open,
  onOpenChange,
  candidateKey,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateKey: string;
}) {
  return (
    <Card>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          nativeButton={false}
          render={
            <CardHeader className="group/trigger cursor-pointer rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          }
        >
          <CardTitle emphasis="prominent">
            {PANE3_SECTION.applicationInfo}
          </CardTitle>
          <CardAction>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-[color,transform] group-hover/trigger:text-foreground in-data-[panel-open]:rotate-180"
            />
            <span className="sr-only">{`${PANE3_SECTION.applicationInfo}を開く`}</span>
          </CardAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <ApplicationInfoCardContent
              key={candidateKey}
              profile={profile}
              setProfile={setProfile}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ===== 候補者ヘッダー（固定。Avatar + 名前 + 年齢 / スコア） =====

function CandidateHeader({
  profile,
  scorecards,
}: {
  profile: Profile;
  scorecards: Scorecard[];
}) {
  return (
    <div className="flex items-center gap-5">
      <Avatar className="size-16">
        <AvatarFallback className="bg-primary/10 text-xl text-primary">
          {profile.name[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="font-heading truncate text-xl font-semibold text-foreground">
          {profile.name || "名前未設定"}
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {profile.birthday && <span>{calculateAge(profile.birthday)}</span>}
          {profile.birthday && <span aria-hidden="true">·</span>}
          <ScoreLabel value={getScorecardsAverageScore(scorecards)} />
        </div>
      </div>
    </div>
  );
}

// ===== Pane 3 メイン =====

export function CandidateDashboardPane({
  profile,
  scorecards,
  selectedDetail,
  onOpenDetail,
  setProfile,
  applicationInfoOpen,
  onApplicationInfoOpenChange,
  selectedCandidateId,
}: {
  profile: Profile;
  scorecards: Scorecard[];
  selectedDetail: SelectedDetail;
  onOpenDetail: (next: SelectedDetail, scrollAnchor?: string) => void;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  applicationInfoOpen: boolean;
  onApplicationInfoOpenChange: (open: boolean) => void;
  selectedCandidateId: string;
}) {
  return (
    <section className="min-w-0 flex-1 bg-canvas">
      <ScrollArea className="h-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-8 py-8">
          <CandidateHeader profile={profile} scorecards={scorecards} />

          <ApplicationInfoCard
            profile={profile}
            setProfile={setProfile}
            open={applicationInfoOpen}
            onOpenChange={onApplicationInfoOpenChange}
            candidateKey={selectedCandidateId}
          />

          <RecruitingConditionsCard profile={profile} setProfile={setProfile} />

          <ScreeningFlowListCard
            scorecards={scorecards}
            selectedDetail={selectedDetail}
            onOpenDetail={onOpenDetail}
          />
        </div>
      </ScrollArea>
    </section>
  );
}
