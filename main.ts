// Ember Duel — make.fun entry for best-card-game-20261122-1826 (Node 22,
// standard library only).
//
// A complete, original card duel that plays offline in a desktop browser
// from static files: game/index.html + game/style.css + game/game.js, with
// no network request at all. You (the Ember Knight) duel the AI Gloom
// Warden: 30 life each, mana grows +1 per turn (max 10), draw a card each
// turn, play cards by clicking them or pressing 1-7, Space ends the turn.
// First life total to 0 loses. Four elements, twelve cards: Ember burns,
// Tide heals and draws, Stone shields and crushes, Gale is fast and sharp.
// Shield absorbs damage before life does. All art is CSS and all sound is
// synthesised WebAudio; the game loads no outside file.
//
// This program hands the entry in: it copies game/ and screenshots/ from
// beside this file into the output directory and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. Fully deterministic: every run writes the same bytes
// (plain file copies plus a dossier built from the same inputs). No
// network, no clock, no randomness.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
