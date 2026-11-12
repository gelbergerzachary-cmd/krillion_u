import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GAMES, MAX_DAILY_POINTS, detectAndParse, type Game, type GameId, type GameResult } from '../lib/games';
import { supabase, type ScoreRow } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { prettyDate, today } from '../lib/dates';

export default function Today() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const date = today();
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [paste, setPaste] = useState('');
  const [manualFor, setManualFor] = useState<GameId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('scores').select('*').eq('user_id', userId).eq('play_date', date);
    setScores(Object.fromEntries((data ?? []).map((r) => [r.game, r])));
  }, [userId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const save = async (game: Game, result: GameResult, raw: string | null) => {
    const { error } = await supabase.from('scores').upsert(
      {
        user_id: userId,
        game: game.id,
        play_date: date,
        solved: result.solved,
        value: result.value,
        points: result.points,
        raw: raw?.slice(0, 2000) ?? null,
      },
      { onConflict: 'user_id,game,play_date' },
    );
    if (error) return flash(`Couldn't save: ${error.message}`);
    flash(`${game.emoji} ${game.name} saved · +${result.points}`);
    setPaste('');
    setManualFor(null);
    load();
  };

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

      <section className="card">
        <h2>Paste a result</h2>
        <p className="muted small">Hit "Share" in any game, then paste here. We'll work out which game it is.</p>
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
                  <a className="button primary" href={g.url} target="_blank" rel="noreferrer">
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

