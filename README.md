# Project Sekai Countdown & Rotation Tracker

Live **"days since"** drought clocks, focus event rotation matrices, limited 4★ trackers, and Virtual Singer SEKAI sub-unit breakdowns for *Project SEKAI: COLORFUL STAGE! feat. Hatsune Miku* (JP schedule, EN/JA bilingual).

Deploys to `https://mting314.github.io/sekai-countdown/` via GitHub Pages (`deploy.yml`).

## Pages / Cuts

| Path | What it shows |
| --- | --- |
| `/` | **Overview Hub**: Live/upcoming JP event countdown banner, 6-category transparent card-cutout podiums, active all-time record waits, and a 26-character `@countdown_prsk` quick grid |
| `/focus` | **Focus & Rotation**: 5-unit focus pacing, per-unit Cycle 1→N matrix with Cycle Jump / Queue Jump badges, waiting-member highlights, and Hakolim toggle |
| `/cards` | **4★ & Lim Jail**: Hairstyle Lim 4★ (with World Link & Collab toggles), Any 4★, ColorFes & BloomFes (plus the BloomFes Waiting Room), Permanent 4★, and Event 3★/2★ |
| `/virtual-singers` | **Virtual Singers**: Unit-focus VS 4★ / card / commissioned-song vocal slots, 6×5 SEKAI sub-unit matrix (`supportUnit`), and dedicated VS banner focuses |
| `/mixed-attrs` | **Mixed & Attributes**: 26×5 card attribute starvation heatmap (All 4★ vs. Lim 4★) and Mixed event banner/lineup droughts |
| `/extras` | **Songs, Duos & Stamps**: Another Vocal cover droughts, unit song/3DMV/2DMV pacing, Co-4★ Banner Duo explorer, and character illustration stamp droughts |
| `/characters/:id` | **Character Dossier**: Full transparent card cutout hero, all personal drought clocks, 5-attribute breakdown, and chronological 4★ release/gap timeline |

## Hybrid Data Pipeline

- **Build-time snapshot (`bun run fetch:data`)**: Joins JP + EN tables from `Sekai-World/sekai-master-db-diff` into `data/sekai/snapshot.json` for zero-spinner prerendering.
- **Client-side live sync**: Checks `versions.json` on `sekai-world.github.io` in the background (with IndexedDB cache + manual **Sync DB** button) so newly preloaded JP events/gachas appear immediately.
- **Assets**: Hotlinked from `storage.sekai.best/sekai-jp-assets` with `referrerPolicy="no-referrer"`, paired with bundled unit, character, SEKAI sub-unit Miku, attribute, and rarity icons under `public/assets/sekai/`.

## Development

```bash
bun install
bun run fetch:icons
bun run fetch:data
bun dev                                        # http://localhost:3000
bun run check                                  # oxlint + eslint + tsc
bun node_modules/vitest/vitest.mjs run         # unit tests
PUBLIC_ENV__BASE_URL=/sekai-countdown bun run ci:build
```
