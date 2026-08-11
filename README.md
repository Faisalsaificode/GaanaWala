# Gaana Wala — *Find Your Next Gaana Wala*

A directory of Indian places, each with its own radio station. The barber's. The truck
cabin at 2am. The tapri at golden hour. Pick a place from the homepage and press play.

**14 stations · 168 songs**, all playing through YouTube's own player.

| | |
|---|---|
| Saloon Wala | सैलून वाला — the ₹30 haircut canon |
| Truck Wala | ट्रक वाला — Horn OK Please, 2am |
| Bus Wala | बस वाला — window seat, morning ghat |
| Auto Wala | ऑटो वाला — speaker bigger than the meter |
| Chai Tapri | चाय टपरी — golden hour, cutting chai |
| Gym Wala | जिम वाला — last set, no spotter |
| Shaadi Wala | शादी वाला — baraat is not moving |
| Dhaba Wala | ढाबा वाला — charpai, dal makhani, 1am |
| Paan Wala | पान वाला — meetha, extra gulkand |
| Mandir Wala | मंदिर वाला — 5am, bell and loudspeaker |
| Qawwali Wala | कव्वाली वाला — dargah courtyard, after Isha |
| Train Wala | ट्रेन वाला — side upper, 3am, chai |
| Barish Wala | बारिश वाला — first rain, grille open |
| Padhai Wala | पढ़ाई वाला — table lamp, 2am, exam in six days |

## How it is put together

Plain HTML, CSS and JavaScript — no framework, no dependencies, no build tooling beyond
Node itself. That is deliberate: GitHub Pages serves static files, and everything here is
static files.

```
tools/stations.mjs      station identity: names, copy, colours, art, hours
tools/songs/<slug>.mjs  one file per station, ~100 curated songs each
tools/seed.mjs          composes the two above, drops duplicate titles
tools/resolve-youtube   seed → verified video ids → data/library.json
data/library.json       the whole library, generated
tools/art.mjs           the 14 scene illustrations, as inline SVG
tools/build.mjs         library.json → index.html + s/<slug>/index.html
tools/serve.mjs         local preview server
tools/check-embeds.mjs  drives real Chrome: does it play, is everything embeddable
tools/check-counters    visitor-counter UI, no Firebase needed
tools/check-firebase    visitor counters end to end against the live database
assets/                 css + js shared by every page
index.html, s/          generated — do not hand-edit
```

Each page has its own data inlined, so there is no runtime `fetch` and no CORS to worry
about. Every link is relative, so the site works unchanged from a repo sub-path
(`user.github.io/GaanaWala/`) or a custom domain at the root.

### Music and rights

Nothing is hosted here. Every track plays through YouTube's embedded player, so the
labels, composers and performers get exactly the view they would get anywhere else on
YouTube. All rights remain with them. If you hold rights to something here and want it
gone, open an issue.

## Working on it

```bash
npm run build     # regenerate the site from data/library.json
npm run serve     # preview at http://localhost:8099
npm start         # both
```

### Adding a station or changing songs

1. Add songs to `tools/songs/<slug>.mjs` as `{ t, f, y }` (title, film, year).
   Use `a` for non-film artists, and `q` to override the search query when a
   title is ambiguous — `q` is how you steer the resolver away from a cover, a
   remix or a jukebox and onto the recording you actually mean.
2. `npm run resolve` — finds and **verifies** a YouTube id for anything new.
   Existing ids are cached and left alone, so this only costs time for what you
   added. `npm run resolve:force` redoes everything from scratch.
3. `npm run build`.

A new station needs a block in `tools/stations.mjs`, a `tools/songs/<slug>.mjs`
file, a matching entry in the `SONGS` map in `tools/seed.mjs`, and a scene in
`tools/art.mjs` under the key you set as `art`.

Duplicate titles inside one station are dropped automatically at build time and
reported, so it is safe to append without checking the whole list first.

