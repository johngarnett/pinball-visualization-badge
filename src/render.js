import { createCanvas } from 'canvas'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Layout constants
const CANVAS_SIZE = 360
const CENTER_X = 180
const CENTER_Y = 180
const RADIUS = 180
const BORDER_RADIUS = 179
const NUM_SLICES = 12
const SLICE_ANGLE = (2 * Math.PI) / NUM_SLICES
const HALF_SLICE = SLICE_ANGLE / 2
const TOP_ANGLE = -Math.PI / 2

// Style constants
const COLOR_WIN = '#009A44'
const COLOR_LOSS = '#CC1414'
const COLOR_PENDING = '#0055CC'
const COLOR_UNPLAYED = '#000000'
const COLOR_BORDER = '#FFFFFF'
const COLOR_TEXT = '#000000'
const COLOR_BACKGROUND = '#000000'
const COLOR_MARKER = '#000000'
const COLOR_MACHINE_TEXT = '#FFFF00'
const MACHINE_TEXT_OFFSET = 20
const LINE_WIDTH = 2
const FONT_FAMILY = 'sans-serif'
const MACHINE_FONT_FAMILY = 'Arial Narrow, sans-serif'
const FONT_WEIGHT = 'bold'
const MACHINE_HEIGHT_FILL = 2 / 3  // cap height as fraction of rect height
const TEXT_SIZE_PROBE = 'WWW'
const TEXT_FIT_MARGIN = 4
const TEXT_OUTER_MARGIN = 8
const FONT_SIZE_MAX = 40
const FONT_SIZE_MIN = 6
const MARKER_HEIGHT = 10
const MARKER_WIDTH = 10

function parseResults(csvPath) {
  const lines = fs.readFileSync(csvPath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const dataRows = lines.slice(1).slice(0, NUM_SLICES)

  const rounds = dataRows.map(line => {
    const parts = line.split(',')
    const result = (parts[0] || '').trim().toLowerCase()
    const opponent = (parts[1] || '').trim().toUpperCase()
    const machine = (parts[2] || '').trim()
    return {
      result: ['win', 'loss', 'pending'].includes(result) ? result : 'unplayed',
      opponent,
      machine
    }
  })

  while (rounds.length < NUM_SLICES) {
    rounds.push({ result: 'unplayed', opponent: '' })
  }

  return rounds
}

function sliceCenterAngle(i) {
  return TOP_ANGLE + i * SLICE_ANGLE
}

function sliceColor(result) {
  if (result === 'win') return COLOR_WIN
  if (result === 'loss') return COLOR_LOSS
  if (result === 'pending') return COLOR_PENDING
  return COLOR_UNPLAYED
}

// Returns fontSize and the base circle radius where letter baselines sit
function computeTextMetrics(ctx) {
  const chord = 2 * BORDER_RADIUS * Math.sin(HALF_SLICE)
  const maxWidth = chord - TEXT_FIT_MARGIN
  let fontSize = FONT_SIZE_MAX
  ctx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`
  while (ctx.measureText(TEXT_SIZE_PROBE).width > maxWidth && fontSize > FONT_SIZE_MIN) {
    fontSize -= 1
    ctx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`
  }
  // Cap height = distance from baseline to top of a capital letter
  const capHeight = ctx.measureText('M').actualBoundingBoxAscent
  const capHeightRatio = capHeight / fontSize
  // Place cap tops TEXT_OUTER_MARGIN inside the outer border
  const baseRadius = BORDER_RADIUS - TEXT_OUTER_MARGIN - capHeight
  const innerRadius = baseRadius - TEXT_OUTER_MARGIN
  return { fontSize, baseRadius, innerRadius, capHeightRatio }
}

function drawSliceFills(ctx, rounds) {
  for (let i = 0; i < NUM_SLICES; i++) {
    const center = sliceCenterAngle(i)
    ctx.beginPath()
    ctx.moveTo(CENTER_X, CENTER_Y)
    ctx.arc(CENTER_X, CENTER_Y, RADIUS, center - HALF_SLICE, center + HALF_SLICE)
    ctx.closePath()
    ctx.fillStyle = sliceColor(rounds[i].result)
    ctx.fill()
  }
}

function drawBorders(ctx) {
  ctx.strokeStyle = COLOR_BORDER
  ctx.lineWidth = LINE_WIDTH

  for (let i = 0; i < NUM_SLICES; i++) {
    const angle = sliceCenterAngle(i) - HALF_SLICE
    ctx.beginPath()
    ctx.moveTo(CENTER_X, CENTER_Y)
    ctx.lineTo(
      CENTER_X + RADIUS * Math.cos(angle),
      CENTER_Y + RADIUS * Math.sin(angle)
    )
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, BORDER_RADIUS, 0, 2 * Math.PI)
  ctx.stroke()
}

