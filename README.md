# Balatro-lite (static, no build)

A tiny Balatro-inspired poker roguelite that runs as a static site (no build tools). Works on GitHub Pages.

## Run locally
Open `index.html` in your browser, or use VS Code’s Live Server.

## Controls
- Left click: select cards (drag to paint)
- Right click: deselect (drag to paint)
- Double-click a rank: select that rank up to the cap
- Space: Play hand
- D: Discard selected
- R / U / N: Sort by Rank / sUit / None
- Shop hotkeys: 1–9 to buy (via focus + enter/space), Enter/Esc: Proceed

## Loop
Beat Goal → Shop (buy or reroll, payout +$5 on open) → Proceed (Small → Big → Boss → Ante+1) → new Goal.

## Accessibility / QoL
- Colorblind suit hues (♠ blue, ♥ orange, ♣ green, ♦ purple)
- Big money readout
- No text selection while dragging

## Roadmap
- Settings (SFX mute, animation speed)
- Boss blinds modifiers
- Real planet cards & Joker set
