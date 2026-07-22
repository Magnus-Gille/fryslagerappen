import type { RecordModel } from 'pocketbase';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { pocketbase, pocketbaseAuthReady } from '@/lib/pocketbase';

export type AppUser = RecordModel & {
  email: string;
  displayName: string;
  household: string;
  householdRole: 'owner' | 'member' | '';
};

type AuthContextValue = {
  authenticated: boolean;
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(Boolean(pocketbase));

  useEffect(() => {
    if (!pocketbase) return;
    const client = pocketbase;
    let mounted = true;
    let unsubscribe = () => {};

    pocketbaseAuthReady
      .then(async () => {
        if (client.authStore.isValid) {
          try {
            await client.collection('users').authRefresh();
          } catch {
            client.authStore.clear();
          }
        }
        if (!mounted) return;
        unsubscribe = client.authStore.onChange((_token, record) => {
          if (mounted) setUser((record as AppUser | null) ?? null);
        }, true);
        setLoading(false);
      })
      .catch(() => {
        client.authStore.clear();
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated: Boolean(user && pocketbase?.authStore.isValid),
      user,
      loading,
      signIn: async (email, password) => {
        if (!pocketbase) throw new Error('M5-servern är inte konfigurerad.');
        await pocketbase.collection('users').authWithPassword(email, password);
      },
      signUp: async (email, password) => {
        if (!pocketbase) throw new Error('M5-servern är inte konfigurerad.');
        const auth = await pocketbase.send<{ token: string; record: RecordModel }>('/api/iceage/signup', {
          method: 'POST',
          body: { email, password },
        });
        pocketbase.authStore.save(auth.token, auth.record);
      },
      signOut: async () => {
        if (!pocketbase) return;
        await pocketbase.realtime.unsubscribe();
        pocketbase.authStore.clear();
      },
      refreshUser: async () => {
        if (!pocketbase?.authStore.isValid) return;
        await pocketbase.collection('users').authRefresh();
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