function drawInnerCircle(ctx, baseRadius) {
  // Same gap below baseline as above cap tops
  const innerRadius = baseRadius - TEXT_OUTER_MARGIN
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, innerRadius, 0, 2 * Math.PI)
  ctx.strokeStyle = COLOR_BORDER
  ctx.lineWidth = LINE_WIDTH
  ctx.stroke()
}

function drawStartMarker(ctx, baseRadius) {
  const innerRadius = baseRadius - TEXT_OUTER_MARGIN
  // Triangle at 12 o'clock on the inner circle, pointing toward center
  const tipX = CENTER_X
  const tipY = CENTER_Y - innerRadius + MARKER_HEIGHT
  const baseY = CENTER_Y - innerRadius
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX - MARKER_WIDTH / 2, baseY)
  ctx.lineTo(tipX + MARKER_WIDTH / 2, baseY)
  ctx.closePath()
  ctx.fillStyle = COLOR_MARKER
  ctx.fill()
}

function drawInitials(ctx, rounds, fontSize, baseRadius) {
  ctx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`
  ctx.fillStyle = COLOR_TEXT
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  for (let i = 0; i < NUM_SLICES; i++) {
    const { opponent } = rounds[i]
    if (!opponent) continue

    const sliceCenter = sliceCenterAngle(i)

    // Measure each character individually
    const charWidths = [...opponent].map(ch => ctx.measureText(ch).width)
    const totalWidth = charWidths.reduce((s, w) => s + w, 0)

    // Start angle centers the string on the slice using arc length = radius * angle
    let currentAngle = sliceCenter - totalWidth / (2 * baseRadius)

    for (let j = 0; j < opponent.length; j++) {
      const w = charWidths[j]
      const charCenterAngle = currentAngle + w / (2 * baseRadius)

      const x = CENTER_X + baseRadius * Math.cos(charCenterAngle)
      const y = CENTER_Y + baseRadius * Math.sin(charCenterAngle)

      // Baseline is tangent to base circle; cap top points outward
      const rotation = charCenterAngle + Math.PI / 2

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.fillText(opponent[j], -w / 2, 0)
      ctx.restore()

      currentAngle += w / baseRadius
    }
  }
}

function machineRectDims(innerRadius) {
  const TWO_PI = 2 * Math.PI
  const rectWidth = Math.ceil(innerRadius * 2)
  const rectHeight = Math.ceil(TWO_PI * innerRadius / NUM_SLICES)
  return { rectWidth, rectHeight }
}

function drawMachineNames(ctx, rounds, innerRadius) {
  const TWO_PI = 2 * Math.PI
  const { rectWidth, rectHeight } = machineRectDims(innerRadius)

  const scratch = createCanvas(rectWidth, rectHeight)
  const sctx = scratch.getContext('2d')

  // Measure cap height ratio using the machine font
  sctx.font = `${FONT_WEIGHT} ${FONT_SIZE_MAX}px ${MACHINE_FONT_FAMILY}`
  const capHeightRatio = sctx.measureText('M').actualBoundingBoxAscent / FONT_SIZE_MAX
  const fontSize = Math.max(FONT_SIZE_MIN, Math.round(rectHeight * MACHINE_HEIGHT_FILL / capHeightRatio))

  // Bounding box on main canvas that covers the inner circle
  const pad = 1
  const bx0 = Math.max(0, Math.floor(CENTER_X - innerRadius - pad))
  const by0 = Math.max(0, Math.floor(CENTER_Y - innerRadius - pad))
  const bx1 = Math.min(CANVAS_SIZE, Math.ceil(CENTER_X + innerRadius + pad))
  const by1 = Math.min(CANVAS_SIZE, Math.ceil(CENTER_Y + innerRadius + pad))
  const bw = bx1 - bx0
  const bh = by1 - by0

  for (let i = 0; i < NUM_SLICES; i++) {
    const { machine } = rounds[i]
    if (!machine) continue

    // Render machine name into scratch canvas — no horizontal scaling
    sctx.clearRect(0, 0, rectWidth, rectHeight)
    sctx.font = `${FONT_WEIGHT} ${fontSize}px ${MACHINE_FONT_FAMILY}`
    sctx.fillStyle = COLOR_MACHINE_TEXT
    sctx.textAlign = 'left'
    sctx.textBaseline = 'middle'
    sctx.fillText(machine, MACHINE_TEXT_OFFSET, rectHeight / 2)

    const scratchData = sctx.getImageData(0, 0, rectWidth, rectHeight)
    const mainData = ctx.getImageData(bx0, by0, bw, bh)

    const sliceCenter = sliceCenterAngle(i)
    const sliceStart = sliceCenter - HALF_SLICE

    for (let py = by0; py < by1; py++) {
      for (let px = bx0; px < bx1; px++) {
        const dx = px - CENTER_X
        const dy = py - CENTER_Y
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r < 1 || r > innerRadius) continue

        const dtheta = (((Math.atan2(dy, dx) - sliceStart) % TWO_PI) + TWO_PI) % TWO_PI
        if (dtheta >= SLICE_ANGLE) continue

        // x=0 → inner circle (r=innerRadius), x=rectWidth → center (r=0)
        const sx = Math.round((1 - r / innerRadius) * rectWidth)
        // flip y so text reads in the natural clockwise direction around the slice
        const sy = Math.round((1 - dtheta / SLICE_ANGLE) * rectHeight)
        if (sx < 0 || sx >= rectWidth || sy < 0 || sy >= rectHeight) continue

        const sidx = (sy * rectWidth + sx) * 4
        const alpha = scratchData.data[sidx + 3]
        if (alpha === 0) continue

        const midx = ((py - by0) * bw + (px - bx0)) * 4
        const a = alpha / 255
        mainData.data[midx]     = Math.round(scratchData.data[sidx]     * a + mainData.data[midx]     * (1 - a))
        mainData.data[midx + 1] = Math.round(scratchData.data[sidx + 1] * a + mainData.data[midx + 1] * (1 - a))
        mainData.data[midx + 2] = Math.round(scratchData.data[sidx + 2] * a + mainData.data[midx + 2] * (1 - a))
        mainData.data[midx + 3] = Math.min(255, mainData.data[midx + 3] + alpha)
      }
    }

    ctx.putImageData(mainData, bx0, by0)
  }
}

function saveMachinesDebug(rounds, innerRadius) {
  const { rectWidth, rectHeight } = machineRectDims(innerRadius)
  const GAP = 2
  const totalHeight = NUM_SLICES * rectHeight + (NUM_SLICES + 1) * GAP

  const out = createCanvas(rectWidth + GAP * 2, totalHeight)
  const octx = out.getContext('2d')
  octx.fillStyle = '#333333'
  octx.fillRect(0, 0, out.width, totalHeight)

  const scratch = createCanvas(rectWidth, rectHeight)
  const sctx = scratch.getContext('2d')
  sctx.font = `${FONT_WEIGHT} ${FONT_SIZE_MAX}px ${MACHINE_FONT_FAMILY}`
  const capHeightRatio = sctx.measureText('M').actualBoundingBoxAscent / FONT_SIZE_MAX
  const fontSize = Math.max(FONT_SIZE_MIN, Math.round(rectHeight * MACHINE_HEIGHT_FILL / capHeightRatio))

  for (let i = 0; i < NUM_SLICES; i++) {
    const { machine } = rounds[i]
    const y = GAP + i * (rectHeight + GAP)

    octx.fillStyle = '#ffffff'
    octx.fillRect(GAP, y, rectWidth, rectHeight)

    if (!machine) continue

    sctx.clearRect(0, 0, rectWidth, rectHeight)
    sctx.font = `${FONT_WEIGHT} ${fontSize}px ${MACHINE_FONT_FAMILY}`
    sctx.fillStyle = COLOR_MACHINE_TEXT
    sctx.textAlign = 'left'
    sctx.textBaseline = 'middle'
    sctx.fillText(machine, MACHINE_TEXT_OFFSET, rectHeight / 2)

    octx.drawImage(scratch, GAP, y)
  }

  const outputPath = path.join(ROOT, 'machines.jpg')
  fs.writeFileSync(outputPath, out.toBuffer('image/jpeg', { quality: 0.95 }))
  console.log(`Wrote ${outputPath}`)
}

function render() {
  const csvPath = path.join(ROOT, 'results.csv')
  const rounds = parseResults(csvPath)

  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = COLOR_BACKGROUND
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.save()
  ctx.beginPath()
  ctx.arc(CENTER_X, CENTER_Y, RADIUS, 0, 2 * Math.PI)
  ctx.clip()

  drawSliceFills(ctx, rounds)
  drawBorders(ctx)

  const { fontSize, baseRadius, innerRadius, capHeightRatio } = computeTextMetrics(ctx)
  drawInnerCircle(ctx, baseRadius)
  drawStartMarker(ctx, baseRadius)
  drawInitials(ctx, rounds, fontSize, baseRadius)
  drawMachineNames(ctx, rounds, innerRadius)

  ctx.restore()

  saveMachinesDebug(rounds, innerRadius)

  const outputPath = path.join(ROOT, 'pie.jpg')
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.92 })
  fs.writeFileSync(outputPath, buffer)
  console.log(`Wrote ${outputPath}`)
}

render()
