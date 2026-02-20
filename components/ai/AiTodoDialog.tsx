'use client';

/**
 * AI 할 일 생성 다이얼로그
 * 자연어 입력 → Gemini 분석 → 결과 확인 → 할 일 추가 2단계 플로우
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Sparkles, Loader2, ArrowLeft, Plus, CalendarClock, Tag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { ParsedTodoResult } from '@/lib/types/ai';
import type { CreateTodoInput } from '@/lib/types/todo';

// 예시 프롬프트 목록
const EXAMPLE_PROMPTS = [
  '내일 오후 3시까지 중요한 팀 회의 자료 준비하기',
  '이번 주 금요일까지 프로젝트 보고서 작성',
  '오늘 저녁 7시 헬스장 운동 1시간',
  '다음주까지 React 강의 5강 수강하기',
];

// 우선순위 표시 설정
const PRIORITY_CONFIG = {
  high: { label: '높음', className: 'badge-priority-high' },
  medium: { label: '보통', className: 'badge-priority-medium' },
  low: { label: '낮음', className: 'badge-priority-low' },
} as const;

interface AiTodoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTodo: (data: CreateTodoInput) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * 날짜 문자열을 사용자 친화적 로컬 형식으로 포맷합니다
 * AI가 반환한 로컬 시간 문자열을 new Date()로 파싱해 표시
 */
const formatParsedDueAt = (dueAt: string): string => {
  const d = new Date(dueAt);
  return format(d, 'yyyy년 M월 d일 (E) HH:mm', { locale: ko });
};

/**
 * 현재 로컬 시간을 "YYYY-MM-DDTHH:mm" 형식으로 반환합니다
 * API 프롬프트의 현재 시간 기준점으로 사용
 */
const getCurrentLocalDateTime = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
};

export const AiTodoDialog = ({
  isOpen,
  onClose,
  onAddTodo,
  isSubmitting = false,
}: AiTodoDialogProps) => {
  const [input, setInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedTodoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 자연어 → 구조화 데이터 변환 호출
  const handleParse = async () => {
    if (!input.trim()) return;

    try {
      setIsParsing(true);
      setError(null);

      const response = await fetch('/api/ai/parse-todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input.trim(),
          currentLocalDateTime: getCurrentLocalDateTime(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI 분석 중 오류가 발생했습니다.');
      }

      setParsedResult(data as ParsedTodoResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'AI 분석 중 오류가 발생했습니다.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  // 파싱 결과를 할 일로 추가하고 다이얼로그 닫기
  const handleAdd = async () => {
    if (!parsedResult) return;

    await onAddTodo({
      title: parsedResult.title,
      description: parsedResult.description || undefined,
      due_at: parsedResult.due_at || undefined,
      priority: parsedResult.priority,
      category: parsedResult.category || undefined,
    });

    handleClose();
  };

  // 입력 단계로 돌아가기
  const handleReset = () => {
    setParsedResult(null);
    setError(null);
  };

  // 다이얼로그 닫기 시 전체 상태 초기화
  const handleClose = () => {
    setInput('');
    setParsedResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI로 할 일 만들기
          </DialogTitle>
          <DialogDescription>
            자연어로 할 일을 입력하면 AI가 제목, 마감일, 우선순위를 자동으로 추출합니다.
          </DialogDescription>
        </DialogHeader>

        {/* ── 1단계: 자연어 입력 ── */}
        {!parsedResult && (
          <div className="space-y-4">
            {/* 텍스트 입력 영역 */}
            <div className="space-y-2">
              <Textarea
                placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                disabled={isParsing}
                className="resize-none"
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleParse();
                  }
                }}
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">
                  Ctrl+Enter로 빠르게 분석
                </p>
                <p className="text-xs text-muted-foreground">
                  {input.length}/500
                </p>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 예시 프롬프트 */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">예시 문장</p>
              <div className="flex flex-col gap-1.5">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button
                    key={example}
                    onClick={() => setInput(example)}
                    disabled={isParsing}
                    className="text-left text-xs px-3 py-2 rounded-md border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} disabled={isParsing}>
                취소
              </Button>
              <Button
                onClick={handleParse}
                disabled={!input.trim() || isParsing}
                className="btn-ai"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    분석하기
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── 2단계: 파싱 결과 확인 ── */}
        {parsedResult && (
          <div className="space-y-4">
            {/* 원본 입력 표시 */}
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">입력한 내용</p>
              <p className="text-sm">{input}</p>
            </div>

            {/* 분석 결과 카드 */}
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="font-semibold text-base leading-snug">
                  {parsedResult.title}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* 마감일 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    마감일
                  </div>
                  <p className={cn('font-medium', !parsedResult.due_at && 'text-muted-foreground')}>
                    {parsedResult.due_at
                      ? formatParsedDueAt(parsedResult.due_at)
                      : '없음'}
                  </p>
                </div>

                {/* 우선순위 */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">우선순위</p>
                  <Badge
                    variant="outline"
                    className={PRIORITY_CONFIG[parsedResult.priority].className}
                  >
                    {PRIORITY_CONFIG[parsedResult.priority].label}
                  </Badge>
                </div>

                {/* 카테고리 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    카테고리
                  </div>
                  <p className={cn('font-medium', !parsedResult.category && 'text-muted-foreground')}>
                    {parsedResult.category || '없음'}
                  </p>
                </div>

                {/* 설명 */}
                {parsedResult.description && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-xs text-muted-foreground">설명</p>
                    <p className="text-sm">{parsedResult.description}</p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              결과가 정확하지 않으면 다시 입력하거나, 추가 후 직접 수정할 수 있습니다.
            </p>

            {/* 버튼 */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset} disabled={isSubmitting}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                다시 입력
              </Button>
              <Button onClick={handleAdd} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    추가 중...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    추가하기
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
