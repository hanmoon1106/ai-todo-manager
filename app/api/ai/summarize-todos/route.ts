/**
 * AI 할 일 요약 API Route
 * 사용자의 할 일 목록을 Gemini 2.5 Flash로 분석해 요약·인사이트·추천을 생성
 */

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import type { SummarizeTodosRequest, TodoSummaryInput } from '@/lib/types/ai';

// ─────────────────────────────────────────
// Gemini 출력 스키마
// ─────────────────────────────────────────

const summarySchema = z.object({
  summary: z
    .string()
    .describe('전체 상황을 1~2문장으로 요약 (친근하고 자연스러운 한국어)'),
  urgentTasks: z
    .array(z.string())
    .describe('즉시 처리가 필요한 할 일 제목 목록 (최대 3개, 없으면 빈 배열)'),
  insights: z
    .array(z.string())
    .describe('데이터 기반 인사이트 2~4개 (구체적인 수치와 패턴 포함)'),
  recommendations: z
    .array(z.string())
    .describe('실행 가능한 추천 사항 2~3개 (구체적이고 실용적으로)'),
});

// ─────────────────────────────────────────
// 통계 계산 헬퍼
// ─────────────────────────────────────────

interface PriorityCompletionStat {
  total: number;
  completed: number;
  rate: number;
}

interface PeriodStats {
  now: Date;
  todayStr: string;
  weekMonday: Date;
  weekSunday: Date;

  // 전체
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;

  // 기간별 할 일
  todayTasks: TodoSummaryInput[];
  weekTasks: TodoSummaryInput[];

  // 우선순위별 완료 통계
  priorityCompletion: Record<'high' | 'medium' | 'low', PriorityCompletionStat>;

  // 카테고리별 완료율
  categoryCompletion: Record<string, { total: number; completed: number; overdue: number }>;

  // 마감일 준수율 (due_at 있는 완료 항목 중 마감 전 완료 비율)
  deadlineAdherenceRate: number;

  // 시간대별 마감 분포
  timeSlotDist: { morning: number; afternoon: number; evening: number; night: number };

  // 요일별 마감 분포 (0=일~6=토)
  dayOfWeekDist: number[];

  // 지연 패턴: 어떤 카테고리/우선순위가 자주 지연되는지
  overdueByCategory: Record<string, number>;
  overdueByPriority: Record<string, number>;

  // 이번 주 완료된 할 일
  completedThisWeek: number;
}

const rate = (completed: number, total: number) =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

/**
 * 할 일 목록에서 상세 통계를 계산합니다
 */
