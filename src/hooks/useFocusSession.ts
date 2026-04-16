import { useState, useEffect, useRef, useCallback } from 'react';
import { syncFocusSession } from './useTasks';

// ─── TYPES ───────────────────────────────────────────────────────────

export type TimerMode = 'pomodoro' | 'flowtime';
export type TimerStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'break'
  | 'break-paused'
  | 'completed';

export interface FocusSessionApi {
  // Settings
  mode: TimerMode;
  setMode: (m: TimerMode) => void;
  focusDuration: number; // seconds
  setFocusDuration: (v: number) => void;
  breakDuration: number; // seconds
  setBreakDuration: (v: number) => void;
  longBreakDuration: number; // seconds
  setLongBreakDuration: (v: number) => void;
  isStrictMode: boolean;
  setIsStrictMode: (v: boolean) => void;

  // Timer state
  status: TimerStatus;
  timeLeft: number; // seconds remaining (pomodoro)
  timeElapsed: number; // seconds elapsed (stopwatch / interval)
  focusCycles: number; // completed focus cycles
  sessionLiquidTime: number; // total focused seconds this session
  pendingLiquidTime: number;
  pendingPomodoros: number;
  pageTitle: string;

  // Actions
  toggleTimer: () => void;
  resetTimer: () => void;
  skipToComplete: () => void;
  startBreak: () => void;
  skipBreakNewFocus: () => void;
  discardSessionTime: () => void;
  closeAfterPersist: () => Promise<void>;
  formatTime: (s: number) => string;
  progress: number;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────

const PREF = 'eduflow_session_';
const STORAGE_KEY_BUFFER = 'focus_sync_buffer'; // For crash recovery

function readInt(key: string, fallback: number) {
  try {
    const v = Number(localStorage.getItem(PREF + key));
    return isNaN(v) || v === 0 ? fallback : v;
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

// ─── HOOK ────────────────────────────────────────────────────────────

export function useFocusSession(
  taskId: string,
  taskTitle: string
): FocusSessionApi {
  // ── Persisted settings ──────────────────────────────────────────────
  const [mode, setModeState] = useState<TimerMode>(() => readStr<TimerMode>('mode', 'pomodoro'));
  const [focusDuration, setFocusDurationState] = useState(() => readInt('focusDur', 1500));
  const [breakDuration, setBreakDurationState] = useState(() => readInt('breakDur', 300));
  const [longBreakDuration, setLongBreakDurationState] = useState(() => readInt('longBreakDur', 900));
  const [isStrictMode, setIsStrictModeState] = useState(() => readBool('strict'));

  // ── Timer state (Lazy Initializer for Persistence & Drift) ─────────
  const [initialState] = useState(() => {
    // 🚑 1. Check for Crash Recovery (Buffer)
    const savedBuffer = localStorage.getItem(STORAGE_KEY_BUFFER);
    const savedState = localStorage.getItem(PREF + 'session_state');
    
    const saved = savedBuffer || savedState;
    if (!saved) return null;

    try {
      const s = JSON.parse(saved);
      const AGE_LIMIT = 24 * 60 * 60 * 1000; // 24h
      if (Date.now() - s.timestamp > AGE_LIMIT) return null;

      const driftSec = Math.floor((Date.now() - s.timestamp) / 1000);
      let tLeft = s.timeLeft;
      let tElapsed = s.timeElapsed;
      let tStatus = s.status;

      if (s.status === 'running') {
        // Resume from where it was, or pause on recovery if it was a crash
        tLeft = Math.max(0, s.timeLeft - driftSec);
        tElapsed = s.timeElapsed + driftSec;
        if (tLeft === 0) tStatus = 'completed';
        else if (savedBuffer) tStatus = 'paused'; // Auto-pause after crash
      } else if (s.status === 'break') {
        tLeft = Math.max(0, s.timeLeft - driftSec);
        if (tLeft === 0) tStatus = 'idle';
      }

      return { ...s, status: tStatus, timeLeft: tLeft, timeElapsed: tElapsed };
    } catch { return null; }
  });

  const [status, setStatus] = useState<TimerStatus>(initialState?.status ?? 'idle');
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft ?? focusDuration);
  const [timeElapsed, setTimeElapsed] = useState(initialState?.timeElapsed ?? 0);
  const [focusCycles, setFocusCycles] = useState(initialState?.focusCycles ?? 0);
  const [sessionLiquidTime, setSessionLiquidTime] = useState(initialState?.sessionLiquidTime ?? 0);
  const [pendingLiquidTime, setPendingLiquidTime] = useState(initialState?.pendingLiquidTime ?? 0);
  const [pendingPomodoros, setPendingPomodoros] = useState(initialState?.pendingPomodoros ?? 0);
  const [lastSyncTime, setLastSyncTime] = useState(initialState?.lastSyncTime ?? 0);

  // ── Refs ────────────────────────────────────────────────────────────
  const statusRef = useRef(status);
  const timeLeftRef = useRef(timeLeft);
  const timeElapsedRef = useRef(timeElapsed);
  const focusDurRef = useRef(focusDuration);
  const breakDurRef = useRef(breakDuration);
  const longBreakDurRef = useRef(longBreakDuration);
  const focusCyclesRef = useRef(focusCycles);
  const isStrictRef = useRef(isStrictMode);
  const modeRef = useRef(mode);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taskTitleRef = useRef(taskTitle);
  const startTimeRef = useRef<number | null>(null);
  const durationAtStartRef = useRef<number>(0);

  // Keep refs in sync
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { timeElapsedRef.current = timeElapsed; }, [timeElapsed]);
  useEffect(() => { focusDurRef.current = focusDuration; }, [focusDuration]);
  useEffect(() => { breakDurRef.current = breakDuration; }, [breakDuration]);
  useEffect(() => { longBreakDurRef.current = longBreakDuration; }, [longBreakDuration]);
  useEffect(() => { focusCyclesRef.current = focusCycles; }, [focusCycles]);
  useEffect(() => { isStrictRef.current = isStrictMode; }, [isStrictMode]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { taskTitleRef.current = taskTitle; }, [taskTitle]);

  // Sync settings to localStorage
  useEffect(() => { localStorage.setItem(PREF + 'mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem(PREF + 'focusDur', String(focusDuration)); }, [focusDuration]);
  useEffect(() => { localStorage.setItem(PREF + 'breakDur', String(breakDuration)); }, [breakDuration]);
  useEffect(() => { localStorage.setItem(PREF + 'longBreakDur', String(longBreakDuration)); }, [longBreakDuration]);
  useEffect(() => { localStorage.setItem(PREF + 'strict', String(isStrictMode)); }, [isStrictMode]);

  // Sync session state for persistence and crash recovery
  useEffect(() => {
    try {
      const state = {
        status, 
        timeLeft, 
        timeElapsed, 
        focusCycles, 
        pendingLiquidTime, 
        pendingPomodoros,
        sessionLiquidTime,
        lastSyncTime,
        mode, 
        taskId,
        timestamp: Date.now()
      };
      localStorage.setItem(PREF + 'session_state', JSON.stringify(state));
      localStorage.setItem(STORAGE_KEY_BUFFER, JSON.stringify(state));
    } catch {}
  }, [status, timeLeft, timeElapsed, focusCycles, pendingLiquidTime, pendingPomodoros, sessionLiquidTime, lastSyncTime, mode, taskId]);

  // 🚑 Emergency Backup: beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (status === 'running' || pendingLiquidTime > 0) {
        console.log("⚠️ Emergency buffer saved on tab close");
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status, pendingLiquidTime]);

  // Auto-start logic with Drift Compensation on Initial Load
  useEffect(() => {
    if (status === 'running') startTick('focus');
    else if (status === 'break') startTick('break');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start logic for Strict Mode
  useEffect(() => {
    if (status === 'idle' && isStrictMode && timeLeft === focusDuration) {
      const timer = setTimeout(() => {
        if (statusRef.current === 'idle') {
          setStatus('running');
          startTick('focus');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, isStrictMode, focusDuration, timeLeft]);

  // ── Logic Functions ─────────────────────────────────────────────────

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTick = useCallback((type: 'focus' | 'break') => {
    clearTimer();
    startTimeRef.current = Date.now();
    
    // Capturar o estado inicial do cronômetro para cálculo de delta
    const startVal = type === 'focus' 
      ? (modeRef.current === 'pomodoro' ? timeLeftRef.current : timeElapsedRef.current)
      : timeLeftRef.current;
    
    durationAtStartRef.current = startVal;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSec = Math.floor((now - startTimeRef.current!) / 1000);
      if (deltaSec <= 0) return;

      const s = statusRef.current;
      const m = modeRef.current;

      if (s !== 'running' && s !== 'break') {
        clearTimer();
        return;
      }

      if (type === 'focus') {
        if (m === 'pomodoro') {
          const newTimeLeft = Math.max(0, durationAtStartRef.current - deltaSec);
          const actualElapsedThisTick = timeLeftRef.current - newTimeLeft;
          
          if (actualElapsedThisTick > 0) {
            setTimeLeft(newTimeLeft);
            timeLeftRef.current = newTimeLeft;
            setTimeElapsed(e => e + actualElapsedThisTick);
            setSessionLiquidTime(s => s + actualElapsedThisTick);
            
            // Auto-sync a cada 5 min (300s)
            const currentTotal = sessionLiquidTime + actualElapsedThisTick;
            if (currentTotal > 0 && currentTotal % 300 === 0) {
              const minutesToSync = Math.floor(currentTotal / 60) - Math.floor(lastSyncTime / 60);
              if (minutesToSync > 0) {
                syncFocusSession(taskId, minutesToSync, 0);
                setLastSyncTime(currentTotal);
              }
            }
          }

          if (newTimeLeft <= 0) {
            clearTimer();
            const newCycles = focusCyclesRef.current + 1;
            setFocusCycles(newCycles);
            
            // Ciclo completo: Adiciona 1 pomodoro e os minutos restantes
            const totalInFocus = focusDurRef.current;
            const minutesToSync = Math.floor(totalInFocus / 60) - Math.floor(lastSyncTime / 60);
            
            syncFocusSession(taskId, Math.max(0, minutesToSync), 1);
            setLastSyncTime(0); // Reset for next cycle or break
            setSessionLiquidTime(0);
            setPendingLiquidTime(0);
            setPendingPomodoros(0);
            
            setStatus('completed');
          }
        } else {
          // Flowtime
          const newElapsed = durationAtStartRef.current + deltaSec;
          const actualElapsedThisTick = newElapsed - timeElapsedRef.current;
          
          if (actualElapsedThisTick > 0) {
            setTimeElapsed(newElapsed);
            timeElapsedRef.current = newElapsed;
            setSessionLiquidTime(s => s + actualElapsedThisTick);
            
            // Flowtime: Sync a cada 5 min
            const currentTotal = sessionLiquidTime + actualElapsedThisTick;
            if (currentTotal > 0 && currentTotal % 300 === 0) {
              const minutesToSync = Math.floor(currentTotal / 60) - Math.floor(lastSyncTime / 60);
              if (minutesToSync > 0) {
                syncFocusSession(taskId, minutesToSync, 0);
                setLastSyncTime(currentTotal);
              }
            }
          }
          setTimeLeft(99 * 60 * 60);
        }
      } else {
        // Break
        const newTimeLeft = Math.max(0, durationAtStartRef.current - deltaSec);
        if (timeLeftRef.current !== newTimeLeft) {
          setTimeLeft(newTimeLeft);
          timeLeftRef.current = newTimeLeft;
        }

        if (newTimeLeft <= 0) {
          clearTimer();
          const fd = focusDurRef.current;
          setStatus('idle');
          setTimeLeft(fd);
          setTimeElapsed(0);
          setSessionLiquidTime(0);
          setLastSyncTime(0);
        }
      }
    }, 500); // Check every 500ms for responsiveness, but delta handles drift
  }, [clearTimer, taskId, sessionLiquidTime, lastSyncTime]);

  // Multi-tab Sync Listener
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PREF + 'session_state' && e.newValue) {
        try {
          const s = JSON.parse(e.newValue);
          if (Date.now() - s.timestamp < 2000) {
            setStatus(s.status);
            setTimeLeft(s.timeLeft);
            setTimeElapsed(s.timeElapsed);
            setFocusCycles(s.focusCycles);
            setPendingLiquidTime(s.pendingLiquidTime);
            setPendingPomodoros(s.pendingPomodoros);
            
            if ((s.status === 'running' || s.status === 'break') && !intervalRef.current) {
              startTick(s.status === 'running' ? 'focus' : 'break');
            } else if (s.status !== 'running' && s.status !== 'break') {
              clearTimer();
            }
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [startTick, clearTimer]);

  // Initial Load - Clear buffer if session belongs to different task
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BUFFER);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.taskId && s.taskId !== taskId) {
           localStorage.removeItem(STORAGE_KEY_BUFFER);
        }
      } catch {}
    }
  }, [taskId]);

  // ── Actions ─────────────────────────────────────────────────────────

  const toggleTimer = useCallback(() => {
    const s = statusRef.current;
    if (s === 'idle' || s === 'paused' || s === 'completed') {
      if (s === 'completed') {
        const fd = focusDurRef.current;
        setTimeLeft(fd);
        setTimeElapsed(0);
      }
      setStatus('running');
      startTick('focus');
    } else if (s === 'running') {
      clearTimer();
      setStatus('paused');
    } else if (s === 'break') {
      clearTimer();
      setStatus('break-paused');
    } else if (s === 'break-paused') {
      setStatus('break');
      startTick('break');
    }
  }, [clearTimer, startTick]);

  const resetTimer = useCallback(() => {
    clearTimer();
    const fd = focusDurRef.current;
    setStatus('idle');
    setTimeLeft(fd);
    setTimeElapsed(0);
    localStorage.removeItem(STORAGE_KEY_BUFFER);
  }, [clearTimer]);

  const skipToComplete = useCallback(() => {
    if (statusRef.current !== 'running') return;
    clearTimer();
    const elapsed = modeRef.current === 'pomodoro' ? (focusDurRef.current - timeLeftRef.current) : timeElapsedRef.current;
    
    // Persist immediately what was studied
    const minutesToSync = Math.floor(elapsed / 60) - Math.floor(lastSyncTime / 60);
    syncFocusSession(taskId, Math.max(0, minutesToSync), 1);
    
    setFocusCycles(c => c + 1);
    setSessionLiquidTime(0);
    setLastSyncTime(0);
    setPendingLiquidTime(0);
    setPendingPomodoros(0);
    setStatus('completed');
    setTimeLeft(0);
  }, [clearTimer, taskId, lastSyncTime]);

  const startBreak = useCallback(() => {
    const isLong = focusCyclesRef.current > 0 && focusCyclesRef.current % 4 === 0;
    const dur = isLong ? longBreakDurRef.current : breakDurRef.current;
    setStatus('break');
    setTimeLeft(dur);
    startTick('break');
  }, [startTick]);

  const skipBreakNewFocus = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const closeAfterPersist = useCallback(async () => {
    clearTimer();
    
    // Calcular apenas o que NÃO foi sincronizado ainda
    const elapsed = modeRef.current === 'pomodoro' 
      ? (focusDurRef.current - timeLeftRef.current) 
      : timeElapsedRef.current;
    
    const totalMinutesStudied = Math.floor(elapsed / 60);
    const alreadySyncedMinutes = Math.floor(lastSyncTime / 60);
    const finalMinutesToSync = totalMinutesStudied - alreadySyncedMinutes;

    if (finalMinutesToSync > 0) {
      syncFocusSession(taskId, finalMinutesToSync, 0);
    }
    
    setPendingLiquidTime(0);
    setPendingPomodoros(0);
    setSessionLiquidTime(0);
    setLastSyncTime(0);
    
    localStorage.removeItem(STORAGE_KEY_BUFFER);
    localStorage.removeItem(PREF + 'session_state');
  }, [clearTimer, taskId, lastSyncTime]);

  const discardSessionTime = useCallback(() => {
    clearTimer();
    setPendingLiquidTime(0);
    setPendingPomodoros(0);
    setSessionLiquidTime(0);
    localStorage.removeItem(PREF + 'session_state');
    resetTimer();
  }, [clearTimer, resetTimer]);

  // Computed Values
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (mode === 'flowtime' || h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentDuration = status === 'break' || status === 'break-paused' 
    ? (focusCycles > 0 && focusCycles % 4 === 0 ? longBreakDuration : breakDuration)
    : focusDuration;

  const progress = mode === 'pomodoro' 
    ? ((currentDuration - timeLeft) / currentDuration) * 100
    : 0;

  const pageTitle = status === 'running'
    ? `(${formatTime(mode === 'pomodoro' ? timeLeft : timeElapsed)}) ${taskTitle}`
    : status === 'completed' ? '✅ Concluído!' : 'EduFlow';

  return {
    mode, setMode: (m) => { setModeState(m); resetTimer(); },
    status, focusDuration, setFocusDuration: setFocusDurationState,
    breakDuration, setBreakDuration: setBreakDurationState,
    longBreakDuration, setLongBreakDuration: setLongBreakDurationState,
    isStrictMode, setIsStrictMode: setIsStrictModeState,
    timeLeft: mode === 'pomodoro' ? timeLeft : timeElapsed, 
    timeElapsed, focusCycles, sessionLiquidTime,
    pendingLiquidTime, pendingPomodoros, pageTitle,
    toggleTimer, resetTimer, skipToComplete, startBreak, skipBreakNewFocus,
    discardSessionTime, closeAfterPersist, formatTime, progress
  };
}
