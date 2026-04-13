import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, awaitRedirectAuthResult } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void awaitRedirectAuthResult().finally(() => {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setIsAuthReady(true);
      });
    });

    return () => unsubscribe?.();
  }, []);

  return { user, isAuthReady };
}
