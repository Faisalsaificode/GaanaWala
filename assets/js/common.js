/* Theme toggle + the India-time clock. Shared by every page. */
(function () {
  var KEY = 'gw-theme';
  var root = document.documentElement;

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var btn = document.getElementById('theme-btn');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀' : '☾';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(saved || (prefersDark ? 'dark' : 'light'));

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('#theme-btn');
    if (!btn) return;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (err) {}
  });

  /* --- Indian Standard Time, wherever the listener actually is --- */

  window.GW = window.GW || {};

  GW.istParts = function () {
    var fmt = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    var h24 = parseInt(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date()),
      10
    );
    return { label: fmt.format(new Date()), hour: h24 % 24 };
  };

  GW.dayOfYear = function () {
    var d = new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  };

  function tick() {
    var el = document.getElementById('clock');
    if (!el) return;
    el.innerHTML = 'India · <b>' + GW.istParts().label + '</b>';
  }
  tick();
  setInterval(tick, 20000);
})();
