import { useCallback } from 'react';
import type { Task, Status } from '../../types';
import { createTask, deleteTask, moveTaskToStatus, updateTask } from '../../hooks/useTasks';
import { playSuccessSound } from '../../utils/audio';

export function useTaskActions() {
  const saveTask = useCallback(
    async (
      userId: string,
      taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
      taskToEdit?: Task
    ) => {
      if (taskToEdit) {
        await updateTask(taskToEdit.id, taskData);
      } else {
        await createTask(userId, taskData);
      }

      playSuccessSound();
    },
    []
  );

  const removeTask = useCallback(async (taskId: string) => {
    await deleteTask(taskId);
  }, []);

  const setTaskStatus = useCallback(async (task: Task, newStatus: Status) => {
    await moveTaskToStatus(task.id, newStatus);

    if (newStatus === 'concluida' && task.status !== 'concluida') {
      playSuccessSound();
    }
  }, []);

  const toggleTaskCompletion = useCallback(
    async (task: Task, fallbackStatus: Status = 'hoje') => {
      const nextStatus = task.status === 'concluida' ? fallbackStatus : 'concluida';
      await setTaskStatus(task, nextStatus);
    },
    [setTaskStatus]
  );

  const toggleTaskMetric = useCallback(
    async (task: Task, field: 'theoryCompleted' | 'flashcardsCompleted') => {
      await updateTask(task.id, { [field]: !task[field] });
    },
    []
  );

  const toggleSubtaskItem = useCallback(async (task: Task, groupId: string, itemId: string) => {
    let completedNow = false;

    const updatedSubtasks = task.subtasks.map((group) => {
      if (group.id !== groupId) {
        return group;
      }

      return {
        ...group,
        items: group.items.map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          const nextCompleted = !item.completed;
          completedNow = nextCompleted;

          return {
            ...item,
            completed: nextCompleted,
          };
        }),
      };
    });

    await updateTask(task.id, { subtasks: updatedSubtasks });

    if (completedNow) {
      playSuccessSound();
    }
  }, []);

  return {
    saveTask,
    removeTask,
    setTaskStatus,
    toggleTaskCompletion,
    toggleTaskMetric,
    toggleSubtaskItem,
  };
}
