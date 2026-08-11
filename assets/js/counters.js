/* Visitor counters: how many people are here right now, and how many have
 * visited in total.
 *
 * "Right now" is real presence, not an estimate — every open tab holds a node
 * in Firebase with an onDisconnect handler, so closing the tab (or losing the
 * network) removes it within seconds.
 *
 * If assets/js/config.js has no databaseURL, nothing renders and nothing
 * breaks. Same if Firebase is blocked by an extension or is down: the counters
 * stay hidden rather than showing a wrong number.
 */
(function () {
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var STALE_MS = 150000; // ignore presence nodes that stopped refreshing
  var BEAT_MS = 45000;   // how often we re-stamp our own node

  var slug = (window.GW_STATION && window.GW_STATION.slug) || 'home';

  /* ---------- rendering (kept separate so it can be exercised on its own) ---------- */

  // The visit count and the presence count arrive from two independent
  // subscriptions, each knowing only its own number. Patches are merged into
  // one state so a presence update cannot blank the total, or vice versa.
  var state = { live: null, total: null, here: null, byStation: null };

  function render(patch) {
    if (patch) {
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k) && patch[k] !== undefined) state[k] = patch[k];
      }
    }

    var live = document.getElementById('live-now');
    var total = document.getElementById('total-visits');
    var here = document.getElementById('live-here');
    var box = document.getElementById('stats');

    if (live) live.textContent = state.live == null ? '–' : state.live.toLocaleString('en-IN');
    if (total) total.textContent = state.total == null ? '–' : state.total.toLocaleString('en-IN');
    if (box && (state.live != null || state.total != null)) box.hidden = false;

    if (here && state.here != null) {
      here.querySelector('b').textContent = state.here.toLocaleString('en-IN');
      here.hidden = false;
    }

    // per-station live dots on the homepage cards
    if (state.byStation) {
      document.querySelectorAll('[data-live-for]').forEach(function (el) {
        var n = state.byStation[el.dataset.liveFor] || 0;
        if (n > 0) { el.textContent = n + ' listening'; el.hidden = false; }
        else el.hidden = true;
      });
    }
  }

  window.__gwCounts = { render: render }; // used by tools/check-counters.mjs

  /* ---------- firebase ---------- */

  var cfg = window.GW_FIREBASE || {};
  if (!cfg.databaseURL) return; // not configured — counters stay hidden

  Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-database.js')])
    .then(function (mods) {
      var app = mods[0].initializeApp(cfg);
      var d = mods[1];
      var db = d.getDatabase(app);

      /* total visits — once per browser session, not per page view */
      var counted = false;
      try { counted = sessionStorage.getItem('gw-counted') === '1'; } catch (e) {}
      if (!counted) {
        d.runTransaction(d.ref(db, 'visits'), function (n) { return (n || 0) + 1; }).catch(function () {});
        try { sessionStorage.setItem('gw-counted', '1'); } catch (e) {}
      }
      d.onValue(d.ref(db, 'visits'), function (snap) {
        render({ total: snap.val() || 0 });
      });

      /* presence */
      var offset = 0;
      d.onValue(d.ref(db, '.info/serverTimeOffset'), function (s) { offset = s.val() || 0; });

      var mine = d.push(d.ref(db, 'presence'));
      var beat = null;

      d.onValue(d.ref(db, '.info/connected'), function (snap) {
        if (!snap.val()) return;
        d.onDisconnect(mine).remove();
        var stamp = function () { d.set(mine, { s: slug, t: Date.now() + offset }).catch(function () {}); };
        stamp();
        clearInterval(beat);
        beat = setInterval(stamp, BEAT_MS);
      });

      d.onValue(d.ref(db, 'presence'), function (snap) {
        var now = Date.now() + offset;
        var live = 0;
        var byStation = {};
        var stale = [];

        snap.forEach(function (child) {
          var v = child.val() || {};
          if (typeof v.t !== 'number') return;
          if (now - v.t > STALE_MS) { stale.push(child.key); return; }
          live++;
          if (v.s && v.s !== 'home') byStation[v.s] = (byStation[v.s] || 0) + 1;
        });

        render({ live: live, byStation: byStation, here: slug === 'home' ? null : byStation[slug] || 0 });

        // Tidy up nodes left behind by a client that died without disconnecting.
        stale.slice(0, 5).forEach(function (key) {
          d.remove(d.ref(db, 'presence/' + key)).catch(function () {});
        });
      });

      window.addEventListener('pagehide', function () {
        clearInterval(beat);
        d.remove(mine).catch(function () {});
      });
    })
    .catch(function () {
      /* SDK blocked or offline — leave the counters hidden */
    });
})();
