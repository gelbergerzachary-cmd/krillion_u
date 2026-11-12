import type { Game, GameResult } from './games';
import { supabase } from './supabase';
import { today } from './dates';

export const SCORES_CHANGED = 'dd:scores-changed';

export async function saveScore(userId: string, game: Game, result: GameResult, raw: string | null) {
  const { error } = await supabase.from('scores').upsert(
    {
      user_id: userId,
      game: game.id,
      play_date: today(),
      solved: result.solved,
      value: result.value,
      points: result.points,
      raw: raw?.slice(0, 2000) ?? null,
    },
    { onConflict: 'user_id,game,play_date' },
  );
  if (!error) window.dispatchEvent(new Event(SCORES_CHANGED));
  return error;
}
