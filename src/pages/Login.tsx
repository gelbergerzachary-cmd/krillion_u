import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { session } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (mode === 'signup' && !/^[A-Za-z0-9_.]{2,24}$/.test(username)) {
      setError('Username: 2–24 letters, numbers, _ or .');
      return;
    }
    setBusy(true);
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { username }, emailRedirectTo: window.location.origin + from },
          });
    setBusy(false);
    if (error) return setError(error.message);
    if (mode === 'signup' && !data.session) setInfo('Check your email to confirm your account, then sign in.');
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand big">
          <img src="/icon.svg" alt="" width={40} height={40} />
          <span>Daily Dose</span>
        </div>
        <p className="muted">Krillion · Wordle · Connections · Feetle · Globle — one daily scoreboard for the crew.</p>

        <div className="seg">
          <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>
            Sign in
          </button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>
            Create account
          </button>
        </div>

        {mode === 'signup' && (
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="what friends see" required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button className="primary" disabled={busy}>
          {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
