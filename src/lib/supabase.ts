import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
});

export interface Profile {
  id: string;
  username: string;
}
export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
}
export interface ScoreRow {
  user_id: string;
  game: string;
  play_date: string;
  solved: boolean;
  value: number | null;
  points: number;
  raw: string | null;
}
