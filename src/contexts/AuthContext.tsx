import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserRole } from '@/types/app-types';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error?: Error }>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUidRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        currentUidRef.current = firebaseUser.uid;
        const currentUid = firebaseUser.uid;
        try {
          const roleDoc = await getDoc(doc(db, 'user_roles', firebaseUser.uid));
          if (currentUidRef.current === currentUid) {
            setRole(roleDoc.exists() ? (roleDoc.data().role as UserRole) : 'staff');
          }
        } catch {
          if (currentUidRef.current === currentUid) {
            setRole('staff');
          }
        }
      } else {
        currentUidRef.current = null;
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      return {};
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const value: AuthContextValue = {
    user,
    role,
    isAdmin: role === 'admin',
    loading,
    signInWithGoogle,
    signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
