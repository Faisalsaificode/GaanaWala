/* Homepage: live-now badge, text search and time-of-day filtering.
   Station cards are already in the HTML — this only shows and hides them. */
(function () {
  var stations = window.GW_STATIONS || [];
  var hour = GW.istParts().hour;

  var BUCKETS = {
    morning: [5, 6, 7, 8, 9, 10, 11],
    afternoon: [12, 13, 14, 15, 16],
    evening: [17, 18, 19, 20, 21],
    night: [22, 23, 0, 1, 2, 3, 4],
  };

  function bucketOf(h) {
    for (var k in BUCKETS) if (BUCKETS[k].indexOf(h) > -1) return k;
    return 'evening';
  }

  /* --- what suits this hour in India --- */

  var live = stations.filter(function (s) { return (s.hours || []).indexOf(hour) > -1; });
  var pick = live.length ? live[GW.dayOfYear() % live.length] : stations[0];

  var hint = document.getElementById('now-hint');
  if (hint && pick) {
    hint.innerHTML =
      '<span class="pulse" aria-hidden="true"></span>' +
      '<span>It is <b>' + GW.istParts().label + '</b> in India — this is a ' +
      '<a href="s/' + pick.slug + '/">' + pick.name + '</a> hour.</span>';
  }

  live.forEach(function (s) {
    var badge = document.querySelector('[data-slug="' + s.slug + '"] .badge');
    if (badge) { badge.textContent = 'right now'; badge.classList.add('live'); }
  });

  /* --- filtering --- */

  var cards = Array.prototype.slice.call(document.querySelectorAll('.card[data-slug]'));
  var input = document.getElementById('filter');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-bucket]'));
  var empty = document.getElementById('empty');
  var activeBucket = 'all';

  function matches(card) {
    var s = stations.find(function (x) { return x.slug === card.dataset.slug; });
    if (!s) return true;

    if (activeBucket === 'now') {
      if ((s.hours || []).indexOf(hour) === -1) return false;
    } else if (activeBucket !== 'all') {
      var hit = (s.hours || []).some(function (h) { return bucketOf(h) === activeBucket; });
      if (!hit) return false;
    }

    var q = (input && input.value || '').trim().toLowerCase();
    if (!q) return true;
    var hay = [s.name, s.hi, s.tagline, s.blurb]
      .concat((s.songs || []).map(function (x) { return x.t + ' ' + (x.f || ''); }))
      .join(' ')
      .toLowerCase();
    return hay.indexOf(q) > -1;
  }

  function render() {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = matches(c);
      c.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    if (empty) empty.style.display = shown ? 'none' : '';
  }

  if (input) input.addEventListener('input', render);
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeBucket = chip.dataset.bucket;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      render();
    });
  });

  render();
})();
