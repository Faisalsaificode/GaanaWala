// Drives a real Chrome over the DevTools protocol to answer two questions:
//   1. does a station page actually start playing?
//   2. will YouTube let us embed every video in the library?
//
//   node tools/check-embeds.mjs            # play test + embed sweep
//   node tools/check-embeds.mjs --play     # play test only
//
// A rights holder can disable embedding at any time, so re-run this now and
// then; anything reported here should get a new query in tools/seed.mjs.

import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.GW_PORT || 8099);
const CDP_PORT = 9222;

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findChrome() {
  const { existsSync } = await import('node:fs');
  const hit = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!hit) throw new Error('No Chrome/Edge found — set one of the paths in CHROME_CANDIDATES.');
  return hit;
}

/* --- minimal CDP client (Node 22+ ships a global WebSocket) --- */

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); }

  static async attach(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const cdp = new CDP(ws);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const pending = cdp.waiting.get(msg.id);
      if (pending) { cdp.waiting.delete(msg.id); pending(msg); }
    };
    return cdp;
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res) => this.waiting.set(id, res));
  }

  async eval(expression, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', {
      expression, awaitPromise, returnByValue: true, allowUnsafeEvalBlockedByCSP: true,
    });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
    return r.result?.result?.value;
  }
}

async function openTab(url) {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return res.json();
}

/* --- checks --- */

async function playTest(slug) {
  const tab = await openTab(`http://localhost:${PORT}/s/${slug}/`);
  const cdp = await CDP.attach(tab.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await sleep(4500); // let the IFrame API boot

  const state = await cdp.eval(`(async () => {
    document.getElementById('play').click();
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      const p = document.querySelector('#yt-host');
      if (document.getElementById('tr-title').textContent !== '—' &&
          document.body.classList.contains('paused') === false) {
        return { playing: true, track: document.getElementById('tr-title').textContent, at: i * 0.5 };
      }
    }
    return { playing: false, track: document.getElementById('tr-title').textContent };
  })()`, true);

  await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${tab.id}`);
  return state;
}

async function embedSweep(ids) {
  const tab = await openTab(`http://localhost:${PORT}/tools/embed-probe.html`);
  const cdp = await CDP.attach(tab.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');

  for (let i = 0; i < 40; i++) {
    if (await cdp.eval('typeof gwReady === "function" && gwReady()')) break;
    await sleep(400);
  }

  const bad = [];
  const CHUNK = 20; // report progress as it goes rather than after four minutes
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const found = await cdp.eval(`gwProbe(${JSON.stringify(slice.map((s) => s.yt))}, 850)`, true);
    for (const f of found || []) {
      const song = slice.find((s) => s.yt === f.id);
      bad.push({ ...f, ...song });
    }
    process.stdout.write(`  checked ${Math.min(i + CHUNK, ids.length)}/${ids.length}\r`);
  }
  process.stdout.write('\n');

  await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${tab.id}`);
  return bad;
}

async function main() {
  const chrome = await findChrome();
  const profile = await mkdtemp(path.join(tmpdir(), 'gw-chrome-'));
  const proc = spawn(chrome, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    'about:blank',
  ], { stdio: 'ignore' });

  // wait for the debugging endpoint
  for (let i = 0; i < 40; i++) {
    try { await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); break; } catch { await sleep(300); }
  }

  const lib = JSON.parse(await readFile(path.join(ROOT, 'data', 'library.json'), 'utf8'));

  try {
    console.log('Play test');
    for (const slug of ['truck-wala', 'chai-tapri', 'mandir-wala']) {
      const r = await playTest(slug);
      console.log(
        r.playing
          ? `  ✓ ${slug} — playing "${r.track}" after ${r.at}s`
          : `  ✗ ${slug} — did not start (showing "${r.track}")`
      );
    }

    if (!process.argv.includes('--play')) {
      const all = lib.stations.flatMap((st) =>
        st.songs.filter((s) => s.yt).map((s) => ({ yt: s.yt, t: s.t, slug: st.slug }))
      );
      console.log(`\nEmbed sweep — ${all.length} videos`);
      const bad = await embedSweep(all);
      if (!bad.length) console.log('  ✓ every video is embeddable');
      else {
        console.log(`  ✗ ${bad.length} blocked:\n`);
        for (const b of bad) console.log(`    ${b.slug} :: ${b.t} (${b.yt}) — error ${b.code}`);
      }
    }
  } finally {
    proc.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
