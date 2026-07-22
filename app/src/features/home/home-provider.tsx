import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { pocketbase } from '@/lib/pocketbase';
import { diagnosticError, reportTelemetry } from '@/lib/telemetry';

export type HomeRole = 'owner' | 'member';
export type Home = { id: string; name: string; role: HomeRole; displayName: string };
export type HomeMember = { id: string; displayName: string; role: HomeRole };

type HomeContextValue = {
  home: Home | null;
  members: HomeMember[];
  loading: boolean;
  refresh: () => Promise<void>;
  createHome: (homeName: string, displayName: string) => Promise<void>;
  joinHome: (inviteToken: string, displayName: string) => Promise<void>;
  renameHome: (name: string) => Promise<void>;
  createInvite: () => Promise<string>;
  removeMember: (memberId: string) => Promise<void>;
};

const HomeContext = createContext<HomeContextValue | null>(null);

export function HomeProvider({ children }: PropsWithChildren) {
  const { user, refreshUser } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [members, setMembers] = useState<HomeMember[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const latestRefresh = useRef(0);

  const refresh = useCallback(async () => {
    const refreshNumber = ++latestRefresh.current;
    if (!pocketbase || !user?.household) {
      setHome(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [record, memberResult] = await Promise.all([
        pocketbase.collection('households').getOne(user.household),
        pocketbase.send<{ members: HomeMember[] }>(`/api/iceage/homes/${user.household}/members`, {}),
      ]);
      if (refreshNumber !== latestRefresh.current) return;
      setHome({
        id: record.id,
        name: String(record.name),
        role: user.householdRole === 'owner' ? 'owner' : 'member',
        displayName: user.displayName,
      });
      setMembers(memberResult.members);
    } finally {
      if (refreshNumber === latestRefresh.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    Promise.resolve()
      .then(refresh)
      .catch((error) => {
        void reportTelemetry('home_load_failed', {
          stage: 'initial_load',
          ...diagnosticError(error),
        });
        setLoading(false);
      });
  }, [refresh]);

  const value = useMemo<HomeContextValue>(
    () => ({
      home,
      members,
      loading,
      refresh,
      createHome: async (homeName, displayName) => {
        if (!pocketbase) throw new Error('M5-servern är inte konfigurerad.');
        await pocketbase.send('/api/iceage/homes', {
          method: 'POST',
          body: { name: homeName, displayName },
        });
        await refreshUser();
      },
      joinHome: async (inviteToken, displayName) => {
        if (!pocketbase) throw new Error('M5-servern är inte konfigurerad.');
        await pocketbase.send('/api/iceage/invites/accept', {
          method: 'POST',
          body: { token: inviteToken.trim(), displayName },
        });
        await refreshUser();
      },
      renameHome: async (name) => {
        if (!pocketbase || !home) throw new Error('Inget hem är valt.');
        await pocketbase.send(`/api/iceage/homes/${home.id}`, {
          method: 'PATCH',
          body: { name: name.trim() },
        });
        await refresh();
      },
      createInvite: async () => {
        if (!pocketbase || !home) throw new Error('Inget hem är valt.');
        const result = await pocketbase.send<{ token: string }>(
          `/api/iceage/homes/${home.id}/invites`,
          { method: 'POST', body: {} },
        );
        return result.token;
      },
      removeMember: async (memberId) => {
        if (!pocketbase || !home) throw new Error('Inget hem är valt.');
        await pocketbase.send(`/api/iceage/homes/${home.id}/members/${memberId}`, {
          method: 'DELETE',
        });
        await refresh();
      },
    }),
    [home, loading, members, refresh, refreshUser],
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome() {
  const value = useContext(HomeContext);
  if (!value) throw new Error('useHome must be used within HomeProvider');
  return value;
}
