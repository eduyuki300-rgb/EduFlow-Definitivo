import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

function playChime() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1);
  } catch (e) {
    console.error(e);
  }
}

export function useFocusSession(taskId: string) {
  const [mode, setMode] = useState<FocusTimerMode>('pomodoro');
  const [status, setStatus] = useState<FocusTimerStatus>('idle');
  const [theme, setTheme] = useState<FocusTheme>(readStoredFocusTheme);
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [sessionLiquidTime, setSessionLiquidTime] = useState(0);

  const statusRef = useRef(status);
  const modeRef = useRef(mode);
  const focusDurationRef = useRef(focusDuration);
  const breakDurationRef = useRef(breakDuration);
  const sessionLiquidSecondsRef = useRef(0);
  const sessionTotalSecondsRef = useRef(0);

  useEffect(() => {
    setMode('pomodoro');
    setStatus('idle');
    setFocusDuration(25 * 60);
    setBreakDuration(5 * 60);
    setTimeLeft(25 * 60);
    setTimeElapsed(0);
    sessionLiquidSecondsRef.current = 0;
    sessionTotalSecondsRef.current = 0;
    setSessionLiquidTime(0);

    return () => {
      const id = taskId;
      const deltaLiquid = sessionLiquidSecondsRef.current;
      const deltaTotal = sessionTotalSecondsRef.current;
      if (deltaLiquid <= 0 && deltaTotal <= 0) return;
      sessionLiquidSecondsRef.current = 0;
      sessionTotalSecondsRef.current = 0;
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

  const persistToFirestore = useCallback(async (isPomodoroComplete: boolean) => {
    const deltaLiquid = sessionLiquidSecondsRef.current;
    const deltaTotal = sessionTotalSecondsRef.current;
    if (deltaLiquid === 0 && deltaTotal === 0 && !isPomodoroComplete) return;
    try {
      const updateData: any = {
        liquidTime: increment(deltaLiquid),
        totalTime: increment(deltaTotal),
        updatedAt: serverTimestamp(),
      };
      if (isPomodoroComplete) {
        updateData.pomodoros = increment(1);
      }
      await updateDoc(doc(db, 'tasks', taskId), updateData);
      sessionLiquidSecondsRef.current = 0;
      sessionTotalSecondsRef.current = 0;
      setSessionLiquidTime(0);
    } catch (error) {
      console.error('Error saving time:', error);
    }
  }, [taskId]);

  const onPomodoroCompleteRef = useRef<() => void>(() => {});
  onPomodoroCompleteRef.current = () => {
    playChime();
    setStatus('finished');
    void persistToFirestore(true);
  };

  const onBreakCompleteRef = useRef<() => void>(() => {});
  onBreakCompleteRef.current = () => {
    playChime();
    setStatus('idle');
    setTimeLeft(focusDurationRef.current);
  };

  useEffect(() => {
    if (status === 'idle' && mode === 'pomodoro') {
      setTimeLeft(focusDuration);
    }
  }, [focusDuration, status, mode]);

  useEffect(() => {
    if (status === 'idle' || status === 'finished') return;

    const id = window.setInterval(() => {
      const s = statusRef.current;
      const m = modeRef.current;

      sessionTotalSecondsRef.current += 1;

      if (m === 'pomodoro') {
        if (s === 'running') {
          setTimeLeft((prev) => {
            if (prev === 0) return 0;
            const next = prev - 1;
            if (next === 0) {
              queueMicrotask(() => onPomodoroCompleteRef.current());
            }
            return next;
          });
          sessionLiquidSecondsRef.current += 1;
          setSessionLiquidTime(sessionLiquidSecondsRef.current);
        } else if (s === 'break') {
          setTimeLeft((prev) => {
            if (prev === 0) return 0;
            const next = prev - 1;
            if (next === 0) {
              queueMicrotask(() => onBreakCompleteRef.current());
            }
            return next;
          });
        }
      } else if (m === 'stopwatch' && s === 'running') {
        setTimeElapsed((prev) => prev + 1);
        sessionLiquidSecondsRef.current += 1;
        setSessionLiquidTime(sessionLiquidSecondsRef.current);
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

  const skipToComplete = useCallback(() => {
    if (mode !== 'pomodoro' || status !== 'running') return;
    playChime();
    setStatus('finished');
    void persistToFirestore(true);
    setTimeLeft(0);
  }, [mode, status, persistToFirestore]);

  const startBreak = useCallback(() => {
    setStatus('break');
    setTimeLeft(breakDuration);
  }, [breakDuration]);

  const skipBreakNewFocus = useCallback(() => {
    setStatus('running');
    setTimeLeft(focusDuration);
  }, [focusDuration]);

  const closeAfterPersist = useCallback(async () => {
    if (status === 'running' || status === 'paused') {
      await persistToFirestore(false);
    }
  }, [status, persistToFirestore]);

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
    timeLeft,
    setTimeLeft,
    timeElapsed,
    sessionLiquidTime,
    toggleTimer,
    resetTimer,
    skipToComplete,
    startBreak,
    skipBreakNewFocus,
    closeAfterPersist,
    playChime,
  };
}

export type FocusSessionApi = ReturnType<typeof useFocusSession>;
