import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth';

import { deleteAccount as deleteAccountRequest } from '../api/account';
import { setAccessTokenGetter } from '../api/authToken';
import { isApiFirebaseEnvironmentAligned } from '../config/apiConfig';
import { clearCachedUserCards } from '../services/userCardsCache';
import { clearOfflineUserCardQueue } from '../services/offlineUserCardQueue';
import {
  clearScanImagePersistentCache,
} from '../services/scanImagePersistentCache';
import { clearMemoryScanImageCache } from '../utils/scanImage';

const PENDING_SHARE_TOKEN_KEY = '@ebc/pendingShareToken';

interface AuthContextValue {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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

      if (nextUser && !isApiFirebaseEnvironmentAligned()) {
        await auth().signOut();
        setUser(null);
        setInitializing(false);
        return;
      }

      setUser(nextUser);
      setInitializing(false);
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
      return currentUser.getIdToken(true);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isApiFirebaseEnvironmentAligned()) {
      throw new Error(
        'Cannot sign in: API target and Firebase project do not match this app install.',
      );
    }
    await auth().signInWithEmailAndPassword(email.trim(), password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isApiFirebaseEnvironmentAligned()) {
      throw new Error(
        'Cannot create account: API target and Firebase project do not match this app install.',
      );
    }
    await auth().createUserWithEmailAndPassword(email.trim(), password);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await auth().sendPasswordResetEmail(email.trim());
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const currentUser = auth().currentUser;
      if (!currentUser?.email) {
        throw new Error('You must be signed in with an email account to change your password.');
      }

      const credential = auth.EmailAuthProvider.credential(
        currentUser.email,
        currentPassword,
      );
      await currentUser.reauthenticateWithCredential(credential);
      await currentUser.updatePassword(newPassword);
    },
    [],
  );

  const signOut = useCallback(async () => {
    clearMemoryScanImageCache();
    await Promise.all([
      clearCachedUserCards(),
      clearOfflineUserCardQueue(),
      clearScanImagePersistentCache(),
    ]);
    await auth().signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteAccountRequest();
    await AsyncStorage.removeItem(PENDING_SHARE_TOKEN_KEY);
    await auth().signOut();
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      signIn,
      signUp,
      sendPasswordReset,
      changePassword,
      signOut,
      deleteAccount,
    }),
    [
      user,
      initializing,
      signIn,
      signUp,
      sendPasswordReset,
      changePassword,
      signOut,
      deleteAccount,
    ],
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
