// Resolves a real, verified YouTube video id for every song in seed.mjs.
//
//   node tools/resolve-youtube.mjs          # resolve anything not yet cached
//   node tools/resolve-youtube.mjs --force  # re-resolve everything
//   node tools/resolve-youtube.mjs --only truck-wala
//
// Nothing is guessed: each candidate comes from a live YouTube search page and
// is confirmed through the public oembed endpoint before it is written out.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stations, searchQuery } from './seed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'library.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Concurrency is deliberately modest: YouTube throttles bursts, and the backoff
// that recovers from it costs more time than the parallelism saves.
let JOBS = 3;
const DELAY = 350;

const OFFICIAL = [
  't-series', 'saregama', 'sony music india', 'zee music company', 'shemaroo',
  'tips official', 'tips music', 'venus', 'ultra bollywood', 'ultra movie parlour',
  'yrf', 'yash raj films', 'speed records', 'times music', 'universal music india',
  'eros now', 'goldmines', 'rajshri', 'sa re ga ma', 'aditya music', 'wave music',
  'sony music south', 'muzik247', 'bhakti sagar', 'shemaroo filmi gaane',
  'shemaroo bhakti', 'gaane sune ansune', 'hungama', 'panorama music',
];

// Titles containing any of these are almost never the canonical recording.
const BAD_WORDS = [
  'full movie', 'jukebox', 'mashup', 'cover by', 'karaoke', 'instrumental',
  'reaction', 'trailer', 'teaser', 'making of', 'behind the scenes', '8d audio',
  'slowed', 'reverb', 'nightcore', 'ringtone', 'whatsapp status', 'shorts',
  'dj remix', 'nonstop', 'non stop', 'all songs', 'audio songs', 'best of',
  'lofi', 'lo-fi', 'trap mix', 'carvaan', 'unplugged', 'remake', 'medley',
  'female version', 'male version', 'jhankar', 'live at', 'live performance',
  'dance performance', 'guitar', 'flute', 'piano', 'tutorial', 'sanam',
];

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// YouTube music uploads put the song name first: "Chura Ke Dil Mera - 4K VIDEO | ..."
// Matching that leading segment stops us picking a different song off the same film.
const headSegment = (title) => norm(title.split(/[|\-–—([]/)[0]);

// YouTube throttles a burst of scripted requests by resetting the connection.
// Exponential backoff rides it out; without this roughly one song per station
// drops out of every run.
async function fetchWithRetry(url, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, {
        headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
      });
    } catch (err) {
      lastErr = err;
      await sleep(2000 * 2 ** i);
    }
  }
  throw lastErr;
}

function parseDuration(text) {
  if (!text) return 0;
  const parts = text.split(':').map((n) => parseInt(n, 10));
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function parseViews(text) {
  if (!text) return 0;
  const m = text.replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1;
  return parseFloat(m[1]) * mult;
}

// Walk the ytInitialData blob and pull out every videoRenderer it contains.
function collectVideos(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVideos(item, out);
    return out;
  }
  const v = node.videoRenderer;
  if (v && v.videoId) {
    out.push({
      id: v.videoId,
      title: v.title?.runs?.map((r) => r.text).join('') || '',
      channel:
        v.ownerText?.runs?.[0]?.text ||
        v.longBylineText?.runs?.[0]?.text ||
        '',
      duration: parseDuration(v.lengthText?.simpleText),
      views: parseViews(v.viewCountText?.simpleText || v.shortViewCountText?.simpleText),
    });
  }
  for (const key of Object.keys(node)) collectVideos(node[key], out);
  return out;
}

async function searchYouTube(query) {
  const url =
    'https://www.youtube.com/results?search_query=' +
    encodeURIComponent(query) +
    '&sp=EgIQAQ%253D%253D'; // filter: videos only
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
  if (!m) throw new Error('no ytInitialData in response');
  return collectVideos(JSON.parse(m[1]));
}

