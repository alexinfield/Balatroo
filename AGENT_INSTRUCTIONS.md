# Project Brief: **Balatro-lite** (Static Web, No Build)

You are the dev agent for a tiny, Balatro-inspired poker roguelite that runs as a static site (GitHub Pages). We already have a working MVP using **React + Tailwind via CDN** and **Babel Standalone** (no bundler). Your job is to keep it simple, make it stable, and iterate the *feel* (animations & UX), not to re-platform.

## Non-negotiables

* **No build tooling.** Do **not** introduce Node/npm, Vite, Webpack, Next.js, or server routes.
* **Static deploy only** (GitHub Pages). All assets must load via relative paths. No absolute `/` routes.
* **One page app**: `index.html` + `styles.css` + `src/app.jsx` (Babel compiles JSX in the browser).
* **No external game assets** (images, audio) unless they’re original or license-clear. We’re using emojis + CSS only.
* **Mouse-first UX**, **colorblind-friendly suits**, **sticky sorting**, **readable money**.
* **Scoring suspense**: do **not** reveal the final total until the animation completes.

## Current Feature Set (must keep)

* Left-click selects cards; **left-drag** paints selection.
* Right-click deselects; **right-drag** paints deselection; context menu is suppressed.
* Double-click on a rank selects that rank up to the play cap.
* **Sort**: Rank / Suit / None. Sort **sticks** across draws and after Proceed.
* HUD shows: **Ante, Blind, Goal, Score, Hands, Discards, Money** (money must be large/readable).
* **Play**: removes selected cards, quick “pop” animation on those cards, then a center **scoring animation**: chips count up → multiplier ramps → big total; only then apply score.
* **Discard**: discards selected cards and draws up to hand size; discards are limited per blind.
* Blind loop: **Small → Big → Boss → Ante+1**, with a new **Goal** each step.
* **Shop** appears only after beating the goal. Items: Hand Size +1, +1 Discard next blind, +$5. **Reroll = -$1**. Proceed closes shop and advances the loop.
* Preview pill shows **“N selected”** (no math spoilers).

## Tech & Files

```
balatro-lite/
├─ index.html         # Tailwind CDN, React UMD, Babel Standalone, mounts <App/>
├─ styles.css         # Global tweaks and keyframes (no build)
├─ src/
│  └─ app.jsx         # All app logic (React)
├─ README.md
├─ LICENSE (MIT)
└─ .gitignore
```

* **React** & **ReactDOM** via UMD, **Babel** via Standalone (data-presets="react") compile `src/app.jsx` at runtime.
* **Tailwind** via CDN. Use utility classes; don’t add custom frameworks or CSS resets.
* **No routing**, no hash-routing. Everything is on one page.

## Target devices & compatibility

* Must run on a **2021 MacBook Pro** in Safari and Chrome (no extensions required).
* Works on GitHub Pages URL like `https://<user>.github.io/balatro-lite/`.
* No service workers, no localStorage reliance for core loop.

---

## Acceptance Criteria (Definition of Done)

1. **Local run**: Opening `index.html` directly or via VS Code Live Server shows the game and it plays a full loop without console errors.
2. **Selection UX**: left-drag selects, right-drag deselects; context menu is suppressed; no accidental text selection.
3. **Sticky sort**: select Rank/Suit/None → deal/draw/proceed preserves the chosen mode without requiring a second click.
4. **Scoring suspense**: After pressing **Play**, final score is hidden; cards “pop”; chips count up, multiplier ramps, total reveals; score applies at the **end**. Inputs are locked during the animation.
5. **Readable money**: money is a large badge in the header and in the shop; values never overflow or overlap.
6. **Shop**: opens only when goal met; shows 3 items; **Reroll** costs $1; **Proceed** advances Small→Big→Boss→Ante+1; buying updates money and item effects immediately.
7. **No build tools**: repo contains only the files listed above; everything loads with CDN links; no node_modules.

---

## Known Bugs to Watch & Prevent

* **Double-click sort bug** (needing two clicks): caused by applying sort without passing the current mode. Always call `applySort(list, mode)` with explicit `mode`.
* **Money visual overflow**: badge must be big enough; test at $99+.
* **Shop payout spikes**: payout on shop open is **flat +$5**; do not add leftover hands or other bonuses unless asked.
* **Animation input leaks**: while `s.anim === true`, **disable Play/Discard/Reroll/Proceed** and ignore hotkeys.
* **Drag state undefined**: ensure `drag` and `dragMode` are initialized in state.

---

## Coding Constraints & Style

* Keep logic compact; prefer pure helpers for: deck make/shuffle, hand eval, sorting, animation tick.
* Use **functional `setState`** everywhere you derive from current state.
* Avoid heavy abstractions; no custom hooks unless it reduces code size materially.
* Tailwind utilities only; keep `styles.css` minimal (keyframes + drag text-selection rules).

---

## State Model (authoritative)

```js
{
  deck: Card[], hand: Card[], discard: Card[],
  ante: number, blind: "Small"|"Big"|"Boss", goal: number, score: number,
  hands: number, discards: number, handSize: number, maxPlay: number,
  money: number, sort: "none"|"rank"|"suit",
  inShop: boolean, shop: {id:string,label:string,price:number}[],
  anim: boolean, aChips: number, aMult: number, aTotal: number,
  aHand: string, aTier: string, aTierColor: string,
  fx: number[], drag: boolean, dragMode: null|"add"|"remove"
}
```

