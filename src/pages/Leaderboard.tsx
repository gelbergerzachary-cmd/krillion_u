import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GAMES, GAME_BY_ID, MAX_DAILY_POINTS, type GameId } from '../lib/games';
import { supabase, type ScoreRow } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useMyGroups } from '../lib/groups';
import { PERIOD_LABEL, periodStart, today, type Period } from '../lib/dates';

type Tab = 'overall' | GameId;

interface Member {
  user_id: string;
  username: string;
}

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

export default function Leaderboard() {
  const { session } = useAuth();
  const me = session!.user.id;
  const { groups, loading: groupsLoading } = useMyGroups(me);
  const [groupId, setGroupId] = useState<string | null>(store.get('dd.group'));
  const [period, setPeriod] = useState<Period>((store.get('dd.period') as Period) || 'today');
  const [tab, setTab] = useState<Tab>('overall');
  const [members, setMembers] = useState<Member[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Fall back to the first group if the stored one isn't valid
  const activeGroup = groups.find((g) => g.id === groupId) ?? groups[0];

  useEffect(() => {
    if (!activeGroup) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: mem } = await supabase
        .from('group_members')
        .select('user_id, profiles(username)')
        .eq('group_id', activeGroup.id);
      const list: Member[] = (mem ?? []).map((m) => ({
        user_id: m.user_id,
        username: (m.profiles as unknown as { username: string } | null)?.username ?? '?',
      }));
      let q = supabase
        .from('scores')
        .select('user_id, game, play_date, solved, value, points, raw')
        .in(
          'user_id',
          list.map((m) => m.user_id),
        )
        .lte('play_date', today());
      const start = periodStart(period);
      if (start) q = q.gte('play_date', start);
      const { data: sc } = await q;
      if (cancelled) return;
      setMembers(list);
      setScores(sc ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGroup?.id, period]);

  const pickGroup = (id: string) => {
    setGroupId(id);
    store.set('dd.group', id);
  };
  const pickPeriod = (p: Period) => {
    setPeriod(p);
    store.set('dd.period', p);
  };

  if (groupsLoading) return <div className="center muted">Loading…</div>;

  if (!activeGroup)
    return (
      <div className="card empty">
        <h2>No groups yet</h2>
        <p className="muted">Make a group and send your friends the invite link.</p>
        <Link className="button primary" to="/groups">
          Create or join a group
        </Link>
      </div>
    );

  return (
    <div className="stack">
      <div className="toolbar">
        {groups.length > 1 ? (
          <select value={activeGroup.id} onChange={(e) => pickGroup(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : (
          <h2 className="no-margin">{activeGroup.name}</h2>
        )}
        <div className="seg">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <button key={p} className={period === p ? 'on' : ''} onClick={() => pickPeriod(p)}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="chips">
        <button className={tab === 'overall' ? 'chip on' : 'chip'} onClick={() => setTab('overall')}>
          ⭐ Overall
        </button>
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={tab === g.id ? 'chip on' : 'chip'}
            style={{ ['--accent' as string]: g.color }}
            onClick={() => setTab(g.id)}
          >
            {g.emoji} {g.name}
          </button>
        ))}
      </div>

      <div className={`card table-card ${loading ? 'loading' : ''}`}>
        {tab === 'overall' ? (
          period === 'today' ? (
            <TodayOverall members={members} scores={scores} me={me} />
          ) : (
            <PeriodOverall members={members} scores={scores} me={me} />
          )
        ) : (
          <GameBoard game={tab} period={period} members={members} scores={scores} me={me} />
        )}
      </div>
    </div>
  );
}

const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

/** Today: one row per person with every game's result inline. */
function TodayOverall({ members, scores, me }: { members: Member[]; scores: ScoreRow[]; me: string }) {
  const rows = members
    .map((m) => {
      const mine = scores.filter((s) => s.user_id === m.user_id);
      const byGame = Object.fromEntries(mine.map((s) => [s.game, s]));
      return { ...m, byGame, total: mine.reduce((a, s) => a + s.points, 0), played: mine.length };
    })
    .sort((a, b) => b.total - a.total || b.played - a.played);

  return (
    <table className="board">
      <thead>
        <tr>
          <th>#</th>
          <th className="left">Player</th>
          {GAMES.map((g) => (
            <th key={g.id} title={g.name}>
              {g.emoji}
            </th>
          ))}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.user_id} className={r.user_id === me ? 'mine' : ''}>
            <td>{r.played ? medal(i) : '—'}</td>
            <td className="left">{r.username}</td>
            {GAMES.map((g) => {
              const s = r.byGame[g.id];
              return (
                <td key={g.id} className="cell" title={s ? `${g.describe(s)} · ${s.points} pts` : 'Not played'}>
                  {s ? <span className={s.solved ? '' : 'fail'}>{s.points}</span> : <span className="muted">·</span>}
                </td>
              );
            })}
            <td>
              <b>{r.total}</b>
              <span className="muted small">/{MAX_DAILY_POINTS}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Multi-day: total points, days played, average per day, and daily wins. */
function PeriodOverall({ members, scores, me }: { members: Member[]; scores: ScoreRow[]; me: string }) {
  const rows = useMemo(() => {
    // daily totals per user
    const daily = new Map<string, Map<string, number>>(); // date -> user -> pts
    for (const s of scores) {
      if (!daily.has(s.play_date)) daily.set(s.play_date, new Map());
      const d = daily.get(s.play_date)!;
      d.set(s.user_id, (d.get(s.user_id) ?? 0) + s.points);
    }
    const wins = new Map<string, number>();
    for (const d of daily.values()) {
      const best = Math.max(...d.values());
      for (const [u, p] of d) if (p === best) wins.set(u, (wins.get(u) ?? 0) + 1);
    }
    return members
      .map((m) => {
        let total = 0;
        let days = 0;
        for (const d of daily.values()) {
          const p = d.get(m.user_id);
          if (p !== undefined) {
            total += p;
            days++;
          }
        }
        return { ...m, total, days, avg: days ? Math.round(total / days) : 0, wins: wins.get(m.user_id) ?? 0 };
      })
      .sort((a, b) => b.total - a.total);
  }, [members, scores]);

  return (
    <table className="board">
      <thead>
        <tr>
          <th>#</th>
          <th className="left">Player</th>
          <th>Total</th>
          <th>Days</th>
          <th>Avg/day</th>
          <th title="Days with the top score">👑</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.user_id} className={r.user_id === me ? 'mine' : ''}>
            <td>{r.days ? medal(i) : '—'}</td>
            <td className="left">{r.username}</td>
            <td>
              <b>{r.total}</b>
            </td>
            <td>{r.days}</td>
            <td>{r.avg}</td>
            <td>{r.wins}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GameBoard({
  game,
  period,
  members,
  scores,
  me,
}: {
  game: GameId;
  period: Period;
  members: Member[];
  scores: ScoreRow[];
  me: string;
}) {
  const g = GAME_BY_ID[game];
  const rows = members
    .map((m) => {
      const mine = scores.filter((s) => s.user_id === m.user_id && s.game === game);
      const total = mine.reduce((a, s) => a + s.points, 0);
      const best = [...mine].sort((a, b) => b.points - a.points)[0];
      const solveRate = mine.length ? Math.round((mine.filter((s) => s.solved).length / mine.length) * 100) : 0;
      return { ...m, played: mine.length, total, avg: mine.length ? Math.round(total / mine.length) : 0, best, solveRate };
    })
    .sort((a, b) => (period === 'today' ? b.total - a.total : b.total - a.total || b.avg - a.avg));

  if (period === 'today')
    return (
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th className="left">Player</th>
            <th>Result</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.user_id} className={r.user_id === me ? 'mine' : ''}>
              <td>{r.played ? medal(i) : '—'}</td>
              <td className="left">{r.username}</td>
              <td className={r.best && !r.best.solved ? 'fail' : ''}>
                {r.best ? g.describe(r.best) : <span className="muted">not yet</span>}
              </td>
              <td>
                <b>{r.played ? r.total : ''}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );

  return (
    <table className="board">
      <thead>
        <tr>
          <th>#</th>
          <th className="left">Player</th>
          <th>Total</th>
          <th>Played</th>
          <th>Avg</th>
          <th>Solved</th>
          <th>Best</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.user_id} className={r.user_id === me ? 'mine' : ''}>
            <td>{r.played ? medal(i) : '—'}</td>
            <td className="left">{r.username}</td>
            <td>
              <b>{r.total}</b>
            </td>
            <td>{r.played}</td>
            <td>{r.avg}</td>
            <td>{r.played ? `${r.solveRate}%` : ''}</td>
            <td className="small">{r.best ? g.describe(r.best) : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
