/**
 * Todo 관련 유틸리티 함수
 */

import { Todo, TodoStatus } from '@/lib/types/todo';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * Todo의 현재 상태를 계산합니다
 * @param todo - Todo 객체
 * @returns 'progress' | 'completed' | 'delayed'
 */
export const getTodoStatus = (todo: Todo): TodoStatus => {
  // 완료된 경우
  if (todo.completed) {
    return 'completed';
  }

  // 마감일이 없으면 진행 중
  if (!todo.due_at) {
    return 'progress';
  }

  // 마감일이 지났으면 지연
  const dueDate = parseISO(todo.due_at);
  if (isPast(dueDate)) {
    return 'delayed';
  }

  return 'progress';
};

/**
 * 날짜를 한글 형식으로 포맷합니다
 * @param dateString - ISO 날짜 문자열
 * @returns 포맷된 날짜 문자열
 */
export const formatDate = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'yyyy년 M월 d일 HH:mm', { locale: ko });
};

/**
 * 날짜만 포맷합니다 (시간 제외)
 * @param dateString - ISO 날짜 문자열
 * @returns 포맷된 날짜 문자열
 */
export const formatDateOnly = (dateString: string): string => {
  const date = parseISO(dateString);
  return format(date, 'yyyy년 M월 d일', { locale: ko });
};

/**
 * 상대 시간 포맷 (예: "3일 전", "2시간 후")
 * @param dateString - ISO 날짜 문자열
 * @returns 상대 시간 문자열
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: ko });
};

/**
 * 우선순위를 한글로 변환합니다
 * @param priority - 'high' | 'medium' | 'low'
 * @returns 한글 우선순위
 */
export const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    high: '높음',
    medium: '보통',
    low: '낮음',
  };
  return labels[priority] || '보통';
};

/**
 * 우선순위 정렬 순서 (높음 > 보통 > 낮음)
 * @param priority - 우선순위
 * @returns 정렬 순서 숫자
 */
export const getPrioritySortOrder = (priority: string): number => {
  const order: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return order[priority] ?? 1;
};
