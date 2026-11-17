// ─────────────────────────────────────────────────────────────
// Champion pages: #/builds (all champs) and #/builds/Jinx (one champ).
// The "recommended build" is found by the simulator:
// it buys, one by one, the item that kills a standard target fastest.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react'
import { useStore, configFor } from '../state/store.jsx'
import Icon, { ChampIcon, ItemIcon } from '../components/Icon.jsx'
import { StatusChip, useChampDetail } from '../components/UnitEditor.jsx'
import { CHAMP_DEFS } from '../data/champs/index.js'
import { RUNE_EFFECTS } from '../data/runes.js'
import { buildUnit, buildDummies } from '../engine/build.js'
import { bestNextItem, dummyRun } from '../engine/metrics.js'
import { itemRoles, isBoots, defaultBootSlot } from '../data/itemRules.js'

// Standard target: a mid-game bruiser-ish dummy (2600 HP, 100 armor, 70 MR)
export const STANDARD_TARGET = () => [{
  ...buildDummies('tower')[0],
  key: 'T0', name: 'Training dummy', structure: false, size: 65,
  stats: { hp: 2600, armor: 100, mr: 70, ad: 0, ap: 0, range: 0, level: 13, ms: 0, asBase: 0, asRatio: 0, critDmg: 2 },
}]

const ROLE_OF = (champ) => ['Marksman', 'Assassin', 'Mage', 'Fighter', 'Tank', 'Support'].find((r) => (champ?.tags || []).includes(r)) || 'Fighter'

export function recommendBuild(champId, data, level = 13) {
  const champ = data.champions[champId]
  const role = ROLE_OF(champ)
  const foes = STANDARD_TARGET()
  const fits = (it) => itemRoles(it).includes(role) || (role === 'Support' && itemRoles(it).includes('Mage')) || (role === 'Tank' && itemRoles(it).includes('Fighter'))

  // 1) keystone: try each simulated keystone, keep the best
  const keystones = data.trees.flatMap((tr) => tr.slots[0] || []).filter((r) => RUNE_EFFECTS[r.key] && !RUNE_EFFECTS[r.key].noCombat)
  let cfg = configFor(champId, data, { level, bootSlot: defaultBootSlot(champ) })
  let best = null
  for (const k of keystones) {
    const c = { ...cfg, runes: { keystone: k.key, minors: [] } }
    const r = dummyRun(buildUnit(c, data, 'A0'), foes, { record: false })
    if (!best || r.dps > best.dps) best = { key: k.key, dps: r.dps }
  }
  cfg = { ...cfg, runes: { keystone: best?.key || null, minors: [] } }

  // 2) items: greedy, 3 core items, then boots, then 3 more
  const seen = new Set()
  const pool = Object.values(data.items)
    .filter((it) => it.complete && !it.starter && it.gold >= 900 && !isBoots(it) && fits(it))
    .filter((it) => (seen.has(it.name) ? false : seen.add(it.name)))
    .map((it) => it.id)
  const boots = Object.values(data.items).filter((it) => isBoots(it) && it.gold >= 900).map((it) => it.id)
  for (let step = 0; step < 7; step++) {
    const wantBoots = step === 3
    const cands = (wantBoots ? boots : pool).filter((id) => !cfg.items.includes(id))
    if (!cands.length) continue
    const [top] = bestNextItem(cfg, data, buildUnit, foes, cands)
    if (top) cfg = { ...cfg, items: [...cfg.items, top.id] }
  }
  const final = dummyRun(buildUnit(cfg, data, 'A0'), foes, { record: false })
  return { cfg, role, ttk: final.ttk, dps: final.dps }
}

