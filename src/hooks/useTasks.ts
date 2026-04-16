import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Status } from '../types';

/**
 * Hook robusto para gerenciamento de tarefas com sincronização Firestore
 * - Usa onSnapshot para atualizações em tempo real
 * - Mantém cache local via Firestore persistence (configurado em firebase.ts)
 * - Previne perda de dados mesmo em fechamento inesperado da aba
 */
/**
 * Buffer global para atualizações frequentes (ex: liquidTime)
 * Para evitar múltiplas escritas no Firestore em um curto intervalo.
 */
const pendingUpdates = new Map<string, { liquidTime: number, pomodoros: number }>();
const isSyncing = { current: false };
let syncTimer: NodeJS.Timeout | null = null;

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'pending' | 'error'>('synced');
  const syncStatusRef = useRef(syncStatus);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  // Loop de Sincronização Inteligente (A cada 1 minuto)
  useEffect(() => {
    if (!userId) return;

    const timer = setInterval(async () => {
      if (pendingUpdates.size > 0) {
        await forceSync();
      }
    }, 1 * 60 * 1000); // 1 minuto

    // Timer para atualizar o status visual de 'pendente' se houver algo no buffer
    const statusInterval = setInterval(() => {
      if (pendingUpdates.size > 0 && syncStatusRef.current === 'synced') {
        setSyncStatus('pending');
      }
    }, 1000);

    // Listener para quando o usuário sai da aba (Força Sync)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        forceSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      clearInterval(statusInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    // ... (rest of query logic remains the same)

    setIsLoading(true);
    setError(null);

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Task)
        );
        // Ordenar por createdAt (mais recentes primeiro)
        list.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setTasks(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Função para forçar a sincronização de tudo que está no buffer
  const forceSync = async () => {
    if (pendingUpdates.size === 0 || !userId || isSyncing.current) return;
    
    isSyncing.current = true;
    setSyncStatus('syncing');
    
    const updates = Array.from(pendingUpdates.entries());
    pendingUpdates.clear();

    try {
      const { increment } = await import('firebase/firestore');
      
      await Promise.all(
        updates.map(([taskId, data]) => {
          const docUpdates: any = { updatedAt: serverTimestamp() };
          if (data.liquidTime > 0) docUpdates.liquidTime = increment(data.liquidTime);
          if (data.pomodoros > 0) docUpdates.pomodoros = increment(data.pomodoros);
          
          return updateDoc(doc(db, 'tasks', taskId), docUpdates);
        })
      );

      setSyncStatus('synced');
    } catch (err) {
      console.error("Erro no Smart Sync:", err);
      // Recuperação: Recolocar no buffer para tentar depois
      updates.forEach(([taskId, data]) => {
        const prev = pendingUpdates.get(taskId) || { liquidTime: 0, pomodoros: 0 };
        pendingUpdates.set(taskId, {
          liquidTime: prev.liquidTime + data.liquidTime,
          pomodoros: prev.pomodoros + data.pomodoros
        });
      });
      setSyncStatus('error');
    } finally {
      isSyncing.current = false;
    }
  };

  return { tasks, isLoading, error, syncStatus, forceSync };
}

/**
 * Cria uma nova tarefa no Firestore
 * @param userId ID do usuário autenticado
 * @param taskData Dados da tarefa (sem id, createdAt, updatedAt)
 * @returns Promise com o ID da tarefa criada
 */
export async function createTask(
  userId: string,
  taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const taskWithMeta = {
    ...taskData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'tasks'), taskWithMeta);
  return docRef.id;
}

/**
 * Atualiza uma tarefa existente no Firestore
 * @param taskId ID da tarefa
 * @param updates Campos a serem atualizados
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Move uma tarefa entre status (inbox -> hoje -> semana -> concluida)
 * @param taskId ID da tarefa
 * @param newStatus Novo status
 */
export async function moveTaskToStatus(
  taskId: string,
  newStatus: Status
): Promise<void> {
  await updateTask(taskId, { status: newStatus });
}

/**
 * Deleta uma tarefa do Firestore
 * @param taskId ID da tarefa
 */
export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', taskId));
}

/**
 * Sincroniza dados de sessão de foco (liquidTime, pomodoros)
 * Usado pelo FocusMode para persistir progresso mesmo se a aba fechar
 * @param taskId ID da tarefa
 * @param liquidTimeIncrement Segundos adicionais de foco
 * @param pomodorosIncrement Pomodoros adicionais
 */
/**
 * Sincroniza dados de sessão de foco (liquidTime, pomodoros) de forma INTELIGENTE.
 * Agora usa um buffer local para economizar requisições no Firestore.
 */
export function syncFocusSession(
  taskId: string,
  liquidTimeIncrement: number,
  pomodorosIncrement: number
): void {
  if (liquidTimeIncrement === 0 && pomodorosIncrement === 0) return;

  const current = pendingUpdates.get(taskId) || { liquidTime: 0, pomodoros: 0 };
  pendingUpdates.set(taskId, {
    liquidTime: current.liquidTime + liquidTimeIncrement,
    pomodoros: current.pomodoros + pomodorosIncrement
  });
  
  // Nota: Não chamamos updateDoc aqui! 
  // O loop de 5min ou o fechar da aba cuidará disso.
}
