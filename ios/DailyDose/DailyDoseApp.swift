import SwiftUI

@main
struct DailyDoseApp: App {
    @StateObject private var bridge = Bridge()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(bridge)
                .preferredColorScheme(.dark)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var bridge: Bridge

    var body: some View {
        ZStack {
            Color(red: 0.08, green: 0.07, blue: 0.12).ignoresSafeArea()
            MainWebView(bridge: bridge).ignoresSafeArea()
        }
        .fullScreenCover(item: $bridge.activeGame) { game in
            GameView(game: game).environmentObject(bridge)
        }
    }
}
