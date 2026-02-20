/**
 * AI 할 일 파싱 API Route
 * 자연어 입력을 Gemini 2.5 Flash로 분석해 구조화된 할 일 데이터로 변환
 * 입력 검증 → 전처리 → AI 분석 → 후처리 파이프라인
 */

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import type { ParseTodoRequest, ParsedTodoResult } from '@/lib/types/ai';

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────

const MIN_LENGTH = 2;
const MAX_LENGTH = 500;
const TITLE_MIN = 2;
const TITLE_MAX = 100;

// 이모지 매칭 정규식 (Unicode Emoji 블록)
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1FFFF}]/gu;

// SQL 인젝션·스크립트 인젝션 위험 특수문자
const DANGEROUS_CHARS_REGEX = /[<>'"`;\\]/g;

// ─────────────────────────────────────────
// Gemini 출력 스키마
// ─────────────────────────────────────────

const parsedTodoSchema = z.object({
  title: z
    .string()
    .describe('할 일의 핵심 제목 (간결하게, 동사형 권장, 날짜/시간 표현 제외)'),
  due_at: z
    .string()
    .nullable()
    .describe('마감일시 (YYYY-MM-DDTHH:mm 형식, 로컬 시간 기준). 날짜/시간 언급 없으면 null'),
  priority: z
    .enum(['high', 'medium', 'low'])
    .describe('우선순위: high(중요/긴급), medium(일반), low(여유)'),
  category: z
    .string()
    .nullable()
    .describe('카테고리 (업무/개인/건강/학습). 불명확하면 null'),
  description: z
    .string()
    .nullable()
    .describe('추가 설명. 핵심 정보만, 불필요하면 null'),
});

// ─────────────────────────────────────────
// 1. 입력 검증
// ─────────────────────────────────────────

interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * 입력 텍스트의 유효성을 검사합니다
 */
const validateInput = (text: unknown): ValidationResult => {
  if (typeof text !== 'string') {
    return { ok: false, error: '텍스트 형식이 올바르지 않습니다.' };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: '할 일 내용을 입력해주세요.' };
  }
  if (trimmed.length < MIN_LENGTH) {
    return { ok: false, error: `최소 ${MIN_LENGTH}자 이상 입력해주세요.` };
  }
  if (text.length > MAX_LENGTH) {
    return { ok: false, error: `입력은 ${MAX_LENGTH}자 이내로 입력해주세요.` };
  }

  // 위험 특수문자 포함 여부 확인
  if (DANGEROUS_CHARS_REGEX.test(trimmed)) {
    return { ok: false, error: '사용할 수 없는 특수문자가 포함되어 있습니다.' };
  }

  // 이모지만으로 이루어진 경우
  const withoutEmoji = trimmed.replace(EMOJI_REGEX, '').trim();
  if (withoutEmoji.length === 0) {
    return { ok: false, error: '이모지만으로는 할 일을 분석할 수 없습니다. 텍스트를 함께 입력해주세요.' };
  }

  return { ok: true };
};

// ─────────────────────────────────────────
// 2. 전처리
// ─────────────────────────────────────────

/**
 * 입력 텍스트를 AI 분석 전에 정규화합니다
 */
const preprocessText = (text: string): string => {
  let result = text.trim();

  // 연속 공백을 단일 공백으로 통합 (줄바꿈 포함)
  result = result.replace(/\s+/g, ' ');

  // 이모지 제거 (텍스트 분석에 불필요)
  result = result.replace(EMOJI_REGEX, '').trim();

  // 위험 특수문자 제거
  result = result.replace(DANGEROUS_CHARS_REGEX, '');

  // 전각 숫자/문자 → 반각으로 변환 (예: １２３ → 123)
  result = result.replace(/[\uFF01-\uFF5E]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );

  return result.trim();
};

// ─────────────────────────────────────────
// 3. 후처리
// ─────────────────────────────────────────

/**
 * AI 출력 결과를 검증·보정합니다
 */
