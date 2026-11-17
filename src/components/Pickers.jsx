// Full-screen pickers for champions and items.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { ChampIcon, ItemIcon } from './Icon.jsx'
import { abilityStatus, VERIFIED, kitLevel } from '../data/champs/index.js'
import { ROLES as ITEM_ROLES, ROLE_LABEL, STAT_FILTERS, itemRoles, isBoots, searchText } from '../data/itemRules.js'
import { L } from '../i18n.js'

function Modal({ title, onClose, tools, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.querySelector('input')?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2 className="grow">{title}</h2>
          <button className="btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-tools">{tools}</div>
        {children}
      </div>
    </div>
  )
}

const ROLES = ['Marksman', 'Fighter', 'Tank', 'Mage', 'Assassin', 'Support']

export function ChampPicker({ onPick, onClose }) {
  const { data, t } = useStore()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('Marksman')
  const list = useMemo(() => {
    const all = Object.values(data.champions).sort((a, b) => a.name.localeCompare(b.name))
    return all.filter((c) =>
      (!q || c.name.toLowerCase().includes(q.toLowerCase())) &&
      (q || role === 'all' || c.tags.includes(role)))
  }, [data, q, role])
  return (
    <Modal title={t('pick_champ')} onClose={onClose} tools={<>
      <input type="search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} aria-label={t('search')} />
      <div className="seg" role="group">
        <button aria-pressed={role === 'all'} onClick={() => setRole('all')}>{t('all')}</button>
        {ROLES.map((r) => <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>{r}</button>)}
      </div>
      <span className="tiny muted">
        <span className="dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: 'var(--cyan)' }} /> detailed kit ·{' '}
        <span className="dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: 'var(--yellow)' }} /> simplified ·{' '}
        <span className="dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, background: 'var(--good)' }} /> verified
      </span>
    </>}>
      <div className="grid-pick">
        {list.map((c) => (
          <button key={c.id} className="pick" onClick={() => onPick(c.id)} title={c.title}>
            <ChampIcon id={c.id} />
            <span>{c.name} {abilityStatus(c.id) === 'full' && <span className="dot" style={{ background: VERIFIED.has(c.id) ? 'var(--good)' : kitLevel(c.id) === 'simplified' ? 'var(--yellow)' : 'var(--cyan)' }} />}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

export function ItemPicker({ onPick, onClose, exclude = [], allowItems = true, allowBoots = true, startRole = 'all' }) {
  const { data, t, lang } = useStore()
  const [q, setQ] = useState('')
  const [complete, setComplete] = useState(true)
  const [role, setRole] = useState(allowItems ? startRole : 'Boots')
  const [stats, setStats] = useState([])
  const [sort, setSort] = useState('priceDesc')
  const priceCap = useMemo(() => Math.max(...Object.values(data.items).map((it) => it.gold)), [data])
  const [maxPrice, setMaxPrice] = useState(priceCap)

  // Everything that passes the filters (before role grouping)
  const pool = useMemo(() => {
    const seen = new Set()
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return Object.values(data.items)
      .filter((it) => !exclude.includes(it.id))
      .filter((it) => (isBoots(it) ? allowBoots : allowItems))
      .filter((it) => (complete ? (it.complete && (it.gold >= 900 || isBoots(it) || it.starter)) : true))
      .filter((it) => it.gold <= maxPrice)
      .filter((it) => stats.every((id) => STAT_FILTERS.find((f) => f.id === id).test(it.stats || {}, it)))
      .filter((it) => { if (!words.length) return true; const txt = searchText(it); return words.every((w) => txt.includes(w)) })
      .filter((it) => (seen.has(it.name) ? false : seen.add(it.name)))
      .sort(sort === 'priceAsc' ? (a, b) => a.gold - b.gold : sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.gold - a.gold)
  }, [data, q, complete, exclude, allowItems, allowBoots, maxPrice, stats, sort])

  const counts = useMemo(() => {
    const c = { all: pool.length }
    for (const it of pool) for (const r of itemRoles(it)) c[r] = (c[r] || 0) + 1
    return c
  }, [pool])

  // "All" = grouped by category like the in-game shop (each item once, first category)
  const sections = useMemo(() => {
    if (role !== 'all') return [{ id: role, items: pool.filter((it) => itemRoles(it).includes(role)) }]
    const order = [...ITEM_ROLES, 'Other']
    return order.map((r) => ({ id: r, items: pool.filter((it) => itemRoles(it)[0] === r) })).filter((x) => x.items.length)
  }, [pool, role])

  const toggleStat = (id) => setStats((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const tabs = ['all', ...ITEM_ROLES].filter((r) => (r === 'Boots' ? allowBoots : r === 'all' ? true : allowItems))

  return (
    <Modal title={t('add_item')} onClose={onClose} tools={<div className="stack" style={{ gap: 10, width: '100%' }}>
      <div className="row">
        <input type="search" placeholder={t('item_search')} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 380 }} aria-label={t('search')} />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }} aria-label={t('sort')}>
          <option value="priceDesc">{t('sort_price_desc')}</option>
          <option value="priceAsc">{t('sort_price_asc')}</option>
          <option value="name">{t('sort_name')}</option>
        </select>
        <label className="row small" style={{ gap: 8, minWidth: 260 }}>
          <span className="muted">{t('max_price')}</span>
          <input type="range" min="300" max={priceCap} step="50" value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} aria-label={t('max_price')} style={{ width: 130 }} />
          <b className="num" style={{ color: 'var(--yellow)', minWidth: 46 }}>{maxPrice}</b>
        </label>
        <label className="toggle small"><input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} /> {t('complete_only')}</label>
        <span className="tiny muted">★ = {t('passive_sim')}</span>
      </div>
      <div className="seg" role="group" aria-label={t('category')}>
        {tabs.map((r) => (
          <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>
            {r === 'all' ? t('all') : L(ROLE_LABEL[r], lang)} <span className="tiny">({counts[r] || 0})</span>
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 6 }}>
        {STAT_FILTERS.map((f) => (
          <button key={f.id} className={`chip ${stats.includes(f.id) ? 'on' : ''}`} onClick={() => toggleStat(f.id)} aria-pressed={stats.includes(f.id)}>{L(f.label, lang)}</button>
        ))}
        {(stats.length > 0 || q || maxPrice < priceCap) && <button className="chip" onClick={() => { setStats([]); setQ(''); setMaxPrice(priceCap) }}>✕ {t('clear')}</button>}
      </div>
    </div>}>
      <div style={{ overflow: 'auto', padding: '10px 18px 18px' }}>
        {sections.every((s) => !s.items.length) && <p className="muted">{t('no_items')}</p>}
        {sections.map((sec) => (
          <section key={sec.id} style={{ marginBottom: 14 }}>
            {role === 'all' && <h3 style={{ margin: '8px 0' }}>{L(ROLE_LABEL[sec.id], lang)}</h3>}
            <div className="grid-pick" style={{ padding: 0 }}>
              {sec.items.map((it) => (
                <button key={it.id} className="pick" onClick={() => onPick(it.id)} title={`${it.name} — ${statLine(it, lang)}${it.effect ? `\n★ ${it.effect.desc}${it.effect.approx ? ' (≈)' : ''}` : ''}`}>
                  <ItemIcon id={it.id} />
                  <span>{it.name}{it.effect ? ' ★' : ''}</span>
                  <span className="gold">{it.gold}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  )
}

function statLine(it, lang) {
  return STAT_FILTERS.filter((f) => f.test(it.stats || {}, it)).map((f) => L(f.label, lang)).join(', ')
}
