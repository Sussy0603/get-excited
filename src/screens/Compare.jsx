// Compare 2-3 item builds on the same champ, vs the same target.
import { useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { ItemIcon, ChampIcon } from '../components/Icon.jsx'
import { ItemPicker } from '../components/Pickers.jsx'
import { LineChart } from '../components/Charts.jsx'
import ShareBar from '../components/ShareBar.jsx'
import { buildUnit } from '../engine/build.js'
import { dummyRun, breakpoints, bestOrder } from '../engine/metrics.js'
import { useFightSetup, fmt } from './Calculator.jsx'
import { TARGETS } from '../data/targets.js'
import { L } from '../i18n.js'
import { slotInfo, defaultBootSlot } from '../data/itemRules.js'

const COLORS = ['#ff2d95', '#22e6ff', '#ffe14a']
const LETTERS = ['A', 'B', 'C']

export default function Compare() {
  const { state, update, data, t, lang, go } = useStore()
  const [picking, setPicking] = useState(null)
  const { focusFoe, target, dummies, opts } = useFightSetup()
  const builds = state.compare
  const me = state.me

  const versus = useMemo(() => (target === 'champ' ? (focusFoe ? [focusFoe] : null) : dummies), [target, focusFoe, dummies])
  const rows = useMemo(() => {
    if (!me || !versus) return []
    return builds.map((items) => {
      const cfg = { ...me, items }
      const u = buildUnit(cfg, data, 'A0')
      const r = dummyRun(u, versus, { positioning: opts.positioning, resource: opts.resource, record: false })
      const bp = breakpoints(cfg, data, buildUnit, versus[0], { positioning: opts.positioning, resource: opts.resource })
      return { items, gold: u.gold, ...r, perGold: u.gold ? (r.dps / u.gold) * 1000 : 0, bp }
    })
  }, [me, builds, versus, data, opts])

  if (!me) {
    return <div className="panel empty"><div className="big">{t('pick_champ')}</div><button className="btn primary" onClick={() => go('calc')}>{t('nav_calc')}</button></div>
  }

  const setBuild = (i, items) => update((s) => { s.compare[i] = items })
  const bestBy = (k, low = false) => {
    const vals = rows.map((r) => r[k]).filter((v) => v != null)
    if (vals.length < 2) return null
    const b = low ? Math.min(...vals) : Math.max(...vals)
    return rows.findIndex((r) => r[k] === b)
  }
  const best = { ttk: bestBy('ttk', true), dps: bestBy('dps'), burst: bestBy('burst'), perGold: bestBy('perGold') }

  return (
    <div className="stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <ChampIcon id={me.champ} ring="pink" />
          <div>
            <h2 style={{ margin: 0 }}>{t('nav_compare')} <span className="tag">{data.champions[me.champ]?.name}</span> <span className="muted small">{t('level')} {me.level}</span></h2>
            <p className="hint" style={{ margin: '4px 0 0' }}>{t('compare_hint')} vs <b>{target === 'champ' ? focusFoe?.name || '—' : L(TARGETS[target].label, lang)}</b></p>
          </div>
        </div>
        <ShareBar route="compare" />
      </div>

      {!versus && <div className="panel empty"><p className="muted">{t('enemies_hint')}</p><button className="btn primary" onClick={() => go('enemies')}>+ {t('nav_enemies')}</button></div>}

      <div className="builds">
        {builds.map((items, i) => {
          const r = rows[i]
          return (
            <div key={i} className="panel build-card" style={{ borderColor: COLORS[i] }}>
              <h3><i className="swatch" style={{ background: COLORS[i] }} /> {t('build')} {LETTERS[i]}
                <span className="grow" />
                {builds.length > 2 && <button className="btn icon danger" onClick={() => update((s) => { s.compare.splice(i, 1) })} aria-label={t('remove')}>✕</button>}
              </h3>
              <div className="row" style={{ gap: 4 }}>
                {items.map((id, k) => (
                  <button key={k} className="btn ghost icon" style={{ padding: 0, border: 'none' }} title={`${data.items[id]?.name} — ${t('remove')}`}
                    onClick={() => setBuild(i, items.filter((_, j) => j !== k))}><ItemIcon id={id} /></button>
                ))}
                {!slotInfo(items, data, me.bootSlot ?? defaultBootSlot(data.champions[me.champ])).full && <button className="add-slot" style={{ width: 40, height: 40, padding: 0 }} onClick={() => setPicking(i)} aria-label={t('add_item')}>+</button>}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small" onClick={() => setBuild(i, [...me.items])}>{t('copy_current')}</button>
                {items.length > 1 && versus && (
                  <button className="btn small" title={t('best_order_hint')}
                    onClick={() => setBuild(i, bestOrder({ ...me, items }, data, buildUnit, versus, { positioning: opts.positioning, resource: opts.resource }))}>⚡ {t('best_order')}</button>
                )}
                <span className="grow" />
                <span className="num small" style={{ color: 'var(--yellow)' }}>{r?.gold ?? 0} {t('gold')}</span>
              </div>
              {r && (
                <div className="section stack" style={{ gap: 6 }}>
                  <Stat k={t('ttk')} v={r.ttk != null ? `${r.ttk.toFixed(2)}s` : '30s+'} best={best.ttk === i} />
                  <Stat k={t('dps')} v={fmt(r.dps)} best={best.dps === i} />
                  <Stat k={t('burst')} v={fmt(r.burst)} best={best.burst === i} />
                  <Stat k={t('gold_eff')} v={fmt(r.perGold)} best={best.perGold === i} />
                </div>
              )}
            </div>
          )
        })}
        {builds.length < 3 && (
          <button className="add-slot" style={{ minHeight: 180 }} onClick={() => update((s) => { s.compare.push([]) })}>+ {t('add_build')}</button>
        )}
      </div>

      {rows.some((r) => r.bp?.length > 1) && (
        <div className="panel">
          <h3>{t('breakpoints')}</h3>
          <LineChart
            series={rows.map((r, i) => ({ name: `${t('build')} ${LETTERS[i]}`, color: COLORS[i], points: r.bp.map((p) => ({ x: p.n, y: p.dps })) }))}
            xLabel={(n) => (n === 0 ? '0' : `${n}`)}
          />
          <p className="tiny muted">X = items bought (in order) · Y = {t('dps')}</p>
        </div>
      )}

      {picking != null && (() => {
        const si = slotInfo(builds[picking], data, me.bootSlot ?? defaultBootSlot(data.champions[me.champ]))
        return <ItemPicker exclude={builds[picking]} allowItems={si.canAddItem} allowBoots={si.canAddBoots} onClose={() => setPicking(null)} onPick={(id) => { setBuild(picking, [...builds[picking], id]); setPicking(null) }} />
      })()}
    </div>
  )
}

function Stat({ k, v, best }) {
  const { t } = useStore()
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="small muted">{k}</span>
      <span className="row" style={{ gap: 8 }}>{best && <span className="best">★ {t('best')}</span>}<b className="num">{v}</b></span>
    </div>
  )
}
