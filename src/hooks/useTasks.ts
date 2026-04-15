import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../types';

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      return;
    }

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
        setTasks(list);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { tasks };
}