const computeStats = (todos: TodoSummaryInput[], nowStr: string): PeriodStats => {
  const now = new Date(nowStr);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 이번 주 월~일
  const dayOfWeek = now.getDay();
  const weekMonday = new Date(now);
  weekMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekMonday.setHours(0, 0, 0, 0);
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  weekSunday.setHours(23, 59, 59, 999);

  // 기간별 분류
  const todayTasks = todos.filter((t) => t.due_at?.startsWith(todayStr));
  const weekTasks = todos.filter((t) => {
    if (!t.due_at) return false;
    const d = new Date(t.due_at);
    return d >= weekMonday && d <= weekSunday;
  });
  const completedThisWeek = todos.filter(
    (t) => t.completed && t.due_at && new Date(t.due_at) >= weekMonday && new Date(t.due_at) <= weekSunday
  ).length;

  // 기본 집계
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const inProgress = total - completed;
  const completionRate = rate(completed, total);
  const overdue = todos.filter((t) => !t.completed && t.due_at && new Date(t.due_at) < now).length;

  // 우선순위별 완료 통계
  const priorityCompletion: Record<'high' | 'medium' | 'low', PriorityCompletionStat> = {
    high: { total: 0, completed: 0, rate: 0 },
    medium: { total: 0, completed: 0, rate: 0 },
    low: { total: 0, completed: 0, rate: 0 },
  };
  todos.forEach((t) => {
    const p = t.priority as 'high' | 'medium' | 'low';
    if (p in priorityCompletion) {
      priorityCompletion[p].total++;
      if (t.completed) priorityCompletion[p].completed++;
    }
  });
  (['high', 'medium', 'low'] as const).forEach((p) => {
    priorityCompletion[p].rate = rate(priorityCompletion[p].completed, priorityCompletion[p].total);
  });

  // 카테고리별 완료율·지연율
  const categoryCompletion: Record<string, { total: number; completed: number; overdue: number }> = {};
  todos.forEach((t) => {
    const cat = t.category || '미분류';
    if (!categoryCompletion[cat]) categoryCompletion[cat] = { total: 0, completed: 0, overdue: 0 };
    categoryCompletion[cat].total++;
    if (t.completed) categoryCompletion[cat].completed++;
    if (!t.completed && t.due_at && new Date(t.due_at) < now) categoryCompletion[cat].overdue++;
  });

  // 마감일 준수율 (due_at 있는 완료 항목 중 마감 전 완료한 것 — due_at 기준으로 근사)
  const withDue = todos.filter((t) => t.due_at);
  const completedWithDue = withDue.filter((t) => t.completed).length;
  const deadlineAdherenceRate = rate(completedWithDue, withDue.length);

  // 시간대별 마감 분포
  const timeSlotDist = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  todos.forEach((t) => {
    if (!t.due_at) return;
    const h = new Date(t.due_at).getHours();
    if (h < 12) timeSlotDist.morning++;
    else if (h < 17) timeSlotDist.afternoon++;
    else if (h < 21) timeSlotDist.evening++;
    else timeSlotDist.night++;
  });

  // 요일별 마감 분포 (0=일~6=토)
  const dayOfWeekDist = Array(7).fill(0);
  todos.forEach((t) => {
    if (!t.due_at) return;
    dayOfWeekDist[new Date(t.due_at).getDay()]++;
  });

  // 지연 패턴: 카테고리·우선순위별 지연 개수
  const overdueByCategory: Record<string, number> = {};
  const overdueByPriority: Record<string, number> = {};
  todos
    .filter((t) => !t.completed && t.due_at && new Date(t.due_at) < now)
    .forEach((t) => {
      const cat = t.category || '미분류';
      overdueByCategory[cat] = (overdueByCategory[cat] || 0) + 1;
      overdueByPriority[t.priority] = (overdueByPriority[t.priority] || 0) + 1;
    });

  return {
    now,
    todayStr,
    weekMonday,
    weekSunday,
    total,
    completed,
    inProgress,
    overdue,
    completionRate,
    todayTasks,
    weekTasks,
    completedThisWeek,
    priorityCompletion,
    categoryCompletion,
    deadlineAdherenceRate,
    timeSlotDist,
    dayOfWeekDist,
    overdueByCategory,
    overdueByPriority,
  };
};

// 요일 이름 (0=일)
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 프롬프트에 포함할 할 일 목록 텍스트를 생성합니다
 */
const formatTodosForPrompt = (todos: TodoSummaryInput[]): string => {
  if (todos.length === 0) return '(없음)';
  return todos
    .map((t) => {
      const status = t.completed ? '✓완료' : '○미완료';
      const due = t.due_at ? `마감: ${t.due_at}` : '마감 없음';
      const cat = t.category ? `[${t.category}]` : '';
      return `- ${status} ${cat} "${t.title}" (${t.priority}우선순위, ${due})`;
    })
    .join('\n');
};

/**
 * 통계 데이터를 프롬프트용 텍스트 블록으로 직렬화합니다
 */
