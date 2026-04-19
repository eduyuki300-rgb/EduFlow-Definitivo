import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, setDoc, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { syncFocusSession } from './useTasks';
import { ActiveSession } from '../types';

export type TimerMode = 'pomodoro' | 'flowtime';
export type TimerStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'break'
  | 'break-paused'
  | 'completed';

export interface FocusNotification {
  id: string;
  type: 'focus' | 'break';
  title: string;
  description: string;
  actionLabel: string;
}

export interface FocusSessionApi {
  mode: TimerMode;
  setMode: (mode: TimerMode) => void;
  focusDuration: number;
  setFocusDuration: (value: number) => void;
  breakDuration: number;
  setBreakDuration: (value: number) => void;
  longBreakDuration: number;
  setLongBreakDuration: (value: number) => void;
  isStrictMode: boolean;
  setIsStrictMode: (value: boolean) => void;
  status: TimerStatus;
  timeLeft: number;
  timeElapsed: number;
  focusCycles: number;
  sessionLiquidTime: number;
  pageTitle: string;
  progress: number;
  notification: FocusNotification | null;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipToComplete: () => void;
  startBreak: () => void;
  dismissNotification: () => void;
  advanceNotification: () => void;
  persistAndClose: () => Promise<void>;
  discardAndClose: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

const PREF = 'eduflow_session_';

// Preference persistence helpers
const readInt = (k: string, fb: number) => { try { const v = Number(localStorage.getItem(PREF+k)); return Number.isFinite(v) && v > 0 ? v : fb; } catch { return fb; } };
const readBool = (k: string) => localStorage.getItem(PREF+k) === 'true';
const readStr = <T extends string>(k: string, fb: T): T => (localStorage.getItem(PREF+k) as T) ?? fb;

const createNotification = (type: FocusNotification['type']): FocusNotification => ({
  id: `${type}-${Date.now()}`,
  type,
  title: type === 'focus' ? 'Foco Concluído!' : 'Pausa Encerrada!',
  description: type === 'focus' ? 'Hora de recuperar as energias.' : 'Pronto para o próximo bloco?',
  actionLabel: type === 'focus' ? 'Começar pausa' : 'Iniciar foco',
});

export function useFocusSession(
  taskId: string, 
  taskTitle: string, 
  userId?: string, 
  cloudData?: ActiveSession | null
): FocusSessionApi {
  const [mode, setModeState] = useState<TimerMode>(() => readStr<TimerMode>('mode', 'pomodoro'));
  const [focusDuration, setFocusDurationState] = useState(() => readInt('focusDur', 1500));
  const [breakDuration, setBreakDurationState] = useState(() => readInt('breakDur', 300));
  const [longBreakDuration, setLongBreakDurationState] = useState(() => readInt('longBreakDur', 900));
  const [isStrictMode, setIsStrictModeState] = useState(() => readBool('strict'));

  // SESSÃO
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(focusDuration);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [focusCycles, setFocusCycles] = useState(0);
  const [lastSyncedLiquidTime, setLastSyncedLiquidTime] = useState(0);
  const [notification, setNotification] = useState<FocusNotification | null>(null);

  // REFS PARA PRECISÃO ABSOLUTA (AUDIT FIX 3 & 4)
  const statusRef = useRef<TimerStatus>(status);
  const timeLeftRef = useRef(timeLeft);
  const timeElapsedRef = useRef(timeElapsed);
  const lastSyncedRef = useRef(lastSyncedLiquidTime);
  const focusCyclesRef = useRef(focusCycles);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // CONTROLADORES DE MUTEX (AUDIT FIX 1 & 2)
  const [isLocalUpdating, setIsLocalUpdating] = useState(false);
  const pendingCloudUpdate = useRef<ActiveSession | null>(null);

  // Sync refs with state
  useEffect(() => { 
    statusRef.current = status; 
    timeLeftRef.current = timeLeft;
    timeElapsedRef.current = timeElapsed;
    lastSyncedRef.current = lastSyncedLiquidTime;
    focusCyclesRef.current = focusCycles;
  }, [status, timeLeft, timeElapsed, lastSyncedLiquidTime, focusCycles]);

  const applyCloudUpdate = useCallback((data: ActiveSession) => {
    let calcTimeLeft = data.timeLeftAtPause ?? focusDuration;
    let calcElapsed = data.timeElapsed;
    
    if (data.status === 'running' || data.status === 'break') {
      const endAt = data.endAt?.toDate ? data.endAt.toDate() : new Date(data.endAt);
      const now = new Date();
      // +2s Latency Buffer (AUDIT FIX)
      calcTimeLeft = Math.max(0, Math.floor((endAt.getTime() - now.getTime()) / 1000) + 2);
      
      const startAt = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
      calcElapsed = Math.floor((now.getTime() - startAt.getTime()) / 1000);
    }

    setStatus(data.status);
    setTimeLeft(calcTimeLeft);
    setTimeElapsed(calcElapsed);
    setFocusCycles(data.focusCycles);
    setLastSyncedLiquidTime(data.lastSyncedLiquidTime);
  }, [focusDuration]);

  // FIX 1: Re-applies pending updates after mutex release
  useEffect(() => {
    if (!cloudData || cloudData.taskId !== taskId) return;
    if (isLocalUpdating) {
      pendingCloudUpdate.current = cloudData;
      return;
    }
    applyCloudUpdate(cloudData);
  }, [cloudData, taskId, isLocalUpdating, applyCloudUpdate]);

  const syncToCloud = useCallback(async (updates: Partial<ActiveSession>) => {
    if (!userId) return;
    setIsLocalUpdating(true); // LOCK
    try {
      const sessionRef = doc(db, `users/${userId}/config/activeSession`);
      await setDoc(sessionRef, {
        taskId, taskTitle, updatedAt: serverTimestamp(), ...updates
      }, { merge: true });
    } catch (err) {
      console.error('[FocusSession] Sync drift:', err);
    } finally {
      // FIX 2: Unlock only after await and apply any missed updates
      setIsLocalUpdating(false); // UNLOCK
      if (pendingCloudUpdate.current) {
        applyCloudUpdate(pendingCloudUpdate.current);
        pendingCloudUpdate.current = null;
      }
    }
  }, [userId, taskId, taskTitle, applyCloudUpdate]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // FIX 4: Callback stabilization with Refs
  const completeFocusCycle = useCallback(async () => {
    clearTimer();
    const nextCycles = focusCyclesRef.current + 1;
    const currentElapsed = timeElapsedRef.current;
    const currentLastSynced = lastSyncedRef.current;

    setStatus('completed');
    setTimeLeft(0);
    setNotification(createNotification('focus'));

    await syncToCloud({
      status: 'completed',
      focusCycles: nextCycles,
      timeElapsed: currentElapsed,
      lastSyncedLiquidTime: currentElapsed
    });
    
    await syncFocusSession(taskId, currentElapsed - currentLastSynced, 1);
  }, [clearTimer, taskId, syncToCloud]);

  const resetTimer = useCallback(async () => {
    clearTimer();
    setStatus('idle');
    setTimeLeft(focusDuration);
    setTimeElapsed(0);
    setNotification(null);
    setLastSyncedLiquidTime(0);
    
    if (userId) {
      await deleteDoc(doc(db, `users/${userId}/config/activeSession`));
    }
  }, [clearTimer, focusDuration, userId]);

  const toggleTimer = useCallback(async () => {
    const now = new Date();
    const currentStatus = statusRef.current;

    if (currentStatus === 'idle' || currentStatus === 'paused' || currentStatus === 'completed') {
      const duration = currentStatus === 'completed' ? focusDuration : timeLeftRef.current;
      const endAt = new Date(now.getTime() + duration * 1000);
      setStatus('running');
      await syncToCloud({
        status: 'running',
        startTime: serverTimestamp(),
        endAt: Timestamp.fromDate(endAt),
        timeLeftAtPause: null
      });
    } else if (currentStatus === 'running') {
      clearTimer();
      setStatus('paused');
      await syncToCloud({
        status: 'paused',
        timeLeftAtPause: timeLeftRef.current,
        timeElapsed: timeElapsedRef.current
      });
    }
  }, [focusDuration, syncToCloud, clearTimer]);

  // FIX 3: Stale-closure-free Tick with Cleanup Rigorous
  useEffect(() => {
    if (status !== 'running' && status !== 'break') {
      clearTimer();
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          if (statusRef.current === 'running') completeFocusCycle();
          else resetTimer();
        }
        return next;
      });
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, clearTimer, completeFocusCycle, resetTimer]);

