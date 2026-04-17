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
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { EduStuff } from '../types';
import { playSuccessSound } from '../utils/audio';

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function useEduStuffs(userId: string | undefined) {
  const [stuffs, setStuffs] = useState<EduStuff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyMood, setDailyMoodState] = useState<number | null>(null);

  // Sync EduStuffs
  useEffect(() => {
    if (!userId) {
      setStuffs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'eduStuffs'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newStuffs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EduStuff[];
      setStuffs(newStuffs);
      setIsLoading(false);
    }, (error) => {
      console.error('[useEduStuffs] Subscription error:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Sync Mood Diário
  useEffect(() => {
    if (!userId) return;
    const today = getLocalDate();
    const moodDocRef = doc(db, `users/${userId}/dailyMoods/${today}`);
    
    const unsubscribe = onSnapshot(moodDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setDailyMoodState(docSnap.data().value);
      } else {
        // Fallback para localStorage se quiser persistir offline antes de sync
        const saved = localStorage.getItem(`mood_${userId}_${today}`);
        if (saved) setDailyMoodState(parseInt(saved));
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const setDailyMood = useCallback(async (value: number) => {
    if (!userId) return;
    const today = getLocalDate();
    const moodDocRef = doc(db, `users/${userId}/dailyMoods/${today}`);
    
    // Otimista
    setDailyMoodState(value);
    localStorage.setItem(`mood_${userId}_${today}`, value.toString());

    try {
      await setDoc(moodDocRef, {
        value,
        updatedAt: serverTimestamp(),
        userId
      });
    } catch (err) {
      console.error('[useEduStuffs] Error setting mood:', err);
    }
  }, [userId]);

  const addStuff = useCallback(async (stuff: Omit<EduStuff, 'id' | 'createdAt' | 'updatedAt' | 'streak' | 'completedDates'>) => {
    if (!userId) return;
    try {
      await addDoc(collection(db, 'eduStuffs'), {
        ...stuff,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        streak: 0,
        completedDates: []
      });
    } catch (err) {
      console.error('[useEduStuffs] addStuff error:', err);
    }
  }, [userId]);

  const updateStuff = useCallback(async (id: string, updates: Partial<EduStuff>) => {
    if (!userId) return;
    
    // ATUALIZAÇÃO OTIMISTA
    setStuffs(prev => prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s));

    try {
      const finalUpdates: any = { 
        ...updates, 
        updatedAt: serverTimestamp() 
      };

      if (updates.completed === true) {
        const todayISO = getLocalDate();
        finalUpdates.lastCompletedAt = serverTimestamp();
        
        const habit = stuffs.find(s => s.id === id);
        const currentDates = habit?.completedDates || [];
        if (!currentDates.includes(todayISO)) {
          finalUpdates.completedDates = [...currentDates, todayISO];
        }
      } else if (updates.completed === false) {
        finalUpdates.lastCompletedAt = null;
        const habit = stuffs.find(s => s.id === id);
        const todayISO = getLocalDate();
        finalUpdates.completedDates = (habit?.completedDates || []).filter(d => d !== todayISO);
      }

      await updateDoc(doc(db, 'eduStuffs', id), finalUpdates);
    } catch (err) {
      console.error('[useEduStuffs] updateStuff error:', err);
    }
  }, [userId, stuffs]);

  const toggleHabit = useCallback(async (habit: EduStuff) => {
    if (!userId) return;
    const today = getLocalDate();
    const completedDates = habit.completedDates || [];
    const isDoneToday = completedDates.includes(today);

    let newDates = isDoneToday 
      ? completedDates.filter(d => d !== today)
      : [...completedDates, today];
    
    newDates = Array.from(new Set(newDates)).sort();

    // Streak logic (basic)
    let streak = 0;
    const checkDate = new Date();
    while (newDates.includes(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Otimista
    setStuffs(prev => prev.map(s => s.id === habit.id ? { ...s, completedDates: newDates, streak } : s));

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
  }, [userId]);

  const deleteStuff = useCallback(async (id: string) => {
    if (!userId) return;
    // Otimista
    setStuffs(prev => prev.filter(s => s.id !== id));
    try {
      await deleteDoc(doc(db, 'eduStuffs', id));
    } catch (err) {
      console.error('[useEduStuffs] deleteStuff error:', err);
    }
  }, [userId]);

  return {
    stuffs,
    isLoading,
    dailyMood,
    setDailyMood,
    addStuff,
    updateStuff,
    deleteStuff,
    toggleHabit
  };
}
