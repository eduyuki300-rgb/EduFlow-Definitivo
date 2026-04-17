import type { Task } from '../../types';
import { getTaskEstimatedSeconds, getTaskPriorityRank, getTaskSortTimestamp, hasTaskProgress, isSameDay, toDate } from '../../lib/task-utils';

export type TodayFilter = 'all' | 'inProgress' | 'highPriority' | 'quickWins';

export interface TodaySummary {
  plannedCount: number;
  completedTodayCount: number;
  progressPercent: number;
  focusedSeconds: number;
  estimatedSeconds: number;
  inProgressCount: number;
}

export interface TodaySubjectGroup {
  subject: string;
  tasks: Task[];
  count: number;
  estimatedSeconds: number;
  focusedSeconds: number;
  startedCount: number;
}

export interface TodayViewModel {
  summary: TodaySummary;
  nextTask: Task | null;
  focusQueue: Task[];
  subjectGroups: TodaySubjectGroup[];
}

function matchesFilter(task: Task, filter: TodayFilter) {
  if (filter === 'inProgress') return hasTaskProgress(task);
  if (filter === 'highPriority') return task.priority === 'alta';
  if (filter === 'quickWins') return (task.estimatedPomodoros ?? 0) <= 2;
  return true;
}

function matchesSearch(task: Task, search: string) {
  if (!search) return true;
  const query = search.toLowerCase();
  return (
    task.title.toLowerCase().includes(query) ||
    task.subject.toLowerCase().includes(query) ||
    (task.tags ?? []).some((tag) => tag.toLowerCase().includes(query))
  );
}

export function rankTodayTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const priorityDiff = getTaskPriorityRank(left) - getTaskPriorityRank(right);
    if (priorityDiff !== 0) return priorityDiff;

    const leftStarted = hasTaskProgress(left) ? 0 : 1;
    const rightStarted = hasTaskProgress(right) ? 0 : 1;
    if (leftStarted !== rightStarted) return leftStarted - rightStarted;

    const estimatedDiff = (left.estimatedPomodoros ?? Number.MAX_SAFE_INTEGER) - (right.estimatedPomodoros ?? Number.MAX_SAFE_INTEGER);
    if (estimatedDiff !== 0) return estimatedDiff;

    return getTaskSortTimestamp(left) - getTaskSortTimestamp(right);
  });
}

export function buildTodayViewModel(tasks: Task[], search: string, filter: TodayFilter): TodayViewModel {
  const today = new Date();
  const todayTasks = tasks.filter((task) => task.status === 'hoje');
  const completedTodayCount = tasks.filter((task) => task.status === 'concluida' && isSameDay(task.updatedAt, today)).length;
  const filtered = rankTodayTasks(todayTasks).filter((task) => matchesFilter(task, filter) && matchesSearch(task, search));
  const plannedCount = todayTasks.length;
  const estimatedSeconds = todayTasks.reduce((acc, task) => acc + getTaskEstimatedSeconds(task), 0);
  const focusedSeconds = todayTasks.reduce((acc, task) => acc + (task.liquidTime ?? 0), 0);
  const inProgressCount = todayTasks.filter((task) => hasTaskProgress(task)).length;
  const totalScope = plannedCount + completedTodayCount;
  const progressPercent = totalScope > 0 ? Math.round((completedTodayCount / totalScope) * 100) : 0;

  const groupsMap = new Map<string, TodaySubjectGroup>();

  for (const task of rankTodayTasks(todayTasks)) {
    const current = groupsMap.get(task.subject) ?? {
      subject: task.subject,
      tasks: [],
      count: 0,
      estimatedSeconds: 0,
      focusedSeconds: 0,
      startedCount: 0,
    };

    current.tasks.push(task);
    current.count += 1;
    current.estimatedSeconds += getTaskEstimatedSeconds(task);
    current.focusedSeconds += task.liquidTime ?? 0;
    current.startedCount += hasTaskProgress(task) ? 1 : 0;

    groupsMap.set(task.subject, current);
  }

  const subjectGroups = [...groupsMap.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return right.estimatedSeconds - left.estimatedSeconds;
  });

  return {
    summary: {
      plannedCount,
      completedTodayCount,
      progressPercent,
      focusedSeconds,
      estimatedSeconds,
      inProgressCount,
    },
    nextTask: filtered[0] ?? null,
    focusQueue: filtered,
    subjectGroups,
  };
}
