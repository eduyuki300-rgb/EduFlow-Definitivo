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

// Helpers de leitura de config local (ainda úteis para preferências)
function readInt(key: string, fallback: number) {
  try {
    const value = Number(localStorage.getItem(PREF + key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function readBool(key: string) {
  try {
    return localStorage.getItem(PREF + key) === 'true';
  } catch {
    return false;
  }
}

function readStr<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(PREF + key) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function createNotification(type: FocusNotification['type']): FocusNotification {
  return {
    id: `${type}-${Date.now()}`,
    type,
    title: type === 'focus' ? 'Foco Concluído!' : 'Pausa Encerrada!',
    description: type === 'focus' ? 'Hora de recuperar as energias.' : 'Pronto para o próximo bloco?',
    actionLabel: type === 'focus' ? 'Começar pausa' : 'Iniciar foco',
  };
}

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

  // ESTADO DA SESSÃO
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(focusDuration);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [focusCycles, setFocusCycles] = useState(0);
  const [sessionLiquidTime, setSessionLiquidTime] = useState(0);
  const [lastSyncedLiquidTime, setLastSyncedLiquidTime] = useState(0);
  const [notification, setNotification] = useState<FocusNotification | null>(null);

  const statusRef = useRef(status);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUpdatingCloud = useRef(false);

  // Sync Cloud -> Local State (Efeito de reconexão/sincronização)
  useEffect(() => {
    if (!cloudData || cloudData.taskId !== taskId) {
      // Se não houver dados na nuvem para esta task, mantemos local ou resetamos se mudou de task
      if (cloudData?.taskId && cloudData.taskId !== taskId) {
         // reset local state se task mudou
      }
      return;
    }

    // Calcular tempo restante baseado no endAt do servidor
    let calculatedTimeLeft = cloudData.timeLeftAtPause ?? focusDuration;
    let calculatedElapsed = cloudData.timeElapsed;
    
    if (cloudData.status === 'running' || cloudData.status === 'break') {
      const endAt = cloudData.endAt?.toDate ? cloudData.endAt.toDate() : new Date(cloudData.endAt);
      const now = new Date();
      calculatedTimeLeft = Math.max(0, Math.floor((endAt.getTime() - now.getTime()) / 1000));
      
      // Ajustar tempo decorrido total
      const startTime = cloudData.startTime?.toDate ? cloudData.startTime.toDate() : new Date(cloudData.startTime);
      calculatedElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    }

    setStatus(cloudData.status);
    statusRef.current = cloudData.status;
    setTimeLeft(calculatedTimeLeft);
    setTimeElapsed(calculatedElapsed);
    setFocusCycles(cloudData.focusCycles);
    setSessionLiquidTime(cloudData.timeElapsed); // ou usar logica de liquid
    setLastSyncedLiquidTime(cloudData.lastSyncedLiquidTime);
  }, [cloudData, taskId, focusDuration]);

  // Sincronização Local -> Cloud (Persistência)
  const syncToCloud = useCallback(async (updates: Partial<ActiveSession>) => {
    if (!userId || isUpdatingCloud.current) return;
    
    isUpdatingCloud.current = true;
    try {
      const sessionRef = doc(db, `users/${userId}/config/activeSession`);
      await setDoc(sessionRef, {
        taskId,
        taskTitle,
        updatedAt: serverTimestamp(),
        ...updates
      }, { merge: true });
    } catch (err) {
      console.error('[useFocusSession] Sync drift:', err);
    } finally {
      isUpdatingCloud.current = false;
    }
  }, [userId, taskId, taskTitle]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const completeFocusCycle = useCallback(async () => {
    clearTimer();
    const nextCycles = focusCycles + 1;
    setFocusCycles(nextCycles);
    setStatus('completed');
    statusRef.current = 'completed';
    setTimeLeft(0);
    setNotification(createNotification('focus'));

    await syncToCloud({
      status: 'completed',
      focusCycles: nextCycles,
      timeElapsed,
      lastSyncedLiquidTime: timeElapsed // sync final
    });
    
    // Sync Task Progress
    syncFocusSession(taskId, timeElapsed - lastSyncedLiquidTime, 1);
  }, [clearTimer, focusCycles, timeElapsed, lastSyncedLiquidTime, taskId, syncToCloud]);

  const toggleTimer = useCallback(async () => {
    const now = new Date();
    
    if (status === 'idle' || status === 'paused' || status === 'completed') {
      const duration = status === 'completed' ? focusDuration : timeLeft;
      const endAt = new Date(now.getTime() + duration * 1000);
      
      setStatus('running');
      statusRef.current = 'running';
      
      await syncToCloud({
        status: 'running',
        startTime: serverTimestamp(),
        endAt: Timestamp.fromDate(endAt),
        timeLeftAtPause: null
      });
      return;
    }

    if (status === 'running') {
      clearTimer();
      setStatus('paused');
      statusRef.current = 'paused';
      await syncToCloud({
        status: 'paused',
        timeLeftAtPause: timeLeft,
        timeElapsed
      });
      return;
    }

    // Logica similar para break...
  }, [status, focusDuration, timeLeft, syncToCloud, clearTimer, timeElapsed]);

  const resetTimer = useCallback(async () => {
    clearTimer();
    setStatus('idle');
    statusRef.current = 'idle';
    setTimeLeft(focusDuration);
    setTimeElapsed(0);
    setNotification(null);
    
    if (userId) {
      const sessionRef = doc(db, `users/${userId}/config/activeSession`);
      await deleteDoc(sessionRef);
    }
  }, [clearTimer, focusDuration, userId]);

  // Tick do Timer (Resiliente)
  useEffect(() => {
    if (status !== 'running' && status !== 'break') {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) {
          if (status === 'running') completeFocusCycle();
          else resetTimer();
        }
        return next;
      });
      setTimeElapsed(prev => prev + 1);
      setSessionLiquidTime(prev => prev + 1);
    }, 1000);

    return clearTimer;
  }, [status, clearTimer, completeFocusCycle, resetTimer]);

  const formatTime = useCallback((seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainder = safeSeconds % 60;
    return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  }, []);

  return {
    mode,
    setMode: setModeState,
    focusDuration,
    setFocusDuration: setFocusDurationState,
    breakDuration,
    setBreakDuration: setBreakDurationState,
    longBreakDuration,
    setLongBreakDuration: setLongBreakDurationState,
    isStrictMode,
    setIsStrictMode: setIsStrictModeState,
    status,
    timeLeft,
    timeElapsed,
    focusCycles,
    sessionLiquidTime,
    pageTitle: status === 'running' ? `(${formatTime(timeLeft)}) ${taskTitle}` : 'EduFlow',
    progress: ((focusDuration - timeLeft) / focusDuration) * 100,
    notification,
    toggleTimer,
    resetTimer,
    skipToComplete: () => {}, // TODO
    startBreak: () => {}, // TODO
    dismissNotification: () => setNotification(null),
    advanceNotification: () => {
      if (notification?.type === 'focus') setStatus('break'); // Simples por enquanto
      else resetTimer();
    },
    persistAndClose: async () => {
       await syncRemainingFocus(taskId, timeElapsed - lastSyncedLiquidTime, 0);
       await resetTimer();
    },
    discardAndClose: async () => await resetTimer(),
    formatTime,
  };
}

// Helper externo para sync de task
async function syncRemainingFocus(taskId: string, seconds: number, pomos: number) {
  if (seconds > 0 || pomos > 0) {
    await syncFocusSession(taskId, seconds, pomos);
  }
}
