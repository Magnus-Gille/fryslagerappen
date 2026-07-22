import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { supabase } from '@/lib/supabase';

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
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const latestRefresh = useRef(0);

  const refresh = useCallback(async () => {
    const refreshNumber = ++latestRefresh.current;
    if (!supabase || !user) {
      setHousehold(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('role, display_name, households!inner(id, name)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (refreshNumber !== latestRefresh.current) return;
      const joined = data?.households as unknown as { id: string; name: string } | undefined;
      setHousehold(
        joined
          ? { id: joined.id, name: joined.name, role: data!.role, displayName: data!.display_name }
          : null,
      );
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
        if (!supabase) throw new Error('Supabase är inte konfigurerat.');
        const { error } = await supabase.rpc('bootstrap_household', {
          household_name: householdName,
          member_name: displayName,
        });
        if (error) throw error;
        await refresh();
      },
      joinHousehold: async (inviteToken, displayName) => {
        if (!supabase) throw new Error('Supabase är inte konfigurerat.');
        const { error } = await supabase.rpc('accept_household_invite', {
          invite_token: inviteToken.trim(),
          member_name: displayName,
        });
        if (error) throw error;
        await refresh();
      },
      createInvite: async () => {
        if (!supabase || !household) throw new Error('Inget hushåll är valt.');
        const { data, error } = await supabase.rpc('create_household_invite', {
          target_household_id: household.id,
        });
        if (error) throw error;
        return String(data);
      },
    }),
    [household, loading, refresh],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error('useHousehold must be used within HouseholdProvider');
  return value;
}
