// Team fight: your 5 vs their 5, both hitting back.
import { useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store.jsx'
import UnitEditor from '../components/UnitEditor.jsx'
import { ChampIcon, ItemIcon } from '../components/Icon.jsx'
import { HpChart, colorOf } from '../components/Charts.jsx'
import Arena from '../components/Arena.jsx'
import FightLog from '../components/FightLog.jsx'
import ShareBar from '../components/ShareBar.jsx'
import { buildUnit } from '../engine/build.js'
import { fight } from '../engine/metrics.js'

export default function Team() {
  const { state, update, data, t, go } = useStore()
  const [open, setOpen] = useState(null) // which ally slot is being edited
  const exportRef = useRef(null)

  const allies = state.allies
  const enemies = state.enemies
  const res = useMemo(() => {
    const A = allies.map((c, i) => (c ? buildUnit(c, data, `A${i}`) : null)).filter(Boolean)
    const B = enemies.map((c, i) => (c ? buildUnit(c, data, `B${i}`) : null)).filter(Boolean)
    if (!A.length || !B.length) return null
    return fight(A, B, { twoWay: true, positioning: state.opts.positioning })
  }, [allies, enemies, data, state.opts.positioning])

  const setAlly = (i, cfg) => update((s) => { s.allies[i] = cfg })
  const setTarget = (side, i, key) => update((s) => { s[side][i].target = key || null })
  const enemyKeys = enemies.map((c, i) => (c ? { key: `B${i}`, c } : null)).filter(Boolean)
  const allyKeys = allies.map((c, i) => (c ? { key: `A${i}`, c } : null)).filter(Boolean)
  const name = (c) => data.champions[c.champ]?.name || c.champ

  const Row = ({ c, i, side }) => {
    const u = res?.units.find((x) => x.key === `${side === 'allies' ? 'A' : 'B'}${i}`)
    const foes = side === 'allies' ? enemyKeys : allyKeys
    return (
      <div className={`mini ${u?.dead ? 'dead' : ''} ${open === i && side === 'allies' ? 'open' : ''}`}>
        <ChampIcon id={c.champ} ring={side === 'allies' ? 'cyan' : 'pink'} />
        <div>
          <b>{name(c)}</b> <span className="tiny muted">{c.level}</span>
          <div className="items">{c.items.map((id, k) => <ItemIcon key={k} id={id} size="sm" />)}</div>
          <select value={c.target || ''} onChange={(e) => setTarget(side, i, e.target.value)} aria-label="Target" style={{ marginTop: 6, padding: '4px 8px', fontSize: '0.8rem' }}>
            <option value="">{t('auto_target')}</option>
            {foes.map((f) => <option key={f.key} value={f.key}>→ {name(f.c)}</option>)}
          </select>
        </div>
        <div className="stack" style={{ gap: 4, justifyItems: 'end' }}>
          {u && <span className="num small" style={{ color: colorOf(res, u.key) }}>{Math.round(u.totals.physical + u.totals.magic + u.totals.true).toLocaleString()}</span>}
          {u?.dead && <span className="tiny muted">☠ {u.deathT.toFixed(1)}s</span>}
          {side === 'allies' && <button className="btn icon small" onClick={() => setOpen(open === i ? null : i)}>✎</button>}
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}><span className="tag">5v5</span> {t('nav_team')}</h2>
          <p className="hint" style={{ margin: '6px 0 0' }}>{t('team_hint')}</p>
        </div>
        <div className="row">
          <label className="toggle"><input type="checkbox" checked={state.opts.positioning} onChange={(e) => update((s) => { s.opts.positioning = e.target.checked })} /> {t('positioning')}</label>
          <ShareBar targetRef={exportRef} route="team" />
        </div>
      </div>

      <div className="team-grid">
        <div className="panel stack">
          <h3 style={{ margin: 0, color: 'var(--cyan)' }}>{t('your_team')}</h3>
          {allies.map((c, i) => c ? <Row key={i} c={c} i={i} side="allies" /> : (
            <div key={i} className="row">
              <button className="add-slot grow" onClick={() => setOpen(i)}>+ {t('pick_champ')}</button>
              {i === 0 && state.me && <button className="btn" onClick={() => setAlly(0, structuredClone(state.me))}>{t('copy_me')}</button>}
            </div>
          ))}
        </div>
        <div className="panel stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, color: 'var(--pink)' }}>{t('their_team')}</h3>
            <button className="btn small" onClick={() => go('enemies')}>✎ {t('nav_enemies')}</button>
          </div>
          {enemies.map((c, i) => c ? <Row key={i} c={c} i={i} side="enemies" /> : <div key={i} className="mini muted small" style={{ gridTemplateColumns: '1fr' }}>{t('slot_empty')}</div>)}
        </div>
      </div>

      {open != null && (
        <UnitEditor cfg={allies[open]} onChange={(c) => setAlly(open, c)} label={`${t('your_team')} ${open + 1}`} compact
          onRemove={allies[open] ? () => { setAlly(open, null); setOpen(null) } : undefined} />
      )}

      {res && (
        <div ref={exportRef} className="stack" style={{ background: 'var(--bg)' }}>
          <div className="panel">
            <div className={`banner ${res.winner === 'A' ? 'win' : 'lose'}`}>
              {res.winner === 'A' ? t('winner_a') : res.winner === 'B' ? t('winner_b') : t('winner_none')}
            </div>
            <p className="muted small" style={{ textAlign: 'center', margin: 0 }}>
              {res.t.toFixed(1)}s · {t('survivors')}: {res.units.filter((u) => !u.dead).map((u) => u.name).join(', ') || '—'}
            </p>
          </div>
          <div className="panel">
            <h3>{t('dealt')}</h3>
            <div className="ttk-list">
              {(() => {
                const max = Math.max(...res.units.map((u) => u.totals.physical + u.totals.magic + u.totals.true), 1)
                return [...res.units].sort((a, b) => (b.totals.physical + b.totals.magic + b.totals.true) - (a.totals.physical + a.totals.magic + a.totals.true)).map((u) => {
                  const d = u.totals.physical + u.totals.magic + u.totals.true
                  return (
                    <div key={u.key} className="ttk-row" style={{ cursor: 'default' }}>
                      <ChampIcon id={u.champId} size="sm" />
                      <span className="small" style={{ color: colorOf(res, u.key) }}>{u.name}</span>
                      <span className="bar"><i style={{ width: `${(d / max) * 100}%`, background: colorOf(res, u.key) }} /></span>
                      <span className="num small">{Math.round(d).toLocaleString()}</span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
          <div className="panel"><h3>{t('hp_chart')}</h3><HpChart res={res} /></div>
          <div className="panel"><h3>{t('arena')}</h3><Arena res={res} /></div>
          <div className="panel"><h3>{t('fight_log')}</h3><FightLog res={res} /></div>
        </div>
      )}
    </div>
  )
}
