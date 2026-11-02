import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getProfile, upsertProfile } from './profile';
import type { Profile } from './profile';

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => setProfile(p));
  }, [user]);

  async function save(fields: { display_name: string; avatar_url: string }) {
    if (!user) return;
    const updated = await upsertProfile(user.id, fields);
    setProfile(updated);
  }

  return { profile: user ? profile : null, save };
}
