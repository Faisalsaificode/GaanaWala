// Source of truth for the Gaana Wala library.
//
// Station identity lives in tools/stations.mjs; each station's songs live in
// tools/songs/<slug>.mjs. YouTube ids are resolved and verified separately by
// tools/resolve-youtube.mjs, so no video id is ever typed in by hand.
//
// Fields per song: t = title, f = film, y = year, a = artist (non-film tracks),
// q = search-query override when the plain title is ambiguous.

import { stations as meta } from './stations.mjs';

import saloonWala from './songs/saloon-wala.mjs';
import truckWala from './songs/truck-wala.mjs';
import busWala from './songs/bus-wala.mjs';
import autoWala from './songs/auto-wala.mjs';
import chaiTapri from './songs/chai-tapri.mjs';
import gymWala from './songs/gym-wala.mjs';
import shaadiWala from './songs/shaadi-wala.mjs';
import dhabaWala from './songs/dhaba-wala.mjs';
import paanWala from './songs/paan-wala.mjs';
import mandirWala from './songs/mandir-wala.mjs';
import qawwaliWala from './songs/qawwali-wala.mjs';
import trainWala from './songs/train-wala.mjs';
import barishWala from './songs/barish-wala.mjs';
import padhaiWala from './songs/padhai-wala.mjs';

const SONGS = {
  'saloon-wala': saloonWala,
  'truck-wala': truckWala,
  'bus-wala': busWala,
  'auto-wala': autoWala,
  'chai-tapri': chaiTapri,
  'gym-wala': gymWala,
  'shaadi-wala': shaadiWala,
  'dhaba-wala': dhabaWala,
  'paan-wala': paanWala,
  'mandir-wala': mandirWala,
  'qawwali-wala': qawwaliWala,
  'train-wala': trainWala,
  'barish-wala': barishWala,
  'padhai-wala': padhaiWala,
};

// A repeated title inside one station would collide in the resolver cache and
// show up twice in the rotation, so drop duplicates at the source.
function dedupe(slug, list) {
  const seen = new Set();
  return list.filter((s) => {
    const key = s.t.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (seen.has(key)) {
      console.warn(`  duplicate dropped: ${slug} :: ${s.t}`);
      return false;
    }
    seen.add(key);
    return true;
  });
}

export const stations = meta.map((st) => ({
  ...st,
  songs: dedupe(st.slug, SONGS[st.slug] || []),
}));

export function searchQuery(song) {
  if (song.q) return song.q;
  const parts = [song.t];
  if (song.f) parts.push(song.f);
  else if (song.a) parts.push(song.a);
  parts.push('song');
  return parts.join(' ');
}
