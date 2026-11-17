// ─────────────────────────────────────────────────────────────
// StatsVs — your stats next to the enemy's, row by row.
// The bar shows who's ahead. "Damage they take from you" uses
// the real armor/MR + penetration math from the engine.
// ─────────────────────────────────────────────────────────────
import { useStore } from '../state/store.jsx'
import { ChampIcon } from './Icon.jsx'
import { mitigate } from '../engine/damage.js'

const n0 = (v) => Math.round(v).toLocaleString()
const n2 = (v) => v.toFixed(2)
const pct = (v) => `${Math.round(v * 100)}%`

// [label key, getter, format, higherIsBetter]
const ROWS = [
  ['st_hp', (s) => s.hp, n0, true],
  ['st_ad', (s) => s.ad, n0, true],
  ['st_ap', (s) => s.ap, n0, true],
  ['st_armor', (s) => s.armor, n0, true],
  ['st_mr', (s) => s.mr, n0, true],
  ['st_as', (s) => s.as, n2, true],
  ['st_crit', (s) => s.crit, pct, true],
  ['st_critdmg', (s) => s.critDmg, pct, true],
  ['st_leth', (s) => s.lethality, n0, true],
  ['st_apen', (s) => s.armorPenPct, pct, true],
  ['st_mpen', (s) => s.magicPen, n0, true],
  ['st_mpenpct', (s) => s.magicPenPct, pct, true],
  ['st_ls', (s) => s.lifesteal, pct, true],
  ['st_omni', (s) => s.omnivamp, pct, true],
  ['st_ah', (s) => s.ah, n0, true],
  ['st_range', (s) => s.range, n0, true],
  ['st_ms', (s) => s.ms, n0, true],
]

const taken = (src, tgt, type) => mitigate(100, type, src.stats, { armor: tgt.stats.armor, mr: tgt.stats.mr }) / 100

export default function StatsVs({ me, foe, foes = [], onFocus }) {
  const { t } = useStore()
  if (!me || !foe) return null
  const rows = ROWS.filter(([, get]) => get(me.stats) || get(foe.stats))

  const derived = [
    ['st_phys_taken', taken(me, foe, 'physical'), taken(foe, me, 'physical')],
    ['st_magic_taken', taken(me, foe, 'magic'), taken(foe, me, 'magic')],
  ]

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{t('stats_vs')}</h3>
        {foes.length > 1 && (
          <select value={foe.key} onChange={(e) => onFocus(e.target.value)} aria-label={t('focus')} style={{ width: 'auto', padding: '6px 10px' }}>
            {foes.map((f) => <option key={f.key} value={f.key}>vs {f.name}</option>)}
          </select>
        )}
      </div>

      <table className="vs">
        <thead>
          <tr>
            <th className="vs-me"><ChampIcon id={me.champId} size="sm" ring="cyan" /> {me.name} <span className="muted tiny">{t('level')} {me.level}</span></th>
            <th />
            <th className="vs-them">{foe.name} <span className="muted tiny">{t('level')} {foe.level}</span> <ChampIcon id={foe.champId} size="sm" ring="pink" /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, get, fmt, hi]) => {
            const a = get(me.stats), b = get(foe.stats)
            const total = Math.abs(a) + Math.abs(b) || 1
            const win = a === b ? 0 : (a > b) === hi ? 1 : -1
            return (
              <tr key={key}>
                <td className={`vs-me num ${win > 0 ? 'ahead' : ''}`}>
                  <span className="vs-bar me" style={{ width: `${(Math.abs(a) / total) * 100}%` }} />
                  <span>{fmt(a)}</span>
                </td>
                <td className="vs-label">{t(key)}</td>
                <td className={`vs-them num ${win < 0 ? 'ahead' : ''}`}>
                  <span className="vs-bar them" style={{ width: `${(Math.abs(b) / total) * 100}%` }} />
                  <span>{fmt(b)}</span>
                </td>
              </tr>
            )
          })}
          {derived.map(([key, a, b]) => (
            <tr key={key} className="vs-derived">
              <td className={`vs-me num ${a > b ? 'ahead' : ''}`}>{pct(a)}</td>
              <td className="vs-label">{t(key)}</td>
              <td className={`vs-them num ${b > a ? 'ahead' : ''}`}>{pct(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tiny muted" style={{ margin: '8px 0 0' }}>{t('stats_vs_hint')}</p>
    </div>
  )
}
