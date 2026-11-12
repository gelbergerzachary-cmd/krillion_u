/// JavaScript injected into every game page. Every game's "Share" button either
/// copies text to the clipboard or calls the Web Share API, so we listen to
/// those calls (not the game's page layout). That makes it work for all games and
/// keeps it working when a site redesigns. The text goes to the native app, which
/// passes it to the Daily Dose site to parse and save.
enum CaptureScript {
    static let source = #"""
    (function () {
      if (window.__ddHooked) return;
      window.__ddHooked = true;

      function post(text, via) {
        try {
          if (text && String(text).trim()) {
            window.webkit.messageHandlers.ddCapture.postMessage({ text: String(text), via: via });
          }
        } catch (e) {}
      }

      // 1) navigator.clipboard.writeText / write
      try {
        var cb = navigator.clipboard;
        if (cb) {
          var origWriteText = cb.writeText ? cb.writeText.bind(cb) : null;
          Object.defineProperty(cb, 'writeText', {
            configurable: true,
            value: function (t) { post(t, 'clipboard'); return origWriteText ? origWriteText(t) : Promise.resolve(); }
          });
          var origWrite = cb.write ? cb.write.bind(cb) : null;
          if (origWrite) {
            Object.defineProperty(cb, 'write', {
              configurable: true,
              value: function (items) {
                try {
                  (items || []).forEach(function (item) {
                    if (item.types && item.types.indexOf('text/plain') >= 0) {
                      item.getType('text/plain').then(function (b) { return b.text(); })
                        .then(function (t) { post(t, 'clipboard-item'); });
                    }
                  });
                } catch (e) {}
                return origWrite(items);
              }
            });
          }
        }
      } catch (e) {}

      // 2) Web Share API (the native share sheet still opens if available)
      try {
        var origShare = navigator.share ? navigator.share.bind(navigator) : null;
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: function (data) {
            data = data || {};
            post([data.title, data.text, data.url].filter(Boolean).join('\n'), 'share');
            return origShare ? origShare(data).catch(function () {}) : Promise.resolve();
          }
        });
        if (!navigator.canShare) {
          Object.defineProperty(navigator, 'canShare', { configurable: true, value: function () { return true; } });
        }
      } catch (e) {}

      // 3) Old-school document.execCommand('copy')
      try {
        var origExec = document.execCommand.bind(document);
        document.execCommand = function (cmd) {
          if (String(cmd).toLowerCase() === 'copy') {
            var el = document.activeElement, t = '';
            if (el && typeof el.value === 'string') {
              t = el.value.substring(el.selectionStart || 0, el.selectionEnd || el.value.length) || el.value;
            } else {
              t = String(window.getSelection());
            }
            post(t, 'execCommand');
          }
          return origExec.apply(document, arguments);
        };
      } catch (e) {}

      // 4) A plain copy the user does themselves (long-press → Copy)
      document.addEventListener('copy', function () {
        setTimeout(function () { post(String(window.getSelection()), 'copy-event'); }, 0);
      }, true);
    })();
    """#
}
