# Daily Dose 🎯

One daily scoreboard for **Krillion, Wordle, Connections, Feetle and Globle**, so nobody has to compare screenshots.

Play each game on its own site as usual, hit **Share**, and paste the result into Daily Dose. It works out which game it is, reads the score and puts it on your group's leaderboards (per game and overall, for today, 7 days, 30 days or all time).

- Each game is worth up to **100 pts/day**, so the overall maximum is **500/day**.
- If a share can't be read, every game also has an **Enter manually** option.
- Make groups and send friends an invite link (`/join/<code>`).

## Scoring

| Game | How points work |
|---|---|
| 🦐 Krillion | your score ÷ 7 (700 → 100) |
| 🟩 Wordle | 1→100, 2→90, 3→75, 4→60, 5→45, 6→30, X→0 |
| 🟪 Connections | perfect 100, −20 per mistake; if you fail, 10 per group found |
| ⚽ Feetle | same as Wordle (out of 6) |
| 🌍 Globle | 106 − 6×guesses (minimum 10) |

All of this lives in `src/lib/games.ts` (game links, how shares are read, and points), so it's easy to change.

---

## Setup (about 10 minutes, all free)

### 1. Supabase (database + logins)
1. Create a free project at <https://supabase.com>.
2. In the project, go to **SQL Editor → New query**, paste all of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and click **Run**.
3. Go to **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email". Friends can then sign up instantly, and you avoid Supabase's free-tier limit of a few emails per hour.
4. Go to **Project Settings → API** (or **Connect**) and copy the **Project URL** and the **anon / publishable key**.

### 2. Run it locally (Mac Terminal)
```bash
cd krillion_u
npm install
cp .env.example .env.local
open -e .env.local        # paste in your Supabase URL + key, then save
npm run dev               # then open http://localhost:5173
```

### 3. Deploy on Vercel (free)
1. Go to <https://vercel.com>, choose **Add New → Project** and import this GitHub repo. It detects Vite automatically.
2. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Click **Deploy**. You get a free URL such as `daily-dose.vercel.app`, and you can rename it under **Settings → Domains**.
4. Back in Supabase, go to **Authentication → URL Configuration** and set **Site URL** to your Vercel URL.

Every push to GitHub redeploys automatically.

## Dev
```bash
npm test        # share-text parser tests
npm run build
```
