import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, ActiveSession } from '../types';
import { useFocusSession, FocusSessionApi } from '../hooks/useFocusSession';
import { useAuthContext } from './AuthContext';
import { useTasksContext } from './TasksContext';

interface FocusContextType {
  activeTask: Task | null;
  session: FocusSessionApi | null;
  view: 'widget' | 'mini' | 'full';
  theme: 'classic' | 'emerald' | 'midnight' | 'rose';
  setActiveTask: (task: Task | null) => void;
  setView: (view: 'widget' | 'mini' | 'full') => void;
  setTheme: (theme: 'classic' | 'emerald' | 'midnight' | 'rose') => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const { tasks } = useTasksContext();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => localStorage.getItem('eduflow_active_focus_id'));
  const [view, setView] = useState<'widget' | 'mini' | 'full'>('widget');
  const [theme, setTheme] = useState<'classic' | 'emerald' | 'midnight' | 'rose'>(() => {
    return (localStorage.getItem('eduflow_pomodoro_theme') as any) || 'classic';
  });
  const [cloudSessionData, setCloudSessionData] = useState<ActiveSession | null>(null);

  useEffect(() => {
    localStorage.setItem('eduflow_pomodoro_theme', theme);
  }, [theme]);

  // Sync session from Cloud (Firestore)
  useEffect(() => {
    if (!user) {
      setCloudSessionData(null);
      return;
    }

    const sessionRef = doc(db, `users/${user.uid}/config/activeSession`);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        setCloudSessionData(docSnap.data() as ActiveSession);
      } else {
        setCloudSessionData(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Se houver uma sessão na nuvem mas não houver task ativa local, sincronizamos
  useEffect(() => {
    if (cloudSessionData?.taskId && cloudSessionData.taskId !== activeTaskId) {
      setActiveTaskId(cloudSessionData.taskId);
    }
  }, [cloudSessionData, activeTaskId]);

  const activeTask = tasks.find(t => t.id === activeTaskId) || null;
  
  const session = useFocusSession(
    activeTask?.id || 'general', 
    activeTask?.title || 'Foco Geral',
    user?.uid,
    cloudSessionData
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

  const wrappedSession = useMemo(() => ({
    ...session,
    persistAndClose: async () => {
      await session.persistAndClose();
      setActiveTaskId(null);
      setView('widget');
    },
    discardAndClose: async () => {
      await session.discardAndClose();
      setActiveTaskId(null);
      setView('widget');
    }
  }), [session]);

  return (
    <FocusContext.Provider value={{ activeTask, session: wrappedSession, view, theme, setActiveTask, setView, setTheme }}>
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
