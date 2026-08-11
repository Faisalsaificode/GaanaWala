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
data/library.json      the whole library: stations, songs, verified YouTube ids
tools/seed.mjs         hand-curated source of truth (titles, films, years)
tools/resolve-youtube  seed.mjs → verified video ids → data/library.json
tools/art.mjs          the 14 scene illustrations, as inline SVG
tools/build.mjs        library.json → index.html + s/<slug>/index.html
tools/serve.mjs        local preview server
tools/check-embeds.mjs drives real Chrome: does it play, is everything embeddable
assets/                css + js shared by every page
index.html, s/         generated — do not hand-edit
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

1. Edit `tools/seed.mjs` — add a station block, or add songs as `{ t, f, y }`
   (title, film, year). Use `a` for non-film artists and `q` to override the
   search query when a title is ambiguous.
2. `npm run resolve` — finds and **verifies** a YouTube id for anything new.
   Existing ids are cached and left alone; `npm run resolve:force` redoes everything.
3. `npm run build`.

A new station also needs a scene in `tools/art.mjs` under the key you set as `art`.

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
