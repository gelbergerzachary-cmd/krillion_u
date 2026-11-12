# Daily Dose 🎯

One daily scoreboard for **Krillion, Wordle, Connections, Feetle and Globle**, so nobody has to compare screenshots.

Play each game on its own site as usual, hit **Share**, and paste the result into Daily Dose. It works out which game it is, reads the score and puts it on your group's leaderboards (per game and overall, for today, 7 days, 30 days or all time).

- Each game is worth up to **100 pts/day**, so the overall maximum is **500/day**.
- In the **phone app** your score saves itself when you tap Share in the game. On the website you tap **Paste result**, and every game also has **Enter manually**.
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

## 📱 The phone app (iPhone + Android): scores save themselves

`mobile/` is an Expo (React Native) app for **iPhone and Android/Samsung**. It shows the Daily Dose site, and when you tap **Play** it opens the game in an in-app browser with a small script injected. Tap the game's **Share** button and the result is caught, saved to the leaderboard, and copied so you can still post it in the group chat.

### Try it right now on your own phone (free, ~2 min)
1. Install **Expo Go** from the App Store / Play Store.
2. On your Mac:
   ```bash
   cd krillion_u/mobile
   npm install
   open -e src/config.ts      # set WEB_APP_URL to your Vercel URL
   npx expo start
   ```
3. Scan the QR code with your phone's camera (iPhone) or the Expo Go app (Android).

### Send it to friends
You need a free Expo account (`npx eas-cli@latest login`), then from `mobile/`:

**Samsung / Android: free, no Play Store**
```bash
npx eas-cli@latest build -p android --profile preview
```
EAS builds it in the cloud and gives you a download link for an `.apk`. Send that link to your Android friends. They open it and allow "Install unknown apps" when asked.

**iPhone: TestFlight (needs the Apple Developer Program, $99/yr)**
1. Change `bundleIdentifier` in `mobile/app.json` to something unique (e.g. `com.yourname.dailydose`), and do the same for Android's `package`.
2. Build and upload. EAS walks you through signing in to Apple:
   ```bash
   npx eas-cli@latest build -p ios --profile production --auto-submit
   ```
3. In **App Store Connect → your app → TestFlight**, add friends as testers (or turn on a **public link**). External testers need a quick Apple beta review the first time, usually within a day. Friends install the **TestFlight** app and tap your link.

After that, **website changes reach the app instantly** (it loads your Vercel site), so you only need to rebuild the app when something in `mobile/` changes.

### Without the app
Anyone can still use the website. Tap **Play**, hit Share in the game, come back, and tap **📋 Paste result**. You can also add it to your Home Screen (Safari: Share → Add to Home Screen; Chrome: ⋮ → Install app).

## Dev
```bash
npm test        # share-text parser tests
npm run build
```
