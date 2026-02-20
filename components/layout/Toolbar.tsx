'use client';

/**
 * 검색, 필터, 정렬 툴바 컴포넌트
 */

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface FilterState {
  priority: string[];
  status: string[];
  category: string;
}

interface ToolbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
}

/**
 * 검색, 필터, 정렬 기능을 제공하는 툴바
 */
export const Toolbar = ({
  searchQuery = '',
  onSearchChange,
  sortBy = 'created_desc',
  onSortChange,
  filters = { priority: [], status: [], category: '' },
  onFiltersChange,
}: ToolbarProps) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // 필터 초기화
  const handleResetFilters = () => {
    const resetFilters = { priority: [], status: [], category: '' };
    setLocalFilters(resetFilters);
    onFiltersChange?.(resetFilters);
    onSearchChange?.('');
  };

  // 우선순위 필터 토글
  const togglePriorityFilter = (priority: string) => {
    const newPriorities = localFilters.priority.includes(priority)
      ? localFilters.priority.filter((p) => p !== priority)
      : [...localFilters.priority, priority];
    
    const newFilters = { ...localFilters, priority: newPriorities };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  // 상태 필터 토글
  const toggleStatusFilter = (status: string) => {
    const newStatuses = localFilters.status.includes(status)
      ? localFilters.status.filter((s) => s !== status)
      : [...localFilters.status, status];
    
    const newFilters = { ...localFilters, status: newStatuses };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  // 활성 필터 개수 계산
  const activeFiltersCount =
    localFilters.priority.length +
    localFilters.status.length +
    (localFilters.category ? 1 : 0) +
    (searchQuery ? 1 : 0);

  return (
    <div className="flex flex-col gap-4 p-4 bg-muted/30 border-b">
      {/* 검색 및 정렬 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 검색창 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="할 일 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 정렬 */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="정렬 기준" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority_asc">우선순위 높은순</SelectItem>
            <SelectItem value="priority_desc">우선순위 낮은순</SelectItem>
            <SelectItem value="due_asc">마감일 빠른순</SelectItem>
            <SelectItem value="due_desc">마감일 느린순</SelectItem>
            <SelectItem value="created_desc">최신순</SelectItem>
            <SelectItem value="created_asc">오래된순</SelectItem>
          </SelectContent>
        </Select>

        {/* 필터 버튼 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              필터
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">필터</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                  >
                    초기화
                  </Button>
                )}
              </div>

              <Separator />

              {/* 우선순위 필터 */}
              <div className="space-y-2">
                <Label>우선순위</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      localFilters.priority.includes('high')
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer badge-priority-high"
                    onClick={() => togglePriorityFilter('high')}
                  >
                    높음
                  </Badge>
                  <Badge
                    variant={
                      localFilters.priority.includes('medium')
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer badge-priority-medium"
                    onClick={() => togglePriorityFilter('medium')}
                  >
                    보통
                  </Badge>
                  <Badge
                    variant={
                      localFilters.priority.includes('low')
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer badge-priority-low"
                    onClick={() => togglePriorityFilter('low')}
                  >
                    낮음
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* 상태 필터 */}
              <div className="space-y-2">
                <Label>상태</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      localFilters.status.includes('progress')
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer"
                    onClick={() => toggleStatusFilter('progress')}
                  >
                    진행 중
                  </Badge>
                  <Badge
                    variant={
                      localFilters.status.includes('completed')
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer"
                    onClick={() => toggleStatusFilter('completed')}
                  >
                    완료
                  </Badge>
                  <Badge
                    variant={
                      localFilters.status.includes('delayed')
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer"
                    onClick={() => toggleStatusFilter('delayed')}
                  >
                    지연
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* 카테고리 필터 */}
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select
                  value={localFilters.category}
                  onValueChange={(value) => {
                    const newFilters = { ...localFilters, category: value };
                    setLocalFilters(newFilters);
                    onFiltersChange?.(newFilters);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체</SelectItem>
                    <SelectItem value="업무">업무</SelectItem>
                    <SelectItem value="개인">개인</SelectItem>
                    <SelectItem value="학습">학습</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 활성 필터 표시 */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">활성 필터:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              검색: {searchQuery}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onSearchChange?.('')}
              />
            </Badge>
          )}
          {localFilters.priority.map((p) => (
            <Badge key={p} variant="secondary" className="gap-1">
              우선순위: {p === 'high' ? '높음' : p === 'medium' ? '보통' : '낮음'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => togglePriorityFilter(p)}
              />
            </Badge>
          ))}
          {localFilters.status.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1">
              상태: {s === 'progress' ? '진행 중' : s === 'completed' ? '완료' : '지연'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleStatusFilter(s)}
              />
            </Badge>
          ))}
          {localFilters.category && (
            <Badge variant="secondary" className="gap-1">
              카테고리: {localFilters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const newFilters = { ...localFilters, category: '' };
                  setLocalFilters(newFilters);
                  onFiltersChange?.(newFilters);
                }}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-6 text-xs"
          >
            전체 초기화
          </Button>
        </div>
      )}
    </div>
  );
};
