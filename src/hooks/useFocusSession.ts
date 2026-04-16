import { useState, useEffect, useRef, useCallback } from 'react';
import { syncFocusSession } from './useTasks';

// ─── TYPES ───────────────────────────────────────────────────────────

export type TimerMode = 'pomodoro' | 'stopwatch';
export type TimerStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'break'
  | 'break-paused'
  | 'finished';

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

  // Actions
  toggleTimer: () => void;
  resetTimer: () => void;
  skipToComplete: () => void;
  startBreak: () => void;
  skipBreakNewFocus: () => void;
  discardSessionTime: () => void;
  closeAfterPersist: () => Promise<void>;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────

const PREF = 'eduflow_session_';

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
    const saved = localStorage.getItem(PREF + 'session_state');
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
        tLeft = Math.max(0, s.timeLeft - driftSec);
        tElapsed = s.timeElapsed + driftSec;
        if (tLeft === 0) tStatus = 'finished';
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
  const [sessionLiquidTime, setSessionLiquidTime] = useState(0);
  const [pendingLiquidTime, setPendingLiquidTime] = useState(initialState?.pendingLiquidTime ?? 0);
  const [pendingPomodoros, setPendingPomodoros] = useState(initialState?.pendingPomodoros ?? 0);

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

  // Sync session state for persistence and multi-tab
  useEffect(() => {
    try {
      const state = {
        status, timeLeft, timeElapsed, focusCycles, pendingLiquidTime, pendingPomodoros,
        timestamp: Date.now()
      };
      localStorage.setItem(PREF + 'session_state', JSON.stringify(state));
    } catch {}
  }, [status, timeLeft, timeElapsed, focusCycles, pendingLiquidTime, pendingPomodoros]);

  // Auto-start logic with Drift Compensation on Initial Load
  useEffect(() => {
    if (status === 'running') startTick('focus');
    else if (status === 'break') startTick('break');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start logic for Strict Mode
  useEffect(() => {
    if (status === 'idle' && isStrictMode && timeLeft === focusDuration) {
      // If we just finished a break and it's idle, and strict mode is on, start next focus
      // (Small delay to allow UI to show break-end notification if any)
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

  const updateTitle = useCallback((secs: number, phase: 'focus' | 'break' | 'done' | 'idle') => {
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    if (phase === 'focus') document.title = `⏳ (${mm}:${ss}) — ${taskTitleRef.current}`;
    else if (phase === 'break') document.title = `☕ (${mm}:${ss}) — Pausa`;
    else if (phase === 'done') document.title = '✅ Foco concluído!';
    else document.title = 'EduFlow';
  }, []);

  const startTick = useCallback((type: 'focus' | 'break') => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      const s = statusRef.current;
      const m = modeRef.current;

      if (s !== 'running' && s !== 'break') {
        clearTimer();
        return;
      }

      if (type === 'focus') {
        if (m === 'pomodoro') {
          setTimeLeft((prev) => {
            const next = prev - 1;
            timeLeftRef.current = next;
            if (next <= 0) {
              clearTimer();
              const newCycles = focusCyclesRef.current + 1;
              setFocusCycles(newCycles);
              const dur = focusDurRef.current;
              // Sincronizar ciclo completo imediatamente com o motor global
              syncFocusSession(taskId, dur, 1);
              setSessionLiquidTime(s => s + dur);
              setStatus('finished');
              updateTitle(0, 'done');
              return 0;
            }
            setTimeElapsed(e => e + 1);
            setSessionLiquidTime(s => s + 1);
            updateTitle(next, 'focus');
            return next;
          });
        } else {
          // Stopwatch counts UP
          setTimeElapsed(e => {
            const next = e + 1;
            setSessionLiquidTime(s => s + 1);
            updateTitle(next, 'focus');
            return next;
          });
          setTimeLeft(0);
        }
      } else {
        // Break Tick
        setTimeLeft((prev) => {
          const next = prev - 1;
          timeLeftRef.current = next;
          if (next <= 0) {
            clearTimer();
            const fd = focusDurRef.current;
            setStatus('idle');
            setTimeLeft(fd);
            setTimeElapsed(0);
            updateTitle(0, 'idle');
            // Logic for auto-next-cycle if strict can be handled in a notification callback or here
            return 0;
          }
          updateTitle(next, 'break');
          return next;
        });
      }
    }, 1000);
  }, [clearTimer, updateTitle]);

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

  // Initial Load
  useEffect(() => {
    const saved = localStorage.getItem(PREF + 'session_state');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (Date.now() - s.timestamp < 24 * 60 * 60 * 1000) {
          setStatus(s.status);
          setTimeLeft(s.timeLeft);
          setTimeElapsed(s.timeElapsed);
          setFocusCycles(s.focusCycles);
          setPendingLiquidTime(s.pendingLiquidTime);
          setPendingPomodoros(s.pendingPomodoros);
          if (s.status === 'running') startTick('focus');
          else if (s.status === 'break') startTick('break');
        }
      } catch {}
    }
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────

  const toggleTimer = useCallback(() => {
    const s = statusRef.current;
    if (s === 'idle' || s === 'paused' || s === 'finished') {
      if (s === 'finished') {
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
    updateTitle(0, 'idle');
  }, [clearTimer, updateTitle]);

  const skipToComplete = useCallback(() => {
    if (statusRef.current !== 'running') return;
    clearTimer();
    const elapsed = modeRef.current === 'pomodoro' ? (focusDurRef.current - timeLeftRef.current) : timeElapsedRef.current;
    setFocusCycles(c => c + 1);
    // Sincronizar progresso parcial/pulado imediatamente
    syncFocusSession(taskId, elapsed, 1);
    setSessionLiquidTime(s => s + elapsed);
    setStatus('finished');
    setTimeLeft(0);
    updateTitle(0, 'done');
  }, [clearTimer, updateTitle, taskId]);

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
    // Cálculo robusto para qualquer modo (Pomodoro ou Cronômetro)
    let extra = 0;
    if (statusRef.current === 'running') {
      extra = modeRef.current === 'pomodoro' 
        ? (focusDurRef.current - timeLeftRef.current) 
        : timeElapsedRef.current;
    }
    
    // Enviar qualquer tempo pendente + tempo da sessão atual não salva
    syncFocusSession(taskId, pendingLiquidTime + extra, pendingPomodoros);
    
    setPendingLiquidTime(0);
    setPendingPomodoros(0);
  }, [clearTimer, taskId, pendingLiquidTime, pendingPomodoros]);

  const discardSessionTime = useCallback(() => {
    clearTimer();
    setPendingLiquidTime(0);
    setPendingPomodoros(0);
    setSessionLiquidTime(0);
    localStorage.removeItem(PREF + 'session_state');
    resetTimer();
  }, [clearTimer, resetTimer]);

  return {
    mode, setMode: (m) => { setModeState(m); resetTimer(); },
    status, focusDuration, setFocusDuration: setFocusDurationState,
    breakDuration, setBreakDuration: setBreakDurationState,
    longBreakDuration, setLongBreakDuration: setLongBreakDurationState,
    isStrictMode, setIsStrictMode: setIsStrictModeState,
    timeLeft, timeElapsed, focusCycles, sessionLiquidTime,
    toggleTimer, resetTimer, skipToComplete, startBreak, skipBreakNewFocus,
    discardSessionTime, closeAfterPersist
  };
}
