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

## 📱 iPhone app (automatic score capture)

The `ios/` folder holds a small SwiftUI app that shows the Daily Dose site and opens each game in an in-app browser (WKWebView). It injects a script into the game that catches the text when you tap the game's **Share** button. Your score is saved automatically and the text is still copied, so you can drop it in the group chat.

**Build it on your Mac** (needs Xcode from the App Store):
```bash
brew install xcodegen          # one time (needs Homebrew: https://brew.sh)
cd krillion_u/ios
open -e DailyDose/AppConfig.swift   # set webAppURL to your Vercel URL
xcodegen                       # creates DailyDose.xcodeproj
open DailyDose.xcodeproj
```
In Xcode, select the **DailyDose** target, open **Signing & Capabilities**, pick your Apple ID as the Team and change the Bundle Identifier to something unique. Plug in your iPhone, select it at the top, and press ▶. The first time, approve the developer on the phone under **Settings → General → VPN & Device Management**.

**Getting it onto friends' phones:**
- With a **free Apple ID**, the app only installs on phones plugged into your Mac, and it stops opening after 7 days until you press ▶ again.
- With the **paid Apple Developer Program ($99/yr)**, you can send it through **TestFlight** to up to 100 friends with a link.
- Friends on Android, or anyone without the app, can use the website and paste their results. Everyone shares the same leaderboard.

**Testing against your Mac instead of Vercel:** run `npm run dev -- --host`, then set `webAppURL` to `http://<your-mac-ip>:5173`. Find the IP with `ipconfig getifaddr en0`.

**Debugging:** on the Mac, turn on Safari → Settings → Advanced → "Show features for web developers". Then the **Develop** menu lets you inspect both the Daily Dose page and the game pages running on the phone.

## Dev
```bash
npm test        # share-text parser tests
npm run build
```
