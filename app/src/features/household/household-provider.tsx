import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { pocketbase } from '@/lib/pocketbase';

export type Household = { id: string; name: string; role: 'owner' | 'member'; displayName: string };

type HouseholdContextValue = {
  household: Household | null;
  loading: boolean;
  refresh: () => Promise<void>;
  createHousehold: (householdName: string, displayName: string) => Promise<void>;
  joinHousehold: (inviteToken: string, displayName: string) => Promise<void>;
  createInvite: () => Promise<string>;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: PropsWithChildren) {
  const { user, refreshUser } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const latestRefresh = useRef(0);

  const refresh = useCallback(async () => {
    const refreshNumber = ++latestRefresh.current;
    if (!pocketbase || !user?.household) {
      setHousehold(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const record = await pocketbase.collection('households').getOne(user.household);
      if (refreshNumber !== latestRefresh.current) return;
      setHousehold({
        id: record.id,
        name: String(record.name),
        role: user.householdRole === 'owner' ? 'owner' : 'member',
        displayName: user.displayName,
      });
    } finally {
      if (refreshNumber === latestRefresh.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    Promise.resolve()
      .then(refresh)
      .catch(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<HouseholdContextValue>(
    () => ({
      household,
      loading,
      refresh,
      createHousehold: async (householdName, displayName) => {
        if (!pocketbase) throw new Error('M5-servern är inte konfigurerad.');
        await pocketbase.send('/api/iceage/households', {
          method: 'POST',
          body: { name: householdName, displayName },
        });
        await refreshUser();
      },
      joinHousehold: async (inviteToken, displayName) => {
        if (!pocketbase) throw new Error('M5-servern är inte konfigurerad.');
        await pocketbase.send('/api/iceage/invites/accept', {
          method: 'POST',
          body: { token: inviteToken.trim(), displayName },
        });
        await refreshUser();
      },
      createInvite: async () => {
        if (!pocketbase || !household) throw new Error('Inget hushåll är valt.');
        const result = await pocketbase.send<{ token: string }>(
          `/api/iceage/households/${household.id}/invites`,
          { method: 'POST', body: {} },
        );
        return result.token;
      },
    }),
    [household, loading, refresh, refreshUser],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error('useHousehold must be used within HouseholdProvider');
  return value;
}
