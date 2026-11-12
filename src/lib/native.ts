// Bridge to the Daily Dose phone app (mobile/ folder, iPhone + Android).
// Inside the app, this site runs in a WebView. Tapping Play asks the app to open
// the game in an in-app browser. The app injects a script there that catches the
// game's Share text and hands it back here via window.dailyDoseCapture().
import { useEffect } from 'react';
import { GAME_BY_ID, detectAndParse, type Game, type GameId } from './games';
import { saveScore } from './scores';

export interface CaptureResult {
  ok: boolean;
  message: string;
}

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    dailyDoseCapture?: (text: string, gameId?: string) => Promise<CaptureResult>;
  }
}

const post = (msg: object) => window.ReactNativeWebView?.postMessage(JSON.stringify(msg));

export const isNativeApp = () => Boolean(window.ReactNativeWebView);

/** Ask the app to open a game in its in-app browser. Returns false on the plain website. */
export function openInApp(game: Game): boolean {
  if (!isNativeApp()) return false;
  post({ type: 'openGame', id: game.id, name: game.name, url: game.url, color: game.color });
  return true;
}

/** Lets the app hand us captured share text. Mount once while signed in. */
export function useNativeCapture(userId: string | undefined) {
  useEffect(() => {
    if (!userId || !isNativeApp()) return;
    window.dailyDoseCapture = async (text, gameId) => {
      const hint = gameId && gameId in GAME_BY_ID ? (gameId as GameId) : undefined;
      const found = detectAndParse(text, hint);
      let result: CaptureResult;
      if (!found?.result) {
        result = { ok: false, message: "Couldn't read that result. It's copied, so paste it on Today." };
      } else {
        const err = await saveScore(userId, found.game, found.result, text.trim());
        result = err
          ? { ok: false, message: `Couldn't save: ${err.message}` }
          : {
              ok: true,
              message: `${found.game.emoji} ${found.game.name} · ${found.game.describe(found.result)} · +${found.result.points}`,
            };
      }
      post({ type: 'captureResult', gameId, ...result });
      return result;
    };
    post({ type: 'ready' });
    return () => {
      delete window.dailyDoseCapture;
    };
  }, [userId]);
}
