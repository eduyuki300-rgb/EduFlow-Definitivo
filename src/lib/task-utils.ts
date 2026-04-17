import type { Task } from '../types';

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null) {
    if ('toDate' in value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    if ('seconds' in value && typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000);
    }
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function formatDurationCompact(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${minutes.toString().padStart(2, '0')}m ${remainder.toString().padStart(2, '0')}s`;
}

export function formatDateLabel(value: unknown, options?: Intl.DateTimeFormatOptions) {
  const date = toDate(value);
  if (!date) return '';

  return new Intl.DateTimeFormat('pt-BR', options ?? {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function isSameDay(a: unknown, b: Date) {
  const left = toDate(a);
  if (!left) return false;

  return left.toDateString() === b.toDateString();
}

export function getTaskPriorityRank(task: Task) {
  return PRIORITY_ORDER[task.priority] ?? PRIORITY_ORDER.media;
}

export function getTaskEstimatedSeconds(task: Task) {
  return (task.estimatedPomodoros ?? 0) * 25 * 60;
}

export function getTaskChecklistProgress(task: Task) {
  const groups = task.subtasks ?? [];
  const totalItems = groups.reduce((acc, group) => acc + (group.items?.length || 0), 0);
  const completedItems = groups.reduce((acc, group) => acc + (group.items?.filter((item) => item.completed).length || 0), 0);
  const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : -1;

  return {
    totalItems,
    completedItems,
    percent,
  };
}

export function hasTaskProgress(task: Task) {
  const checklist = getTaskChecklistProgress(task);

  return Boolean(
    (task.liquidTime ?? 0) > 0 ||
    (task.pomodoros ?? 0) > 0 ||
    checklist.completedItems > 0 ||
    task.theoryCompleted ||
    task.flashcardsCompleted ||
    (task.questionsTotal ?? 0) > 0 ||
    task.notes.trim().length > 0
  );
}

export function getTaskSortTimestamp(task: Task) {
  return toDate(task.createdAt)?.getTime() ?? 0;
}
