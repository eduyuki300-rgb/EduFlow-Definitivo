import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { playSuccessSound } from '../utils/audio';


export type FocusTimerMode = 'pomodoro' | 'stopwatch';
export type FocusTimerStatus = 'idle' | 'running' | 'paused' | 'break' | 'break-paused' | 'finished';
export type FocusTheme = 'midnight' | 'aurora' | 'minimal' | 'forest';

const FOCUS_THEME_STORAGE_KEY = 'eduflow_focus_theme';

function readStoredFocusTheme(): FocusTheme {
  if (typeof window === 'undefined') return 'midnight';
  try {
    const v = localStorage.getItem(FOCUS_THEME_STORAGE_KEY);
    if (v === 'midnight' || v === 'aurora' || v === 'minimal' || v === 'forest') return v;
  } catch {
    /* ignore */
  }
  return 'midnight';
}

function readStoredBool(key: string, def: boolean): boolean {
  if (typeof window === 'undefined') return def;
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v === 'true';
  } catch {
    return def;
  }
}

// removed local playChime, now using from utils via playSuccessSound alias or directly as playSuccessSound

export function useFocusSession(taskId: string, taskTitle: string = 'Foco') {
  const [mode, setMode] = useState<FocusTimerMode>('pomodoro');
  const [status, setStatus] = useState<FocusTimerStatus>('idle');
  const [theme, setTheme] = useState<FocusTheme>(readStoredFocusTheme);
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const [longBreakDuration, setLongBreakDuration] = useState(15 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sessionLiquidTime, setSessionLiquidTime] = useState(0);
  
  const [focusCycles, setFocusCycles] = useState(0);
  const [isStrictMode, setIsStrictMode] = useState<boolean>(() => readStoredBool('eduflow_strict_mode', false));

  const statusRef = useRef(status);
  const modeRef = useRef(mode);
  const focusDurationRef = useRef(focusDuration);
  const breakDurationRef = useRef(breakDuration);
  const longBreakDurationRef = useRef(longBreakDuration);
  const isStrictModeRef = useRef(isStrictMode);
  const focusCyclesRef = useRef(focusCycles);
  const sessionLiquidSecondsRef = useRef(0);
  const sessionTotalSecondsRef = useRef(0);
  const timeLeftRef = useRef(timeLeft);
  const isPersistingRef = useRef(false);

  useEffect(() => {
    // 1. Reset state
    setMode('pomodoro');
    setStatus('idle');
    setFocusDuration(25 * 60);
    setBreakDuration(5 * 60);
    setTimeLeft(25 * 60);
    setTimeElapsed(0);
    sessionLiquidSecondsRef.current = 0;
    sessionTotalSecondsRef.current = 0;
    setSessionLiquidTime(0);

    // 2. Recovery Logic: Check for unsaved time from a previous crash/reload
    const recoveryKey = `eduflow_unsaved_${taskId}`;
    const saved = localStorage.getItem(recoveryKey);
    if (saved) {
      try {
        const { liquid, total } = JSON.parse(saved);
        if (liquid > 0 || total > 0) {
          // Atomic cleanup: remove before sync to prevent double-counting if mid-sync crash happens
          localStorage.removeItem(recoveryKey);
          
          console.log(`[FocusSession] Recovering ${liquid}s of study time for task ${taskId}`);
          void updateDoc(doc(db, 'tasks', taskId), {
            liquidTime: increment(liquid),
            totalTime: increment(total),
            updatedAt: serverTimestamp(),
          }).catch(err => {
             console.error('Failed to sync recovered time, data may be lost:', err);
             // Note: In a production app, we would re-buffer this time for another retry attempt.
          });
        }
      } catch (e) { 
        console.error('Recovery error:', e);
        localStorage.removeItem(recoveryKey);
      }
    }

    return () => {
      if (isPersistingRef.current) return;
      const id = taskId;
      const deltaLiquid = sessionLiquidSecondsRef.current;
      const deltaTotal = sessionTotalSecondsRef.current;
      if (deltaLiquid <= 0 && deltaTotal <= 0) return;
      
      // Atomic reset within cleanup
      sessionLiquidSecondsRef.current = 0;
      sessionTotalSecondsRef.current = 0;
      localStorage.removeItem(`eduflow_unsaved_${id}`);
      
      void updateDoc(doc(db, 'tasks', id), {
        liquidTime: increment(deltaLiquid),
        totalTime: increment(deltaTotal),
        updatedAt: serverTimestamp(),
      }).catch((err) => console.error('Error saving time on session end:', err));
    };
  }, [taskId]);

  useEffect(() => {
    try {
      localStorage.setItem(FOCUS_THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
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
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    focusCyclesRef.current = focusCycles;
  }, [focusCycles]);
  useEffect(() => {
    isStrictModeRef.current = isStrictMode;
    try { localStorage.setItem('eduflow_strict_mode', String(isStrictMode)); } catch {}
  }, [isStrictMode]);

  useEffect(() => {
    if (status === 'idle' || status === 'finished') {
      document.title = 'EduFlow';
      return;
    }
    const t = mode === 'pomodoro' ? timeLeft : timeElapsed;
    const m = Math.floor(t / 60);
    const s = t % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const prefix = status === 'running' ? (mode === 'pomodoro' ? '⏳' : '⏱️') : (status === 'break' ? '☕' : '⏸️');
    document.title = `(${prefix} ${timeStr}) ${taskTitle} - EduFlow`;

    return () => { document.title = 'EduFlow'; };
  }, [timeLeft, timeElapsed, status, taskTitle, mode]);

  const bufferSessionTime = useCallback(() => {
    try {
      localStorage.setItem(`eduflow_unsaved_${taskId}`, JSON.stringify({
        liquid: sessionLiquidSecondsRef.current,
        total: sessionTotalSecondsRef.current
      }));
    } catch (e) {}
  }, [taskId]);

  const persistToFirestore = useCallback(async (isPomodoroComplete: boolean) => {
    if (isPersistingRef.current) return;
    
    // Capture current values sync
    const deltaLiquid = sessionLiquidSecondsRef.current;
    const deltaTotal = sessionTotalSecondsRef.current;
    
    if (deltaLiquid === 0 && deltaTotal === 0 && !isPomodoroComplete) return;
    
    isPersistingRef.current = true;
    try {
      interface TaskUpdate {
        liquidTime: any;
        totalTime: any;
        updatedAt: any;
        pomodoros?: any;
      }

      const updateData: TaskUpdate = {
        liquidTime: increment(deltaLiquid),
        totalTime: increment(deltaTotal),
        updatedAt: serverTimestamp(),
      };
      if (isPomodoroComplete) {
        updateData.pomodoros = increment(1);
      }
      
      await updateDoc(doc(db, 'tasks', taskId), updateData as any);
      
      // Reset after successful save
      sessionLiquidSecondsRef.current = 0;
      sessionTotalSecondsRef.current = 0;
      setSessionLiquidTime(0);
      localStorage.removeItem(`eduflow_unsaved_${taskId}`);
    } catch (error) {
      console.error('Error saving time:', error);
    } finally {
      isPersistingRef.current = false;
    }
  }, [taskId]);

  const onPomodoroCompleteRef = useRef<() => void>(() => {});
  onPomodoroCompleteRef.current = () => {
    playSuccessSound(true);
    const nextCycle = focusCyclesRef.current + 1;
    setFocusCycles(nextCycle);
    void persistToFirestore(true).then(() => {
      // In strict mode, we might want to trigger something after save, but for now we follow the existing logic
    }).catch(err => console.error("Critical: Failed to save completed Pomodoro:", err));

    if (isStrictModeRef.current) {
      setStatus('break');
      setTimeLeft(nextCycle % 4 === 0 ? longBreakDurationRef.current : breakDurationRef.current);
    } else {
      setStatus('finished');
    }
  };

  const onBreakCompleteRef = useRef<() => void>(() => {});
  onBreakCompleteRef.current = () => {
    playSuccessSound(true);
    if (isStrictModeRef.current) {
      setStatus('running');
      setTimeLeft(focusDurationRef.current);
    } else {
      setStatus('idle');
      setTimeLeft(focusDurationRef.current);
    }
  };

  useEffect(() => {
    if (status === 'idle' && mode === 'pomodoro') {
      setTimeLeft(focusDuration);
    }
  }, [focusDuration, status, mode]);

  useEffect(() => {
    if (status === 'idle' || status === 'finished' || status === 'paused' || status === 'break-paused') return;

    let lastTick = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTick;
      const deltaSecs = Math.floor(deltaMs / 1000);

      if (deltaSecs < 1) return;
      lastTick += deltaSecs * 1000;

      const s = statusRef.current;
      const m = modeRef.current;
      const currentLeft = timeLeftRef.current;

      if (m === 'pomodoro') {
        if (s === 'running') {
          const actualDelta = Math.min(currentLeft, deltaSecs);
          sessionTotalSecondsRef.current += actualDelta;
          sessionLiquidSecondsRef.current += actualDelta;
          setSessionLiquidTime(sessionLiquidSecondsRef.current);

          setTimeLeft((prev) => {
            if (prev === 0) return 0;
            const next = prev - actualDelta;
            if (next === 0 && prev > 0) {
              queueMicrotask(() => onPomodoroCompleteRef.current());
            }
            return next;
          });
          bufferSessionTime();
        } else if (s === 'break') {
          const actualDelta = Math.min(currentLeft, deltaSecs);
          sessionTotalSecondsRef.current += actualDelta;

          setTimeLeft((prev) => {
            if (prev === 0) return 0;
            const next = prev - actualDelta;
            if (next === 0 && prev > 0) {
              queueMicrotask(() => onBreakCompleteRef.current());
            }
            return next;
          });
          bufferSessionTime();
        }
      } else if (m === 'stopwatch' && s === 'running') {
        sessionTotalSecondsRef.current += deltaSecs;
        sessionLiquidSecondsRef.current += deltaSecs;
        setSessionLiquidTime(sessionLiquidSecondsRef.current);
        setTimeElapsed((prev) => prev + deltaSecs);
        bufferSessionTime();
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [status, mode]);

  const toggleTimer = useCallback(() => {
    if (status === 'idle' || status === 'paused') {
      setStatus('running');
    } else if (status === 'break-paused') {
      setStatus('break');
    } else if (status === 'running') {
      setStatus('paused');
      void persistToFirestore(false);
    } else if (status === 'break') {
      setStatus('break-paused');
    }
  }, [status, persistToFirestore]);

  const resetTimer = useCallback(() => {
    if (mode === 'pomodoro') setTimeLeft(focusDuration);
    else setTimeElapsed(0);
    setStatus('idle');
  }, [mode, focusDuration]);

  const skipToComplete = useCallback(async () => {
    if (mode !== 'pomodoro' || status !== 'running') return;
    playSuccessSound();
    setStatus('finished');
    await persistToFirestore(true);
    setTimeLeft(0);
  }, [mode, status, persistToFirestore]);

  const startBreak = useCallback(() => {
    setStatus('break');
    setTimeLeft(focusCycles % 4 === 0 && focusCycles > 0 ? longBreakDuration : breakDuration);
  }, [breakDuration, longBreakDuration, focusCycles]);

  const skipBreakNewFocus = useCallback(() => {
    setStatus('running');
    setTimeLeft(focusDuration);
  }, [focusDuration]);

  const closeAfterPersist = useCallback(async () => {
    if (status !== 'idle' && status !== 'finished') {
      await persistToFirestore(false);
    }
  }, [status, persistToFirestore]);

  const discardSessionTime = useCallback(() => {
    // Lock persistence and reset refs
    isPersistingRef.current = true;
    sessionLiquidSecondsRef.current = 0;
    sessionTotalSecondsRef.current = 0;
    setSessionLiquidTime(0);
    localStorage.removeItem(`eduflow_unsaved_${taskId}`);
  }, [taskId]);

  return {
    mode,
    setMode,
    status,
    setStatus,
    theme,
    setTheme,
    focusDuration,
    setFocusDuration,
    breakDuration,
    setBreakDuration,
    longBreakDuration,
    setLongBreakDuration,
    timeLeft,
    setTimeLeft,
    timeElapsed,
    sessionLiquidTime,
    focusCycles,
    isStrictMode,
    setIsStrictMode,
    toggleTimer,
    resetTimer,
    skipToComplete,
    startBreak,
    skipBreakNewFocus,
    closeAfterPersist,
    discardSessionTime,
    playSuccessSound,
  };
}

export type FocusSessionApi = ReturnType<typeof useFocusSession>;
