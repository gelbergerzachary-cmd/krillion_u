import { useCallback, useEffect, useState } from 'react';
import { supabase, type Group } from './supabase';

export function useMyGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('group_members')
      .select('groups(id, name, invite_code, created_by)')
      .eq('user_id', userId);
    const list = (data ?? []).map((r) => r.groups as unknown as Group).filter(Boolean);
    list.sort((a, b) => a.name.localeCompare(b.name));
    setGroups(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { groups, loading, reload };
}

export const inviteLink = (code: string) => `${window.location.origin}/join/${code}`;
