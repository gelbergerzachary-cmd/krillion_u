import SwiftUI
import WebKit

/// Full-screen in-app browser for one game, with the capture script injected.
struct GameView: View {
    let game: GameLink
    @EnvironmentObject var bridge: Bridge
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            GameWebView(game: game, bridge: bridge)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle(game.name)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done") { dismiss() }
                    }
                }
                .overlay(alignment: .bottom) {
                    if let banner = bridge.banner {
                        BannerView(banner: banner)
                            .padding(.bottom, 40)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .animation(.spring(response: 0.3, dampingFraction: 0.85), value: bridge.banner)
        }
    }
}

struct BannerView: View {
    let banner: Banner
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: banner.ok ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
                .foregroundStyle(banner.ok ? .green : .orange)
            Text(banner.text).font(.subheadline.weight(.semibold))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThickMaterial, in: Capsule())
        .shadow(radius: 12)
        .padding(.horizontal, 16)
    }
}

struct GameWebView: UIViewRepresentable {
    let game: GameLink
    let bridge: Bridge

    func makeCoordinator() -> Coordinator { Coordinator(game: game, bridge: bridge) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration.dailyDose()
        let script = WKUserScript(source: CaptureScript.source,
                                  injectionTime: .atDocumentStart,
                                  forMainFrameOnly: false)
        config.userContentController.addUserScript(script)
        config.userContentController.add(WeakScriptHandler(context.coordinator), name: "ddCapture")

        let web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = context.coordinator
        web.allowsBackForwardNavigationGestures = true
        if #available(iOS 16.4, *) { web.isInspectable = true }
        web.load(URLRequest(url: game.url))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler, WKUIDelegate {
        let game: GameLink
        let bridge: Bridge
        init(game: GameLink, bridge: Bridge) { self.game = game; self.bridge = bridge }

        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], let text = body["text"] as? String else { return }
            let gameId = game.id
            Task { @MainActor in self.bridge.captured(text: text, gameId: gameId) }
        }

        /// Pop-up links (target=_blank) open in the same view instead of doing nothing.
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if action.targetFrame == nil { webView.load(action.request) }
            return nil
        }
    }
}
