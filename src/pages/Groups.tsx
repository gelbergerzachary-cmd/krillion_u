import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { inviteLink, useMyGroups } from '../lib/groups';

export default function Groups() {
  const { session } = useAuth();
  const me = session!.user.id;
  const navigate = useNavigate();
  const { groups, loading, reload } = useMyGroups(me);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const openBoard = (id: string) => {
    try {
      localStorage.setItem('dd.group', id);
    } catch {
      /* ignore */
    }
    navigate('/leaderboard');
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.rpc('create_group', { p_name: name });
    if (error) return setError(error.message);
    setName('');
    reload();
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    // accept either a bare code or a full invite link
    const c = code.trim().split('/').pop() ?? '';
    const { error } = await supabase.rpc('join_group', { p_code: c });
    if (error) return setError(error.message);
    setCode('');
    reload();
  };

  const leave = async (id: string, groupName: string) => {
    if (!confirm(`Leave "${groupName}"?`)) return;
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', me);
    reload();
  };

  const share = async (groupName: string, c: string) => {
    const url = inviteLink(c);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${groupName} on Daily Dose`, url });
        return;
      } catch {
        /* fall back to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(c);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Your groups</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="muted">You're not in any groups yet. Create one below and send your friends the link.</p>
        ) : (
          <ul className="group-list">
            {groups.map((g) => (
              <li key={g.id}>
                <button className="link grow left" onClick={() => openBoard(g.id)}>
                  <b>{g.name}</b>
                  <div className="muted small">code: {g.invite_code}</div>
                </button>
                <button onClick={() => share(g.name, g.invite_code)}>{copied === g.invite_code ? 'Copied!' : 'Invite'}</button>
                <button className="link small" onClick={() => leave(g.id, g.name)}>
                  Leave
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="two-col">
        <form className="card" onSubmit={create}>
          <h2>Create a group</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Group Chat" maxLength={40} required />
          <button className="primary">Create</button>
        </form>
        <form className="card" onSubmit={join}>
          <h2>Join a group</h2>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Invite code or link" required />
          <button>Join</button>
        </form>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