function score(candidate, song) {
  const title = norm(candidate.title);
  const head = headSegment(candidate.title);
  const channel = norm(candidate.channel);
  const wanted = norm(song.t).split(' ').filter(Boolean);
  const cover = (hay) => (wanted.length ? wanted.filter((w) => hay.includes(w)).length / wanted.length : 0);
  const ratio = cover(title);
  const headRatio = cover(head);

  let s = ratio * 6 + headRatio * 6;
  if (ratio < 0.6) s -= 12; // almost certainly the wrong track
  // Title words all present, but not in the leading segment: usually a different
  // song from a film that happens to share the name we searched for.
  if (ratio >= 0.6 && headRatio < 0.5) s -= 6;

  if (song.f && title.includes(norm(song.f).split(' ')[0])) s += 2;
  if (song.a && title.includes(norm(song.a).split(' ')[0])) s += 1;
  if (OFFICIAL.some((label) => channel.includes(norm(label)))) s += 3;
  if (channel.includes('youtube movies') || channel.includes('topic')) s -= 4;

  const d = candidate.duration;
  if (d >= 100 && d <= 780) s += 3;
  else if (d > 780 && d <= 1200) s -= 2;
  else if (d > 1200) s -= 10; // jukebox or a whole film
  else if (d > 0 && d < 60) s -= 6;
  else if (d === 0) s -= 3; // live / unknown

  const rawTitle = candidate.title.toLowerCase();
  for (const bad of BAD_WORDS) if (rawTitle.includes(bad)) s -= 7;

  if (candidate.views > 5e7) s += 2;
  else if (candidate.views > 5e6) s += 1;

  return s;
}

async function verify(id) {
  const res = await fetchWithRetry(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
  );
  if (!res.ok) return null;
  return res.json();
}

async function resolve(song) {
  const query = searchQuery(song);
  const candidates = await searchYouTube(query);
  if (!candidates.length) return { ok: false, reason: 'no results' };

  const ranked = candidates
    .map((c) => ({ ...c, score: score(c, song) }))
    .sort((a, b) => b.score - a.score);

  for (const best of ranked.slice(0, 3)) {
    if (best.score < 0) break;
    const meta = await verify(best.id);
    if (meta) {
      return {
        ok: true,
        yt: best.id,
        ytTitle: meta.title,
        channel: meta.author_name || best.channel,
        duration: best.duration,
        score: Number(best.score.toFixed(1)),
      };
    }
    await sleep(150);
  }
  return { ok: false, reason: 'no verifiable candidate', top: ranked[0]?.title };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx > -1 ? args[onlyIdx + 1] : null;
  const jobsIdx = args.indexOf('--jobs');
  if (jobsIdx > -1) JOBS = Math.max(1, Math.min(6, parseInt(args[jobsIdx + 1], 10) || 3));

  let cache = {};
  if (existsSync(OUT) && !force) {
    const prev = JSON.parse(await readFile(OUT, 'utf8'));
    for (const st of prev.stations || []) {
      for (const s of st.songs || []) {
        if (s.yt) cache[`${st.slug}::${s.t}`] = s;
      }
    }
  }

  const out = { generatedAt: new Date().toISOString(), stations: [] };
  let resolved = 0;
  let failed = 0;

  for (const station of stations) {
    if (only && station.slug !== only) {
      // keep whatever we already had for stations we are skipping
      const kept = station.songs.map((s) => cache[`${station.slug}::${s.t}`] || { ...s });
      out.stations.push({ ...station, songs: kept });
      continue;
    }

    process.stdout.write(`\n${station.name}\n`);

    // Resolve a few at a time but keep the rotation in its curated order.
    const songs = new Array(station.songs.length);
    let cursor = 0;

    async function worker() {
      while (cursor < station.songs.length) {
        const i = cursor++;
        const song = station.songs[i];
        const key = `${station.slug}::${song.t}`;

        if (cache[key]) {
          songs[i] = cache[key];
          continue;
        }
        try {
          const r = await resolve(song);
          if (r.ok) {
            songs[i] = { ...song, yt: r.yt, ytTitle: r.ytTitle, channel: r.channel, dur: r.duration };
            resolved++;
            process.stdout.write(`  ✓ ${song.t} → ${r.yt}  ${r.ytTitle.slice(0, 52)}\n`);
          } else {
            songs[i] = { ...song };
            failed++;
            process.stdout.write(`  ✗ ${song.t} — ${r.reason}\n`);
          }
        } catch (err) {
          songs[i] = { ...song };
          failed++;
          process.stdout.write(`  ! ${song.t} — ${err.message}\n`);
        }
        await sleep(DELAY);
      }
    }

    await Promise.all(Array.from({ length: JOBS }, worker));
    out.stations.push({ ...station, songs });

    // Save after every station so a long run can be interrupted and resumed.
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, JSON.stringify({ ...out, partial: true }, null, 2) + '\n', 'utf8');
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const total = out.stations.reduce((n, s) => n + s.songs.length, 0);
  const withId = out.stations.reduce((n, s) => n + s.songs.filter((x) => x.yt).length, 0);
  console.log(
    `\nWrote ${path.relative(ROOT, OUT)} — ${withId}/${total} songs have a verified video id ` +
      `(${resolved} new, ${failed} failed this run).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
