// Generates the static site from data/library.json.
//
//   node tools/build.mjs
//
// Output: index.html and s/<slug>/index.html, each with its data inlined so
// the pages work from GitHub Pages, a sub-path, or a plain file:// open.

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { art } from './art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = JSON.parse(await readFile(path.join(ROOT, 'data', 'library.json'), 'utf8'));

const SITE = 'Gaana Wala';
const TAGLINE = 'Find Your Next Gaana Wala';

// The custom domain in CNAME is the single source of truth for absolute URLs
// (canonical links, og:url, sitemap). GitHub Pages reads the same file, so the
// two can never drift. GW_SITE_URL is the fallback when there is no CNAME.
async function siteUrl() {
  try {
    const domain = (await readFile(path.join(ROOT, 'CNAME'), 'utf8')).trim();
    if (domain) return `https://${domain.toLowerCase()}`;
  } catch {}
  return (process.env.GW_SITE_URL || '').replace(/\/+$/, '');
}
const SITE_URL = await siteUrl();

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const mins = (songs) => Math.round(songs.reduce((n, s) => n + (s.dur || 240), 0) / 60);

// A hundred songs is roughly eight hours; "482 min" reads worse than "8 hr".
function runtime(songs) {
  const m = mins(songs);
  if (m < 120) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem >= 10 ? `${h} hr ${rem} min` : `${h} hr`;
}

// Only the first chunk of a long rotation is rendered open; the rest is one
// click away, or opens on its own if playback lands down there.
const VISIBLE_TRACKS = 30;

// Pick black or white text for a given accent so the "right now" badge and the
// play button stay readable on both the yellow and the deep teal stations.
function readableOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? '#191310' : '#ffffff';
}

function fmtDur(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const favicon = (accent) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${accent}"/><path d="M21 7v13.2a4 4 0 1 1-2.4-3.66V10.6l-6.6 1.5v10.1a4 4 0 1 1-2.4-3.66V9.2z" fill="#fff"/></svg>`
  );

function head({ title, desc, accent, accent2, depth, canonical }) {
  const up = depth ? '../'.repeat(depth) : '';
  const abs = SITE_URL && canonical !== undefined ? `${SITE_URL}${canonical}` : '';
  return `<meta charset="utf-8">${abs ? `\n<link rel="canonical" href="${abs}">\n<meta property="og:url" content="${abs}">` : ''}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="${accent}">
<link rel="icon" href="${favicon(accent)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${up}assets/css/style.css">
<style>:root{--accent:${accent};--accent-2:${accent2};--on-accent:${readableOn(accent)}}</style>
<script>(function(){try{var t=localStorage.getItem('gw-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t)}catch(e){}})();</script>`;
}

function topbar(depth) {
  const up = depth ? '../'.repeat(depth) : '';
  return `<header class="topbar">
  <div class="wrap">
    <a class="brand" href="${up}index.html">
      <span class="dot" aria-hidden="true"></span>
      <span>GAANA WALA</span>
      <small class="hi">गाना वाला</small>
    </a>
    <span class="spacer"></span>
    <span class="clock" id="clock" aria-live="off"></span>
    <button class="icon-btn" id="theme-btn" type="button" aria-label="Toggle theme">☾</button>
  </div>
</header>`;
}

function footer(depth) {
  const up = depth ? '../'.repeat(depth) : '';
  return `<footer class="footer">
  <div class="wrap cols">
    <div>
      <p><strong>${SITE}</strong> — ${lib.stations.length} places, ${lib.stations.reduce((n, s) => n + s.songs.length, 0)} songs.</p>
      <p>Everything plays through YouTube's own player, so the labels, composers and performers get exactly the view they would get anywhere else. All rights stay with them. Nothing is hosted here.</p>
      <p>Rights holders: if a track should not be here, open an issue and it comes out.</p>
    </div>
    <div>
      <p><a href="${up}index.html">All stations</a></p>
      <p style="opacity:.75">Times shown are Indian Standard Time.</p>
    </div>
  </div>
</footer>`;
}

/* ---------- homepage ---------- */

function card(st) {
  const svg = art[st.art] ? art[st.art](st.accent, st.accent2) : '';
  return `<a class="card" href="s/${st.slug}/" data-slug="${st.slug}" style="--accent:${st.accent};--accent-2:${st.accent2};--on-accent:${readableOn(st.accent)}">
  <div class="art">${svg}<span class="badge">${st.songs.length} songs</span></div>
  <div class="body">
    <div class="name">${esc(st.name)}</div>
    <div class="name-hi">${esc(st.hi)}</div>
    <div class="tag">${esc(st.tagline)}</div>
    <div class="meta">
      <span class="live-for" data-live-for="${st.slug}" hidden></span>
      <span class="dim">${runtime(st.songs)} rotation</span>
      <span class="play">Play <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>
    </div>
  </div>
</a>`;
}

