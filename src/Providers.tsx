import React, { ReactNode } from 'react';
import { AuthProvider } from './context/AuthContext';
import { TasksProvider } from './context/TasksContext';
import { FocusProvider } from './context/FocusContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TasksProvider>
        <FocusProvider>
          {children}
        </FocusProvider>
      </TasksProvider>
    </AuthProvider>
  );
}
