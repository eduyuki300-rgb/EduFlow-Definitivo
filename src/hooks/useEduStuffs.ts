import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  setDoc,
  increment 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { EduStuff } from '../types';
import { playSuccessSound } from '../utils/audio';

export interface UserProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  streak: number;
  lastStudyDate: string; // UTC ISO String (YYYY-MM-DD)
  totalFocusMinutes: number;
  gems: number;
}

const LEVEL_BASE_XP = 100;
const LEVEL_GROWTH_FACTOR = 1.6; // Ajustado para ser levemente mais desafiador

const getLocalISODate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const useEduStuffs = () => {
  const { user } = useAuth();
  const [stuffs, setStuffs] = useState<EduStuff[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyMood, setDailyMoodState] = useState<number | null>(null);
  const [levelUpTriggered, setLevelUpTriggered] = useState(false);

  // Sync EduStuffs (Hábitos)
  useEffect(() => {
    if (!user) {
      setStuffs([]);
      return;
    }

    const q = query(
      collection(db, 'eduStuffs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newStuffs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EduStuff[];
      setStuffs(newStuffs);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync Progresso do Usuário (Gamificação)
  useEffect(() => {
    if (!user) {
      setProgress(null);
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentLevel = data.level || 1;
        setProgress({
          level: currentLevel,
          xp: data.xp || 0,
          xpToNextLevel: Math.floor(LEVEL_BASE_XP * Math.pow(currentLevel, LEVEL_GROWTH_FACTOR)),
          streak: data.streak || 0,
          lastStudyDate: data.lastStudyDate || '',
          totalFocusMinutes: data.totalFocusMinutes || 0,
          gems: data.gems || 0,
        });
      }
      setIsLoading(false);
    });

    return unsub;
  }, [user]);

  // Sync Mood Diário
  useEffect(() => {
    if (!user) return;
    const today = getLocalISODate();
    const moodDocRef = doc(db, `users/${user.uid}/dailyMoods/${today}`);
    
    return onSnapshot(moodDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setDailyMoodState(docSnap.data().value);
      }
    });
  }, [user]);

  const calculateXPGain = useCallback((minutes: number, category?: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
    if (!progress) return 0;
    
    // Base XP: 1.5 XP por minuto focado (melhorado para ser mais gratificante)
    const baseXP = minutes * 1.5;
    
    // Multiplier 1: Dificuldade
    const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'medium' ? 1.0 : 1.5;
    
    // Multiplier 2: Categoria (Gamificação por esforço intelectual)
    let catMult = 1.0;
    if (category) {
      const c = category.toLowerCase();
      if (c.includes('simulado')) catMult = 2.0;
      else if (c.includes('revisão')) catMult = 1.3;
      else if (c.includes('vídeo')) catMult = 0.9;
    }
    
    // Multiplier 3: Streak (Max 10 days bonus)
    const streakBonus = Math.min(progress.streak, 10) * 0.1; 
    const streakMult = 1 + streakBonus;

    // Multiplier 4: Deep Work (>50min session)
    const deepWorkMult = minutes >= 50 ? 1.5 : 1.0;

    return Math.floor(baseXP * diffMult * catMult * streakMult * deepWorkMult);
  }, [progress]);

  const addFocusSession = useCallback(async (minutes: number, category?: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
    if (!user || !progress) return;
    
    const xpGain = calculateXPGain(minutes, category, difficulty);
    const gemsGain = Math.floor(minutes / 10); 
    
    const todayLocal = getLocalISODate();
    const lastLocal = progress.lastStudyDate;

    let newStreak = progress.streak || 0;
    
    if (lastLocal !== todayLocal) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const offset = yesterday.getTimezoneOffset();
      const yesterdayLocal = new Date(yesterday.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
      
      if (lastLocal === yesterdayLocal) {
        newStreak += 1;
        console.log('🔥 Streak incrementada!', { de: lastLocal, para: todayLocal, novaStreak: newStreak });
      } else if (lastLocal === "") {
        newStreak = 1;
        console.log('✨ Primeira sessão de estudo registrada!');
      } else {
        newStreak = 1;
        console.log('❄️ Streak resetada (dia perdido ou novo período)', { lastLocal, todayLocal });
      }
    }

    console.log('📊 XP Gain Calculation:', {
      minutes,
      category,
      difficulty,
      xpTotal: xpGain,
      gems: gemsGain,
      currentLevel: progress.level
    });

    const userRef = doc(db, 'users', user.uid);
    const updatedXP = progress.xp + xpGain;
    const hasLeveledUp = updatedXP >= progress.xpToNextLevel;

    try {
      await updateDoc(userRef, {
        xp: hasLeveledUp ? updatedXP - progress.xpToNextLevel : updatedXP,
        level: hasLeveledUp ? increment(1) : progress.level,
        gems: increment(gemsGain),
        totalFocusMinutes: increment(minutes),
        streak: newStreak,
        lastStudyDate: todayLocal,
        lastActive: serverTimestamp()
      });

      if (hasLeveledUp) {
        setLevelUpTriggered(true);
        setTimeout(() => setLevelUpTriggered(false), 8000);
      }
    } catch (err) {
      console.error('[useEduStuffs] Error adding focus session:', err);
    }
  }, [user, progress, calculateXPGain]);

  const setDailyMood = useCallback(async (value: number) => {
    if (!user) return;
    const today = getLocalISODate();
    const moodDocRef = doc(db, `users/${user.uid}/dailyMoods/${today}`);
    setDailyMoodState(value);
    try {
      await setDoc(moodDocRef, { value, updatedAt: serverTimestamp(), userId: user.uid });
    } catch (err) {
      console.error('[useEduStuffs] Error setting mood:', err);
    }
  }, [user]);

  const addStuff = useCallback(async (stuff: Omit<EduStuff, 'id' | 'createdAt' | 'updatedAt' | 'streak' | 'completedDates'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'eduStuffs'), {
        ...stuff,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        streak: 0,
        completedDates: []
      });
    } catch (err) {
      console.error('[useEduStuffs] addStuff error:', err);
    }
  }, [user]);

  const toggleHabit = useCallback(async (habit: EduStuff) => {
    if (!user) return;
    const today = getLocalISODate();
    const completedDates = habit.completedDates || [];
    const isDoneToday = completedDates.includes(today);

    let newDates = isDoneToday 
      ? completedDates.filter(d => d !== today)
      : [...completedDates, today];
    
    newDates = Array.from(new Set(newDates)).sort();

    // Streak logic para o hábito individual
    let streak = 0;
    const checkDate = new Date();
    while (newDates.includes(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    try {
      await updateDoc(doc(db, 'eduStuffs', habit.id), {
        completedDates: newDates,
        streak,
        lastCompletedAt: isDoneToday ? null : serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      if (!isDoneToday) playSuccessSound(true);
    } catch (err) {
      console.error('[useEduStuffs] toggleHabit error:', err);
    }
  }, [user]);

  const updateStuff = useCallback(async (id: string, updates: Partial<EduStuff>) => {
    if (!user) return;
    try {
      const finalUpdates: any = { 
        ...updates, 
        updatedAt: serverTimestamp() 
      };

      // BUG 1: Firestore sanitization for complex objects (subtasks)
      if (updates.subtasks) {
        finalUpdates.subtasks = updates.subtasks.map(s => ({ ...s }));
      }

      // BUG 2: Automatic completedAt management
      if (updates.completed === true) finalUpdates.completedAt = new Date().toISOString();
      if (updates.completed === false) finalUpdates.completedAt = null;

      // BUG 3: Immutable optimistic update for nested arrays
      setStuffs(prev => prev.map(s => 
        s.id === id 
          ? { 
              ...s, 
              ...updates, 
              subtasks: updates.subtasks ? [...updates.subtasks] : s.subtasks 
            } 
          : s
      ));

      await updateDoc(doc(db, 'eduStuffs', id), finalUpdates);
    } catch (err) {
      console.error('[useEduStuffs] updateStuff error:', err);
    }
  }, [user]);

  const deleteStuff = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'eduStuffs', id));
    } catch (err) {
      console.error('[useEduStuffs] deleteStuff error:', err);
    }
  }, [user]);

  const forceYesterdayStudy = useCallback(async () => {
    if (!user) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const offset = yesterday.getTimezoneOffset();
    const yesterdayLocal = new Date(yesterday.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lastStudyDate: yesterdayLocal
      });
      console.log('🧪 Debug: lastStudyDate forçado para ontem:', yesterdayLocal);
    } catch (err) {
      console.error('Erro ao forçar data de estudo:', err);
    }
  }, [user]);

  return {
    stuffs,
    progress,
    isLoading,
    dailyMood,
    levelUpTriggered,
    setDailyMood,
    addFocusSession,
    addStuff,
    updateStuff,
    toggleHabit,
    deleteStuff,
    forceYesterdayStudy
  };
}
