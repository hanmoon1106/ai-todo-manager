/**
 * AI 할 일 파싱 관련 타입 정의
 */

/**
 * Gemini가 자연어를 분석해 반환하는 구조화된 할 일 데이터
 * due_at은 로컬 시간 기준 "YYYY-MM-DDTHH:mm" 형식
 */
export interface ParsedTodoResult {
  title: string;
  due_at: string | null;
  priority: 'high' | 'medium' | 'low';
  category: string | null;
  description: string | null;
}

/**
 * AI 파싱 API 요청 바디
 */
export interface ParseTodoRequest {
  text: string;
  currentLocalDateTime: string; // "YYYY-MM-DDTHH:mm" 형식 (로컬 시간)
}

/**
 * AI 파싱 API 응답 (성공)
 */
export type ParseTodoResponse = ParsedTodoResult;

/**
 * AI 파싱 API 응답 (실패)
 */
export interface ParseTodoErrorResponse {
  error: string;
}

// ─────────────────────────────────────────
// AI 요약 관련 타입
// ─────────────────────────────────────────

/**
 * AI가 생성하는 할 일 목록 요약 결과
 */
export interface TodoSummary {
  summary: string;
  urgentTasks: string[];
  insights: string[];
  recommendations: string[];
}

/**
 * 요약 API로 전송하는 할 일 데이터 (필수 필드만 포함)
 */
export interface TodoSummaryInput {
  title: string;
  completed: boolean;
  due_at: string | null;
  priority: 'high' | 'medium' | 'low';
  category: string | null;
  created_at: string;
}

/**
 * AI 요약 API 요청 바디
 */
export interface SummarizeTodosRequest {
  todos: TodoSummaryInput[];
  period: 'today' | 'week';
  currentLocalDateTime: string; // "YYYY-MM-DDTHH:mm" 형식
}
