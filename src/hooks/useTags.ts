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
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { CustomTag } from '../types';

export const useTags = (userId: string | undefined) => {
  const [tags, setTags] = useState<CustomTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTags([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Ordenação por 'order' ascendente, fallback por 'createdAt' descendente
    const q = query(
      collection(db, 'userTags'),
      where('userId', '==', userId),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTags = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomTag[];
      
      setTags(newTags);
      setIsLoading(false);
    }, (error) => {
      console.error('[useTags] onSnapshot error:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const addTag = useCallback(async (tag: Omit<CustomTag, 'id' | 'createdAt' | 'userId'>) => {
    if (!userId) return;
    
    try {
      // Determinamos a ordem (final da lista)
      const maxOrder = tags.length > 0 ? Math.max(...tags.map(t => (t as any).order || 0)) : 0;
      
      await addDoc(collection(db, 'userTags'), {
        ...tag,
        userId,
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[useTags] addTag error:', err);
      throw err;
    }
  }, [userId, tags]);

  const updateTag = useCallback(async (id: string, updates: Partial<CustomTag>) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'userTags', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('[useTags] updateTag error:', err);
      throw err;
    }
  }, [userId]);

  const deleteTag = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'userTags', id));
    } catch (err) {
      console.error('[useTags] deleteTag error:', err);
      throw err;
    }
  }, [userId]);

  const reorderTags = useCallback(async (orderedIds: string[]) => {
    if (!userId) return;
    
    const batch = writeBatch(db);
    
    orderedIds.forEach((id, index) => {
      const tagRef = doc(db, 'userTags', id);
      batch.update(tagRef, { order: index });
    });

    try {
      await batch.commit();
    } catch (err) {
      console.error('[useTags] reorderTags error:', err);
      throw err;
    }
  }, [userId]);

  return {
    tags,
    isLoading,
    addTag,
    updateTag,
    deleteTag,
    reorderTags
  };
};
