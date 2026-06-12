import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth';

import { setAccessTokenGetter } from '../api/authToken';

interface AuthContextValue {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const initTimeout = setTimeout(() => {
      if (!cancelled) {
        setInitializing(false);
      }
    }, 10_000);

    const unsubscribe = auth().onAuthStateChanged(async (nextUser) => {
      if (cancelled) {
        return;
      }

      clearTimeout(initTimeout);
      setUser(nextUser);
      setInitializing(false);

      if (__DEV__ && nextUser) {
        const token = await nextUser.getIdToken();
        console.log('Token for testing:', token);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(initTimeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setAccessTokenGetter(async () => {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        return null;
      }
      return currentUser.getIdToken();
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await auth().signInWithEmailAndPassword(email.trim(), password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await auth().createUserWithEmailAndPassword(email.trim(), password);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await auth().sendPasswordResetEmail(email.trim());
  }, []);

  const signOut = useCallback(async () => {
    await auth().signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      signIn,
      signUp,
      sendPasswordReset,
      signOut,
    }),
    [user, initializing, signIn, signUp, sendPasswordReset, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
