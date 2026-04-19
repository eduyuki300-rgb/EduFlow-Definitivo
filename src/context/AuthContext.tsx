import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Busca mock user se existir (QA Bypass)
    const qaBypass = localStorage.getItem('eduflow_qa_bypass');
    if (qaBypass) {
      try {
        const mockUser = JSON.parse(qaBypass);
        setUser(mockUser as User);
        setIsAuthReady(true);
        return;
      } catch (e) {
        localStorage.removeItem('eduflow_qa_bypass');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
  }
  return context;
}
