// Injected into every game page before it loads. Every game's "Share" button
// either copies text to the clipboard or calls the Web Share API, so we listen
// to those calls instead of the game's page layout. That way it works for every
// game and keeps working when a site redesigns. Captured text goes to the app,
// which hands it to the Daily Dose site to parse and save.
export const CAPTURE_SCRIPT = `
(function () {
  if (window.__ddHooked) return;
  window.__ddHooked = true;

  function post(text, via) {
    try {
      if (text && String(text).trim() && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'capture', text: String(text), via: via }));
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
        value: function (t) {
          post(t, 'clipboard');
          // Never let a blocked clipboard make the game show an error. The app copies it for real.
          return origWriteText ? origWriteText(t).catch(function () {}) : Promise.resolve();
        }
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
            return origWrite(items).catch(function () {});
          }
        });
      }
    }
  } catch (e) {}

  // 2) Web Share API. We capture the text and skip the share sheet, since the app copies it for you.
  try {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: function (data) {
        data = data || {};
        post([data.title, data.text, data.url].filter(Boolean).join('\\n'), 'share');
        return Promise.resolve();
      }
    });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: function () { return true; } });
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
        try { origExec.apply(document, arguments); } catch (e) {}
        return true;
      }
      return origExec.apply(document, arguments);
    };
  } catch (e) {}

  // 4) The user copying something themselves (long-press → Copy)
  document.addEventListener('copy', function () {
    setTimeout(function () { post(String(window.getSelection()), 'copy-event'); }, 0);
  }, true);
})();
true;
`;