const buildStatsBlock = (stats: PeriodStats, period: 'today' | 'week'): string => {
  const targetTodos = period === 'today' ? stats.todayTasks : stats.weekTasks;
  const periodLabel = period === 'today' ? '오늘' : '이번 주';

  // 카테고리 요약 (완료율 포함)
  const catSummary = Object.entries(stats.categoryCompletion)
    .map(([k, v]) => `${k} ${v.total}개(완료 ${v.completed}개, 지연 ${v.overdue}개)`)
    .join(' / ');

  // 우선순위 완료율
  const { high, medium, low } = stats.priorityCompletion;

  // 시간대 집중도
  const { morning, afternoon, evening, night } = stats.timeSlotDist;

  // 요일 분포 (마감 있는 것만)
  const dayDist = stats.dayOfWeekDist
    .map((cnt, i) => `${DAY_NAMES[i]}요일 ${cnt}개`)
    .filter((_, i) => stats.dayOfWeekDist[i] > 0)
    .join(' / ');

  // 지연 패턴
  const overdueBycat = Object.entries(stats.overdueByCategory)
    .map(([k, v]) => `${k} ${v}개`)
    .join(', ') || '없음';
  const overdueByPri = Object.entries(stats.overdueByPriority)
    .map(([k, v]) => `${k} ${v}개`)
    .join(', ') || '없음';

  return `=== 현재 시각 ===
${stats.now.toISOString().slice(0, 16)} (오늘: ${stats.todayStr})

=== 전체 완료율 분석 ===
- 전체: ${stats.total}개 / 완료: ${stats.completed}개 (${stats.completionRate}%) / 진행 중: ${stats.inProgress}개
- 마감 초과(지연): ${stats.overdue}개
- 마감일 준수율(마감 있는 항목 기준): ${stats.deadlineAdherenceRate}%
- 이번 주 완료: ${stats.completedThisWeek}개

=== 우선순위별 완료 패턴 ===
- 높음(high): 전체 ${high.total}개 중 ${high.completed}개 완료 (${high.rate}%)
- 보통(medium): 전체 ${medium.total}개 중 ${medium.completed}개 완료 (${medium.rate}%)
- 낮음(low): 전체 ${low.total}개 중 ${low.completed}개 완료 (${low.rate}%)

=== 카테고리별 현황 ===
${catSummary || '(데이터 없음)'}

=== 시간대별 업무 집중도 ===
- 오전(~12시): ${morning}개 / 오후(12~17시): ${afternoon}개 / 저녁(17~21시): ${evening}개 / 야간(21시~): ${night}개
- 요일별 마감 분포: ${dayDist || '(데이터 없음)'}

=== 지연 패턴 분석 ===
- 카테고리별 지연: ${overdueBycat}
- 우선순위별 지연: ${overdueByPri}

=== ${periodLabel} 할 일 (${targetTodos.length}개) ===
${formatTodosForPrompt(targetTodos)}

=== 전체 할 일 목록 ===
${formatTodosForPrompt(stats.todayTasks.length > 0 || stats.weekTasks.length > 0 ? [...stats.todayTasks, ...stats.weekTasks.filter(t => !stats.todayTasks.includes(t))] : [])}`;
};

