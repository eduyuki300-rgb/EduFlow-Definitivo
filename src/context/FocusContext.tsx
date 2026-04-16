import React, { createContext, useContext, useState, useEffect } from 'react';
import { Task } from '../types';
import { useFocusSession, FocusSessionApi } from '../hooks/useFocusSession';

interface FocusContextType {
  activeTask: Task | null;
  session: FocusSessionApi | null;
  view: 'widget' | 'mini' | 'full';
  setActiveTask: (task: Task | null) => void;
  setView: (view: 'widget' | 'mini' | 'full') => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children, tasks }: { children: React.ReactNode, tasks: Task[] }) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => localStorage.getItem('eduflow_active_focus_id'));
  const [view, setView] = useState<'widget' | 'mini' | 'full'>('widget');

  const activeTask = tasks.find(t => t.id === activeTaskId) || null;
  
  // Usamos o hook useFocusSession. Se não houver task ativa, usamos valores padrão ou "General"
  // mas o ideal é que o hook seja resiliente a IDs vazios.
  const session = useFocusSession(
    activeTask?.id || 'general', 
    activeTask?.title || 'Foco Geral'
  );

  useEffect(() => {
    if (activeTaskId) {
      localStorage.setItem('eduflow_active_focus_id', activeTaskId);
    } else {
      localStorage.removeItem('eduflow_active_focus_id');
    }
  }, [activeTaskId]);

  const setActiveTask = (task: Task | null) => {
    setActiveTaskId(task?.id || null);
  };

  return (
    <FocusContext.Provider value={{ activeTask, session, view, setActiveTask, setView }}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}
