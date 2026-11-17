import { useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { colorOf } from './Charts.jsx'

// Text list of everything that happened: "0.8s  Jinx → Garen  W  142"
export default function FightLog({ res }) {
  const { t } = useStore()
  const [filter, setFilter] = useState('all')
  const name = (k) => res.units.find((u) => u.key === k)?.name || k
  const rows = useMemo(() => res.log.filter((e) => {
    if (filter === 'dmg') return e.kind === 'dmg' || e.kind === 'death'
    if (filter === 'casts') return ['cast', 'cc', 'death', 'shield', 'heal'].includes(e.kind)
    return true
  }).slice(0, 600), [res, filter])

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="seg" role="group" aria-label={t('fight_log')}>
        {[['all', t('log_all')], ['dmg', t('log_dmg')], ['casts', t('log_casts')]].map(([k, l]) => (
          <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      <div className="log" tabIndex={0} aria-label={t('fight_log')}>
        <table>
          <tbody>
            {rows.map((e, i) => (
              <tr key={i} className={e.kind}>
                <td className="t">{e.t.toFixed(2)}s</td>
                <td style={{ color: colorOf(res, e.src) }}>{name(e.src)}</td>
                <td className="muted">{e.kind === 'death' ? '☠' : e.src === e.tgt ? '' : '→'}</td>
                <td style={{ color: colorOf(res, e.tgt) }}>{e.src === e.tgt ? '' : name(e.tgt)}</td>
                <td className="lbl">{e.kind === 'cast' ? `casts ${e.label}` : e.label}</td>
                <td className={`amt ${e.dtype || ''}`}>{e.amount ? `${e.kind === 'heal' || e.kind === 'shield' ? '+' : ''}${Math.round(e.amount)}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
