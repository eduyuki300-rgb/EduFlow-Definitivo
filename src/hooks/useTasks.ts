import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, increment, writeBatch } from 'firebase/firestore';
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
const BUFFER_KEY = 'eduflow_pending_sync';

const getInitialPendingUpdates = () => {
  try {
    const saved = localStorage.getItem(BUFFER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return new Map<string, { liquidTime: number, pomodoros: number }>(parsed);
      }
    }
  } catch (err) {
    console.warn('[useTasks] Erro ao restaurar buffer de sincronização:', err);
  }
  return new Map<string, { liquidTime: number, pomodoros: number }>();
};

const pendingUpdates = getInitialPendingUpdates();

// PROACTIVE CLEANUP: Remove any legacy 'general' entries that might crash sync
if (pendingUpdates.has('general')) {
  pendingUpdates.delete('general');
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(Array.from(pendingUpdates.entries())));
  } catch {}
}

const saveBuffer = () => {
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(Array.from(pendingUpdates.entries())));
  } catch {}
};

const isSyncing = { current: false };
const LEGACY_RESET_FLAG_PREFIX = 'eduflow_legacy_liquid_time_reset_v2_';

function clearLegacyFocusClientState() {
  pendingUpdates.clear();
  saveBuffer();

  try {
    localStorage.removeItem(BUFFER_KEY);
    localStorage.removeItem('focus_sync_buffer');
    localStorage.removeItem('eduflow_active_focus_id');

    const sessionKeys = Object.keys(localStorage).filter((key) => key.startsWith('eduflow_session_'));
    for (const key of sessionKeys) {
      localStorage.removeItem(key);
    }
  } catch {
    // best effort cleanup
  }
}

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'pending' | 'error'>('synced');
  const syncStatusRef = useRef(syncStatus);
  const legacyCleanupStartedRef = useRef(false);

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
    legacyCleanupStartedRef.current = false;

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
          // Fallback para Date.now() caso o timestamp ainda seja nulo (pending write)
          const aTime = a.createdAt?.toMillis?.() || Date.now();
          const bTime = b.createdAt?.toMillis?.() || Date.now();
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

  useEffect(() => {
    if (!userId || isLoading || legacyCleanupStartedRef.current) {
      return;
    }

    const flagKey = `${LEGACY_RESET_FLAG_PREFIX}${userId}`;
    if (localStorage.getItem(flagKey) === 'true') {
      return;
    }

    legacyCleanupStartedRef.current = true;

    const runLegacyCleanup = async () => {
      clearLegacyFocusClientState();

      const tasksWithLegacyTime = tasks.filter((task) => (task.liquidTime ?? 0) > 0);
      if (tasksWithLegacyTime.length === 0) {
        localStorage.setItem(flagKey, 'true');
        return;
      }

      setSyncStatus('syncing');

      try {
        await Promise.all(
          tasksWithLegacyTime.map((task) =>
            updateDoc(doc(db, 'tasks', task.id), {
              liquidTime: 0,
            })
          )
        );

        localStorage.setItem(flagKey, 'true');
        setSyncStatus('synced');
      } catch (cleanupError) {
        console.error('Erro ao limpar liquidTime legado:', cleanupError);
        legacyCleanupStartedRef.current = false;
        setSyncStatus('error');
      }
    };

    runLegacyCleanup();
  }, [isLoading, tasks, userId]);

  /**
   * Força a sincronização imediata de todo o buffer pendente com o Firestore.
   * PERFORMANCE FIXED: Agora usa writeBatch para atomicidade e velocidade.
   */
  const forceSync = async () => {
    if (isSyncing.current || pendingUpdates.size === 0 || !userId) return;
    
    isSyncing.current = true;
    setSyncStatus('syncing');

    const batch = writeBatch(db);
    const entries = Array.from(pendingUpdates.entries());
    
    try {
      entries.forEach(([taskId, data]) => {
        if (taskId === 'general' || !taskId) return; // Defense in depth

        const docRef = doc(db, 'tasks', taskId);
        const docUpdates: any = { updatedAt: serverTimestamp() };
        if (data.liquidTime > 0) docUpdates.liquidTime = increment(data.liquidTime);
        if (data.pomodoros > 0) docUpdates.pomodoros = increment(data.pomodoros);
        
        batch.update(docRef, docUpdates);
      });

      await batch.commit();
      
      // Cleanup local buffer only after successful commit
      pendingUpdates.clear();
      saveBuffer();
      setSyncStatus('synced');
    } catch (err) {
      console.error("[useTasks] Batch Sync Error (Senior Audit):", err);
      setSyncStatus('error');
      // No manual entry deletion here, so it remains in Map for next retry
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
  // CRITICAL FIX: Ignore 'general' placeholder used for Free Focus
  if (taskId === 'general' || !taskId) return;
  if (liquidTimeIncrement === 0 && pomodorosIncrement === 0) return;

  const current = pendingUpdates.get(taskId) || { liquidTime: 0, pomodoros: 0 };
  pendingUpdates.set(taskId, {
    liquidTime: current.liquidTime + liquidTimeIncrement,
    pomodoros: current.pomodoros + pomodorosIncrement
  });
  saveBuffer();
}
