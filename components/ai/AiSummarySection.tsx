'use client';

/**
 * AI 요약 및 분석 섹션
 * 오늘/이번 주 탭으로 구분해 클라이언트 통계 + AI 분석 결과를 시각화하여 표시
 */

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Todo } from '@/lib/types/todo';
import type { TodoSummary, TodoSummaryInput } from '@/lib/types/ai';

// ─────────────────────────────────────────
// 타입
// ─────────────────────────────────────────

type Period = 'today' | 'week';

interface TodayStats {
  total: number;
  completed: number;
  completionRate: number;
  urgentRemaining: Todo[];
  allRemaining: Todo[];
  overdueCount: number;
}

interface WeekStats {
  total: number;
  completed: number;
  completionRate: number;
  overdueCount: number;
  dayDist: Array<{ name: string; total: number; completed: number }>;
}

// ─────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월~일
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const getCurrentLocalDateTime = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
};

const toSummaryInput = (todos: Todo[]): TodoSummaryInput[] =>
  todos.map((t) => ({
    title: t.title,
    completed: t.completed,
    due_at: t.due_at ?? null,
    priority: t.priority,
    category: t.category ?? null,
    created_at: t.created_at,
  }));

/** due_at이 오늘(로컬 기준)인지 확인 */
const isSameLocalDay = (dueAt: string, ref: Date): boolean => {
  const d = new Date(dueAt);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

const computeTodayStats = (todos: Todo[]): TodayStats => {
  const now = new Date();
  const todayTodos = todos.filter((t) => t.due_at && isSameLocalDay(t.due_at, now));
  const completed = todayTodos.filter((t) => t.completed).length;
  const total = todayTodos.length;
  const allRemaining = todayTodos.filter((t) => !t.completed);
  const urgentRemaining = allRemaining
    .filter((t) => t.priority === 'high')
    .slice(0, 3);
  const overdueCount = todos.filter(
    (t) => !t.completed && t.due_at && new Date(t.due_at) < now
  ).length;
  return {
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    urgentRemaining,
    allRemaining,
    overdueCount,
  };
};

const computeWeekStats = (todos: Todo[]): WeekStats => {
  const now = new Date();
  const dow = now.getDay();
  const weekMonday = new Date(now);
  weekMonday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  weekMonday.setHours(0, 0, 0, 0);
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  weekSunday.setHours(23, 59, 59, 999);

  const weekTodos = todos.filter((t) => {
    if (!t.due_at) return false;
    const d = new Date(t.due_at);
    return d >= weekMonday && d <= weekSunday;
  });

  const completed = weekTodos.filter((t) => t.completed).length;
  const total = weekTodos.length;
  const overdueCount = todos.filter(
    (t) => !t.completed && t.due_at && new Date(t.due_at) < now
  ).length;

  // 월~일 순 집계
  const dayDist = DAY_ORDER.map((dayIdx) => ({
    name: DAY_NAMES[dayIdx],
    total: 0,
    completed: 0,
  }));
  weekTodos.forEach((t) => {
    if (!t.due_at) return;
    const d = new Date(t.due_at).getDay();
    const idx = DAY_ORDER.indexOf(d);
    if (idx >= 0) {
      dayDist[idx].total++;
      if (t.completed) dayDist[idx].completed++;
    }
  });

  return {
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    overdueCount,
    dayDist,
  };
};

/** 완료율에 따른 색상 클래스 */
const rateColor = (rate: number) => {
  if (rate >= 70) return 'text-success';
  if (rate >= 40) return 'text-warning';
  return 'text-destructive';
};

const rateBarColor = (rate: number) => {
  if (rate >= 70) return 'bg-success';
  if (rate >= 40) return 'bg-warning';
  return 'bg-destructive';
};

/** 인사이트 텍스트에서 이모지 추출 */
const getInsightEmoji = (text: string): string => {
  const t = text.toLowerCase();
  if (t.includes('지연') || t.includes('초과') || t.includes('어려') || t.includes('주의')) return '⚠️';
  if (t.includes('잘') || t.includes('달성') || t.includes('성과') || t.includes('훌륭')) return '🎯';
  if (t.includes('시간대') || t.includes('집중') || t.includes('오전') || t.includes('오후')) return '⏰';
  if (t.includes('패턴') || t.includes('트렌드') || t.includes('분포')) return '📊';
  return '💡';
};

const getRecommendationEmoji = (text: string, idx: number): string => {
  const t = text.toLowerCase();
  if (t.includes('긴급') || t.includes('먼저') || t.includes('우선')) return '🔥';
  if (t.includes('시간') || t.includes('일정') || t.includes('오전') || t.includes('오후')) return '⏰';
  if (t.includes('분산') || t.includes('조정') || t.includes('배분')) return '📅';
  if (t.includes('다음 주') || t.includes('계획')) return '📋';
  return ['✅', '💪', '🎯'][idx % 3];
};

// ─────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────

/** 완료율 진행 바 */
const CompletionBar = ({
  rate,
  completed,
  total,
  label,
}: {
  rate: number;
  completed: number;
  total: number;
  label: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-end justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{label} 완료율</p>
        <p className={cn('text-3xl font-bold leading-none mt-0.5', rateColor(rate))}>
          {rate}%
        </p>
      </div>
      <p className="text-xs text-muted-foreground pb-0.5">
        {completed}/{total}개
      </p>
    </div>
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', rateBarColor(rate))}
        style={{ width: `${rate}%` }}
      />
    </div>
  </div>
);

/** 우선순위 배지 */
const PriorityBadge = ({ priority }: { priority: Todo['priority'] }) => {
  const config = {
    high: { label: '높음', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
    medium: { label: '보통', cls: 'bg-warning/10 text-warning border-warning/20' },
    low: { label: '낮음', cls: 'bg-muted text-muted-foreground border-border' },
  }[priority];
  return (
    <span className={cn('text-[10px] border rounded px-1.5 py-0.5 font-medium shrink-0', config.cls)}>
      {config.label}
    </span>
  );
};

/** 인사이트 카드 */
const InsightCard = ({ text }: { text: string }) => (
  <div className="flex gap-2 rounded-md border bg-muted/30 px-3 py-2">
    <span className="text-sm shrink-0 leading-snug">{getInsightEmoji(text)}</span>
    <p className="text-xs text-foreground leading-snug">{text}</p>
  </div>
);

/** 추천 사항 아이템 */
const RecommendationItem = ({ text, idx }: { text: string; idx: number }) => (
  <div className="flex gap-2 items-start">
    <span className="text-sm shrink-0 leading-snug mt-0.5">{getRecommendationEmoji(text, idx)}</span>
    <p className="text-xs text-foreground leading-snug">{text}</p>
  </div>
);

/** 오늘 결과 뷰 */
const TodayResult = ({
  stats,
  summary,
}: {
  stats: TodayStats;
  summary: TodoSummary;
}) => (
  <div className="space-y-4">
    {/* 완료율 */}
    {stats.total > 0 ? (
      <CompletionBar
        rate={stats.completionRate}
        completed={stats.completed}
        total={stats.total}
        label="오늘"
      />
    ) : (
      <p className="text-xs text-muted-foreground text-center py-1">
        오늘 마감인 할 일이 없습니다.
      </p>
    )}

    {/* AI 요약 */}
    <p className="text-xs text-foreground leading-relaxed border-l-2 border-primary pl-2">
      {summary.summary}
    </p>

    {/* 지연 알림 */}
    {stats.overdueCount > 0 && (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
        <span className="text-sm">⚠️</span>
        <p className="text-xs text-destructive font-medium">
          기한 초과된 할 일이 {stats.overdueCount}개 있습니다.
        </p>
      </div>
    )}

    {/* 집중 필요 — 오늘 긴급 작업 */}
    {urgentSection(summary.urgentTasks, stats.urgentRemaining)}

    {/* 남은 할 일 */}
    {stats.allRemaining.length > 0 && (
      <section className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">📋 남은 할 일</p>
        <ul className="space-y-1">
          {stats.allRemaining.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground truncate">{t.title}</span>
              <PriorityBadge priority={t.priority} />
            </li>
          ))}
          {stats.allRemaining.length > 5 && (
            <li className="text-xs text-muted-foreground">
              외 {stats.allRemaining.length - 5}개 더...
            </li>
          )}
        </ul>
      </section>
    )}

    {/* 인사이트 */}
    {summary.insights.length > 0 && (
      <section className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">분석 인사이트</p>
        <div className="space-y-1.5">
          {summary.insights.map((insight, i) => (
            <InsightCard key={i} text={insight} />
          ))}
        </div>
      </section>
    )}

    {/* 추천 사항 */}
    {summary.recommendations.length > 0 && (
      <section className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">추천 행동</p>
        <div className="space-y-2">
          {summary.recommendations.map((rec, i) => (
            <RecommendationItem key={i} text={rec} idx={i} />
          ))}
        </div>
      </section>
    )}
  </div>
);

/** 이번 주 결과 뷰 */
const WeekResult = ({
  stats,
  summary,
}: {
  stats: WeekStats;
  summary: TodoSummary;
}) => {
  const maxDay = Math.max(...stats.dayDist.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* 완료율 */}
      {stats.total > 0 ? (
        <CompletionBar
          rate={stats.completionRate}
          completed={stats.completed}
          total={stats.total}
          label="이번 주"
        />
      ) : (
        <p className="text-xs text-muted-foreground text-center py-1">
          이번 주 마감인 할 일이 없습니다.
        </p>
      )}

      {/* AI 요약 */}
      <p className="text-xs text-foreground leading-relaxed border-l-2 border-primary pl-2">
        {summary.summary}
      </p>

      {/* 지연 알림 */}
      {stats.overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <span className="text-sm">⚠️</span>
          <p className="text-xs text-destructive font-medium">
            기한 초과된 할 일이 {stats.overdueCount}개 있습니다.
          </p>
        </div>
      )}

      {/* 집중 필요 */}
      {urgentSection(summary.urgentTasks, [])}

      {/* 요일별 생산성 차트 */}
      {stats.total > 0 && (
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">📊 요일별 할 일 현황</p>
          <div className="space-y-1.5">
            {stats.dayDist.map((day) => (
              <div key={day.name} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 shrink-0">{day.name}</span>
                <div className="flex-1 h-5 rounded overflow-hidden bg-muted relative">
                  {/* 전체 바 */}
                  <div
                    className="absolute left-0 top-0 h-full bg-primary/20 rounded"
                    style={{ width: `${(day.total / maxDay) * 100}%` }}
                  />
                  {/* 완료 바 */}
                  {day.completed > 0 && (
                    <div
                      className="absolute left-0 top-0 h-full bg-primary rounded"
                      style={{ width: `${(day.completed / maxDay) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
                  {day.completed}/{day.total}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-sm bg-primary mr-1" />완료
            <span className="inline-block w-2 h-2 rounded-sm bg-primary/20 ml-2 mr-1" />예정
          </p>
        </section>
      )}

      {/* 인사이트 */}
      {summary.insights.length > 0 && (
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">분석 인사이트</p>
          <div className="space-y-1.5">
            {summary.insights.map((insight, i) => (
              <InsightCard key={i} text={insight} />
            ))}
          </div>
        </section>
      )}

      {/* 추천 / 다음 주 계획 */}
      {summary.recommendations.length > 0 && (
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">📋 다음 주 계획 제안</p>
          <div className="space-y-2">
            {summary.recommendations.map((rec, i) => (
              <RecommendationItem key={i} text={rec} idx={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/** 긴급 작업 섹션 (공통) */
const urgentSection = (aiUrgent: string[], statUrgent: Todo[]) => {
  const items = aiUrgent.length > 0 ? aiUrgent : statUrgent.map((t) => t.title);
  if (items.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <p className="text-xs font-medium text-destructive flex items-center gap-1">
        🎯 지금 집중해야 할 작업
      </p>
      <div className="space-y-1">
        {items.map((title, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/10 px-3 py-2"
          >
            <span className="text-[10px] shrink-0 mt-0.5 font-bold text-destructive">
              {i + 1}
            </span>
            <p className="text-xs text-foreground leading-snug">{title}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────

interface AiSummarySectionProps {
  todos: Todo[];
}

const TABS: { key: Period; label: string }[] = [
  { key: 'today', label: '오늘의 요약' },
  { key: 'week', label: '이번 주 요약' },
];

export const AiSummarySection = ({ todos }: AiSummarySectionProps) => {
  const [activeTab, setActiveTab] = useState<Period>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [summaryMap, setSummaryMap] = useState<Partial<Record<Period, TodoSummary>>>({});
  const [errorMap, setErrorMap] = useState<Partial<Record<Period, string>>>({});

  const currentSummary = summaryMap[activeTab];
  const currentError = errorMap[activeTab];

  // 클라이언트 사이드 통계
  const todayStats = computeTodayStats(todos);
  const weekStats = computeWeekStats(todos);

  const handleSummarize = async () => {
    try {
      setIsLoading(true);
      setErrorMap((prev) => ({ ...prev, [activeTab]: undefined }));

      const res = await fetch('/api/ai/summarize-todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todos: toSummaryInput(todos),
          period: activeTab,
          currentLocalDateTime: getCurrentLocalDateTime(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI 분석 중 오류가 발생했습니다.');
      setSummaryMap((prev) => ({ ...prev, [activeTab]: data as TodoSummary }));
    } catch (err) {
      setErrorMap((prev) => ({
        ...prev,
        [activeTab]: err instanceof Error ? err.message : 'AI 분석 중 오류가 발생했습니다.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: Period) => {
    if (isLoading) return;
    setActiveTab(tab);
  };

  const handleRefresh = () => {
    setSummaryMap((prev) => ({ ...prev, [activeTab]: undefined }));
    setErrorMap((prev) => ({ ...prev, [activeTab]: undefined }));
    // 다음 틱에서 요청 (state 반영 후)
    setTimeout(handleSummarize, 0);
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">AI 요약 및 분석</h3>
      </div>

      {/* 탭 바 */}
      <div className="flex border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            disabled={isLoading}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-4">
        {/* ── 로딩 상태 ── */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="text-xs font-medium">AI가 분석 중입니다...</p>
              <p className="text-[10px]">잠시만 기다려 주세요</p>
            </div>
          </div>
        )}

        {/* ── 에러 상태 ── */}
        {!isLoading && currentError && (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-snug">{currentError}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSummarize}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              다시 시도
            </Button>
          </div>
        )}

        {/* ── 초기 상태 (결과 없음) ── */}
        {!isLoading && !currentError && !currentSummary && (
          <div className="space-y-3 py-1">
            {/* 간단한 클라이언트 통계 미리보기 */}
            {activeTab === 'today' && todayStats.total > 0 && (
              <div className="rounded-md bg-muted/40 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  오늘 마감: <span className="font-semibold text-foreground">{todayStats.total}개</span>
                  {' '}· 완료: <span className="font-semibold text-success">{todayStats.completed}개</span>
                  {' '}· 남은: <span className="font-semibold text-primary">{todayStats.allRemaining.length}개</span>
                </p>
              </div>
            )}
            {activeTab === 'week' && weekStats.total > 0 && (
              <div className="rounded-md bg-muted/40 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  이번 주: <span className="font-semibold text-foreground">{weekStats.total}개</span>
                  {' '}· 완료: <span className="font-semibold text-success">{weekStats.completed}개</span>
                  {' '}· 완료율: <span className={cn('font-semibold', rateColor(weekStats.completionRate))}>{weekStats.completionRate}%</span>
                </p>
              </div>
            )}

            <Button
              className="w-full btn-ai"
              size="sm"
              onClick={handleSummarize}
              disabled={todos.length === 0}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              AI 요약 보기
            </Button>

            {todos.length === 0 && (
              <p className="text-[10px] text-center text-muted-foreground">
                할 일을 추가하면 AI가 분석해 드립니다.
              </p>
            )}
          </div>
        )}

        {/* ── 결과 상태 ── */}
        {!isLoading && !currentError && currentSummary && (
          <div className="space-y-4">
            {activeTab === 'today' ? (
              <TodayResult stats={todayStats} summary={currentSummary} />
            ) : (
              <WeekResult stats={weekStats} summary={currentSummary} />
            )}

            {/* 재분석 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground h-7"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              다시 분석
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