// ─────────────────────────────────────────
// API 핸들러
// ─────────────────────────────────────────

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export const POST = async (request: NextRequest) => {
  try {
    const body: SummarizeTodosRequest = await request.json();
    const { todos, period, currentLocalDateTime } = body;

    // ── 입력 검증 ──
    if (!Array.isArray(todos)) {
      return errorResponse('할 일 데이터 형식이 올바르지 않습니다.', 400);
    }
    if (!['today', 'week'].includes(period)) {
      return errorResponse('분석 기간이 올바르지 않습니다.', 400);
    }
    if (todos.length === 0) {
      return errorResponse('분석할 할 일이 없습니다. 할 일을 먼저 추가해주세요.', 400);
    }
    if (todos.length > 200) {
      return errorResponse('한 번에 분석할 수 있는 최대 개수(200개)를 초과했습니다.', 400);
    }

    const nowStr = currentLocalDateTime || new Date().toISOString().slice(0, 16);
    const stats = computeStats(todos, nowStr);
    const periodLabel = period === 'today' ? '오늘' : '이번 주';
    const statsBlock = buildStatsBlock(stats, period);

    // ── AI 분석 ──
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: summarySchema,
      prompt: `당신은 공감 능력이 뛰어난 생산성 코치입니다.
아래 데이터를 바탕으로 사용자의 ${periodLabel} 할 일 현황을 분석해 주세요.
반드시 한국어로, 친근하고 자연스러운 문체로 작성하세요.

${statsBlock}

=== 작성 원칙 ===

[summary — 1~2문장 전체 요약]
- "${periodLabel}" 관점에서 현황을 요약
- 완료율, 지연 현황, 핵심 성과 중 가장 인상적인 수치 1~2개 포함
- 예: "오늘 5개 중 3개를 완료해 60%의 달성률을 기록했어요. 아직 긴급 업무 2개가 남아 있으니 집중이 필요한 시간입니다!"
- 격려 또는 집중 유도 메시지로 마무리

[urgentTasks — 최대 3개 제목]
- 조건: 미완료 AND (high우선순위 OR 마감 초과 OR 오늘 마감)
- 없으면 빈 배열 []
- 제목만 반환 (설명 없이)

[insights — 2~4개, 구체적 수치와 패턴]
아래 분석 관점 중 데이터에서 의미 있는 것을 골라 작성하세요:

• 완료율 분석
  - 전체 완료율과 우선순위별 완료 패턴 비교
  - 예: "높음 우선순위 완료율이 40%로 낮아, 중요 업무 처리에 어려움이 있어 보여요."

• 시간 관리 분석
  - 마감일 준수율, 지연 빈도, 시간대 집중도
  - 예: "할 일의 70%가 오후 시간대에 몰려 있어, 오전이 상대적으로 여유롭습니다."

• 생산성 패턴
  - 자주 지연되는 카테고리·유형, 완료하기 쉬운 작업의 특징
  - 예: "업무 카테고리에서 지연이 3건으로 가장 많이 발생하고 있어요."

• 긍정적 성과 강조
  - 잘하고 있는 부분을 구체적으로 언급
  - 예: "낮음 우선순위 항목은 100% 완료! 작은 것부터 처리하는 습관이 잘 되어 있네요."

[recommendations — 2~3개 실행 가능한 조언]
아래 전략 중 현재 데이터에 가장 적합한 것을 선택해 구체적으로 작성하세요:

• 시간 관리 팁
  - 오전/오후 집중 시간 배분 제안
  - 예: "오전에 긴급 업무 2개를 먼저 끝내면, 오후를 더 여유롭게 사용할 수 있어요."

• 우선순위 조정
  - 현재 분포 기반으로 구체적 재배치 제안
  - 예: "높음 우선순위 미완료 업무 중 X를 오늘 안에 처리하는 것을 추천드려요."

• 업무 과부하 분산
  - 특정 날짜·시간대 쏠림 완화 방법
  - 예: "금요일 마감이 4개로 집중되어 있어요. 화·수요일로 분산하면 주말 여유가 생깁니다."

• ${period === 'today' ? '오늘 남은 시간 활용' : '다음 주 계획 제안'}
  ${period === 'today'
    ? '- 남은 오늘 시간에 완료 가능한 항목과 순서 제안'
    : '- 이번 주 패턴을 바탕으로 다음 주 일정 배분 전략 제안'}

• 동기부여 마무리
  - 격려와 구체적인 다음 행동을 한 문장으로
  - 예: "지금 가장 어려운 일 하나를 끝내면 나머지가 훨씬 수월해질 거예요. 파이팅!"

[작성 시 주의사항]
- 데이터에 없는 내용은 추측하지 않음
- 수치가 없으면 패턴 기반 정성 분석으로 대체
- 각 항목은 1~2문장으로 간결하게
- 전체적으로 친근하고 격려하는 어투 유지`,
    });

    return NextResponse.json(object);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AI summarize-todos]', err);
    }

    const message = err instanceof Error ? err.message : '';

    if (message.includes('API_KEY') || message.includes('authentication') || message.includes('API key')) {
      return errorResponse('AI 서비스 인증 오류가 발생했습니다.', 500);
    }
    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return errorResponse('AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.', 429);
    }

    return errorResponse('AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.', 500);
  }
};
