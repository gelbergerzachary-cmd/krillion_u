import Foundation

enum AppConfig {
    /// Where the Daily Dose website lives.
    /// - After deploying to Vercel, put that URL here (e.g. https://daily-dose.vercel.app).
    /// - For local testing, run `npm run dev -- --host` on your Mac and use http://<your-mac-ip>:5173
    static let webAppURL = URL(string: "https://YOUR-APP.vercel.app")!

    /// Makes the in-app browser look like normal mobile Safari, so the games behave normally.
    static let safariUserAgentSuffix = "Version/17.0 Mobile/15E148 Safari/604.1"
}
