import SwiftUI
import WebKit

struct GameLink: Identifiable, Equatable {
    let id: String   // matches the game ids in src/lib/games.ts
    let name: String
    let url: URL
}

struct Banner: Equatable {
    let ok: Bool
    let text: String
}

/// Connects the Daily Dose site (main web view) with the in-app game browser.
@MainActor
final class Bridge: ObservableObject {
    @Published var activeGame: GameLink?
    @Published var banner: Banner?

    weak var mainWebView: WKWebView?

    private var lastCaptured = ""
    private var lastCapturedAt = Date.distantPast

    /// Called when the injected script sees a game's Share / Copy text.
    func captured(text: String, gameId: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        // Games often both copy *and* share the same text; only handle it once.
        if trimmed == lastCaptured, Date().timeIntervalSince(lastCapturedAt) < 5 { return }
        lastCaptured = trimmed
        lastCapturedAt = Date()

        // Keep it on the clipboard too, so it can still be pasted into the group chat.
        UIPasteboard.general.string = trimmed
        deliver(trimmed, gameId: gameId)
    }

    private func deliver(_ text: String, gameId: String) {
        guard let web = mainWebView else {
            show(Banner(ok: false, text: "Result copied. Open Daily Dose and paste it on Today."))
            return
        }
        web.callAsyncJavaScript(
            "if (!window.dailyDoseCapture) return null; return await window.dailyDoseCapture(text, gameId);",
            arguments: ["text": text, "gameId": gameId],
            in: nil,
            in: .page
        ) { [weak self] result in
            Task { @MainActor in
                guard let self else { return }
                switch result {
                case .success(let value):
                    if let dict = value as? [String: Any],
                       let ok = dict["ok"] as? Bool,
                       let message = dict["message"] as? String {
                        self.show(Banner(ok: ok, text: message))
                        if ok {
                            UINotificationFeedbackGenerator().notificationOccurred(.success)
                            // Hop back to the scoreboard after a moment.
                            try? await Task.sleep(nanoseconds: 1_800_000_000)
                            if self.activeGame?.id == gameId { self.activeGame = nil }
                        }
                    } else {
                        self.show(Banner(ok: false, text: "Sign in to Daily Dose first. Your result is copied."))
                    }
                case .failure:
                    self.show(Banner(ok: false, text: "Couldn't save automatically. Your result is copied, so paste it on Today."))
                }
            }
        }
    }

    func show(_ banner: Banner) {
        self.banner = banner
        let shown = banner
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 3_500_000_000)
            if self.banner == shown { self.banner = nil }
        }
    }
}

/// WKUserContentController keeps a strong reference to handlers; this avoids a retain cycle.
final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(c, didReceive: message)
    }
}

extension WKWebViewConfiguration {
    /// Shared setup: persistent cookies (stay signed in to NYT etc.), inline media, Safari UA.
    static func dailyDose() -> WKWebViewConfiguration {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.applicationNameForUserAgent = AppConfig.safariUserAgentSuffix
        return config
    }
}
