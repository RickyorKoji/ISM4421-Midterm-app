import { supabase } from './supabaseClient';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId: string, fields: { display_name: string; avatar_url: string }): Promise<Profile> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: fields.display_name, avatar_url: fields.avatar_url, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
