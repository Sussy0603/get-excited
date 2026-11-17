// Hand-made SVG charts (no chart library: lighter, and easy to read).
import { useState } from 'react'
import { useStore } from '../state/store.jsx'

export const TEAM_A = ['#22e6ff', '#3dffa8', '#ffe14a', '#7aa7ff', '#c4f0ff']
export const TEAM_B = ['#ff2d95', '#ff8a3d', '#a274ff', '#ff4d5e', '#ffb3d9']
export const colorOf = (res, key) => {
  const u = res.units.find((x) => x.key === key)
  const same = res.units.filter((x) => x.side === u?.side)
  const i = same.indexOf(u)
  return (u?.side === 'A' ? TEAM_A : TEAM_B)[i % 5]
}

const W = 640, H = 230, PAD = { l: 40, r: 12, t: 12, b: 26 }

// HP (% of max) over time for every unit in a fight.
export function HpChart({ res }) {
  const { t } = useStore()
  const [hover, setHover] = useState(null)
  if (!res?.frames?.length) return null
  const end = Math.max(1, res.t)
  const x = (s) => PAD.l + (s / end) * (W - PAD.l - PAD.r)
  const y = (p) => PAD.t + (1 - p) * (H - PAD.t - PAD.b)
  const ticks = niceTicks(end)
  const units = res.units

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const s = Math.max(0, Math.min(end, ((px - PAD.l) / (W - PAD.l - PAD.r)) * end))
    const f = res.frames.reduce((best, fr) => (Math.abs(fr.t - s) < Math.abs(best.t - s) ? fr : best), res.frames[0])
    setHover({ f, left: (x(f.t) / W) * 100 })
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={t('hp_chart')}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}><line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(p)} y2={y(p)} /><text x={PAD.l - 6} y={y(p) + 4} textAnchor="end">{p * 100}%</text></g>
        ))}
        {ticks.map((s) => <text key={s} x={x(s)} y={H - 8} textAnchor="middle">{s}s</text>)}
        {units.map((u) => {
          const pts = res.frames.map((f) => { const v = f.u.find((z) => z.k === u.key); return `${x(f.t)},${y((v?.hp || 0) / u.maxHp)}` }).join(' ')
          return <polyline key={u.key} points={pts} fill="none" stroke={colorOf(res, u.key)} strokeWidth="2.5" strokeLinejoin="round" />
        })}
        {units.filter((u) => u.dead).map((u) => (
          <text key={`d${u.key}`} x={x(u.deathT)} y={y(0) - 6} textAnchor="middle" style={{ fill: colorOf(res, u.key), fontSize: 16 }}>✖</text>
        ))}
        {hover && <line x1={x(hover.f.t)} x2={x(hover.f.t)} y1={PAD.t} y2={H - PAD.b} stroke="#fff4" />}
      </svg>
      {hover && (
        <div className="tooltip" style={{ left: `calc(${hover.left}% + 10px)`, top: 10 }}>
          <b className="num">{hover.f.t.toFixed(1)}s</b>
          {units.map((u) => { const v = hover.f.u.find((z) => z.k === u.key); return <div key={u.key} style={{ color: colorOf(res, u.key) }}>{u.name}: {v?.hp ?? 0}{v?.sh ? ` (+${v.sh})` : ''}</div> })}
        </div>
      )}
      <div className="legend">{units.map((u) => <span key={u.key}><i style={{ background: colorOf(res, u.key) }} />{u.name}</span>)}</div>
    </div>
  )
}

// Physical / magic / true donut.
export function Donut({ split, size = 150 }) {
  const { t } = useStore()
  const parts = [['physical', 'var(--physical)'], ['magic', 'var(--magic)'], ['true', 'var(--true)']]
  const total = parts.reduce((s, [k]) => s + (split[k] || 0), 0) || 1
  const r = 52, c = 2 * Math.PI * r
  let off = 0
  return (
    <div className="row" style={{ gap: 18 }}>
      <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={t('split')}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="18" />
        {parts.map(([k, col]) => {
          const frac = (split[k] || 0) / total
          const el = <circle key={k} cx="70" cy="70" r={r} fill="none" stroke={col} strokeWidth="18" strokeDasharray={`${frac * c} ${c}`} strokeDashoffset={-off * c} transform="rotate(-90 70 70)" />
          off += frac
          return el
        })}
      </svg>
      <div className="stack" style={{ gap: 6 }}>
        {parts.map(([k, col]) => (
          <div key={k} className="row small" style={{ gap: 8 }}>
            <i className="swatch" style={{ background: col }} />
            <span style={{ minWidth: 70 }}>{t(k)}</span>
            <b className="num">{Math.round(((split[k] || 0) / total) * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  )
}

// Simple multi-line chart: series = [{ name, color, points: [{x, y}] }]
export function LineChart({ series, xLabel = (v) => v, yLabel = (v) => Math.round(v), height = 220 }) {
  const all = series.flatMap((s) => s.points)
  if (!all.length) return null
  const xmax = Math.max(...all.map((p) => p.x)) || 1
  const ymax = Math.max(...all.map((p) => p.y)) * 1.1 || 1
  const x = (v) => PAD.l + 10 + (v / xmax) * (W - PAD.l - PAD.r - 20)
  const y = (v) => PAD.t + (1 - v / ymax) * (height - PAD.t - PAD.b)
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img">
        {[0, 0.5, 1].map((p) => <g key={p}><line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(p * ymax)} y2={y(p * ymax)} /><text x={PAD.l - 6} y={y(p * ymax) + 4} textAnchor="end">{yLabel(p * ymax)}</text></g>)}
        {[...new Set(all.map((p) => p.x))].map((v) => <text key={v} x={x(v)} y={height - 8} textAnchor="middle">{xLabel(v)}</text>)}
        {series.map((s) => (
          <g key={s.name}>
            <polyline points={s.points.map((p) => `${x(p.x)},${y(p.y)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" />
            {s.points.map((p) => <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r="4" fill={s.color} />)}
          </g>
        ))}
      </svg>
      <div className="legend">{series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div>
    </div>
  )
}

function niceTicks(end) {
  const step = end <= 6 ? 1 : end <= 15 ? 2 : end <= 30 ? 5 : 10
  const out = []
  for (let s = 0; s <= end + 1e-9; s += step) out.push(Math.round(s))
  return out
}
