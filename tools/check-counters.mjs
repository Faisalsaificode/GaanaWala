// Exercises the visitor-counter UI without needing a live Firebase project:
// feeds fake numbers straight into the render function and checks the DOM.
//
//   npm run serve      # in one terminal
//   node tools/check-counters.mjs
//
// Also asserts the counters stay hidden when config.js has no databaseURL,
// which is what an unconfigured deploy must do.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PORT = Number(process.env.GW_PORT || 8099);
const CDP = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));

if (!CHROME) {
  console.error('No Chrome/Edge found.');
  process.exit(1);
}

const profile = await mkdtemp(path.join(tmpdir(), 'gw-c-'));
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu',
  '--host-resolver-rules=MAP www.youtube.com 127.0.0.1, MAP i.ytimg.com 127.0.0.1',
  'about:blank',
], { stdio: 'ignore' });

for (let i = 0; i < 40; i++) {
  try { await fetch(`http://127.0.0.1:${CDP}/json/version`); break; } catch { await sleep(300); }
}

async function page(url) {
  const tab = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res) => { ws.onopen = res; });
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); const p = waiting.get(m.id); if (p) { waiting.delete(m.id); p(m); } };
  const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((r) => waiting.set(i, r)); };
  await send('Runtime.enable');
  return {
    eval: async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
      return r.result?.result?.value;
    },
    close: async () => { ws.close(); await fetch(`http://127.0.0.1:${CDP}/json/close/${tab.id}`); },
  };
}

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

try {
  // With a databaseURL set the counters are supposed to light up, so the
  // "stays hidden" assertion only applies to an unconfigured deploy.
  const configured = /databaseURL:\s*'https?:\/\//.test(
    await readFile(path.join(ROOT, 'assets', 'js', 'config.js'), 'utf8')
  );

  console.log(configured ? 'Configured deploy' : 'Unconfigured deploy (no databaseURL)');
  {
    const p = await page(`http://localhost:${PORT}/`);
    await sleep(configured ? 6000 : 1200);
    const s = await p.eval(`(() => ({
      statsHidden: document.getElementById('stats').hidden,
      dots: [...document.querySelectorAll('[data-live-for]')].filter(e => !e.hidden).length,
      hasRender: typeof window.__gwCounts?.render === 'function',
    }))()`);
    if (configured) {
      check('counters activate', s.statsHidden === false);
    } else {
      check('counters stay hidden', s.statsHidden === true);
      check('no per-card live dots shown', s.dots === 0);
    }
    check('render hook available', s.hasRender === true);
    await p.close();
  }

  console.log('\nHomepage with live data');
  {
    const p = await page(`http://localhost:${PORT}/`);
    await sleep(1200);
    const s = await p.eval(`(() => {
      window.__gwCounts.render({ live: 12, total: 34817, byStation: { 'truck-wala': 3, 'chai-tapri': 1 } });
      const dot = document.querySelector('[data-live-for="truck-wala"]');
      const quiet = document.querySelector('[data-live-for="gym-wala"]');
      return {
        statsVisible: !document.getElementById('stats').hidden,
        live: document.getElementById('live-now').textContent,
        total: document.getElementById('total-visits').textContent,
        truck: dot.hidden ? null : dot.textContent,
        gymHidden: quiet.hidden,
      };
    })()`);
    check('stats row appears', s.statsVisible === true);
    check('live count renders', s.live === '12', s.live);
    check('total formats for India', s.total === '34,817', s.total);
    check('busy station shows a dot', s.truck === '3 listening', s.truck);
    check('quiet station stays hidden', s.gymHidden === true);
    await p.close();
  }

  console.log('\nStation page with live data');
  {
    const p = await page(`http://localhost:${PORT}/s/truck-wala/`);
    await sleep(1500);
    const s = await p.eval(`(() => {
      window.__gwCounts.render({ live: 9, byStation: { 'truck-wala': 4 }, here: 4 });
      const el = document.getElementById('live-here');
      return { hidden: el.hidden, text: el.textContent.replace(/\\s+/g, ' ').trim() };
    })()`);
    check('"here now" badge appears', s.hidden === false);
    check('shows the station count', /\b4 here now\b/.test(s.text), s.text);
    await p.close();
  }
} finally {
  proc.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll counter checks passed');
process.exit(failures ? 1 : 0);
