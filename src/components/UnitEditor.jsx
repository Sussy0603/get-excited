// ─────────────────────────────────────────────────────────────
// UnitEditor — everything about ONE champion's setup.
// Used for "You", each enemy, each team member.
// It never changes state directly: it calls onChange(newConfig).
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useStore, configFor } from '../state/store.jsx'
import Icon, { ChampIcon, ItemIcon } from './Icon.jsx'
import { ChampPicker, ItemPicker } from './Pickers.jsx'
import { CHAMP_DEFS, VERIFIED, abilityStatus, defaultCombo } from '../data/champs/index.js'
import { RUNE_EFFECTS, SUMMONERS } from '../data/runes.js'
import { SHARDS, SHARD_ROWS } from '../engine/stats.js'
import { loadChampDetail } from '../data/ddragon.js'
import { L } from '../i18n.js'

export function useChampDetail(champId) {
  const { data, lang } = useStore()
  const [d, setD] = useState(null)
  useEffect(() => {
    let alive = true
    setD(null)
    if (champId && data?.version && data.version !== 'offline') loadChampDetail(data.version, lang, champId).then((x) => alive && setD(x))
    return () => { alive = false }
  }, [champId, data?.version, lang])
  return d
}

export function StatusChip({ champId }) {
  const { t } = useStore()
  if (abilityStatus(champId) !== 'full') return <span className="chip warn" title={t('autos_only')}>⚠ {t('autos_only')}</span>
  if (VERIFIED.has(champId)) return <span className="chip ok">✔ {t('verified')}</span>
  return <span className="chip cyan" title={t('unverified')}>◐ {t('unverified')}</span>
}

export default function UnitEditor({ cfg, onChange, label, accent = 'cyan', onRemove, compact = false }) {
  const { data, t } = useStore()
  const [picking, setPicking] = useState(null) // 'champ' | 'item'
  const set = (patch) => onChange({ ...cfg, ...patch })
  const detail = useChampDetail(cfg?.champ)

  if (!cfg?.champ) {
    return (
      <div className="panel">
        <h3>{label}</h3>
        <button className="add-slot" style={{ width: '100%', padding: 22 }} onClick={() => setPicking('champ')}>+ {t('pick_champ')}</button>
        {picking === 'champ' && <ChampPicker onClose={() => setPicking(null)} onPick={(id) => { onChange(configFor(id, data)); setPicking(null) }} />}
      </div>
    )
  }

  const champ = data.champions[cfg.champ]
  const def = CHAMP_DEFS[cfg.champ]
  const items = cfg.items || []
  const cumulative = items.map((_, i) => items.slice(0, i + 1).reduce((sum, id) => sum + (data.items[id]?.gold || 0), 0))

  return (
    <div className={`panel ${accent === 'pink' ? '' : 'hot'}`}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{label}</h3>
        {onRemove && <button className="btn icon danger" onClick={onRemove} aria-label={t('remove')}>✕</button>}
      </div>
      <div className="champ-head">
        <button className="btn ghost" style={{ padding: 0, border: 'none' }} onClick={() => setPicking('champ')} aria-label={t('change')}>
          <ChampIcon id={cfg.champ} size="lg" ring={accent} />
        </button>
        <div className="grow">
          <div className="name">{champ?.name || cfg.champ}</div>
          <div className="title">{champ?.title}</div>
          <div style={{ marginTop: 6 }}><StatusChip champId={cfg.champ} /></div>
        </div>
      </div>

      <div className="section">
        <label className="field">
          <span className="row" style={{ justifyContent: 'space-between' }}><span>{t('level')}</span><b className="num" style={{ color: 'var(--ink)' }}>{cfg.level}</b></span>
          <input type="range" min="1" max="18" value={cfg.level} onChange={(e) => set({ level: +e.target.value })} aria-label={t('level')} />
        </label>
      </div>

      {/* Items */}
      <div className="section">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>{t('items')}</h3>
          <span className="tiny muted num">{items.reduce((s, id) => s + (data.items[id]?.gold || 0), 0)} {t('gold')}</span>
        </div>
        <div className="slots" style={{ marginTop: 8 }}>
          {items.map((id, i) => {
            const it = data.items[id]
            const move = (dir) => { const n = [...items]; [n[i], n[i + dir]] = [n[i + dir], n[i]]; set({ items: n }) }
            return (
              <div className="slot" key={`${id}-${i}`}>
                <ItemIcon id={id} />
                <div>
                  <div className="small">{i + 1}. {it?.name || id} {it?.effect && <span title={it.effect.desc} style={{ color: 'var(--yellow)' }}>★</span>}</div>
                  <div className="meta num" style={{ textAlign: 'left' }}>{it?.gold} · Σ {cumulative[i]} {t('gold')}</div>
                </div>
                <div className="slot-actions">
                  <button className="btn ghost" disabled={i === 0} onClick={() => move(-1)} aria-label={t('up')}>↑</button>
                  <button className="btn ghost" disabled={i === items.length - 1} onClick={() => move(1)} aria-label={t('down')}>↓</button>
                  <button className="btn ghost danger" onClick={() => set({ items: items.filter((_, j) => j !== i) })} aria-label={t('remove')}>✕</button>
                </div>
              </div>
            )
          })}
          {items.length < 6 && <button className="add-slot" onClick={() => setPicking('item')}>+ {t('add_item')}</button>}
        </div>
      </div>

      {!compact && <Advanced cfg={cfg} set={set} def={def} detail={detail} />}
      {compact && (
        <details className="section">
          <summary className="small muted" style={{ cursor: 'pointer' }}>{t('runes')}, {t('combo')}, {t('stacks')}…</summary>
          <Advanced cfg={cfg} set={set} def={def} detail={detail} />
        </details>
      )}

      {picking === 'champ' && <ChampPicker onClose={() => setPicking(null)} onPick={(id) => { onChange(configFor(id, data, { level: cfg.level, items: cfg.items })); setPicking(null) }} />}
      {picking === 'item' && <ItemPicker exclude={items} onClose={() => setPicking(null)} onPick={(id) => { set({ items: [...items, id] }); setPicking(null) }} />}
    </div>
  )
}

