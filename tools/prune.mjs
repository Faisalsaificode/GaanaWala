// Removes entries from tools/songs/<slug>.mjs that did not survive resolution:
//
//   · no verifiable YouTube id after a full resolve run
//   · a duplicate of a song already in the same station under another name
//
//   node tools/prune.mjs --dry     # report only
//   node tools/prune.mjs           # rewrite the song files
//
// Run this after `npm run resolve`, then resolve + build again. Keeping the
// dead entries would cost a wasted lookup on every forced run and, worse, put
// unplayable rows in the rotation.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry');

const lib = JSON.parse(await readFile(path.join(ROOT, 'data', 'library.json'), 'utf8'));

let removedTotal = 0;

for (const st of lib.stations) {
  const drop = new Map(); // title -> reason
  const seen = new Map(); // videoId -> title that claimed it

  for (const song of st.songs) {
    if (!song.yt) {
      drop.set(song.t, 'unresolved');
      continue;
    }
    if (seen.has(song.yt)) drop.set(song.t, `duplicate of "${seen.get(song.yt)}"`);
    else seen.set(song.yt, song.t);
  }

  if (!drop.size) continue;

  const file = path.join(ROOT, 'tools', 'songs', `${st.slug}.mjs`);
  const src = await readFile(file, 'utf8');
  const kept = [];
  const cut = [];

  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\s*\{\s*t:\s*'((?:[^'\\]|\\.)*)'/);
    if (m && drop.has(m[1])) {
      cut.push(`${m[1]} — ${drop.get(m[1])}`);
      continue;
    }
    kept.push(line);
  }

  if (cut.length !== drop.size) {
    console.warn(
      `  ! ${st.slug}: matched ${cut.length} of ${drop.size} lines — check for entries spanning multiple lines`
    );
  }

  console.log(`\n${st.slug} — removing ${cut.length}`);
  for (const c of cut) console.log(`   ${c}`);
  removedTotal += cut.length;

  if (!dry) await writeFile(file, kept.join('\n'), 'utf8');
}

console.log(
  `\n${dry ? 'Would remove' : 'Removed'} ${removedTotal} entries. ` +
    (dry ? '' : 'Now run: npm run resolve && npm run build')
);
