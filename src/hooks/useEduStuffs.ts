import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  deleteDoc, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// ============================================================================
// TIPOS ATUALIZADOS COM SUPORTE A HEATMAP E DESAFIO 120 DIAS
// ============================================================================
export type EduStuffCategory = 
  | 'compromisso' 
  | 'aniversario' 
  | 'financeiro' 
  | 'trabalho' 
  | 'obrigacoes' 
  | 'pessoal';

export type EduStuffHabitType = 
  | 'leitura_120'      // Desafio: Conta 1 dia por vez (meta: 5 páginas/dia)
  | 'atividade_120'    // Desafio: Conta 1 dia por vez (meta: 1 treino/dia)
  | 'custom';          // Hábito personalizado

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
  
  // Novos campos para categorias e desafios
  category?: EduStuffCategory;
  habitType?: EduStuffHabitType;
  progress?: number;        // Total de dias completados (0-120)
  targetDays?: number;      // Meta total (ex: 120)
  
  // Heatmap: Array de strings ISO 'YYYY-MM-DD' dos dias completados
  completedDates?: string[];
}

export function useEduStuffs(userId: string | null | undefined) {
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
      const list = snapshot.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          completedDates: data.completedDates || [],
          progress: Number(data.progress) || 0,
          streak: Number(data.streak) || 0,
          completed: !!data.completed
        } as EduStuff;
      });
      
      // Ordenação: To-dos primeiro, depois hábitos. Dentro de cada, por data de criação.
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

  // ============================================================================
  // FUNÇÃO AUXILIAR: DATA LOCAL YYYY-MM-DD (Protege contra bug das 21h UTC)
  // ============================================================================
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addStuff = async (stuff: Omit<EduStuff, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'streak' | 'lastCompletedAt' | 'completedDates'>) => {
    if (!userId) return;
    try {
      const todayISO = getLocalDate();
      await addDoc(collection(db, 'eduStuffs'), {
        ...stuff,
        userId,
        streak: stuff.completed ? 1 : 0,
        lastCompletedAt: stuff.completed ? serverTimestamp() : null,
        completedDates: stuff.completed ? [todayISO] : [], 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        progress: stuff.progress ?? (stuff.completed ? 1 : 0),
        targetDays: stuff.targetDays ?? 120,
      });
    } catch (err) {
      console.error('Error adding EduStuff:', err);
      throw err;
    }
  };

  const updateStuff = async (id: string, updates: Partial<EduStuff>) => {
    try {
      await updateDoc(doc(db, 'eduStuffs', id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating EduStuff:', err);
      throw err;
    }
  };

  const deleteStuff = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'eduStuffs', id));
    } catch (err) {
      console.error('Error deleting EduStuff:', err);
      throw err;
    }
  };

  // ============================================================================
  // FUNÇÃO AUXILIAR: CALCULA STREAK CONSECUTIVO OLHANDO PARA TRÁS
  // ============================================================================
  const calculateStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;

    const sortedDates = [...dates].sort().reverse(); 
    const todayStr = getLocalDate();
    
    // Check if the most recent date is today or yesterday to continue streak
    const today = new Date(todayStr + 'T00:00:00');
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 1;
    let current = new Date(sortedDates[0] + 'T00:00:00');

    for (let i = 1; i < sortedDates.length; i++) {
      const expected = new Date(current);
      expected.setDate(expected.getDate() - 1);
      const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;

      if (sortedDates[i] === expectedStr) {
        streak++;
        current = expected;
      } else {
        break;
      }
    }
    return streak;
  };

  const toggleHabit = async (habit: EduStuff) => {
    if (habit.type !== 'habit') return;

    try {
      const todayISO = getLocalDate();
      const completedDates = habit.completedDates || [];
      const isCompletedToday = completedDates.includes(todayISO);

      let newCompletedDates: string[];
      let newStreak: number;
      let newProgress: number;

      if (isCompletedToday) {
        newCompletedDates = completedDates.filter(date => date !== todayISO);
        newStreak = calculateStreak(newCompletedDates);
        newProgress = Math.max(0, (Number(habit.progress) || 0) - 1);
      } else {
        newCompletedDates = [...completedDates, todayISO];
        newStreak = calculateStreak(newCompletedDates);
        newProgress = Math.min((Number(habit.progress) || 0) + 1, 120); 
      }

      await updateDoc(doc(db, 'eduStuffs', habit.id), {
        completed: !isCompletedToday,
        completedDates: newCompletedDates,
        streak: newStreak,
        progress: newProgress,
        lastCompletedAt: isCompletedToday ? null : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error toggling habit:', err);
      throw err;
    }
  };

  return { stuffs, isLoading, error, addStuff, updateStuff, deleteStuff, toggleHabit };
}
