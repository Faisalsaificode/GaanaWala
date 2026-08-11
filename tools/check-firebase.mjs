// End-to-end test of the live visitor counters against the real Firebase
// Realtime Database in assets/js/config.js.
//
//   npm run serve            # in one terminal
//   node tools/check-firebase.mjs
//
// Opens two browser tabs, confirms presence counts them both, closes one and
// confirms the count drops. Note this does add a couple of real visits to the
// all-time total; reset it in the Firebase console if you want a clean start.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.GW_PORT || 8099);
const CDP = 9337;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cfgSrc = await readFile(path.join(ROOT, 'assets', 'js', 'config.js'), 'utf8');
const dbUrl = (cfgSrc.match(/databaseURL:\s*'([^']*)'/) || [])[1];
if (!dbUrl) {
  console.log('No databaseURL in assets/js/config.js — counters are off. Nothing to test.');
  process.exit(0);
}
console.log(`Database: ${dbUrl}\n`);

/* --- the REST endpoint tells us what the rules allow, before any browser --- */

console.log('Rules');
const readVisits = await fetch(`${dbUrl}/visits.json`);
console.log(`  ${readVisits.ok ? '✓' : '✗'} visits readable (HTTP ${readVisits.status})`);
const readPresence = await fetch(`${dbUrl}/presence.json`);
console.log(`  ${readPresence.ok ? '✓' : '✗'} presence readable (HTTP ${readPresence.status})`);
const hack = await fetch(`${dbUrl}/visits.json`, { method: 'PUT', body: '999999' });
console.log(`  ${hack.status === 401 || hack.status === 403 ? '✓' : '✗'} counter cannot be set to an arbitrary number (HTTP ${hack.status})`);
const junk = await fetch(`${dbUrl}/anything.json`, { method: 'PUT', body: '"junk"' });
console.log(`  ${junk.status === 401 || junk.status === 403 ? '✓' : '✗'} writes outside visits/presence rejected (HTTP ${junk.status})`);

const startVisits = Number(await readVisits.text()) || 0;

/* --- now the real thing, in a real browser --- */

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));

const profile = await mkdtemp(path.join(tmpdir(), 'gw-fb-'));
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu',
  '--host-resolver-rules=MAP www.youtube.com 127.0.0.1, MAP i.ytimg.com 127.0.0.1',
  'about:blank',
], { stdio: 'ignore' });

for (let i = 0; i < 40; i++) {
  try { await fetch(`http://127.0.0.1:${CDP}/json/version`); break; } catch { await sleep(300); }
}

async function open(url) {
  const tab = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res) => { ws.onopen = res; });
  let id = 0; const waiting = new Map();
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

let fails = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) fails++; };

try {
  console.log('\nLive counters');
  const home = await open(`http://localhost:${PORT}/`);
  await sleep(6000);

  const first = await home.eval(`(() => ({
    hidden: document.getElementById('stats').hidden,
    live: document.getElementById('live-now').textContent,
    total: document.getElementById('total-visits').textContent,
  }))()`);
  check('stats row became visible', first.hidden === false);
  check('live count is a number', /^\d/.test(first.live), first.live);
  check('total count is a number', /^[\d,]+$/.test(first.total), first.total);

  console.log('\nPresence tracks a second visitor');
  const station = await open(`http://localhost:${PORT}/s/truck-wala/`);
  await sleep(6000);

  const two = await home.eval(`document.getElementById('live-now').textContent`);
  check('homepage sees 2 people', parseInt(two, 10) >= 2, `${two} live`);

  const here = await station.eval(`(() => {
    const el = document.getElementById('live-here');
    return { hidden: el.hidden, text: el.textContent.replace(/\\s+/g,' ').trim() };
  })()`);
  check('station shows its own listeners', here.hidden === false, here.text);

  const dot = await home.eval(`(() => {
    const el = document.querySelector('[data-live-for="truck-wala"]');
    return { hidden: el.hidden, text: el.textContent };
  })()`);
  check('truck-wala card shows a live dot', dot.hidden === false, dot.text);

  console.log('\nLeaving removes you');
  await station.close();
  await sleep(7000);
  const after = await home.eval(`document.getElementById('live-now').textContent`);
  check('count drops when a tab closes', parseInt(after, 10) < parseInt(two, 10), `${two} → ${after}`);

  await home.close();

  const endVisits = Number(await (await fetch(`${dbUrl}/visits.json`)).text()) || 0;
  console.log(`\nAll-time visits: ${startVisits} → ${endVisits} (this test added ${endVisits - startVisits})`);
} finally {
  proc.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}

console.log(fails ? `\n${fails} check(s) failed` : '\nLive counters working');
process.exit(fails ? 1 : 0);
