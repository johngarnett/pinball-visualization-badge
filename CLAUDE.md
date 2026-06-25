# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
node src/render.js   # render pie.jpg and machines.jpg
npm start            # same as above
```

No build step, no tests, no linter configured.

## What this does

Generates a 360×360 JPEG (`pie.jpg`) intended for a round LCD badge display. It reads `results.csv` (columns: `result,opponent,machine`) and renders a clock-face pie chart of pinball tournament results — 12 slices, one per match round, green for wins, red for losses.

## Architecture

Everything lives in `src/render.js` as a single ES module (no framework, no bundler). Entry point is `render()` at the bottom of the file.

**Rendering pipeline (in call order):**
1. `parseResults` — reads `results.csv`, pads to 12 rounds
2. `drawSliceFills` — fills pie slices with win/loss/unplayed colors
3. `drawBorders` — white radial dividers + outer circle
4. `computeTextMetrics` — sizes the initials font to fit the slice chord; derives `baseRadius` (where letter baselines sit) and `innerRadius` (inner white circle radius)
5. `drawInnerCircle` — white ring at `innerRadius`
6. `drawStartMarker` — black triangle at 12 o'clock on inner circle marking round 1
7. `drawInitials` — opponent initials arc-placed along `baseRadius`, each letter individually rotated to be tangent to the circle
8. `drawMachineNames` — polar-warp technique: renders machine name into a scratch rectangle, then maps each pixel to the corresponding pie-slice region via `(r, θ)` coordinates
9. `saveMachinesDebug` — writes `machines.jpg` showing the 12 pre-transform rectangles stacked for inspection

**Polar warp (machine names):**
The scratch rectangle has `width = innerRadius * 2`, `height = arc length of one slice`. Pixel mapping: `sx = (1 - r/innerRadius) * rectWidth` (x=0 is inner circle, x=rectWidth is center), `sy = (1 - dtheta/SLICE_ANGLE) * rectHeight`. Letters shrink naturally toward the center because smaller `r` maps to a narrower arc region. No horizontal scaling is applied; long names clip at the right edge of the rectangle.

**Key constants to tune:**
- `MACHINE_TEXT_OFFSET` — left margin in scratch rectangle; controls how far from the inner circle the text begins
- `MACHINE_HEIGHT_FILL` — cap height as fraction of rectangle height (currently 2/3)
- `TEXT_OUTER_MARGIN` — gap between outer circle and initials cap tops, and between baselines and inner circle
- `MARKER_HEIGHT` / `MARKER_WIDTH` — triangle size