* **Card**: `{ id:number, suit:"♠"|"♥"|"♣"|"♦", rank:2..14 }`
* **Goal**: `round(300 * 1.45^(ante-1) * blindMult)`, where `blindMult = 1 | 1.6 | 2.4`.

---

## UX/Animation Spec (authoritative)

* **Card pop**: played cards animate with `@keyframes pop` (translateY -42px, slight scale up, fade).
* **Scoring panel** (`s.anim === true`):

  * Show `{handName} • {tierBadge}` line (tiers: Common, Uncommon, Rare, Epic, Legendary).
  * **Phase 1 (0–650ms)**: `aChips` counts from base to base+chips, `aMult=1`.
  * **Phase 2 (650–1450ms)**: `aMult` ramps 1→final; `aTotal = round(aChips * aMult)` each tick.
  * **Apply** final score at ~1550ms; set `s.anim=false`.
* **No spoilers**: the felt preview shows only `"{N} selected"`—no hand type, no math, no total until animation.

---

## Keyboard Map

* **Space** = Play
* **D** = Discard
* **R/U/N** = Sort Rank / sUit / None
* **Enter/Esc** in Shop = Proceed

---

## Shop Rules

* Appears only when `score >= goal`.
* Items (3 random, no duplicates per open):

  * `hand+1` → `handSize = min(9, handSize+1)`
  * `discard+1` → `discards += 1` (for next blind)
  * `money+5` → `money += 5`
* **Reroll**: replaces all 3 items; costs `$1`; cannot go negative.
* **Proceed**: advances Small→Big→Boss→Ante+1; reshuffle full shoe; deal `handSize`; reset `score=0,hands=4,discards=3`.

---

## Tasks for You (Agent)

### Task 0 — Understand constraints

* Do not add build steps.
* Keep the file structure and CDN approach.
* All changes should be incremental.

### Task 1 — Repo sanity

* Ensure the repo contains only: `index.html`, `styles.css`, `src/app.jsx`, `README.md`, `LICENSE`, `.gitignore`.
* Verify all `<script>` and `<link>` tags in `index.html` resolve.

### Task 2 — Functional QA (must pass)

Run through these **manually** (since there’s no test runner):

1. Open `index.html`. No console errors.
2. Select 5 cards via **left-drag**; press **Space**. Cards **pop**; scoring panel animates; final score increments at the end; hands--.
3. **Discard** works and draws to hand size; discards--.
4. **Sort** set to Rank; **discard** then **play**; verify sorting persists with no extra clicks.
5. Beat Goal; **Shop** opens. Buy an item; money decreases; effect applies. **Reroll**; money-1; items change. **Proceed**; loop advances; hand dealt; sort persists.
6. Money badge remains readable at $0–$100+.

If any step fails, fix it in `src/app.jsx` without changing the architecture.

### Task 3 — Stability fixes (if needed)

* Guard inputs when `s.anim === true`.
* Keep `drag`/`dragMode` resets on `mouseup` and `mouseleave`.
* Ensure `openShop()` is only triggered once per blind (use `s.inShop` gate as implemented).

### Task 4 — GitHub Pages deploy

* Ensure **relative paths** in `index.html` (`./styles.css`, `./src/app.jsx`).
* In repo Settings → Pages: Branch `main`, folder `/ (root)`. Confirm site loads.

---

## Future Work (if asked later; not now)

* Settings modal: animation speed slider, SFX toggle (WebAudio “bleeps” only).
* **Deck viewer** & remaining deck stats.
* Better felt skin & ambient particles (CSS-only).
* Planet cards & a small curated Joker set (still license-safe, original names/icons).

---

## What to Avoid

* Don’t import images/spritesheets from Balatro or 3rd-party wikis.
* Don’t move to ESM modules or change from UMD unless explicitly requested.
* Don’t add dependencies (GSAP, lodash, redux, etc.). Keep it light.

---

## Quick Reference (file snippets the agent may need)

### `index.html` essentials

* Tailwind CDN, React UMD, Babel Standalone.
* `<script type="text/babel" data-presets="react" src="./src/app.jsx"></script>`

### `styles.css` essentials

* `@keyframes pop` used by card pop.
* `user-select: none` + `onDragStart={e=>e.preventDefault()}` in root container.

### `src/app.jsx` hotspots (where bugs usually are)

* `applySort(list, mode)` — always pass **mode**.
* `play()` — set `s.anim=true`, run interval, **apply score at end**.
* `openShop()` — set `inShop:true` once per blind.
* `proceed()` — update ante/blind/goal, reshuffle, **preserve sort**.

---

## Deliverable

A working static site (local & GitHub Pages) that matches the feature set + acceptance criteria above, with no console errors, and clean, readable UI. If you need to refactor, keep the 3-file architecture and do not add a build step.

---

That’s the whole playbook. Paste this into the agent and let it run. If it gets confused or tries to add tooling, stop it and point it at the **Non-negotiables** section.
