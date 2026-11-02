import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  function signOut() {
    return supabase.auth.signOut();
  }

  return { user, loading, signInWithGoogle, signOut };
}
