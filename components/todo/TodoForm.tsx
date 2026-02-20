'use client';

/**
 * 할 일 추가/편집 폼 컴포넌트
 */

import { Todo, Priority, CreateTodoInput } from '@/lib/types/todo';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

/**
 * UTC ISO 문자열을 datetime-local 입력에 사용할 로컬 시간 문자열로 변환합니다
 * new Date().toISOString()은 UTC 기준이므로 로컬 시간 메서드로 직접 조합합니다
 */
const toLocalDateTimeInputValue = (isoString: string): string => {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

// 폼 유효성 검사 스키마
const todoFormSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력해주세요')
    .max(100, '제목은 100자 이내로 입력해주세요'),
  description: z
    .string()
    .max(2000, '설명은 2000자 이내로 입력해주세요')
    .optional(),
  due_at: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.string().max(50, '카테고리는 50자 이내로 입력해주세요').optional(),
});

type TodoFormValues = z.infer<typeof todoFormSchema>;

interface TodoFormProps {
  todo?: Todo | null;
  isSubmitting?: boolean;
  onSubmit: (data: CreateTodoInput) => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Todo 추가 또는 편집을 위한 폼 컴포넌트
 */
export const TodoForm = ({
  todo,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: TodoFormProps) => {
  // 편집 모드인지 확인
  const isEditMode = !!todo;

  // React Hook Form 설정
  const form = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: todo?.title || '',
      description: todo?.description || '',
      due_at: todo?.due_at
        ? toLocalDateTimeInputValue(todo.due_at)
        : '',
      priority: todo?.priority || 'medium',
      category: todo?.category || '',
    },
  });

  // 폼 제출 핸들러
  const handleSubmit = async (values: TodoFormValues) => {
    await onSubmit({
      title: values.title,
      description: values.description || undefined,
      due_at: values.due_at || undefined,
      priority: values.priority,
      category: values.category || undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* 제목 */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                제목 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="할 일 제목을 입력하세요"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 설명 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="할 일에 대한 상세 설명을 입력하세요 (선택)"
                  rows={4}
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>최대 2000자까지 입력 가능합니다</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 마감일 */}
        <FormField
          control={form.control}
          name="due_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>마감일</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                마감일과 시간을 설정하세요 (선택)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          {/* 우선순위 */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  우선순위 <span className="text-destructive">*</span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="우선순위 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 카테고리 */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>카테고리</FormLabel>
                <FormControl>
                  <Input
                    placeholder="예: 업무, 개인, 학습"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 버튼들 */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              취소
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? '수정하기' : '추가하기'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
