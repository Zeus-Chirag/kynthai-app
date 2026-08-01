(function(){
  'use strict';
  // ─── iOS Safari Tab-Restore Recovery ──────────────────────────────
  // Reload-loop guard: if the store keeps being wiped (e.g. the app keeps
  // crashing on Safari), a naive `reload()` here can bounce the page
  // forever. Only auto-recover a few times per session, then give up and
  // render normally instead of reloading again.
  var RECOVERY_ATTEMPTS_KEY = 'kynthai-recovery-attempts';
  var MAX_RECOVERY_ATTEMPTS = 3;
  try {
    var bgTime = sessionStorage.getItem('kynthai-bg-timestamp');
    if (bgTime) {
      var elapsed = Date.now() - parseInt(bgTime, 10);
      if (elapsed > 300000) {
        var attempts = parseInt(sessionStorage.getItem(RECOVERY_ATTEMPTS_KEY) || '0', 10);
        if (attempts >= MAX_RECOVERY_ATTEMPTS) {
          // Give up on auto-recovery — clear the stale marker so the app
          // can start fresh without another reload.
          sessionStorage.removeItem('kynthai-bg-timestamp');
          sessionStorage.removeItem('kynthai-last-activity');
        } else {
          sessionStorage.setItem(RECOVERY_ATTEMPTS_KEY, String(attempts + 1));
          localStorage.removeItem('kynthai-store-v2');
          sessionStorage.removeItem('kynthai-bg-timestamp');
          sessionStorage.removeItem('kynthai-last-activity');
          window.location.reload();
          return;
        }
      }
    }
  } catch(e) { /* ignore */ }

  // ─── Chunk-load error recovery (3 retries, then refresh button) ───
  var retried = parseInt(sessionStorage.getItem('kynthai-chunk-retry') || '0', 10);
  if (retried > 0) {
    sessionStorage.removeItem('kynthai-chunk-retry');
  }

  window.addEventListener('error', function(e) {
    if (e.message && (
      e.message.indexOf('ChunkLoadError') !== -1 ||
      e.message.indexOf('Loading chunk') !== -1 ||
      (e.target && e.target.tagName === 'SCRIPT' && e.target.src && !e.target.src.includes(location.host))
    )) {
      var n = parseInt(sessionStorage.getItem('kynthai-chunk-retry') || '0', 10);
      if (n < 3) {
        sessionStorage.setItem('kynthai-chunk-retry', String(n + 1));
        window.location.reload();
      } else {
        document.body.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif">' +
          '<div>' +
          '<h2 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin-bottom:0.5rem">App Update Available</h2>' +
          '<p style="color:#64748b;margin-bottom:1.5rem;max-width:360px;line-height:1.5">A new version was deployed while you were away. Please refresh to get the latest.</p>' +
          '<button onclick=\\'localStorage.clear();sessionStorage.clear();location.reload()\\' ' +
          'style="background:#059669;color:white;border:none;padding:0.75rem 2rem;border-radius:9999px;font-size:1rem;cursor:pointer;font-weight:600;box-shadow:0 4px 6px -1px rgba(5,150,105,0.3)">' +
          'Refresh Now</button>' +
          '</div></div>';
      }
    }
  }, true);
})();
