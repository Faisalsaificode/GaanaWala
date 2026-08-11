/* Station player.
   Audio comes from a hidden YouTube IFrame player, so labels and artists get
   the same view they would get anywhere else on YouTube. */
(function () {
  var station = window.GW_STATION;
  if (!station) return;

  var songs = station.songs.filter(function (s) { return s.yt; });
  var dead = {}; // ids YouTube refuses to embed, skipped on the fly

  var player = null;
  var ready = false;
  var index = 0;
  var playing = false;
  var wantPlay = false;
  var shuffle = false;
  var poll = null;
  var sleepTimer = null;
  var sleepAt = 0;

  var el = {
    play: document.getElementById('play'),
    prev: document.getElementById('prev'),
    next: document.getElementById('next'),
    shuffle: document.getElementById('shuffle'),
    title: document.getElementById('tr-title'),
    sub: document.getElementById('tr-sub'),
    label: document.getElementById('tr-label'),
    bar: document.getElementById('bar'),
    fill: document.getElementById('fill'),
    cur: document.getElementById('t-cur'),
    dur: document.getElementById('t-dur'),
    vol: document.getElementById('vol'),
    list: document.getElementById('tracks'),
    yt: document.getElementById('yt-out'),
    timerNote: document.getElementById('timer-note'),
  };

  /* The rotation starts somewhere different every hour so the station feels
     live rather than like a list that always opens on track one. */
  index = songs.length ? (GW.dayOfYear() * 7 + GW.istParts().hour * 3) % songs.length : 0;

  var ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function current() { return songs[index]; }

  function subtitle(song) {
    if (!song) return '';
    var bits = [];
    if (song.f) bits.push(song.f);
    else if (song.a) bits.push(song.a);
    if (song.y) bits.push(song.y);
    return bits.join(' · ');
  }

  function paint() {
    var song = current();
    if (!song) return;

    el.title.textContent = song.t;
    el.sub.textContent = subtitle(song);
    el.play.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    document.body.classList.toggle('paused', !playing);

    if (el.yt) el.yt.href = 'https://www.youtube.com/watch?v=' + song.yt;

    Array.prototype.forEach.call(el.list.children, function (li, i) {
      li.setAttribute('aria-current', String(i === index));
      li.classList.toggle('dead', !!dead[songs[i].yt]);
    });

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.t,
          artist: subtitle(song) || 'Gaana Wala',
          album: station.name + ' · Gaana Wala',
          artwork: [
            { src: 'https://i.ytimg.com/vi/' + song.yt + '/hqdefault.jpg', sizes: '480x360', type: 'image/jpeg' },
          ],
        });
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      } catch (e) {}
    }
  }

  function load(i, autoplay) {
    if (!songs.length) return;
    index = ((i % songs.length) + songs.length) % songs.length;
    wantPlay = !!autoplay;
    paint();
    if (!ready) return;
    player.loadVideoById(current().yt);
    if (!autoplay) player.pauseVideo();
  }

  var skips = 0;
  function step(delta) {
    if (!songs.length) return;
    if (shuffle && delta > 0) {
      var n;
      do { n = Math.floor(Math.random() * songs.length); } while (songs.length > 1 && n === index);
      load(n, true);
    } else {
      load(index + delta, true);
    }
  }

  function skipDead() {
    skips++;
    if (skips > songs.length) { // everything is blocked — stop rather than spin
      el.label.textContent = 'nothing playable right now';
      playing = false;
      paint();
      return;
    }
    step(1);
  }

  /* --- YouTube wiring --- */

  window.onYouTubeIframeAPIReady = function () {
    var vars = { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1 };
    if (location.protocol === 'http:' || location.protocol === 'https:') vars.origin = location.origin;

    player = new YT.Player('yt-host', {
      height: '180',
      width: '320',
      videoId: songs.length ? current().yt : undefined,
      playerVars: vars,
      events: {
        onReady: function () {
          ready = true;
          var saved = null;
          try { saved = localStorage.getItem('gw-vol'); } catch (e) {}
          var v = saved === null ? 80 : parseInt(saved, 10);
          el.vol.value = v;
          player.setVolume(v);
          el.play.classList.remove('loading');
          if (wantPlay) player.playVideo();
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) {
            playing = true; skips = 0; el.play.classList.remove('loading'); startPoll();
          } else if (e.data === YT.PlayerState.PAUSED) {
            playing = false; stopPoll();
          } else if (e.data === YT.PlayerState.ENDED) {
            playing = false; step(1);
          } else if (e.data === YT.PlayerState.BUFFERING) {
            el.play.classList.add('loading');
          }
          paint();
        },
        onError: function (e) {
          // 100 = gone, 101/150 = embedding disabled by the rights holder
          var song = current();
          if (song && (e.data === 100 || e.data === 101 || e.data === 150 || e.data === 5)) {
            dead[song.yt] = true;
          }
          el.play.classList.remove('loading');
          skipDead();
        },
      },
    });
  };

  function startPoll() {
    stopPoll();
    poll = setInterval(function () {
      if (!ready || !player.getDuration) return;
      var d = player.getDuration() || 0;
      var t = player.getCurrentTime() || 0;
      el.fill.style.width = d ? (t / d) * 100 + '%' : '0%';
      el.cur.textContent = fmt(t);
      el.dur.textContent = fmt(d);
      el.bar.setAttribute('aria-valuenow', String(Math.round(d ? (t / d) * 100 : 0)));

      if (sleepAt) {
        var left = Math.max(0, Math.round((sleepAt - Date.now()) / 60000));
        el.timerNote.textContent = left + ' min left';
      }
    }, 500);
  }

  function stopPoll() { if (poll) { clearInterval(poll); poll = null; } }

  function toggle() {
    if (!ready) { wantPlay = true; el.play.classList.add('loading'); return; }
    if (playing) player.pauseVideo();
    else player.playVideo();
  }

  /* --- controls --- */

  el.play.addEventListener('click', toggle);
  el.next.addEventListener('click', function () { step(1); });
  el.prev.addEventListener('click', function () {
    if (ready && player.getCurrentTime && player.getCurrentTime() > 4) player.seekTo(0);
    else step(-1);
  });

  el.shuffle.addEventListener('click', function () {
    shuffle = !shuffle;
    el.shuffle.setAttribute('aria-pressed', String(shuffle));
  });

  el.vol.addEventListener('input', function () {
    var v = parseInt(el.vol.value, 10);
    if (ready) player.setVolume(v);
    try { localStorage.setItem('gw-vol', String(v)); } catch (e) {}
  });

  el.bar.addEventListener('click', function (e) {
    if (!ready || !player.getDuration) return;
    var r = el.bar.getBoundingClientRect();
    var pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    player.seekTo((player.getDuration() || 0) * pct, true);
  });

  Array.prototype.forEach.call(el.list.children, function (li, i) {
    li.querySelector('button').addEventListener('click', function () { load(i, true); });
  });

  document.querySelectorAll('[data-sleep]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mins = parseInt(btn.dataset.sleep, 10);
      document.querySelectorAll('[data-sleep]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      if (sleepTimer) { clearTimeout(sleepTimer); sleepTimer = null; }

      if (!mins || sleepAt && btn.dataset.sleep === String(mins) && el.timerNote.dataset.active === String(mins)) {
        sleepAt = 0;
        el.timerNote.textContent = '';
        el.timerNote.dataset.active = '';
        return;
      }
      btn.setAttribute('aria-pressed', 'true');
      sleepAt = Date.now() + mins * 60000;
      el.timerNote.dataset.active = String(mins);
      el.timerNote.textContent = mins + ' min left';
      sleepTimer = setTimeout(function () {
        if (ready) player.pauseVideo();
        sleepAt = 0;
        el.timerNote.textContent = 'stopped';
        document.querySelectorAll('[data-sleep]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      }, mins * 60000);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowRight' && e.shiftKey) step(1);
    else if (e.code === 'ArrowLeft' && e.shiftKey) step(-1);
  });

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', toggle);
      navigator.mediaSession.setActionHandler('pause', toggle);
      navigator.mediaSession.setActionHandler('nexttrack', function () { step(1); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { step(-1); });
    } catch (e) {}
  }

  paint();

  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
})();