const postprocess = (
  raw: z.infer<typeof parsedTodoSchema>,
  nowStr: string
): ParsedTodoResult => {
  const now = new Date(nowStr);

  // ── 제목 보정 ──
  let title = raw.title?.trim() || '새 할 일';

  if (title.length < TITLE_MIN) {
    title = '새 할 일';
  } else if (title.length > TITLE_MAX) {
    // 100자 초과 시 마지막 단어 경계에서 자름
    title = title.slice(0, TITLE_MAX).replace(/\s+\S*$/, '').trim() + '…';
  }

  // ── 마감일 보정 ──
  let due_at: string | null = null;

  if (raw.due_at) {
    const parsed = new Date(raw.due_at);

    if (!isNaN(parsed.getTime())) {
      // 과거 날짜 경고만 하고 그대로 반환 (사용자가 의도할 수 있음)
      // 단, 1년 이상 미래인 경우 현재 연도로 재계산
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(now.getFullYear() + 1);

      if (parsed > oneYearLater) {
        // 연도를 현재 연도로 보정
        parsed.setFullYear(now.getFullYear());
      }

      // "YYYY-MM-DDTHH:mm" 형식으로 직렬화
      const pad = (n: number) => String(n).padStart(2, '0');
      due_at =
        `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}` +
        `T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
    }
  }

  // ── 필수 필드 기본값 보장 ──
  const priority: 'high' | 'medium' | 'low' =
    raw.priority && ['high', 'medium', 'low'].includes(raw.priority)
      ? raw.priority
      : 'medium';

  const category = raw.category?.trim() || null;
  const description = raw.description?.trim() || null;

  return { title, due_at, priority, category, description };
};

// ─────────────────────────────────────────
// 4. 에러 응답 헬퍼
// ─────────────────────────────────────────

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

// ─────────────────────────────────────────
// API 핸들러
// ─────────────────────────────────────────

export const POST = async (request: NextRequest) => {
  try {
    const body: ParseTodoRequest = await request.json();
    const { text, currentLocalDateTime } = body;

    // ── 입력 검증 ──
    const validation = validateInput(text);
    if (!validation.ok) {
      return errorResponse(validation.error!, 400);
    }

    // ── 전처리 ──
    const cleanedText = preprocessText(text as string);

    if (cleanedText.length < MIN_LENGTH) {
      return errorResponse('의미 있는 내용을 입력해주세요.', 400);
    }

    // 현재 로컬 시간 (상대 날짜 기준점)
    const nowStr = currentLocalDateTime || new Date().toISOString().slice(0, 16);

    // ── AI 분석 ──
    const { object: raw } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: parsedTodoSchema,
      prompt: `당신은 자연어로 입력된 할 일을 구조화된 JSON 데이터로 변환하는 도우미입니다.
반드시 스키마에 정의된 JSON 형식으로만 응답하세요.

현재 날짜/시간 (로컬): ${nowStr}

=== 변환 규칙 ===

[1. 제목(title)]
- 할 일의 핵심 동작만 간결하게 추출
- 날짜·시간·우선순위 표현은 제목에서 제거
- 동사형 마무리 권장 (예: "팀 회의 준비하기", "보고서 작성하기")

[2. 마감일(due_at) — YYYY-MM-DDTHH:mm 형식, 로컬 시간 기준]

날짜 계산 규칙 (현재 날짜 기준):
- "오늘"         → 현재 날짜
- "내일"         → 현재 날짜 + 1일
- "모레"         → 현재 날짜 + 2일
- "이번 주 N요일" → 현재 날짜 이후 가장 가까운 해당 요일 (이미 지났으면 다음 주)
- "다음 주 N요일" → 다음 주의 해당 요일
- "N월 N일"      → 해당 날짜 (연도는 현재 연도, 이미 지났으면 다음 연도)

시간 변환 규칙:
- "아침"         → 08:00
- "오전 N시"     → N:00 (N은 1~11)
- "점심"·"낮"    → 12:00
- "오후"         → 15:00
- "오후 N시"     → (N < 12 ? N+12 : N):00
- "저녁"         → 18:00
- "밤"·"야간"    → 21:00
- "N시 N분"      → 그대로 변환
- 시간 미언급    → 09:00 (기본값)

날짜·시간 모두 미언급 → null

[3. 우선순위(priority)]
- high   : "급하게", "급히", "중요한", "빨리", "꼭", "반드시", "긴급", "즉시", "오늘 마감"
- low    : "여유롭게", "천천히", "언젠가", "나중에", "시간 될 때", "여유 있을 때"
- medium : 위 키워드 없음, 또는 일반적인 경우 (기본값)

[4. 카테고리(category)]
- "업무" : 회의, 보고서, 프로젝트, 업무, 팀, 직장, 클라이언트, 발표, 기획
- "개인" : 쇼핑, 친구, 가족, 약속, 취미, 집안일, 개인 용무
- "건강" : 운동, 병원, 건강, 요가, 헬스, 약, 검진, 식단
- "학습" : 공부, 책, 강의, 학습, 자격증, 독서, 튜토리얼, 과제
- 해당 없음 또는 불명확 → null

[5. 설명(description)]
- 제목에 담기 어려운 핵심 맥락만 (선택)
- 단순 반복이나 불필요한 정보 → null

입력: "${cleanedText}"`,
    });

    // ── 후처리 ──
    const result = postprocess(raw, nowStr);

    return NextResponse.json(result);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AI parse-todo]', err);
    }

    const message = err instanceof Error ? err.message : '';

    if (message.includes('API_KEY') || message.includes('authentication') || message.includes('API key')) {
      return errorResponse('AI 서비스 인증 오류가 발생했습니다. 관리자에게 문의해주세요.', 500);
    }
    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return errorResponse('AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.', 429);
    }
    if (message.includes('model') || message.includes('not found')) {
      return errorResponse('AI 모델 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 500);
    }
    if (message.includes('JSON') || message.includes('parse')) {
      return errorResponse('AI 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.', 500);
    }

    return errorResponse('AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.', 500);
  }
};
