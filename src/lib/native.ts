// Bridge to the Daily Dose iOS app (ios/ folder). When the site runs inside the
// app's WKWebView, games open in a native in-app browser that captures the
// game's Share text and hands it back here via window.dailyDoseCapture().
import { useEffect } from 'react';
import { GAME_BY_ID, detectAndParse, type Game, type GameId } from './games';
import { saveScore } from './scores';

interface NativeHandler {
  postMessage: (msg: unknown) => void;
}
declare global {
  interface Window {
    webkit?: { messageHandlers?: { dailyDose?: NativeHandler } };
    dailyDoseCapture?: (text: string, gameId?: string) => Promise<CaptureResult>;
  }
}

export interface CaptureResult {
  ok: boolean;
  message: string;
}

const handler = () => window.webkit?.messageHandlers?.dailyDose;

export const isNativeApp = () => Boolean(handler());

/** Ask the iOS app to open a game in its in-app browser. Returns false if not in the app. */
export function openInApp(game: Game): boolean {
  const h = handler();
  if (!h) return false;
  h.postMessage({ type: 'openGame', id: game.id, name: game.name, url: game.url });
  return true;
}

/** Register the capture callback the iOS app calls. Mount once while signed in. */
export function useNativeCapture(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    window.dailyDoseCapture = async (text, gameId) => {
      const hint = gameId && gameId in GAME_BY_ID ? (gameId as GameId) : undefined;
      const found = detectAndParse(text, hint);
      if (!found?.result) {
        return { ok: false, message: "Couldn't read that result. Add it manually on the Today tab." };
      }
      const err = await saveScore(userId, found.game, found.result, text);
      if (err) return { ok: false, message: `Couldn't save: ${err.message}` };
      return {
        ok: true,
        message: `${found.game.emoji} ${found.game.name} · ${found.game.describe(found.result)} · +${found.result.points}`,
      };
    };
    handler()?.postMessage({ type: 'ready' });
    return () => {
      delete window.dailyDoseCapture;
    };
  }, [userId]);
}