The resolver runs three lookups at a time (`--jobs N`, max 6). Higher is not
faster: YouTube throttles bursts and the backoff costs more than the
parallelism saves. It also saves after every station, so a long run can be
interrupted and picked up again.

### Checking it still works

```bash
npm run serve          # in one terminal
npm run check          # in another
```

`check` launches headless Chrome, confirms stations actually start playing, then cues
all 168 videos and reports any that YouTube refuses to embed. Rights holders can disable
embedding at any time, so it is worth re-running occasionally. Anything it flags needs a
new `q` in `seed.mjs` followed by `resolve` + `build`.

The player also handles this at runtime: if a video turns out to be unplayable it gets
marked and skipped rather than stalling the station.

## Visitor counters

The homepage shows **how many people are on the site right now** and **how many visits
there have been in total**; station cards show a live count each, and a station page
shows how many people are listening to that station.

"Right now" is real presence, not an estimate. Every open tab holds a node in a Firebase
Realtime Database with an `onDisconnect` handler, so closing the tab — or losing the
network — removes it within seconds. A total is counted once per browser session, not
once per page view.

GitHub Pages is static and cannot count anything on its own, so this needs one free
service behind it. Setup is about three minutes:

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
   Analytics is not needed.
2. **Build → Realtime Database → Create Database**. Pick a region, start in **locked
   mode**.
3. Open the **Rules** tab, replace everything with the contents of
   [`firebase-rules.json`](firebase-rules.json), and **Publish**. These rules allow
   anonymous reads, let the visit counter only ever go up by one, and restrict presence
   nodes to a fixed shape.
4. **Project settings → General → Your apps → Web (`</>`)** → register the app → copy
   `apiKey`, `projectId` and `databaseURL` from the config it shows you.
5. Paste those three values into [`assets/js/config.js`](assets/js/config.js), commit,
   push.

That is all — no build change, and the counters appear on the next deploy.

**On committing the keys:** Firebase web config is public by design. It ships in the
JavaScript of every Firebase web app. What protects the database is the rules in step 3,
not secrecy of the key.

**If you skip this entirely**, the counters simply never appear and nothing else changes.
Same if Firebase is down or blocked by an ad blocker: the numbers stay hidden rather than
showing something wrong.

**Free tier limits:** 100 simultaneous connections. That is 100 people on the site at the
same moment, which is a lot — but if this takes off, that is the ceiling to watch.

```bash
npm run check:counters   # verifies the counter UI without needing a Firebase project
```

## Deploying to GitHub Pages

Live at **https://gaanawala.run.place**

```bash
git init
git add .
git commit -m "Gaana Wala"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then **Settings → Pages → Source: GitHub Actions**. The included workflow
(`.github/workflows/pages.yml`) rebuilds and deploys on every push to `main`.

If you would rather not use Actions, the generated files are committed too — set
**Source: Deploy from a branch → main → / (root)** and it works as-is. `.nojekyll` is
present so the build is served verbatim.

### The custom domain

`CNAME` holds the domain and is the **single source of truth**: GitHub Pages reads it to
route the domain, and `tools/build.mjs` reads the same file to write canonical links,
`og:url` and `sitemap.xml`. Change the domain in one place and everything follows.

DNS — `gaanawala` is a subdomain, so one record does it:

| Type | Host | Value |
|---|---|---|
| CNAME | `gaanawala` | `<your-github-username>.github.io` |

Note the value is your **user** subdomain, not the repo — no `/repo` path, no trailing
slash. Then **Settings → Pages → Custom domain** → `gaanawala.run.place` → Save, wait for
the DNS check to go green, then tick **Enforce HTTPS** (the certificate can take up to an
hour to issue).

Do not delete `CNAME` — losing it drops the domain on the next deploy.

## Credit where it is due

The genre was mapped out by [deluxesaloon.space](https://www.deluxesaloon.space/),
[chaitapri.wtf](https://chaitapri.wtf/), [safar](https://safaraudio.netlify.app/) and
[Tapri FM](https://taprichai.merakida.com/). This one is the directory none of them had.
