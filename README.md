# GET EXCITED 💥

League of Legends **build damage calculator** and **fight simulator**.
Pick a champ, items, runes → see time-to-kill, DPS, burst, effective HP,
and watch the fight play out second by second.

**Live:** https://sussy0603.github.io/get-excited/

Made by Suzy Bérubé-Robichaud.

---

## Run it on your computer

```bash
npm install
npm run dev      # opens http://localhost:5173/get-excited/
npm test         # runs the math tests
npm run build    # makes the final site in /dist
npm run deploy   # builds and publishes to GitHub Pages
```

---

## How the code is organized (the 5-line tour)

1. **`src/engine/`** — pure math, no React. `stats.js` (champ + items → numbers), `damage.js` (armor/MR), `sim.js` (the fight, 0.05s at a time), `metrics.js` (TTK, DPS, EHP).
2. **`src/data/`** — what things DO. `champs/` (one entry per champion's Q W E R), `itemEffects.js`, `runes.js`, `targets.js`. Riot's data (`ddragon.js`) gives names, icons and base stats.
3. **`src/state/store.jsx`** — the app's memory: one object, saved in the browser, can be squeezed into a share link.
4. **`src/components/`** — reusable pieces: the build editor, pickers, charts, arena replay, fight log.
5. **`src/screens/`** — one file per tab: Calculator, Enemy team, Team fight, Compare, Saved, Overlay.

Rule of thumb: **the screens never do math**. They call the engine and draw the result.

---

## Adding or fixing a champion

Open `src/data/champs/marksmen.js` (or `meta.js`). Each champ looks like:

```js
Jinx: {
  spells: {
    W: S([8, 7, 6, 5, 4], 1450, [dmg(P, [10, 60, 110, 160, 210], { ad: 1.6 })]),
  },
  combo: ['W', 'E', 'R'],
}
```

- `S(cooldown, range, effects)` — a spell
- `dmg(type, base, ratios)` — damage. Arrays = one value per rank.
- `P` physical, `M` magic, `T` true
- Ratios: `ad`, `bad` (bonus AD), `ap`, `thp` (% target max HP), `tmiss` (% missing HP)…

Run `npm test` — there's a test that makes sure **every** champ can fight without crashing.

## ✅ Verifying a champion (the "verified" badge)

1. In the Practice Tool, set the same level + items.
2. Hit the dummy with each ability. Compare the number to the fight log.
3. If it's within ~2%, add the champ id to `VERIFIED` in `src/data/champs/index.js`.

---

## Known limits (honest list)

- Crits use the **average** (no luck) so results are repeatable.
- Mana/energy are ignored.
- Positioning mode is a simple model (move, kite, dash). Good for "who gets there first", not exact.
- **All 171 champions have ability files.** 43 are detailed kits (all marksmen + 15 popular champs). The other ~128 are **simplified kits** (main damage, CC, shields/heals — yellow badge).
- Support heals/shields go on themselves (no ally targeting yet).
- Old patches (patch picker): items and base stats change, but ability numbers are from the current patch.
- Champions added after this was written only basic-attack (⚠ badge) until a kit is added.
- Lethality formula: check `LETHALITY_SCALES_WITH_LEVEL` in `src/engine/damage.js` each season.

## Import a real match

Click **📥 Import a match** on the Calculator. It needs a tiny free server
that keeps the Riot API key secret — setup steps in [`worker/README.md`](worker/README.md).

## Later

1. Verify kits in the Practice Tool (Jinx first) → green "verified" badges
2. Upgrade the most-played simplified kits to detailed ones
3. Support heals/shields on allies in Team fight

---

Get Excited isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
