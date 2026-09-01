/**
 * Auth + membership context (PRD R5).
 * Flow: sign in (Google or email link) → users/{uid} doc requested →
 * admin approves → member sees the family. Membership is watched live,
 * so an approval flips the UI without a refresh.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Firestore is loaded on demand, never at import time. A signed-out
 * visitor only needs to be told "sign in" — making them download the
 * database SDK first is what kept the doorstep waiting (PRD R7).
 */
async function firestore() {
  const [sdk, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase-data'),
  ]);
  return { ...sdk, db };
}

export interface Membership {
  email: string;
  displayName?: string;
  role: 'member' | 'admin';
  status: 'pending' | 'approved' | 'revoked';
  /** Set when an admin approves a "this is me" claim. */
  personId?: string;
}

export type AuthState =
  | { phase: 'loading' }
  | { phase: 'signedOut' }
  | { phase: 'noRequest'; user: User }
  | { phase: 'pending'; user: User; membership: Membership }
  | { phase: 'revoked'; user: User; membership: Membership }
  | { phase: 'approved'; user: User; membership: Membership };

const AuthCtx = createContext<{
  state: AuthState;
  signInGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  requestAccess: () => Promise<void>;
  signOut: () => Promise<void>;
}>(null!);

export const useAuth = () => useContext(AuthCtx);

const EMAIL_KEY = 'family-tree-signin-email';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [membership, setMembership] = useState<Membership | null | undefined>(
    undefined,
  );

  // Complete a magic-link sign-in if this load is one.
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const stored =
        window.localStorage.getItem(EMAIL_KEY) ??
        window.prompt('Confirm your email to finish signing in') ??
        '';
      if (stored) {
        signInWithEmailLink(auth, stored, window.location.href)
          .then(() => {
            window.localStorage.removeItem(EMAIL_KEY);
            window.history.replaceState(null, '', window.location.pathname);
          })
          .catch(console.error);
      }
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  // Watch membership live once signed in.
  useEffect(() => {
    if (!user) {
      setMembership(user === null ? null : undefined);
      return;
    }
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { doc, onSnapshot, db } = await firestore();
      if (cancelled) return;
      unsubscribe = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) =>
          setMembership(snap.exists() ? (snap.data() as Membership) : null),
        () => setMembership(null),
      );
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  // An account pre-approved before its first sign-in (grant-admin) has an
  // empty displayName — fill it from the profile the first time we see it.
  useEffect(() => {
    if (!user?.displayName || !membership || membership.displayName) return;
    void (async () => {
      const { doc, setDoc, db } = await firestore();
      await setDoc(
        doc(db, 'users', user.uid),
        { displayName: user.displayName },
        { merge: true },
      ).catch(() => {});
    })();
  }, [user, membership]);

  const state: AuthState = (() => {
    if (user === undefined) return { phase: 'loading' };
    if (user === null) return { phase: 'signedOut' };
    if (membership === undefined) return { phase: 'loading' };
    if (membership === null) return { phase: 'noRequest', user };
    if (membership.status === 'approved')
      return { phase: 'approved', user, membership };
    if (membership.status === 'revoked')
      return { phase: 'revoked', user, membership };
    return { phase: 'pending', user, membership };
  })();

  async function signInGoogle() {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async function sendMagicLink(email: string) {
    await sendSignInLinkToEmail(auth, email, {
      url: window.location.origin,
      handleCodeInApp: true,
    });
    window.localStorage.setItem(EMAIL_KEY, email);
  }

  async function requestAccess() {
    const u = auth.currentUser;
    if (!u?.email) return;
    const { doc, setDoc, serverTimestamp, db } = await firestore();
    await setDoc(doc(db, 'users', u.uid), {
      email: u.email,
      displayName: u.displayName ?? '',
      role: 'member',
      status: 'pending',
      requestedAt: serverTimestamp(),
    });
  }

  async function signOut() {
    await fbSignOut(auth);
  }

  return (
    <AuthCtx.Provider
      value={{ state, signInGoogle, sendMagicLink, requestAccess, signOut }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
