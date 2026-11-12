import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    supabase.rpc('join_group', { p_code: code }).then(({ data, error }) => {
      if (error) return setError(error.message);
      try {
        localStorage.setItem('dd.group', data.id);
      } catch {
        /* ignore */
      }
      navigate('/leaderboard', { replace: true });
    });
  }, [code, navigate]);

  return (
    <div className="card">
      {error ? (
        <>
          <p className="error">{error}</p>
          <Link to="/groups">Go to groups</Link>
        </>
      ) : (
        <p className="muted">Joining group…</p>
      )}
    </div>
  );
}
