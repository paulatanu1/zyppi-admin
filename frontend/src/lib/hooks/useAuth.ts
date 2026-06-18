import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
}

interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setState({ user: null, loading: false, isAdmin: false });
        return;
      }

      try {
        const snap = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
        const data = snap.data();
        const isAdmin = data?.isAdmin ?? false;

        setState({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? data?.fullName ?? 'Admin',
            isAdmin,
          },
          loading: false,
          isAdmin,
        });
      } catch {
        setState({ user: null, loading: false, isAdmin: false });
      }
    });

    return unsub;
  }, []);

  return {
    ...state,
    signOut: () => signOut(auth),
  };
}
