import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { CAPTURE_SCRIPT } from './src/captureScript';
import { COLORS, USER_AGENT_SUFFIX, WEB_APP_URL } from './src/config';

interface GameLink {
  id: string;
  name: string;
  url: string;
  color?: string;
}
interface Banner {
  ok: boolean;
  text: string;
}

const webOrigin = (() => {
  const m = WEB_APP_URL.match(/^https?:\/\/[^/]+/);
  return m ? m[0] : WEB_APP_URL;
})();

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainRef = useRef<WebView<any>>(null);
  const [game, setGame] = useState<GameLink | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const last = useRef({ text: '', at: 0 });
  const pendingReply = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((b: Banner) => {
    setBanner(b);
    setTimeout(() => setBanner((cur) => (cur === b ? null : cur)), 3500);
  }, []);

  // ── Messages from the Daily Dose site ──────────────────────────────────────
  const onMainMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'openGame' && msg.url) {
        setGame({ id: msg.id, name: msg.name, url: msg.url, color: msg.color });
      } else if (msg.type === 'captureResult') {
        if (pendingReply.current) clearTimeout(pendingReply.current);
        const b = { ok: !!msg.ok, text: String(msg.message ?? '') };
        showBanner(b);
        if (b.ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          // Hop back to the scoreboard after a moment
          setTimeout(() => setGame((g) => (g && g.id === msg.gameId ? null : g)), 1800);
        }
      }
    },
    [showBanner],
  );

  // ── Messages from the injected script inside a game ─────────────────────────
  const onGameMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type !== 'capture' || !game) return;
      const text = String(msg.text ?? '').trim();
      if (!text) return;
      // Games often copy *and* share the result, so only handle one per game every few seconds
      const now = Date.now();
      if (game.id === last.current.text && now - last.current.at < 5000) return;
      last.current = { text: game.id, at: now };

      // Keep it on the clipboard so it can still go in the group chat
      Clipboard.setStringAsync(text).catch(() => {});

      mainRef.current?.injectJavaScript(
        `window.dailyDoseCapture && window.dailyDoseCapture(${JSON.stringify(text)}, ${JSON.stringify(game.id)}); true;`,
      );
      // If the site doesn't answer (not signed in / not loaded), still tell the user something
      if (pendingReply.current) clearTimeout(pendingReply.current);
      pendingReply.current = setTimeout(
        () => showBanner({ ok: false, text: 'Result copied. Sign in to Daily Dose and paste it on Today.' }),
        4000,
      );
    },
    [game, showBanner],
  );

  // Keep the Daily Dose site inside the app; open other links in the phone's browser
  const onMainNavigate = useCallback((req: ShouldStartLoadRequest) => {
    const url = req.url;
    if (url.startsWith(webOrigin) || url.startsWith('about:') || url.startsWith('data:') || req.isTopFrame === false) {
      return true;
    }
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <WebView
          ref={mainRef}
          source={{ uri: WEB_APP_URL }}
          style={styles.web}
          onMessage={onMainMessage}
          onShouldStartLoadWithRequest={onMainNavigate}
          applicationNameForUserAgent={USER_AGENT_SUFFIX}
          sharedCookiesEnabled
          domStorageEnabled
          pullToRefreshEnabled
          allowsBackForwardNavigationGestures
          webviewDebuggingEnabled
          setSupportMultipleWindows={false}
        />
      </SafeAreaView>

      <Modal
        visible={!!game}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setGame(null)}
      >
        {game && (
          <GameScreen game={game} banner={banner} onClose={() => setGame(null)} onMessage={onGameMessage} />
        )}
      </Modal>
    </SafeAreaProvider>
  );
}

function GameScreen({
  game,
  banner,
  onClose,
  onMessage,
}: {
  game: GameLink;
  banner: Banner | null;
  onClose: () => void;
  onMessage: (e: WebViewMessageEvent) => void;
}) {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: banner ? 1 : 0, useNativeDriver: true }).start();
  }, [banner, slide]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: game.color ?? COLORS.border }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {game.name}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <WebView
          source={{ uri: game.url }}
          style={styles.web}
          injectedJavaScriptBeforeContentLoaded={CAPTURE_SCRIPT}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
          injectedJavaScriptForMainFrameOnly={false}
          onMessage={onMessage}
          applicationNameForUserAgent={USER_AGENT_SUFFIX}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          javaScriptCanOpenWindowsAutomatically
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          webviewDebuggingEnabled
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.banner,
            {
              opacity: slide,
              transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
          ]}
        >
          {banner && (
            <Text style={[styles.bannerText, { color: banner.ok ? COLORS.text : COLORS.bad }]}>
              {banner.ok ? '✓ ' : '⚠︎ '}
              {banner.text}
            </Text>
          )}
        </Animated.View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  web: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    backgroundColor: COLORS.bg,
  },
  done: { color: '#a99bff', fontSize: 16, fontWeight: '600', width: 44 },
  title: { color: COLORS.text, fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 48 : 32,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  bannerText: { fontSize: 15, fontWeight: '600' },
});
