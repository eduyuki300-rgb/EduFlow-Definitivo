import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface EduStuff {
  id: string;
  userId: string;
  title: string;
  type: 'todo' | 'habit';
  completed: boolean;
  streak: number;
  lastCompletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  category?: 'saude' | 'social' | 'casa' | 'pessoal';
}

export function useEduStuffs(userId: string | undefined) {
  const [stuffs, setStuffs] = useState<EduStuff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setStuffs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'eduStuffs'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EduStuff));
      // Sort: To-dos first, then habits. Within each, by creation date.
      list.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'todo' ? -1 : 1;
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });
      setStuffs(list);
      setIsLoading(false);
    }, (err) => {
      console.error('Error fetching EduStuffs:', err);
      setError(err.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const addStuff = async (stuff: Omit<EduStuff, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'streak' | 'lastCompletedAt'>) => {
    if (!userId) return;
    await addDoc(collection(db, 'eduStuffs'), {
      ...stuff,
      userId,
      streak: 0,
      lastCompletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const updateStuff = async (id: string, updates: Partial<EduStuff>) => {
    await updateDoc(doc(db, 'eduStuffs', id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteStuff = async (id: string) => {
    await deleteDoc(doc(db, 'eduStuffs', id));
  };

  const toggleHabit = async (habit: EduStuff) => {
    if (habit.type !== 'habit') return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastDate = habit.lastCompletedAt?.toDate();
    if (lastDate) {
      lastDate.setHours(0, 0, 0, 0);
      if (lastDate.getTime() === today.getTime()) {
        // Already completed today, skip or toggle off? Usually toggle off resets streak?
        // Let's implement a simple "Complete for today" logic.
        return;
      }
    }

    await updateStuff(habit.id, {
      streak: (habit.streak || 0) + 1,
      lastCompletedAt: Timestamp.now()
    });
  };

  return { stuffs, isLoading, error, addStuff, updateStuff, deleteStuff, toggleHabit };
}
