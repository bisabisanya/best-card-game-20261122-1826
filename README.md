# Ember Duel — best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/bisabisanya/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/bisabisanya/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Ember Duel** is a complete, original card game that plays offline in a
desktop browser from its own files — no network, no build step, no server.

You are the Ember Knight, duelling the AI Gloom Warden. Both start with
30 life. Each turn you gain +1 mana (up to 10) and draw a card. Play cards
by clicking them or pressing **1–7**; **Space** ends your turn. Bring the
Warden's life to 0 to win.

## The four elements

- **Ember** burns: Flame Lash, Ember Strike, Ember Blast
- **Tide** heals and draws: Tide Mend, Deep Current, Tide Surge
- **Stone** shields and crushes: Stone Wall, Stone Fist, Boulder
- **Gale** is fast and sharp: Gale Rush, Gale Slice, Storm Call

Shield absorbs damage before life does. All art is CSS, all sound is
synthesised WebAudio.

## Play it

Open `game/index.html` in a desktop browser and press **START DUEL**.

## Files

- `main.ts` — the make.fun program (Node 22): copies the game, its
  screenshots and the dossier into the output directory
- `game/index.html`, `game/style.css`, `game/game.js` — the game itself
- `screenshots/` — 4 real renders of the game: title, table, victory, defeat
- `DOSSIER.md` — the game's dossier

## Run the program

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built for the [make.fun](https://make.fun/bounty/best-card-game-20261122-1826)
bounty "Make the best card game" — referral: https://make.fun/r/7y4jdpfs
