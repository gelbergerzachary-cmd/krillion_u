// ─────────────────────────────────────────────────────────────────────────────
// Game definitions. To add / tweak a game, edit this file only.
//
// Every game turns a result into 0–100 points so the "Overall" leaderboard is
// fair across games (max 100 per game per day).
// ─────────────────────────────────────────────────────────────────────────────

export type GameId = 'krillion' | 'wordle' | 'connections' | 'feetle' | 'globle';

export interface GameResult {
  solved: boolean;
  /** guesses for guess games, mistakes for Connections, raw score for points games */
  value: number;
  points: number;
}

/** How the manual-entry form should look for this game. */
export type ManualInput =
  | { kind: 'guesses'; max: number | null; label: string }
  | { kind: 'mistakes'; max: number }
  | { kind: 'score'; max: number; label: string };

export interface Game {
  id: GameId;
  name: string;
  emoji: string;
  url: string;
  color: string;
  blurb: string;
  manual: ManualInput;
  /** Return true if pasted text looks like this game's share text. */
  detect: (text: string) => boolean;
  /** Pull a result out of pasted share text, or null if it can't. */
  parse: (text: string) => GameResult | null;
  /** Points from a manual entry. */
  score: (solved: boolean, value: number) => number;
  /** Short human summary, e.g. "4/6" */
  describe: (r: { solved: boolean; value: number | null }) => string;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

// Wordle-style: fewer guesses = more points. 1→100, 2→90, 3→75, 4→60, 5→45, 6→30, fail→0
const wordleStylePoints = (solved: boolean, guesses: number, max = 6) => {
  if (!solved) return 0;
  const table = [100, 90, 75, 60, 45, 30];
  if (max === 6) return table[Math.max(1, Math.min(6, guesses)) - 1];
  return clamp(100 - ((guesses - 1) / Math.max(1, max - 1)) * 70);
};

/** Find "N/6" or "X/6" style results. */
const parseFraction = (text: string, max: number): GameResult | null => {
  const m = text.match(new RegExp(`\\b([1-9]|X)\\s*/\\s*${max}\\b`, 'i'));
  if (!m) return null;
  const solved = m[1].toUpperCase() !== 'X';
  const value = solved ? Number(m[1]) : max;
  return { solved, value, points: wordleStylePoints(solved, value, max) };
};

const SQUARE = /[🟨🟩🟦🟪]/gu;

export const GAMES: Game[] = [
  {
    id: 'krillion',
    name: 'Krillion',
    emoji: '🦐',
    url: 'https://krillion.io',
    color: '#ff7a59',
    blurb: '7 prompts, rarer answers score more (max 700)',
    manual: { kind: 'score', max: 700, label: 'Points (0–700)' },
    detect: (t) => /krillion|krill|🦐/i.test(t),
    parse: (t) => {
      // Accept "540/700", "540 pts", "540 points" or "5,400m" / "5400 meters" (dive depth = points × 10)
      const frac = t.match(/(\d{1,3})\s*\/\s*700/);
      if (frac) return krillionResult(Number(frac[1]));
      const pts = t.match(/(\d{1,3})\s*(?:pts|points)\b/i);
      if (pts) return krillionResult(Number(pts[1]));
      const depth = t.match(/(\d{1,2},?\d{3}|\d{1,3})\s*(?:m|meters|metres)\b/i);
      if (depth) return krillionResult(Math.round(Number(depth[1].replace(',', '')) / 10));
      return null;
    },
    score: (_s, v) => clamp((v / 700) * 100),
    describe: (r) => `${r.value ?? 0} pts`,
  },
  {
    id: 'wordle',
    name: 'Wordle',
    emoji: '🟩',
    url: 'https://www.nytimes.com/games/wordle/index.html?eafs_enabled=false',
    color: '#6aaa64',
    blurb: 'Guess the 5-letter word in 6',
    manual: { kind: 'guesses', max: 6, label: 'Guesses' },
    detect: (t) => /\bwordle\b/i.test(t),
    parse: (t) => parseFraction(t, 6),
    score: (s, v) => wordleStylePoints(s, v),
    describe: (r) => (r.solved ? `${r.value}/6` : 'X/6'),
  },
  {
    id: 'connections',
    name: 'Connections',
    emoji: '🟪',
    url: 'https://www.nytimes.com/games/connections?eafs_enabled=false',
    color: '#b07ee8',
    blurb: 'Four groups of four',
    manual: { kind: 'mistakes', max: 4 },
    detect: (t) => /connections/i.test(t),
    parse: (t) => {
      // Each guess is a row of 4 coloured squares. A one-colour row = a group found.
      const rows = t
        .split('\n')
        .map((l) => l.match(SQUARE))
        .filter((m): m is RegExpMatchArray => !!m && m.length === 4);
      if (rows.length === 0) return null;
      const found = rows.filter((r) => r.every((c) => c === r[0])).length;
      const mistakes = rows.length - found;
      const solved = found === 4;
      return { solved, value: Math.min(mistakes, 4), points: connectionsPoints(solved, mistakes, found) };
    },
    score: (s, v) => connectionsPoints(s, v, s ? 4 : 0),
    describe: (r) =>
      r.solved ? (r.value === 0 ? 'Perfect' : `${r.value} mistake${r.value === 1 ? '' : 's'}`) : 'Failed',
  },
  {
    id: 'feetle',
    name: 'Feetle',
    emoji: '⚽',
    url: 'https://feetle.fun',
    color: '#3fb6a8',
    blurb: 'Daily guessing game',
    manual: { kind: 'guesses', max: 6, label: 'Guesses' },
    detect: (t) => /feetle/i.test(t),
    parse: (t) => parseFraction(t, 6),
    score: (s, v) => wordleStylePoints(s, v),
    describe: (r) => (r.solved ? `${r.value}/6` : 'X/6'),
  },
  {
    id: 'globle',
    name: 'Globle',
    emoji: '🌍',
    url: 'https://globle-game.com',
    color: '#5a8dee',
    blurb: 'Find the mystery country',
    manual: { kind: 'guesses', max: null, label: 'Guesses' },
    detect: (t) => /globle|🌎|🌍|🌏/i.test(t),
    parse: (t) => {
      // Globle shares look like "🟧🟨🟩 = 4" — the number after "=" is the guess count
      const m = t.match(/=\s*(\d{1,3})\b/) ?? t.match(/(\d{1,3})\s*guess/i);
      if (!m) return null;
      const value = Number(m[1]);
      return { solved: true, value, points: globlePoints(value) };
    },
    score: (s, v) => (s ? globlePoints(v) : 0),
    describe: (r) => (r.solved ? `${r.value} guess${r.value === 1 ? '' : 'es'}` : 'Gave up'),
  },
];

function krillionResult(points: number): GameResult {
  const v = Math.max(0, Math.min(700, points));
  return { solved: true, value: v, points: clamp((v / 700) * 100) };
}

// Perfect=100, then -20 per mistake. Failing still gives 10 per group found.
function connectionsPoints(solved: boolean, mistakes: number, found: number) {
  if (solved) return clamp(100 - mistakes * 20);
  return clamp(found * 10);
}

// 1 guess=100, -6 per extra guess, floor of 10 for finishing at all.
function globlePoints(guesses: number) {
  return clamp(106 - guesses * 6, 10);
}

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, Game>;

/** Figure out which game a pasted share is from, and parse it. */
export function detectAndParse(
  text: string,
  hint?: GameId,
): { game: Game; result: GameResult } | { game: Game; result: null } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // When the iOS app captured the text inside a specific game, trust that first.
  if (hint && GAME_BY_ID[hint]) {
    const r = GAME_BY_ID[hint].parse(trimmed);
    if (r) return { game: GAME_BY_ID[hint], result: r };
  }
  // NYT games first, since their names are explicit and other shares may include globe emoji etc.
  const order: GameId[] = ['wordle', 'connections', 'krillion', 'feetle', 'globle'];
  for (const id of order) {
    const game = GAME_BY_ID[id];
    if (game.detect(trimmed)) return { game, result: game.parse(trimmed) };
  }
  return null;
}

export const MAX_DAILY_POINTS = GAMES.length * 100;
