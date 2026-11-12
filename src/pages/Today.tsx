import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GAMES, GAME_BY_ID, MAX_DAILY_POINTS, detectAndParse, type Game, type GameId, type GameResult } from '../lib/games';
import { supabase, type ScoreRow } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { prettyDate, today } from '../lib/dates';
import { SCORES_CHANGED, saveScore } from '../lib/scores';

export default function Today() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const date = today();
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [paste, setPaste] = useState('');
  const [manualFor, setManualFor] = useState<GameId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // The game you last tapped "Play" on. When you come back, we check the clipboard for its result.
  const [awaiting, setAwaiting] = useState<GameId | null>(() => {
    try {
      return sessionStorage.getItem('dd.awaiting') as GameId | null;
    } catch {
      return null;
    }
  });
  const location = useLocation();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const { data } = await supabase.from('scores').select('*').eq('user_id', userId).eq('play_date', date);
    setScores(Object.fromEntries((data ?? []).map((r) => [r.game, r])));
  }, [userId, date]);

  useEffect(() => {
    load();
    window.addEventListener(SCORES_CHANGED, load);
    return () => window.removeEventListener(SCORES_CHANGED, load);
  }, [load]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // A message handed over from the /share page (Android share sheet)
  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast;
    if (msg) {
      flash(msg);
      navigate('.', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  const setAwaitingGame = (id: GameId | null) => {
    setAwaiting(id);
    try {
      if (id) sessionStorage.setItem('dd.awaiting', id);
      else sessionStorage.removeItem('dd.awaiting');
    } catch {
      /* ignore */
    }
  };

  const save = async (game: Game, result: GameResult, raw: string | null) => {
    const error = await saveScore(userId, game, result, raw);
    if (error) return flash(`Couldn't save: ${error.message}`);
    flash(`${game.emoji} ${game.name} saved · +${result.points}`);
    setPaste('');
    setManualFor(null);
    if (awaitingRef.current === game.id) setAwaitingGame(null);
  };

  const scoresRef = useRef(scores);
  scoresRef.current = scores;
  const awaitingRef = useRef(awaiting);
  awaitingRef.current = awaiting;

  /** Read the clipboard and save any game result on it. `userTapped` = show feedback if nothing found. */
  const grabClipboard = useCallback(
    async (userTapped: boolean) => {
      let text = '';
      try {
        text = (await navigator.clipboard.readText()).trim();
      } catch {
        if (userTapped) flash('Clipboard blocked. Paste into the box instead.');
        return;
      }
      const found = detectAndParse(text, awaitingRef.current ?? undefined);
      if (!found?.result) {
        if (userTapped) flash(found ? `Couldn't read the ${found.game.name} score` : 'No game result on your clipboard');
        return;
      }
      if (scoresRef.current[found.game.id]?.raw === text) {
        if (userTapped) flash(`${found.game.name} already saved`);
        if (awaitingRef.current === found.game.id) setAwaitingGame(null);
        return;
      }
      await save(found.game, found.result, text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId],
  );

  // Coming back to this tab after playing → try the clipboard automatically.
  // (Works silently on browsers that allow it; on iPhone Safari you'll use the Paste button.)
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState === 'visible' && awaitingRef.current) grabClipboard(false);
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [grabClipboard]);

  const remove = async (game: Game) => {
    await supabase.from('scores').delete().eq('user_id', userId).eq('game', game.id).eq('play_date', date);
    load();
  };

  const detected = useMemo(() => detectAndParse(paste), [paste]);
  const total = Object.values(scores).reduce((s, r) => s + r.points, 0);
  const played = Object.keys(scores).length;

  const copySummary = async () => {
    const lines = GAMES.map((g) => {
      const r = scores[g.id];
      return `${g.emoji} ${g.name}: ${r ? `${g.describe(r)} (${r.points})` : '—'}`;
    });
    const text = `Daily Dose · ${date}\n${lines.join('\n')}\nTotal: ${total}/${MAX_DAILY_POINTS}\n${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      flash('Summary copied');
    } catch {
      flash("Couldn't access clipboard");
    }
  };

  return (
    <div className="stack">
      <section className="hero card">
        <div>
          <div className="muted small">{prettyDate(date)}</div>
          <div className="big-number">
            {total}
            <span className="muted"> / {MAX_DAILY_POINTS}</span>
          </div>
          <div className="muted small">
            {played}/{GAMES.length} games played
          </div>
        </div>
        <div className="progress-ring" style={{ ['--p' as string]: `${(total / MAX_DAILY_POINTS) * 100}%` }}>
          <span>{Math.round((total / MAX_DAILY_POINTS) * 100)}%</span>
        </div>
      </section>

      {awaiting && !scores[awaiting] && (
        <section className="card return-banner" style={{ ['--accent' as string]: GAME_BY_ID[awaiting].color }}>
          <div className="grow">
            <b>
              Back from {GAME_BY_ID[awaiting].emoji} {GAME_BY_ID[awaiting].name}?
            </b>
            <div className="muted small">Tap Share in the game, then tap here.</div>
          </div>
          <button className="primary" onClick={() => grabClipboard(true)}>
            📋 Paste result
          </button>
          <button className="link small" onClick={() => setAwaitingGame(null)} aria-label="Dismiss">
            ✕
          </button>
        </section>
      )}

      <section className="card">
        <div className="row between">
          <h2 className="no-margin">Add a result</h2>
          <button className="small-btn" onClick={() => grabClipboard(true)}>
            📋 Paste from clipboard
          </button>
        </div>
        <p className="muted small">Tap Share in any game, then come back here. We'll work out which game it was.</p>
        <textarea
          rows={4}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={'Wordle 1,607 4/6\n⬛🟨⬛⬛⬛\n🟩🟩🟩🟩🟩'}
        />
        {paste.trim() && (
          <div className="detect">
            {detected?.result ? (
              <>
                <span>
                  {detected.game.emoji} <b>{detected.game.name}</b> · {detected.game.describe(detected.result)} ·{' '}
                  <b>{detected.result.points} pts</b>
                  {scores[detected.game.id] && <span className="muted"> (replaces today's)</span>}
                </span>
                <button className="primary" onClick={() => save(detected.game, detected.result!, paste)}>
                  Save
                </button>
              </>
            ) : detected ? (
              <>
                <span>
                  Looks like {detected.game.emoji} <b>{detected.game.name}</b>, but I couldn't read the score.
                </span>
                <button onClick={() => setManualFor(detected.game.id)}>Enter manually</button>
              </>
            ) : (
              <span className="muted">Not sure which game that is. Use "Enter manually" on a game below.</span>
            )}
          </div>
        )}
      </section>

      <section className="games">
        {GAMES.map((g) => {
          const r = scores[g.id];
          return (
            <article key={g.id} className={`game card ${r ? 'done' : ''}`} style={{ ['--accent' as string]: g.color }}>
              <div className="game-head">
                <span className="game-emoji">{g.emoji}</span>
                <div className="grow">
                  <h3>{g.name}</h3>
                  <div className="muted small">{g.blurb}</div>
                </div>
                {r ? <div className="pts">{r.points}</div> : null}
              </div>
              {r && (
                <div className="result-line">
                  ✓ {g.describe(r)}
                  <button className="link small" onClick={() => remove(g)}>
                    undo
                  </button>
                </div>
              )}
              {manualFor === g.id ? (
                <ManualForm game={g} raw={paste} onCancel={() => setManualFor(null)} onSave={save} />
              ) : (
                <div className="game-actions">
                  <a
                    className="button primary"
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setAwaitingGame(g.id)}
                  >
                    {r ? 'Open' : 'Play'} ↗
                  </a>
                  <button onClick={() => setManualFor(g.id)}>{r ? 'Edit' : 'Enter manually'}</button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="row gap">
        <button onClick={copySummary} disabled={played === 0}>
          📋 Copy my summary
        </button>
        <Link className="button" to="/leaderboard">
          🏆 See leaderboard
        </Link>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ManualForm({
  game,
  raw,
  onCancel,
  onSave,
}: {
  game: Game;
  raw: string;
  onCancel: () => void;
  onSave: (g: Game, r: GameResult, raw: string | null) => void;
}) {
  const m = game.manual;
  const [solved, setSolved] = useState(true);
  const [value, setValue] = useState<number>(m.kind === 'mistakes' ? 0 : m.kind === 'score' ? 0 : 3);

  const submit = () => {
    const isSolved = m.kind === 'score' ? true : m.kind === 'mistakes' ? value < 4 : solved;
    const v = m.kind === 'guesses' && !isSolved ? m.max ?? value : value;
    onSave(game, { solved: isSolved, value: v, points: game.score(isSolved, v) }, raw.trim() || null);
  };

  const preview = (() => {
    const isSolved = m.kind === 'score' ? true : m.kind === 'mistakes' ? value < 4 : solved;
    return game.score(isSolved, value);
  })();

  return (
    <div className="manual">
      {m.kind === 'guesses' && (
        <>
          <label className="check">
            <input type="checkbox" checked={solved} onChange={(e) => setSolved(e.target.checked)} /> Solved it
          </label>
          {solved && (
            <label>
              {m.label}
              <input
                type="number"
                min={1}
                max={m.max ?? 300}
                value={value}
                onChange={(e) => setValue(Math.max(1, Number(e.target.value)))}
              />
            </label>
          )}
        </>
      )}
      {m.kind === 'mistakes' && (
        <label>
          Result
          <select value={value} onChange={(e) => setValue(Number(e.target.value))}>
            <option value={0}>Perfect (0 mistakes)</option>
            <option value={1}>1 mistake</option>
            <option value={2}>2 mistakes</option>
            <option value={3}>3 mistakes</option>
            <option value={4}>Didn't solve</option>
          </select>
        </label>
      )}
      {m.kind === 'score' && (
        <label>
          {m.label}
          <input
            type="number"
            min={0}
            max={m.max}
            value={value}
            onChange={(e) => setValue(Math.max(0, Math.min(m.max, Number(e.target.value))))}
          />
        </label>
      )}
      <div className="row gap">
        <button className="primary" onClick={submit}>
          Save · {preview} pts
        </button>
        <button className="link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