export function ChampIndex() {
  const { data, t } = useStore()
  const [q, setQ] = useState('')
  const list = Object.values(data.champions)
    .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div className="stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{t('nav_champs')} <span className="tag">{list.length}</span></h2>
        <input type="search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} aria-label={t('search')} />
      </div>
      <div className="grid-pick panel" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
        {list.map((c) => (
          <a key={c.id} className="pick" href={`#/builds/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <ChampIcon id={c.id} />
            <span>{c.name}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default function ChampPage({ champId }) {
  const { data, t, update, go } = useStore()
  const champ = data.champions[champId]
  const def = CHAMP_DEFS[champId]
  const detail = useChampDetail(champId)
  const [rec, setRec] = useState(null)

  useEffect(() => {
    setRec(null)
    if (!champ) return
    const id = setTimeout(() => setRec(recommendBuild(champId, data)), 30)
    return () => clearTimeout(id)
  }, [champId, data, champ])

  useEffect(() => {
    if (champ) document.title = `${champ.name} build & damage calculator — Get Excited`
    return () => { document.title = 'Get Excited — LoL damage calculator' }
  }, [champ])

  const keystone = useMemo(() => rec && data.runeByKey[rec.cfg.runes.keystone], [rec, data])

  if (!champ) return <div className="panel empty"><div className="big">?</div><a href="#/builds">{t('nav_champs')}</a></div>

  return (
    <div className="stack">
      <div className="panel hot">
        <div className="champ-head">
          <ChampIcon id={champId} size="lg" ring="pink" />
          <div className="grow">
            <h1 className="name" style={{ margin: 0 }}>{champ.name}</h1>
            <div className="title">{champ.title} · {champ.tags.join(' / ')}</div>
            <div style={{ marginTop: 6 }}><StatusChip champId={champId} /></div>
          </div>
          <a className="btn ghost" href="#/builds">← {t('nav_champs')}</a>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h3>{t('kit')}</h3>
          <div className="stack" style={{ gap: 10 }}>
            {['Q', 'W', 'E', 'R'].map((k) => {
              const sp = def?.spells?.[k]
              return (
                <div key={k} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <Icon kind="spell" file={detail?.spells?.[k]?.image} label={k} size="sm" />
                  <div className="grow">
                    <b>{k} — {detail?.spells?.[k]?.name || k}</b>
                    <div className="tiny muted">
                      {sp ? `${t('cooldown')}: ${[].concat(sp.cd).join(' / ')}s · ${t('range')}: ${[].concat(sp.range).join(' / ')}` : t('autos_only')}
                    </div>
                  </div>
                </div>
              )
            })}
            {def?.notes && <p className="tiny muted" style={{ margin: 0 }}>ℹ {def.notes}</p>}
          </div>
        </div>

        <div className="panel">
          <h3>{t('rec_build')} <span className="tag-name">({t('rec_build_vs')})</span></h3>
          {!rec && <p className="muted">{t('computing')}</p>}
          {rec && (
            <div className="stack" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 6 }}>
                {rec.cfg.items.map((id, i) => (
                  <div key={id} className="stack" style={{ gap: 2, justifyItems: 'center' }}>
                    <ItemIcon id={id} />
                    <span className="tiny muted">{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="small">{rec.cfg.items.map((id) => data.items[id]?.name).join(' → ')}</div>
              {keystone && (
                <div className="row small"><Icon kind="rune" file={keystone.icon} label={keystone.name} size="sm" round /> {t('keystone')}: <b>{keystone.name}</b></div>
              )}
              <div className="tiles" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="tile pink"><div className="k">{t('ttk')}</div><div className="v">{rec.ttk != null ? `${rec.ttk.toFixed(2)}s` : '30s+'}</div></div>
                <div className="tile cyan"><div className="k">{t('dps')}</div><div className="v">{Math.round(rec.dps)}</div></div>
              </div>
              <button className="btn primary" onClick={() => { update((s) => { s.me = rec.cfg }); go('calc') }}>⚡ {t('open_in_calc')}</button>
              <p className="tiny muted" style={{ margin: 0 }}>{t('rec_build_hint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
