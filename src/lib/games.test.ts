import { describe, it, expect } from 'vitest';
import { detectAndParse } from './games';

describe('share text parsing', () => {
  it('wordle solved', () => {
    const r = detectAndParse('Wordle 1,607 4/6\n\n⬛🟨⬛⬛⬛\n🟩🟩🟩🟩🟩');
    expect(r?.game.id).toBe('wordle');
    expect(r?.result).toMatchObject({ solved: true, value: 4, points: 60 });
  });
  it('wordle failed', () => {
    const r = detectAndParse('Wordle 1,607 X/6*');
    expect(r?.result).toMatchObject({ solved: false, points: 0 });
  });
  it('connections with one mistake', () => {
    const r = detectAndParse('Connections\nPuzzle #530\n🟨🟨🟨🟨\n🟩🟦🟩🟩\n🟩🟩🟩🟩\n🟦🟦🟦🟦\n🟪🟪🟪🟪');
    expect(r?.game.id).toBe('connections');
    expect(r?.result).toMatchObject({ solved: true, value: 1, points: 80 });
  });
  it('connections failed', () => {
    const r = detectAndParse('Connections\nPuzzle #530\n🟨🟨🟨🟨\n🟩🟦🟩🟩\n🟩🟦🟩🟩\n🟩🟪🟩🟩\n🟩🟦🟪🟩');
    expect(r?.result).toMatchObject({ solved: false, value: 4, points: 10 });
  });
  it('globle', () => {
    const r = detectAndParse('🌎 Nov 12, 2026 🌍\n🔥 3 | Avg. Guesses: 6.1\n🟧🟨🟩 = 4\n\nhttps://globle-game.com\n#globle');
    expect(r?.game.id).toBe('globle');
    expect(r?.result).toMatchObject({ solved: true, value: 4, points: 82 });
  });
  it('krillion depth', () => {
    const r = detectAndParse('Krillion 🦐 dove 4,200m');
    expect(r?.game.id).toBe('krillion');
    expect(r?.result).toMatchObject({ value: 420, points: 60 });
  });
  it('unknown text', () => {
    expect(detectAndParse('hello')).toBeNull();
  });
});
