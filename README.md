# Strikes

Renders pinball tournament results as a 360×360 JPEG image for a round LCD badge display. The image shows a clock-face pie chart with 12 slices — one per match round — colored green for wins and red for losses.

## Installation

Requires [Node.js](https://nodejs.org/) v18 or later.

```bash
npm install
```

## Usage

1. Create a `results.csv` file in the project root (see format below).
2. Run:

```bash
npm start
```

This writes two files:
- `pie.jpg` — the 360×360 badge image
- `machines.jpg` — a debug view of the machine name rectangles before polar transformation

## results.csv format

```
result,opponent,machine
win,MLA,BKSoR
loss,CLC,CFTBL
win,MAT,AIQ
```

| Column | Values | Description |
|--------|--------|-------------|
| `result` | `win`, `loss`, or `pending` | Outcome of the match (`pending` colors the slice blue) |
| `opponent` | 1–3 capital letters | Opponent's initials |
| `machine` | any string | Pinball machine name |

- The first row must be the header `result,opponent,machine`.
- Rows are ordered chronologically; the first data row corresponds to the 12 o'clock slice.
- Up to 12 rounds are supported. Fewer than 12 rows leaves the remaining slices unplayed (black).
