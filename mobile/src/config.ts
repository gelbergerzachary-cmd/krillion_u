// Where the Daily Dose website lives. The app shows this site and adds the
// in-app game browser on top.
//  • After deploying to Vercel, put that URL here (e.g. https://daily-dose.vercel.app)
//  • For testing against your Mac: run `npm run dev -- --host` in the main folder
//    and use http://<your-mac-ip>:5173  (find it with: ipconfig getifaddr en0)
export const WEB_APP_URL = 'https://YOUR-APP.vercel.app';

// Makes the in-app browser look like normal mobile Safari/Chrome so games behave normally.
export const USER_AGENT_SUFFIX = 'Version/17.0 Mobile/15E148 Safari/604.1';

export const COLORS = {
  bg: '#14121f',
  panel: '#1e1b2e',
  border: '#353049',
  text: '#f2f0fa',
  muted: '#9b95b5',
  ok: '#6aaa64',
  bad: '#e5a05a',
};
