// "Best next item vs this enemy": tries every item you could buy next,
// ranks them by how much faster you kill the target.
import { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { ItemIcon } from './Icon.jsx'
import { buildUnit } from '../engine/build.js'
import { bestNextItem } from '../engine/metrics.js'
import { slotInfo, defaultBootSlot, isBoots } from '../data/itemRules.js'

export default function BestItem({ versus, vsName, opts }) {
  const { state, update, data, t } = useStore()
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(false)
  const me = state.me
  const bootSlot = me.bootSlot ?? defaultBootSlot(data.champions[me.champ])
  const slots = slotInfo(me.items, data, bootSlot)
  const full = !slots.canAddItem && !slots.canAddBoots

  const run = () => {
    setBusy(true)
    setTimeout(() => {
      const seen = new Set()
      const candidates = Object.values(data.items)
        .filter((it) => it.complete && !it.starter && (it.gold >= 900 || isBoots(it)))
        .filter((it) => !me.items.includes(it.id))
        .filter((it) => (isBoots(it) ? slots.canAddBoots : slots.canAddItem))
        .filter((it) => (seen.has(it.name) ? false : seen.add(it.name)))
        .map((it) => it.id)
      setRows(bestNextItem(me, data, buildUnit, versus, candidates, { positioning: opts.positioning, resource: opts.resource }).slice(0, 10))
      setBusy(false)
    }, 20)
  }

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{t('best_item')} <span className="tag-name">vs {vsName}</span></h3>
        <button className="btn" onClick={run} disabled={busy || full}>{busy ? '…' : rows ? `↻ ${t('recalc')}` : `⚡ ${t('find_best')}`}</button>
      </div>
      {full && <p className="tiny muted">{t('inventory_full')}</p>}
      {!rows && !full && <p className="hint" style={{ marginTop: 8 }}>{t('best_item_hint')}</p>}
      {rows && (
        <div className="ttk-list" style={{ marginTop: 10 }}>
          {rows.map((r, i) => (
            <div key={r.id} className="ttk-row" style={{ gridTemplateColumns: '28px 36px 1fr 90px 80px 70px', cursor: 'default' }}>
              <b className="num">{i + 1}</b>
              <ItemIcon id={r.id} size="sm" />
              <span className="small">{data.items[r.id]?.name} <span className="tiny" style={{ color: 'var(--yellow)' }}>{r.gold}</span></span>
              <span className="num small" style={{ color: r.gain > 0 ? 'var(--good)' : 'var(--muted)' }}>{r.ttk != null ? `${r.ttk.toFixed(2)}s` : '30s+'}{r.gain > 0.005 ? ` (−${r.gain.toFixed(2)})` : ''}</span>
              <span className="num tiny muted">{r.dpsGain >= 0 ? "+" : "−"}{Math.abs(Math.round(r.dpsGain))} DPS</span>
              <button className="btn small" onClick={() => { update((s) => { s.me.items.push(r.id) }); setRows(null) }}>+ {t('add')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
