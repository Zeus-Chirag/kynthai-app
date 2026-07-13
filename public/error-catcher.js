
// Global error catcher - runs BEFORE React
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** SECURITY: Use textContent/DOM APIs to avoid innerHTML XSS in error catcher */
function renderError(title, messages) {
  document.body.textContent = ''
  var container = document.createElement('div')
  container.style.cssText = 'padding:20px;color:red;font-family:monospace;background:white;position:fixed;top:0;left:0;right:0;z-index:99999'
  var h1 = document.createElement('h1')
  h1.textContent = title
  container.appendChild(h1)
  messages.forEach(function(msg) {
    var p = document.createElement('p')
    if (typeof msg === 'object') {
      p.textContent = msg.text
      if (msg.extra) {
        var extra = document.createElement('span')
        extra.textContent = ' ' + msg.extra
        p.appendChild(extra)
      }
    } else {
      p.textContent = msg
    }
    container.appendChild(p)
  })
  var pre = document.createElement('pre')
  pre.textContent = messages.length > 0 && typeof messages[messages.length-1] === 'string'
    ? messages[messages.length-1] : 'See console for details'
  container.appendChild(pre)
  document.body.appendChild(container)
}

window.onerror = function(message, url, line, col, error) {
  var safeMessage = escapeHtml(message)
  var safeUrl = escapeHtml(url)
  var safeStack = escapeHtml(error ? error.stack : 'No stack')
  renderError('JAVASCRIPT ERROR', [
    { text: safeMessage },
    { text: 'Line: ' + line + ' in ', extra: safeUrl }
  ])
  return true;
};

window.addEventListener('unhandledrejection', function(event) {
  var safeReason = escapeHtml(event.reason ? (event.reason.stack || String(event.reason)) : 'Unknown')
  renderError('UNHANDLED REJECTION', [safeReason])
});