function homepage() {
  const slim = lib.stations.map((s) => ({
    slug: s.slug, name: s.name, hi: s.hi, tagline: s.tagline, blurb: s.blurb, hours: s.hours,
    songs: s.songs.map((x) => ({ t: x.t, f: x.f || x.a || '' })),
  }));

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
${head({
  title: `${TAGLINE} — ${SITE}`,
  desc: `${lib.stations.length} Indian places, each with its own radio station. Saloon wala, truck wala, bus wala, chai tapri, auto wala and more — pick a place, press play.`,
  accent: '#e0483a', accent2: '#f2b134', depth: 0, canonical: '/',
})}
</head>
<body>
${topbar(0)}
<main>
  <section class="hero wrap">
    <span class="kicker">${lib.stations.length} places · ${lib.stations.reduce((n, s) => n + s.songs.length, 0)} songs</span>
    <h1>Find Your Next <span class="accent">Gaana Wala</span></h1>
    <p class="lede">Every place in India has its own soundtrack, and everybody already knows it. The barber's. The truck cabin at 2am. The tapri at golden hour. Pick a place and press play.</p>
    <div class="now-hint" id="now-hint"></div>
    <div class="stats" id="stats" hidden>
      <span class="stat"><span class="pulse" aria-hidden="true"></span><b id="live-now">–</b> listening right now</span>
      <span class="stat"><b id="total-visits">–</b> visits all time</span>
    </div>
  </section>

  <div class="wrap">
    <div class="filterbar">
      <input id="filter" type="search" placeholder="Search a place, a film, a song…" aria-label="Search stations">
      <button class="chip" type="button" data-bucket="all" aria-pressed="true">All</button>
      <button class="chip" type="button" data-bucket="now" aria-pressed="false">Right now</button>
      <button class="chip" type="button" data-bucket="morning" aria-pressed="false">Morning</button>
      <button class="chip" type="button" data-bucket="afternoon" aria-pressed="false">Afternoon</button>
      <button class="chip" type="button" data-bucket="evening" aria-pressed="false">Evening</button>
      <button class="chip" type="button" data-bucket="night" aria-pressed="false">Late night</button>
    </div>

    <div class="grid" id="grid">
${lib.stations.map(card).join('\n')}
      <p class="empty" id="empty" style="display:none">Nothing matches that. Try a film name, or clear the search.</p>
    </div>
  </div>
</main>
${footer(0)}
<script>window.GW_STATIONS=${JSON.stringify(slim)};</script>
<script src="assets/js/config.js"></script>
<script src="assets/js/common.js"></script>
<script src="assets/js/home.js"></script>
<script src="assets/js/counters.js"></script>
</body>
</html>
`;
}

/* ---------- station page ---------- */

function stationPage(st) {
  const svg = art[st.art] ? art[st.art](st.accent, st.accent2) : '';
  const others = lib.stations.filter((s) => s.slug !== st.slug);

  // The player only ever loads songs that have a verified id, so the rendered
  // rows must be exactly that same list — otherwise row N plays song N-of-a-
  // different-list and every click below the first gap is wrong.
  const songs = st.songs.filter((s) => s.yt);

  const tracks = songs
    .map(
      (s, i) => `<li${i === 0 ? '' : ''}>
      <button type="button">
        <span class="num">${String(i + 1).padStart(2, '0')}</span>
        <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="t"><span class="n">${esc(s.t)}</span><span class="f">${esc(
        [s.f || s.a || '', s.y || ''].filter(Boolean).join(' · ')
      )}</span></span>
        <span class="dur">${fmtDur(s.dur)}</span>
      </button>
    </li>`
    )
    .join('\n');

  const payload = {
    slug: st.slug,
    name: st.name,
    songs: songs.map((s) => ({ t: s.t, f: s.f || '', a: s.a || '', y: s.y || '', yt: s.yt || '' })),
  };

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
${head({
  title: `${st.name} — ${st.tagline} · ${SITE}`,
  desc: st.blurb,
  accent: st.accent, accent2: st.accent2, depth: 2, canonical: `/s/${st.slug}/`,
})}
</head>
<body>
${topbar(2)}
<main>
  <section class="station-hero">
    <div class="inner wrap">
      <div class="copy">
        <nav class="crumbs"><a href="../../index.html">All stations</a> <span aria-hidden="true">/</span> ${esc(st.name)}</nav>
        <div class="station-title">
          <h1>${esc(st.name)}</h1>
          <span class="name-hi">${esc(st.hi)}</span>
        </div>
        <div class="station-sub">${esc(st.tagline)} · ${songs.length} songs · ${runtime(songs)}</div>
        <p class="station-blurb">${esc(st.blurb)}</p>
      </div>
      <figure class="art-panel">${svg}</figure>
    </div>
  </section>

  <div class="wrap">
    <section class="player" aria-label="Player">
      <div class="player-top">
        <button class="play-btn loading" id="play" type="button" aria-label="Play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="track-info">
          <div class="label" id="tr-label">now playing · ${esc(st.name)}
            <span class="live-here" id="live-here" hidden><span class="pulse" aria-hidden="true"></span><b>0</b> here now</span>
          </div>
          <div class="title" id="tr-title">—</div>
          <div class="sub" id="tr-sub"></div>
        </div>
        <div class="transport">
          <button class="icon-btn" id="prev" type="button" aria-label="Previous track"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg></button>
          <button class="icon-btn" id="next" type="button" aria-label="Next track"><svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg></button>
          <button class="icon-btn" id="shuffle" type="button" aria-label="Shuffle" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4V8h-2.2l-2.3 3-1.3-1.7L13.6 6H17zM3 6h4.5l2.3 3-1.3 1.7L6.7 8H3zm14 8v-3l4 4-4 4v-3h-3.4l-2.3-3.1 1.3-1.7L14.8 14zM3 16h3.7l2.6-3.4 1.3 1.7L7.5 18H3z"/></svg></button>
        </div>
      </div>

      <div class="scrub">
        <span class="time" id="t-cur">0:00</span>
        <div class="bar" id="bar" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="fill" id="fill"></span></div>
        <span class="time right" id="t-dur">0:00</span>
      </div>

      <div class="player-foot">
        <label class="vol"><span aria-hidden="true">🔊</span><span class="visually-hidden">Volume</span>
          <input id="vol" type="range" min="0" max="100" value="80">
        </label>
        <div class="timer-group">
          <span>Sleep</span>
          <button class="chip" type="button" data-sleep="15" aria-pressed="false">15m</button>
          <button class="chip" type="button" data-sleep="30" aria-pressed="false">30m</button>
          <button class="chip" type="button" data-sleep="60" aria-pressed="false">60m</button>
          <span id="timer-note"></span>
        </div>
        <a class="yt-link" id="yt-out" href="#" target="_blank" rel="noopener">Open on YouTube ↗</a>
      </div>
    </section>

    <div class="section-head">
      <h2>The rotation</h2>
      <span class="count">${songs.length} songs · press a row to jump</span>
    </div>
    <ol class="tracks${songs.length > VISIBLE_TRACKS ? ' collapsed' : ''}" id="tracks" style="--visible:${VISIBLE_TRACKS}">
${tracks}
    </ol>
${
  songs.length > VISIBLE_TRACKS
    ? `    <button class="show-all" id="show-all" type="button" aria-expanded="false">Show all ${songs.length} songs</button>`
    : ''
}

    <div class="section-head"><h2>Somewhere else</h2></div>
    <nav class="strip">
${others
  .map(
    (o) =>
      `      <a href="../${o.slug}/"><span class="swatch" style="background:${o.accent}"></span>${esc(o.name)}</a>`
  )
  .join('\n')}
    </nav>
  </div>
</main>
${footer(2)}
<div id="yt-host"></div>
<script>window.GW_STATION=${JSON.stringify(payload)};</script>
<script src="../../assets/js/config.js"></script>
<script src="../../assets/js/common.js"></script>
<script src="../../assets/js/player.js"></script>
<script src="../../assets/js/counters.js"></script>
</body>
</html>
`;
}

/* ---------- write ---------- */

await rm(path.join(ROOT, 's'), { recursive: true, force: true });
await writeFile(path.join(ROOT, 'index.html'), homepage(), 'utf8');

for (const st of lib.stations) {
  const dir = path.join(ROOT, 's', st.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), stationPage(st), 'utf8');
}

await writeFile(path.join(ROOT, '.nojekyll'), '', 'utf8');

if (SITE_URL) {
  const urls = ['/', ...lib.stations.map((s) => `/s/${s.slug}/`)];
  await writeFile(
    path.join(ROOT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n') +
      `\n</urlset>\n`,
    'utf8'
  );
  await writeFile(
    path.join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    'utf8'
  );
}

console.log(
  `Built index.html + ${lib.stations.length} station pages ` +
    `(${lib.stations.reduce((n, s) => n + s.songs.length, 0)} songs).`
);
