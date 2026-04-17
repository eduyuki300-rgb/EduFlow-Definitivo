import { useCallback, useEffect, useRef, useState } from 'react';
import { syncFocusSession } from './useTasks';

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
const SESSION_STATE_KEY = `${PREF}session_state`;
const STORAGE_KEY_BUFFER = 'focus_sync_buffer';

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

function clearRuntimeStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY_BUFFER);
    localStorage.removeItem(SESSION_STATE_KEY);
  } catch {
    // best effort
  }
}

export function useFocusSession(taskId: string, taskTitle: string): FocusSessionApi {
  const [mode, setModeState] = useState<TimerMode>(() => readStr<TimerMode>('mode', 'pomodoro'));
  const [focusDuration, setFocusDurationState] = useState(() => readInt('focusDur', 1500));
  const [breakDuration, setBreakDurationState] = useState(() => readInt('breakDur', 300));
  const [longBreakDuration, setLongBreakDurationState] = useState(() => readInt('longBreakDur', 900));
  const [isStrictMode, setIsStrictModeState] = useState(() => readBool('strict'));

  const [initialState] = useState(() => {
    try {
      const savedBuffer = localStorage.getItem(STORAGE_KEY_BUFFER);
      const savedState = localStorage.getItem(SESSION_STATE_KEY);
      const raw = savedBuffer || savedState;

      if (!raw) return null;

      const parsed = JSON.parse(raw);
      
      // Só recupera o estado se for a mesma tarefa
      if (parsed.taskId !== taskId) {
        return null;
      }

      const ageLimit = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > ageLimit) {
        return null;
      }

      const driftSeconds = Math.floor((Date.now() - parsed.timestamp) / 1000);
      const recovered = {
        status: parsed.status as TimerStatus,
        timeLeft: Number(parsed.timeLeft ?? focusDuration),
        timeElapsed: Number(parsed.timeElapsed ?? 0),
        focusCycles: Number(parsed.focusCycles ?? 0),
        sessionLiquidTime: Number(parsed.sessionLiquidTime ?? 0),
        lastSyncedLiquidTime: Number(parsed.lastSyncedLiquidTime ?? 0),
        notification: (parsed.notification as FocusNotification | null) ?? null,
      };

      if (recovered.status === 'running') {
        recovered.timeLeft = Math.max(0, recovered.timeLeft - driftSeconds);
        recovered.timeElapsed += driftSeconds;
        recovered.sessionLiquidTime += driftSeconds;

        if (recovered.timeLeft === 0) {
          recovered.status = 'completed';
          recovered.notification = createNotification('focus');
        } else if (savedBuffer) {
          recovered.status = 'paused';
        }
      } else if (recovered.status === 'break') {
        recovered.timeLeft = Math.max(0, recovered.timeLeft - driftSeconds);

        if (recovered.timeLeft === 0) {
          recovered.status = 'idle';
          recovered.timeLeft = focusDuration;
          recovered.notification = createNotification('break');
        } else if (savedBuffer) {
          recovered.status = 'break-paused';
        }
      }

      return recovered;
    } catch {
      return null;
    }
  });

  const [status, setStatus] = useState<TimerStatus>(initialState?.status ?? 'idle');
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft ?? focusDuration);
  const [timeElapsed, setTimeElapsed] = useState(initialState?.timeElapsed ?? 0);
  const [focusCycles, setFocusCycles] = useState(initialState?.focusCycles ?? 0);
  const [sessionLiquidTime, setSessionLiquidTime] = useState(initialState?.sessionLiquidTime ?? 0);
  const [lastSyncedLiquidTime, setLastSyncedLiquidTime] = useState(initialState?.lastSyncedLiquidTime ?? 0);
  const [notification, setNotification] = useState<FocusNotification | null>(initialState?.notification ?? null);

  const statusRef = useRef(status);
  const timeLeftRef = useRef(timeLeft);
  const timeElapsedRef = useRef(timeElapsed);
  const focusCyclesRef = useRef(focusCycles);
  const sessionLiquidTimeRef = useRef(sessionLiquidTime);
  const lastSyncedLiquidTimeRef = useRef(lastSyncedLiquidTime);
  const focusDurationRef = useRef(focusDuration);
  const breakDurationRef = useRef(breakDuration);
  const longBreakDurationRef = useRef(longBreakDuration);
  const isStrictModeRef = useRef(isStrictMode);
  const modeRef = useRef(mode);
  const taskTitleRef = useRef(taskTitle);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationAtStartRef = useRef(0);
  const currentTaskIdRef = useRef(taskId);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    timeElapsedRef.current = timeElapsed;
  }, [timeElapsed]);

  useEffect(() => {
    focusCyclesRef.current = focusCycles;
  }, [focusCycles]);

  useEffect(() => {
    sessionLiquidTimeRef.current = sessionLiquidTime;
  }, [sessionLiquidTime]);

  useEffect(() => {
    lastSyncedLiquidTimeRef.current = lastSyncedLiquidTime;
  }, [lastSyncedLiquidTime]);

  useEffect(() => {
    focusDurationRef.current = focusDuration;
  }, [focusDuration]);

  useEffect(() => {
    breakDurationRef.current = breakDuration;
  }, [breakDuration]);

  useEffect(() => {
    longBreakDurationRef.current = longBreakDuration;
  }, [longBreakDuration]);

  useEffect(() => {
    isStrictModeRef.current = isStrictMode;
  }, [isStrictMode]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    taskTitleRef.current = taskTitle;
  }, [taskTitle]);

  useEffect(() => {
    localStorage.setItem(PREF + 'mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(PREF + 'focusDur', String(focusDuration));
  }, [focusDuration]);

  useEffect(() => {
    localStorage.setItem(PREF + 'breakDur', String(breakDuration));
  }, [breakDuration]);

  useEffect(() => {
    localStorage.setItem(PREF + 'longBreakDur', String(longBreakDuration));
  }, [longBreakDuration]);

  useEffect(() => {
    localStorage.setItem(PREF + 'strict', String(isStrictMode));
  }, [isStrictMode]);

  useEffect(() => {
    try {
      const state = {
        status,
        timeLeft,
        timeElapsed,
        focusCycles,
        sessionLiquidTime,
        lastSyncedLiquidTime,
        mode,
        taskId,
        notification,
        timestamp: Date.now(),
      };

      localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
      localStorage.setItem(STORAGE_KEY_BUFFER, JSON.stringify(state));
    } catch {
      // best effort
    }
  }, [focusCycles, lastSyncedLiquidTime, mode, notification, sessionLiquidTime, status, taskId, timeElapsed, timeLeft]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const syncCompletedChunks = useCallback(
    (totalFocusedSeconds: number) => {
      const unsynced = totalFocusedSeconds - lastSyncedLiquidTimeRef.current;
      if (unsynced < 300) return;

      const syncableSeconds = unsynced - (unsynced % 300);
      if (syncableSeconds <= 0) return;

      syncFocusSession(taskId, syncableSeconds, 0);
      const nextSynced = lastSyncedLiquidTimeRef.current + syncableSeconds;
      lastSyncedLiquidTimeRef.current = nextSynced;
      setLastSyncedLiquidTime(nextSynced);
    },
    [taskId]
  );

  const syncRemainingFocus = useCallback(
    (pomodoros = 0) => {
      const unsynced = Math.max(0, sessionLiquidTimeRef.current - lastSyncedLiquidTimeRef.current);
      if (unsynced > 0 || pomodoros > 0) {
        syncFocusSession(taskId, unsynced, pomodoros);
      }

      lastSyncedLiquidTimeRef.current = sessionLiquidTimeRef.current;
      setLastSyncedLiquidTime(sessionLiquidTimeRef.current);
    },
    [taskId]
  );

  const resetRuntimeState = useCallback(
    (resetCycles = false) => {
      clearTimer();
      clearRuntimeStorage();
      setNotification(null);
      setStatus('idle');
      statusRef.current = 'idle';
      setTimeLeft(focusDurationRef.current);
      timeLeftRef.current = focusDurationRef.current;
      setTimeElapsed(0);
      timeElapsedRef.current = 0;
      setSessionLiquidTime(0);
      sessionLiquidTimeRef.current = 0;
      setLastSyncedLiquidTime(0);
      lastSyncedLiquidTimeRef.current = 0;

      if (resetCycles) {
        setFocusCycles(0);
        focusCyclesRef.current = 0;
      }
    },
    [clearTimer]
  );

  // Efeito para resetar estado quando a taskId muda (troca de tarefa no dropdown)
  useEffect(() => {
    if (currentTaskIdRef.current !== taskId) {
      currentTaskIdRef.current = taskId;
      resetRuntimeState(true);
    }
  }, [taskId, resetRuntimeState]);

  const finishBreak = useCallback(() => {
    clearTimer();
    setNotification(createNotification('break'));
    setStatus('idle');
    statusRef.current = 'idle';
    setTimeLeft(focusDurationRef.current);
    timeLeftRef.current = focusDurationRef.current;
    setTimeElapsed(0);
    timeElapsedRef.current = 0;
    setSessionLiquidTime(0);
    sessionLiquidTimeRef.current = 0;
    setLastSyncedLiquidTime(0);
    lastSyncedLiquidTimeRef.current = 0;
  }, [clearTimer]);

  const completeFocusCycle = useCallback(() => {
    clearTimer();
    syncRemainingFocus(1);

    const nextCycles = focusCyclesRef.current + 1;
    focusCyclesRef.current = nextCycles;
    setFocusCycles(nextCycles);

    setNotification(createNotification('focus'));
    setStatus('completed');
    statusRef.current = 'completed';
    setTimeLeft(0);
    timeLeftRef.current = 0;
  }, [clearTimer, syncRemainingFocus]);

  const startTick = useCallback(
    (phase: 'focus' | 'break') => {
      clearTimer();
      startTimeRef.current = Date.now();
      durationAtStartRef.current =
        phase === 'focus'
          ? modeRef.current === 'pomodoro'
            ? timeLeftRef.current
            : timeElapsedRef.current
          : timeLeftRef.current;

      intervalRef.current = setInterval(() => {
        const startedAt = startTimeRef.current;
        if (!startedAt) return;

        const deltaSeconds = Math.floor((Date.now() - startedAt) / 1000);
        if (deltaSeconds <= 0) return;

        const currentStatus = statusRef.current;
        if (currentStatus !== 'running' && currentStatus !== 'break') {
          clearTimer();
          return;
        }

        if (phase === 'focus') {
          if (modeRef.current === 'pomodoro') {
            const nextTimeLeft = Math.max(0, durationAtStartRef.current - deltaSeconds);
            const elapsedNow = timeLeftRef.current - nextTimeLeft;

            if (elapsedNow <= 0) return;

            const nextElapsed = timeElapsedRef.current + elapsedNow;
            const nextLiquidTime = sessionLiquidTimeRef.current + elapsedNow;

            setTimeLeft(nextTimeLeft);
            timeLeftRef.current = nextTimeLeft;
            setTimeElapsed(nextElapsed);
            timeElapsedRef.current = nextElapsed;
            setSessionLiquidTime(nextLiquidTime);
            sessionLiquidTimeRef.current = nextLiquidTime;

            syncCompletedChunks(nextLiquidTime);

            if (nextTimeLeft <= 0) {
              completeFocusCycle();
            }

            return;
          }

          const nextElapsed = durationAtStartRef.current + deltaSeconds;
          const elapsedNow = nextElapsed - timeElapsedRef.current;

          if (elapsedNow <= 0) return;

          const nextLiquidTime = sessionLiquidTimeRef.current + elapsedNow;
          setTimeElapsed(nextElapsed);
          timeElapsedRef.current = nextElapsed;
          setTimeLeft(nextElapsed);
          timeLeftRef.current = nextElapsed;
          setSessionLiquidTime(nextLiquidTime);
          sessionLiquidTimeRef.current = nextLiquidTime;
          syncCompletedChunks(nextLiquidTime);
          return;
        }

        const nextBreakLeft = Math.max(0, durationAtStartRef.current - deltaSeconds);
        if (nextBreakLeft === timeLeftRef.current) return;

        setTimeLeft(nextBreakLeft);
        timeLeftRef.current = nextBreakLeft;

        if (nextBreakLeft <= 0) {
          finishBreak();
        }
      }, 500);
    },
    [clearTimer, completeFocusCycle, finishBreak, syncCompletedChunks]
  );

  useEffect(() => {
    if (status === 'running') {
      startTick('focus');
    } else if (status === 'break') {
      startTick('break');
    }

    return clearTimer;
  }, [clearTimer, startTick, status]);

  useEffect(() => {
    if (status === 'idle' && isStrictMode && !notification && mode === 'pomodoro' && timeLeft === focusDuration) {
      const timeout = setTimeout(() => {
        if (statusRef.current === 'idle' && isStrictModeRef.current) {
          setStatus('running');
          statusRef.current = 'running';
        }
      }, 1000);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [focusDuration, isStrictMode, mode, notification, status, timeLeft]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STATE_KEY || !event.newValue) {
        return;
      }

      try {
        const nextState = JSON.parse(event.newValue);
        if (Date.now() - nextState.timestamp > 2000) {
          return;
        }

        setStatus(nextState.status);
        setTimeLeft(nextState.timeLeft);
        setTimeElapsed(nextState.timeElapsed);
        setFocusCycles(nextState.focusCycles);
        setSessionLiquidTime(nextState.sessionLiquidTime);
        setLastSyncedLiquidTime(nextState.lastSyncedLiquidTime ?? 0);
        setNotification(nextState.notification ?? null);
      } catch {
        // ignore malformed storage updates
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const startBreak = useCallback(() => {
    const isLongBreak = focusCyclesRef.current > 0 && focusCyclesRef.current % 4 === 0;
    const duration = isLongBreak ? longBreakDurationRef.current : breakDurationRef.current;

    setNotification(null);
    setStatus('break');
    statusRef.current = 'break';
    setTimeLeft(duration);
    timeLeftRef.current = duration;
    setTimeElapsed(0);
    timeElapsedRef.current = 0;
    setSessionLiquidTime(0);
    sessionLiquidTimeRef.current = 0;
    setLastSyncedLiquidTime(0);
    lastSyncedLiquidTimeRef.current = 0;
  }, []);

  const resetTimer = useCallback(() => {
    setNotification(null);
    clearTimer();
    setStatus('idle');
    statusRef.current = 'idle';
    setTimeLeft(focusDurationRef.current);
    timeLeftRef.current = focusDurationRef.current;
    setTimeElapsed(0);
    timeElapsedRef.current = 0;
    setSessionLiquidTime(0);
    sessionLiquidTimeRef.current = 0;
    setLastSyncedLiquidTime(0);
    lastSyncedLiquidTimeRef.current = 0;
    clearRuntimeStorage();
  }, [clearTimer]);

  const advanceNotification = useCallback(() => {
    if (!notification) return;

    if (notification.type === 'focus') {
      startBreak();
      return;
    }

    resetTimer();
  }, [notification, resetTimer, startBreak]);

  const toggleTimer = useCallback(() => {
    if (statusRef.current === 'idle' || statusRef.current === 'paused' || statusRef.current === 'completed') {
      if (statusRef.current === 'completed') {
        setNotification(null);
        setTimeLeft(focusDurationRef.current);
        timeLeftRef.current = focusDurationRef.current;
        setTimeElapsed(0);
        timeElapsedRef.current = 0;
        setSessionLiquidTime(0);
        sessionLiquidTimeRef.current = 0;
        setLastSyncedLiquidTime(0);
        lastSyncedLiquidTimeRef.current = 0;
      }

      setStatus('running');
      statusRef.current = 'running';
      return;
    }

    if (statusRef.current === 'running') {
      clearTimer();
      setStatus('paused');
      statusRef.current = 'paused';
      return;
    }

    if (statusRef.current === 'break') {
      clearTimer();
      setStatus('break-paused');
      statusRef.current = 'break-paused';
      return;
    }

    if (statusRef.current === 'break-paused') {
      setStatus('break');
      statusRef.current = 'break';
    }
  }, [clearTimer]);

  const skipToComplete = useCallback(() => {
    if (modeRef.current !== 'pomodoro' || statusRef.current !== 'running') {
      return;
    }

    const completedSeconds = focusDurationRef.current;
    const delta = Math.max(0, completedSeconds - sessionLiquidTimeRef.current);

    if (delta > 0) {
      const nextLiquid = sessionLiquidTimeRef.current + delta;
      setSessionLiquidTime(nextLiquid);
      sessionLiquidTimeRef.current = nextLiquid;
      setTimeElapsed((current) => {
        const nextValue = current + delta;
        timeElapsedRef.current = nextValue;
        return nextValue;
      });
    }

    setTimeLeft(0);
    timeLeftRef.current = 0;
    completeFocusCycle();
  }, [completeFocusCycle]);

  const persistAndClose = useCallback(async () => {
    clearTimer();
    setNotification(null);

    if (statusRef.current === 'running' || statusRef.current === 'paused') {
      syncRemainingFocus(0);
    }

    resetRuntimeState(true);
  }, [clearTimer, resetRuntimeState, syncRemainingFocus]);

  const discardAndClose = useCallback(async () => {
    resetRuntimeState(true);
  }, [resetRuntimeState]);

  const formatTime = useCallback(
    (seconds: number) => {
      const safeSeconds = Math.max(0, Math.floor(seconds));
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      const remainder = safeSeconds % 60;

      if (modeRef.current === 'flowtime' || hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
      }

      return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
    },
    []
  );

  const pageTitle =
    status === 'running'
      ? `(${formatTime(mode === 'pomodoro' ? timeLeft : timeElapsed)}) ${taskTitleRef.current}`
      : status === 'completed'
        ? '✅ Concluído!'
        : 'EduFlow';

  const currentDuration =
    status === 'break' || status === 'break-paused'
      ? focusCycles > 0 && focusCycles % 4 === 0
        ? longBreakDuration
        : breakDuration
      : focusDuration;

  const progress =
    mode === 'pomodoro'
      ? currentDuration > 0
        ? ((currentDuration - timeLeft) / currentDuration) * 100
        : 0
      : 0;

  return {
    mode,
    setMode: (nextMode) => {
      setModeState(nextMode);
      resetRuntimeState(false);
    },
    focusDuration,
    setFocusDuration: setFocusDurationState,
    breakDuration,
    setBreakDuration: setBreakDurationState,
    longBreakDuration,
    setLongBreakDuration: setLongBreakDurationState,
    isStrictMode,
    setIsStrictMode: setIsStrictModeState,
    status,
    timeLeft: mode === 'pomodoro' ? timeLeft : timeElapsed,
    timeElapsed,
    focusCycles,
    sessionLiquidTime,
    pageTitle,
    progress,
    notification,
    toggleTimer,
    resetTimer,
    skipToComplete,
    startBreak,
    dismissNotification,
    advanceNotification,
    persistAndClose,
    discardAndClose,
    formatTime,
  };
}