function Advanced({ cfg, set, def, detail }) {
  const { data, t, lang } = useStore()
  const combo = cfg.combo?.length ? cfg.combo : defaultCombo(cfg.champ)
  const allKeys = ['Q', 'W', 'E', 'R'].filter((k) => def?.spells?.[k] && !def.spells[k].toggle)
  const off = allKeys.filter((k) => !combo.includes(k))
  const keystones = data.trees.flatMap((tr) => tr.slots[0] || [])
  const minors = data.trees.flatMap((tr) => tr.slots.slice(1).flat()).filter((r) => RUNE_EFFECTS[r.key])
  const chosen = cfg.runes?.minors || []
  const setRunes = (patch) => set({ runes: { ...cfg.runes, ...patch } })
  const stacks = cfg.stacks || {}
  const extraStacks = def?.stacks || []
  const needsLegend = chosen.some((k) => k.startsWith('Legend'))
  const spellIcon = (k) => detail?.spells?.[k]

  return (
    <>
      {def && (
        <div className="section">
          <h3>{t('max_order')}</h3>
          <div className="seg" role="group" aria-label={t('max_order')}>
            {[['Q', 'W', 'E'], ['Q', 'E', 'W'], ['W', 'Q', 'E'], ['W', 'E', 'Q'], ['E', 'Q', 'W'], ['E', 'W', 'Q']].map((o) => (
              <button key={o.join('')} aria-pressed={(cfg.maxOrder || []).join('') === o.join('')} onClick={() => set({ maxOrder: o })}>{o.join('>')}</button>
            ))}
          </div>
        </div>
      )}

      {def && (
        <div className="section">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>{t('combo')}</h3>
            {cfg.combo && <button className="btn ghost small" onClick={() => set({ combo: null })}>{t('reset_combo')}</button>}
          </div>
          <p className="hint" style={{ marginTop: 6 }}>{t('combo_hint')}</p>
          <div className="row">
            {combo.map((k, i) => (
              <div key={k} className="row" style={{ gap: 4, background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '4px 6px' }}>
                <Icon kind="spell" file={spellIcon(k)?.image} label={k} size="sm" title={spellIcon(k)?.name || k} />
                <b>{k}</b>
                <button className="btn ghost icon tiny" disabled={i === 0} onClick={() => { const n = [...combo]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set({ combo: n }) }} aria-label={`${k} ${t('up')}`}>←</button>
                <button className="btn ghost icon tiny" onClick={() => set({ combo: combo.filter((x) => x !== k) })} aria-label={`${k} ${t('remove')}`}>✕</button>
              </div>
            ))}
            {off.map((k) => <button key={k} className="chip" onClick={() => set({ combo: [...combo, k] })}>+ {k}</button>)}
          </div>
        </div>
      )}

      <div className="section">
        <h3>{t('keystone')}</h3>
        <div className="row" style={{ gap: 6 }}>
          {keystones.map((r) => (
            <button key={r.key} className="btn ghost icon" aria-pressed={cfg.runes?.keystone === r.key}
              style={{ borderColor: cfg.runes?.keystone === r.key ? 'var(--pink)' : 'transparent', opacity: RUNE_EFFECTS[r.key] ? 1 : 0.45 }}
              title={`${r.name}${RUNE_EFFECTS[r.key] ? '' : ' (not simulated)'}`}
              onClick={() => setRunes({ keystone: cfg.runes?.keystone === r.key ? null : r.key })}>
              <Icon kind="rune" file={r.icon} label={r.name} size="sm" round />
            </button>
          ))}
        </div>
        <h3 style={{ marginTop: 12 }}>{t('minors')}</h3>
        <div className="row" style={{ gap: 6 }}>
          {minors.map((r) => {
            const on = chosen.includes(r.key)
            return (
              <button key={r.key} className={`chip ${on ? 'on' : ''}`} title={RUNE_EFFECTS[r.key]?.desc}
                disabled={!on && chosen.length >= 5}
                onClick={() => setRunes({ minors: on ? chosen.filter((k) => k !== r.key) : [...chosen, r.key] })}>{r.name}</button>
            )
          })}
        </div>
        <h3 style={{ marginTop: 12 }}>{t('shards')}</h3>
        <div className="stack" style={{ gap: 6 }}>
          {SHARD_ROWS.map((row, i) => (
            <div className="seg" key={i} role="group">
              {row.map((id) => (
                <button key={id} aria-pressed={cfg.shards?.[i] === id} onClick={() => { const s = [...(cfg.shards || [])]; s[i] = id; set({ shards: s }) }}>{L(SHARDS[id].label, lang)}</button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>{t('summoners')}</h3>
        <div className="row">
          {[0, 1].map((i) => (
            <select key={i} value={cfg.summoners?.[i] || ''} aria-label={`${t('summoners')} ${i + 1}`}
              onChange={(e) => { const s = [...(cfg.summoners || [])]; s[i] = e.target.value; set({ summoners: s }) }} style={{ flex: 1 }}>
              {Object.values(data.summoners).filter((s) => SUMMONERS[s.id]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ))}
        </div>
      </div>

      {(needsLegend || extraStacks.length > 0 || cfg.runes?.keystone === 'DarkHarvest') && (
        <div className="section">
          <h3>{t('stacks')}</h3>
          <div className="stack" style={{ gap: 8 }}>
            {needsLegend && <StackInput stacks={stacks} set={set} k="legend" label={t('legend_stacks')} max={10} />}
            {cfg.runes?.keystone === 'DarkHarvest' && <StackInput stacks={stacks} set={set} k="souls" label={t('dh_souls')} max={80} />}
            {extraStacks.map((s) => <StackInput stacks={stacks} set={set} key={s.key} k={s.key} label={L(s.label, lang)} max={s.max} />)}
          </div>
        </div>
      )}

      {def?.notes && <p className="section tiny muted">ℹ {def.notes}</p>}
    </>
  )
}

function StackInput({ k, label, max, stacks, set }) {
  return (
    <label className="field">
      <span className="row" style={{ justifyContent: 'space-between' }}><span>{label}</span><b className="num" style={{ color: 'var(--ink)' }}>{stacks[k] ?? 0}</b></span>
      <input type="range" min="0" max={max} value={stacks[k] ?? 0} onChange={(e) => set({ stacks: { ...stacks, [k]: +e.target.value } })} aria-label={label} />
    </label>
  )
}
