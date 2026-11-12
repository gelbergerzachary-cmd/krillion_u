// Target of the PWA share sheet (Android/Chrome): a game shares its result to
// "Daily Dose", the browser opens /share?text=…, and we save it straight away.
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { detectAndParse } from '../lib/games';
import { saveScore } from '../lib/scores';
import { useAuth } from '../lib/auth';

export default function Share() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !session) return;
    done.current = true;
    const text = ['title', 'text', 'url']
      .map((k) => params.get(k))
      .filter(Boolean)
      .join('\n')
      .trim();
    const found = detectAndParse(text);
    (async () => {
      let toast: string;
      if (!found?.result) toast = "Couldn't read that result. Add it manually below.";
      else {
        const err = await saveScore(session.user.id, found.game, found.result, text);
        toast = err
          ? `Couldn't save: ${err.message}`
          : `${found.game.emoji} ${found.game.name} saved · +${found.result.points}`;
      }
      navigate('/', { replace: true, state: { toast } });
    })();
  }, [params, session, navigate]);

  return <div className="center muted">Saving your result…</div>;
}