  const formatTime = useCallback((s: number) => {
    const safe = Math.max(0, Math.floor(s));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const r = safe % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  }, []);

  return {
    mode, setMode: setModeState,
    focusDuration, setFocusDuration: setFocusDurationState,
    breakDuration, setBreakDuration: setBreakDurationState,
    longBreakDuration, setLongBreakDuration: setLongBreakDurationState,
    isStrictMode, setIsStrictMode: setIsStrictModeState,
    status, timeLeft, timeElapsed, focusCycles,
    sessionLiquidTime: timeElapsed,
    pageTitle: status === 'running' ? `(${formatTime(timeLeft)}) ${taskTitle}` : 'EduFlow',
    progress: ((focusDuration - timeLeft) / focusDuration) * 100,
    notification, toggleTimer, resetTimer,
    skipToComplete: async () => {
      if (statusRef.current === 'running') {
        await completeFocusCycle();
      }
    },
    startBreak: async () => {
      clearTimer();
      const now = new Date();
      const endAt = new Date(now.getTime() + breakDuration * 1000);
      setStatus('break');
      setTimeLeft(breakDuration);
      await syncToCloud({
        status: 'break',
        startTime: serverTimestamp(),
        endAt: Timestamp.fromDate(endAt),
        timeLeftAtPause: null
      });
    },
    dismissNotification: () => setNotification(null),
    advanceNotification: () => {
      if (notification?.id.startsWith('focus')) {
        // Se concluiu foco, inicia pausa
        clearTimer();
        const now = new Date();
        const endAt = new Date(now.getTime() + breakDuration * 1000);
        setStatus('break');
        setTimeLeft(breakDuration);
        syncToCloud({
          status: 'break',
          startTime: serverTimestamp(),
          endAt: Timestamp.fromDate(endAt),
          timeLeftAtPause: null
        });
      } else {
        resetTimer();
      }
      setNotification(null);
    },
    // FIX 5: Explicit LiquidTime Protection with atomic check
    persistAndClose: async () => {
       const unsynced = timeElapsedRef.current - lastSyncedRef.current;
       if (unsynced > 0) {
         // Chamada síncrona ao buffer antes do reset local
         syncFocusSession(taskId, unsynced, 0);
       }
       await resetTimer();
    },
    discardAndClose: async () => await resetTimer(),
    formatTime,
  };
}
