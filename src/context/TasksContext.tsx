import React, { createContext, useContext, ReactNode } from 'react';
import { Task, Status } from '../types';
import { useTasks, createTask, updateTask, deleteTask, moveTaskToStatus } from '../hooks/useTasks';
import { useAuthContext } from './AuthContext';

interface TasksContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'error';
  createTask: (taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTaskToStatus: (taskId: string, newStatus: Status) => Promise<void>;
  forceSync: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const { tasks, isLoading, error, syncStatus, forceSync } = useTasks(user?.uid);

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error("Usuário não autenticado");
    return createTask(user.uid, taskData);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    return updateTask(taskId, updates);
  };

  const handleDeleteTask = async (taskId: string) => {
    return deleteTask(taskId);
  };

  const handleMoveTask = async (taskId: string, newStatus: Status) => {
    return moveTaskToStatus(taskId, newStatus);
  };

  const value = {
    tasks,
    isLoading,
    error,
    syncStatus,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    moveTaskToStatus: handleMoveTask,
    forceSync,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasksContext() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasksContext deve ser usado dentro de um TasksProvider');
  }
  return context;
}
