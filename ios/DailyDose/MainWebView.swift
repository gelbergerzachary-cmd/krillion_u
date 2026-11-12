import SwiftUI
import WebKit

/// Shows the Daily Dose website. The site asks us to open games via
/// window.webkit.messageHandlers.dailyDose.postMessage({type: "openGame", ...}).
struct MainWebView: UIViewRepresentable {
    let bridge: Bridge

    func makeCoordinator() -> Coordinator { Coordinator(bridge: bridge) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration.dailyDose()
        config.userContentController.add(WeakScriptHandler(context.coordinator), name: "dailyDose")

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.allowsBackForwardNavigationGestures = true
        if #available(iOS 16.4, *) { web.isInspectable = true } // debug with Safari → Develop menu

        let refresh = UIRefreshControl()
        refresh.addTarget(context.coordinator, action: #selector(Coordinator.reload(_:)), for: .valueChanged)
        web.scrollView.refreshControl = refresh

        bridge.mainWebView = web
        web.load(URLRequest(url: AppConfig.webAppURL))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let bridge: Bridge
        init(bridge: Bridge) { self.bridge = bridge }

        @objc func reload(_ sender: UIRefreshControl) {
            bridge.mainWebView?.reload()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { sender.endRefreshing() }
        }

        func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
            switch type {
            case "openGame":
                guard let id = body["id"] as? String,
                      let name = body["name"] as? String,
                      let urlString = body["url"] as? String,
                      let url = URL(string: urlString) else { return }
                Task { @MainActor in self.bridge.activeGame = GameLink(id: id, name: name, url: url) }
            default:
                break
            }
        }

        /// Keep Daily Dose in this view; send any other site to Safari.
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if action.navigationType == .linkActivated,
               let url = action.request.url,
               url.host != AppConfig.webAppURL.host {
                UIApplication.shared.open(url)
                return decisionHandler(.cancel)
            }
            decisionHandler(.allow)
        }
    }
}
