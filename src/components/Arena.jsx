// ─────────────────────────────────────────────────────────────
// Arena — top-down replay of the fight on a <canvas>.
// Dots = champions, lines = shots, sparks = kills.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { colorOf } from './Charts.jsx'
import { img } from '../data/ddragon.js'

const CW = 960, CH = 400

export default function Arena({ res }) {
  const { t, data, state } = useStore()
  const canvas = useRef(null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const icons = useRef({})
  const calm = state.prefs.calm
  const end = res.t

  // Load champion portraits once
  useEffect(() => {
    for (const u of res.units) {
      if (!u.champId || icons.current[u.champId] || !data?.version || data.version === 'offline') continue
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.src = img.champ(data.version, data.champions[u.champId]?.image)
      icons.current[u.champId] = im
    }
  }, [res, data])

  // Restart when a new fight comes in
  useEffect(() => { setTime(0); setPlaying(true) }, [res])

  // Play loop
  useEffect(() => {
    if (!playing) return
    let raf, last = performance.now()
    const step = (now) => {
      const dt = (now - last) / 1000
      last = now
      setTime((tm) => {
        const n = tm + dt
        if (n >= end) { setPlaying(false); return end }
        return n
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, end])

  // Draw
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    draw(ctx, res, time, icons.current, calm)
  }, [res, time, calm])

  return (
    <div>
      <div className="arena-wrap">
        <canvas ref={canvas} width={CW} height={CH} role="img" aria-label={t('arena')} />
      </div>
      <div className="arena-ctrl">
        <button className="btn" onClick={() => { if (time >= end) setTime(0); setPlaying(!playing) }}>{playing ? `❚❚ ${t('pause')}` : `▶ ${t('play')}`}</button>
        <button className="btn ghost" onClick={() => { setTime(0); setPlaying(true) }}>↺ {t('restart')}</button>
        <input type="range" min="0" max={end} step="0.05" value={time} onChange={(e) => { setPlaying(false); setTime(+e.target.value) }} aria-label="Time" className="grow" />
        <span className="num">{time.toFixed(1)}s</span>
      </div>
    </div>
  )
}

function draw(ctx, res, time, icons, calm) {
  ctx.clearRect(0, 0, CW, CH)
  // floor grid
  ctx.strokeStyle = '#ffffff0a'
  ctx.lineWidth = 1
  for (let x = 0; x < CW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke() }
  for (let y = 0; y < CH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke() }

  // world → screen (fit everyone who ever appears)
  const xs = res.frames.flatMap((f) => f.u.map((u) => u.x))
  const ys = res.frames.flatMap((f) => f.u.map((u) => u.y))
  const minX = Math.min(...xs) - 120, maxX = Math.max(...xs) + 120
  const minY = Math.min(...ys) - 120, maxY = Math.max(...ys) + 120
  const s = Math.min(CW / (maxX - minX), CH / (maxY - minY))
  const ox = (CW - (maxX - minX) * s) / 2, oy = (CH - (maxY - minY) * s) / 2
  const P = (p) => ({ x: ox + (p.x - minX) * s, y: oy + (p.y - minY) * s })

  // frame at this time
  const i = Math.min(res.frames.length - 1, Math.max(0, Math.round(time / 0.1)))
  const frame = res.frames.reduce((best, f) => (Math.abs(f.t - time) < Math.abs(best.t - time) ? f : best), res.frames[i] || res.frames[0])
  const pos = Object.fromEntries(frame.u.map((u) => [u.k, P(u)]))

  // shots in the last 0.18s
  for (const sh of res.shots) {
    if (sh.t > time || time - sh.t > 0.18) continue
    const a = pos[sh.src], b = pos[sh.tgt]
    if (!a || !b) continue
    ctx.strokeStyle = colorOf(res, sh.src)
    ctx.lineWidth = sh.kind === 'spell' ? 5 : 2
    ctx.globalAlpha = 1 - (time - sh.t) / 0.18
    if (!calm) { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12 }
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }

  // units
  for (const u of res.units) {
    const f = frame.u.find((z) => z.k === u.key)
    if (!f) continue
    const p = pos[u.key]
    const col = colorOf(res, u.key)
    const R = u.dummy ? 16 : 24
    ctx.globalAlpha = f.dead ? 0.25 : 1
    // body
    ctx.save()
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.closePath()
    ctx.fillStyle = '#1c1927'; ctx.fill()
    const im = icons[u.champId]
    if (im?.complete && im.naturalWidth) { ctx.clip(); ctx.drawImage(im, p.x - R, p.y - R, R * 2, R * 2) }
    ctx.restore()
    ctx.lineWidth = 3; ctx.strokeStyle = col
    if (!calm) { ctx.shadowColor = col; ctx.shadowBlur = 14 }
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.stroke()
    ctx.shadowBlur = 0
    if (!im?.complete || !im.naturalWidth) {
      ctx.fillStyle = '#f6f2ff'; ctx.font = 'bold 12px Space Grotesk, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText((u.name || '?').slice(0, 2).toUpperCase(), p.x, p.y + 4)
    }
    // hp bar
    const w = 54, frac = Math.max(0, f.hp / u.maxHp)
    ctx.fillStyle = '#000a'; ctx.fillRect(p.x - w / 2, p.y - R - 14, w, 7)
    ctx.fillStyle = col; ctx.fillRect(p.x - w / 2, p.y - R - 14, w * frac, 7)
    if (f.sh) { ctx.fillStyle = '#ffffffcc'; ctx.fillRect(p.x - w / 2 + w * frac, p.y - R - 14, Math.min(w * (1 - frac), (w * f.sh) / u.maxHp), 7) }
    ctx.globalAlpha = 1

    // kill sparks (0.6s)
    if (u.dead && time >= u.deathT && time - u.deathT < 0.6 && !calm) {
      const k = (time - u.deathT) / 0.6
      for (let n = 0; n < 14; n++) {
        const ang = (n / 14) * Math.PI * 2
        const d = 10 + k * 60
        ctx.fillStyle = n % 2 ? '#ff2d95' : '#22e6ff'
        ctx.globalAlpha = 1 - k
        ctx.beginPath(); ctx.arc(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, 4 * (1 - k) + 1, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffe14a'; ctx.font = '28px "Permanent Marker", cursive'; ctx.textAlign = 'center'
      ctx.fillText('BOOM!', p.x, p.y - R - 24 - k * 16)
    }
  }
}
