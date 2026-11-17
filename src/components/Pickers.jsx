// Full-screen pickers for champions and items.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { ChampIcon, ItemIcon } from './Icon.jsx'
import { abilityStatus, VERIFIED, kitLevel } from '../data/champs/index.js'

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

export function ItemPicker({ onPick, onClose, exclude = [] }) {
  const { data, t } = useStore()
  const [q, setQ] = useState('')
  const [complete, setComplete] = useState(true)
  const list = useMemo(() => {
    const seen = new Set()
    return Object.values(data.items)
      .filter((it) => !exclude.includes(it.id))
      .filter((it) => (complete ? it.complete && it.gold >= 900 : true))
      .filter((it) => !q || it.name.toLowerCase().includes(q.toLowerCase()) || it.enName.toLowerCase().includes(q.toLowerCase()))
      .filter((it) => (seen.has(it.name) ? false : seen.add(it.name)))
      .sort((a, b) => b.gold - a.gold)
  }, [data, q, complete, exclude])
  return (
    <Modal title={t('add_item')} onClose={onClose} tools={<>
      <input type="search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} aria-label={t('search')} />
      <label className="toggle"><input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} /> {t('complete_only')}</label>
      <span className="tiny muted">★ = passive simulated</span>
    </>}>
      <div className="grid-pick">
        {list.map((it) => (
          <button key={it.id} className="pick" onClick={() => onPick(it.id)} title={it.plaintext}>
            <ItemIcon id={it.id} />
            <span>{it.name}{it.effect ? ' ★' : ''}</span>
            <span className="gold">{it.gold}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
