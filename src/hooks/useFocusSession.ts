import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';

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

/**
 * Hook robusto para sessões de foco com sincronização Firestore
 * - Persiste estado no localStorage para recuperação após fechamento da aba
 * - Sincroniza com Firestore ao finalizar sessão (closeAfterPersist)
 * - Usa beforeunload para garantir salvamento mesmo em fechamento inesperado
 */
export function useFocusSession(
  taskId: string,
  taskTitle: string
): FocusSessionApi {
  // ── Persisted settings ──────────────────────────────────────────────
  const [mode, setModeState] = useState<TimerMode>(() =>
    readStr<TimerMode>('mode', 'pomodoro')
  );
  const [focusDuration, setFocusDurationState] = useState(() =>
    readInt('focusDur', 1500)
  );
  const [breakDuration, setBreakDurationState] = useState(() =>
    readInt('breakDur', 300)
  );
  const [longBreakDuration, setLongBreakDurationState] = useState(() =>
    readInt('longBreakDur', 900)
  );
  const [isStrictMode, setIsStrictModeState] = useState(() =>
    readBool('strict')
  );

  // ── Timer state ─────────────────────────────────────────────────────
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(() => readInt('focusDur', 1500));
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [focusCycles, setFocusCycles] = useState(0);
  const [sessionLiquidTime, setSessionLiquidTime] = useState(0);
  const [pendingLiquidTime, setPendingLiquidTime] = useState(0);
  const [pendingPomodoros, setPendingPomodoros] = useState(0);

  // ── Refs (avoid stale closures in setInterval) ──────────────────────
  const statusRef = useRef(status);
  const timeLeftRef = useRef(timeLeft);
  const focusDurRef = useRef(focusDuration);
  const breakDurRef = useRef(breakDuration);
  const longBreakDurRef = useRef(longBreakDuration);
  const focusCyclesRef = useRef(focusCycles);
  const isStrictRef = useRef(isStrictMode);
  const modeRef = useRef(mode);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taskTitleRef = useRef(taskTitle);
  const taskIdRef = useRef(taskId);

  // Keep refs in sync
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { focusDurRef.current = focusDuration; }, [focusDuration]);
  useEffect(() => { breakDurRef.current = breakDuration; }, [breakDuration]);
  useEffect(() => { longBreakDurRef.current = longBreakDuration; }, [longBreakDuration]);
  useEffect(() => { focusCyclesRef.current = focusCycles; }, [focusCycles]);
  useEffect(() => { isStrictRef.current = isStrictMode; }, [isStrictMode]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { taskTitleRef.current = taskTitle; }, [taskTitle]);
  useEffect(() => { taskIdRef.current = taskId; }, [taskId]);

  // Persist settings
  useEffect(() => { try { localStorage.setItem(PREF + 'mode', mode); } catch {} }, [mode]);
  useEffect(() => { try { localStorage.setItem(PREF + 'focusDur', String(focusDuration)); } catch {} }, [focusDuration]);
  useEffect(() => { try { localStorage.setItem(PREF + 'breakDur', String(breakDuration)); } catch {} }, [breakDuration]);
  useEffect(() => { try { localStorage.setItem(PREF + 'longBreakDur', String(longBreakDuration)); } catch {} }, [longBreakDuration]);
  useEffect(() => { try { localStorage.setItem(PREF + 'strict', String(isStrictMode)); } catch {} }, [isStrictMode]);

  // Persist session state for recovery after tab close
  useEffect(() => {
    try {
      const sessionState = {
        status,
        timeLeft,
        timeElapsed,
        focusCycles,
        pendingLiquidTime,
        pendingPomodoros,
        timestamp: Date.now(),
      };
      localStorage.setItem(PREF + 'session_state', JSON.stringify(sessionState));
    } catch {}
  }, [status, timeLeft, timeElapsed, focusCycles, pendingLiquidTime, pendingPomodoros]);

  // Auto-recover session on mount if there's a saved state
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(PREF + 'session_state');
      if (savedState) {
        const { status: savedStatus, timeLeft: savedTimeLeft, pendingLiquidTime: savedLiquid, pendingPomodoros: savedPomos, timestamp } = JSON.parse(savedState);
        // Only recover if session was interrupted recently (within 24 hours)
        const age = Date.now() - timestamp;
        if (age < 24 * 60 * 60 * 1000 && (savedStatus === 'running' || savedStatus === 'paused')) {
          setPendingLiquidTime(savedLiquid || 0);
          setPendingPomodoros(savedPomos || 0);
          setTimeLeft(savedTimeLeft);
          timeLeftRef.current = savedTimeLeft;
          setStatus(savedStatus);
          statusRef.current = savedStatus;
        }
      }
    } catch {}
  }, []);

  // Persist to Firestore on beforeunload (backup for unexpected closes)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (pendingLiquidTime > 0 || pendingPomodoros > 0) {
        try {
          const updates: Record<string, unknown> = {
            updatedAt: serverTimestamp(),
          };
          if (pendingLiquidTime > 0) updates.liquidTime = increment(pendingLiquidTime);
          if (pendingPomodoros > 0) updates.pomodoros = increment(pendingPomodoros);
          await updateDoc(doc(db, 'tasks', taskIdRef.current), updates);
        } catch (e) {
          console.error('Error persisting on unload:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingLiquidTime, pendingPomodoros]);

  // ── Interval management ─────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // ── Title helper ────────────────────────────────────────────────────
  const updateTitle = useCallback(
    (secs: number, phase: 'focus' | 'break' | 'done' | 'idle') => {
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      if (phase === 'focus')
        document.title = `⏳ (${mm}:${ss}) — ${taskTitleRef.current}`;
      else if (phase === 'break') document.title = `☕ (${mm}:${ss}) — Pausa`;
      else if (phase === 'done') document.title = '✅ Foco concluído!';
      else document.title = 'StudyFlow';
    },
    []
  );

  // ── Focus tick factory ──────────────────────────────────────────────
  const startFocusTick = useCallback(
    (initialTimeLeft?: number) => {
      clearTimer();
      if (initialTimeLeft !== undefined) {
        setTimeLeft(initialTimeLeft);
        timeLeftRef.current = initialTimeLeft;
      }
      intervalRef.current = setInterval(() => {
        const s = statusRef.current;
        if (s !== 'running' && s !== 'idle') {
          clearTimer();
          return;
        }

        setTimeLeft((prev) => {
          const next = prev - 1;
          timeLeftRef.current = next;

          if (next <= 0) {
            clearTimer();
            const newCycles = focusCyclesRef.current + 1;
            setFocusCycles(newCycles);
            focusCyclesRef.current = newCycles;
            const dur = focusDurRef.current;
            setPendingLiquidTime((pl) => pl + dur);
            setSessionLiquidTime((sl) => sl + dur);
            setPendingPomodoros((pp) => pp + 1);
            setStatus('finished');
            statusRef.current = 'finished';
            updateTitle(0, 'done');
            return 0;
          }

          setTimeElapsed((e) => e + 1);
          setSessionLiquidTime((sl) => sl + 1);
          updateTitle(next, 'focus');
          return next;
        });
      }, 1000);
    },
    [clearTimer, updateTitle]
  );

  // ── Break tick factory ──────────────────────────────────────────────
  const startBreakTick = useCallback(
    (dur: number) => {
      clearTimer();
      setTimeLeft(dur);
      timeLeftRef.current = dur;
      setTimeElapsed(0);
      updateTitle(dur, 'break');

      intervalRef.current = setInterval(() => {
        if (statusRef.current !== 'break') {
          clearTimer();
          return;
        }
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            clearTimer();
            const fd = focusDurRef.current;
            setStatus('idle');
            statusRef.current = 'idle';
            setTimeLeft(fd);
            timeLeftRef.current = fd;
            setTimeElapsed(0);
            updateTitle(0, 'idle');
            if (isStrictRef.current) {
              setTimeout(() => {
                setStatus('running');
                statusRef.current = 'running';
                startFocusTick(fd);
              }, 600);
            }
            return 0;
          }
          updateTitle(next, 'break');
          return next;
        });
      }, 1000);
    },
    [clearTimer, updateTitle, startFocusTick]
  );

  // ── Public actions ──────────────────────────────────────────────────

  const toggleTimer = useCallback(() => {
    const s = statusRef.current;

    if (s === 'idle' || s === 'paused') {
      setStatus('running');
      statusRef.current = 'running';
      startFocusTick();
    } else if (s === 'running') {
      clearTimer();
      setStatus('paused');
      statusRef.current = 'paused';
      updateTitle(timeLeftRef.current, 'focus');
    } else if (s === 'break') {
      clearTimer();
      setStatus('break-paused');
      statusRef.current = 'break-paused';
      updateTitle(timeLeftRef.current, 'break');
    } else if (s === 'break-paused') {
      // Resume break — reconstruct tick with remaining timeLeft
      setStatus('break');
      statusRef.current = 'break';
      const remaining = timeLeftRef.current;
      clearTimer();
      intervalRef.current = setInterval(() => {
        if (statusRef.current !== 'break') { clearTimer(); return; }
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            clearTimer();
            const fd = focusDurRef.current;
            setStatus('idle');
            statusRef.current = 'idle';
            setTimeLeft(fd);
            timeLeftRef.current = fd;
            updateTitle(0, 'idle');
            return 0;
          }
          updateTitle(next, 'break');
          return next;
        });
      }, 1000);
      void remaining; // suppress unused warning
    }
  }, [clearTimer, startFocusTick, updateTitle]);

  const resetTimer = useCallback(() => {
    clearTimer();
    const fd = focusDurRef.current;
    setStatus('idle');
    statusRef.current = 'idle';
    setTimeLeft(fd);
    timeLeftRef.current = fd;
    setTimeElapsed(0);
    updateTitle(0, 'idle');
  }, [clearTimer, updateTitle]);

  const skipToComplete = useCallback(() => {
    if (statusRef.current !== 'running') return;
    clearTimer();
    const elapsed = focusDurRef.current - timeLeftRef.current;
    const newCycles = focusCyclesRef.current + 1;
    setFocusCycles(newCycles);
    focusCyclesRef.current = newCycles;
    setPendingLiquidTime((pl) => pl + elapsed);
    setSessionLiquidTime((sl) => sl + elapsed);
    setPendingPomodoros((pp) => pp + 1);
    setStatus('finished');
    statusRef.current = 'finished';
    setTimeLeft(0);
    updateTitle(0, 'done');
  }, [clearTimer, updateTitle]);

  const startBreak = useCallback(() => {
    const cycles = focusCyclesRef.current;
    const isLong = cycles > 0 && cycles % 4 === 0;
    const dur = isLong ? longBreakDurRef.current : breakDurRef.current;
    setStatus('break');
    statusRef.current = 'break';
    startBreakTick(dur);
  }, [startBreakTick]);

  const skipBreakNewFocus = useCallback(() => {
    clearTimer();
    const fd = focusDurRef.current;
    setStatus('idle');
    statusRef.current = 'idle';
    setTimeLeft(fd);
    timeLeftRef.current = fd;
    setTimeElapsed(0);
    updateTitle(0, 'idle');
  }, [clearTimer, updateTitle]);

  // ── Firestore persistence ────────────────────────────────────────────

  const persistToFirestore = useCallback(
    async (liquidSecs: number, pomos: number) => {
      if (!taskId || (liquidSecs === 0 && pomos === 0)) return;
      try {
        const updates: Record<string, unknown> = {
          updatedAt: serverTimestamp(),
        };
        if (liquidSecs > 0) updates.liquidTime = increment(liquidSecs);
        if (pomos > 0) updates.pomodoros = increment(pomos);
        await updateDoc(doc(db, 'tasks', taskId), updates);

        // Clear saved session state after successful persist
        try {
          localStorage.removeItem(PREF + 'session_state');
        } catch {}
      } catch (e) {
        console.error('Error persisting session:', e);
      }
    },
    [taskId]
  );

  const closeAfterPersist = useCallback(async () => {
    clearTimer();
    const runningExtra =
      statusRef.current === 'running'
        ? focusDurRef.current - timeLeftRef.current
        : 0;
    const total = pendingLiquidTime + runningExtra;
    await persistToFirestore(total, pendingPomodoros);
    setPendingLiquidTime(0);
    setPendingPomodoros(0);
    updateTitle(0, 'idle');
  }, [clearTimer, pendingLiquidTime, pendingPomodoros, persistToFirestore, updateTitle]);

  const discardSessionTime = useCallback(() => {
    clearTimer();
    setPendingLiquidTime(0);
    setPendingPomodoros(0);
    setSessionLiquidTime(0);
    // Also clear saved session state
    try {
      localStorage.removeItem(PREF + 'session_state');
    } catch {}
    updateTitle(0, 'idle');
  }, [clearTimer, updateTitle]);

  // ── Settings wrappers ────────────────────────────────────────────────

  const setMode = useCallback(
    (m: TimerMode) => {
      setModeState(m);
      modeRef.current = m;
      clearTimer();
      const fd = focusDurRef.current;
      setStatus('idle');
      statusRef.current = 'idle';
      setTimeLeft(fd);
      timeLeftRef.current = fd;
      setTimeElapsed(0);
      updateTitle(0, 'idle');
    },
    [clearTimer, updateTitle]
  );

  const setFocusDuration = useCallback((v: number) => {
    setFocusDurationState(v);
    focusDurRef.current = v;
    if (statusRef.current === 'idle') {
      setTimeLeft(v);
      timeLeftRef.current = v;
    }
  }, []);

  const setBreakDuration = useCallback((v: number) => {
    setBreakDurationState(v);
    breakDurRef.current = v;
  }, []);

  const setLongBreakDuration = useCallback((v: number) => {
    setLongBreakDurationState(v);
    longBreakDurRef.current = v;
  }, []);

  const setIsStrictMode = useCallback((v: boolean) => {
    setIsStrictModeState(v);
    isStrictRef.current = v;
  }, []);

  // ─────────────────────────────────────────────────────────────────────

  return {
    mode,
    setMode,
    status,
    focusDuration,
    setFocusDuration,
    breakDuration,
    setBreakDuration,
    longBreakDuration,
    setLongBreakDuration,
    isStrictMode,
    setIsStrictMode,
    timeLeft,
    timeElapsed,
    focusCycles,
    sessionLiquidTime,
    toggleTimer,
    resetTimer,
    skipToComplete,
    startBreak,
    skipBreakNewFocus,
    discardSessionTime,
    closeAfterPersist,
  };
}
