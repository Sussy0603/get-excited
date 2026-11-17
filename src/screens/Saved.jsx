// Saved builds (stored in this browser).
import { useState } from 'react'
import { useStore, encodeShare } from '../state/store.jsx'
import { ChampIcon, ItemIcon } from '../components/Icon.jsx'

export default function Saved() {
  const { state, update, saved, setSaved, t, data, go } = useStore()
  const [editing, setEditing] = useState(null)
  const [copied, setCopied] = useState(null)

  if (!saved.length) {
    return (
      <div className="panel empty">
        <div className="big">💾</div>
        <p className="muted">{t('saved_empty')}</p>
        <button className="btn primary" onClick={() => go('calc')}>{t('nav_calc')}</button>
      </div>
    )
  }

  const link = (cfg) => `${location.origin}${location.pathname}#/calc?s=${encodeShare({ ...state, me: cfg })}`

  return (
    <div className="stack">
      <h2>{t('nav_saved')} <span className="tag">{saved.length}</span></h2>
      {saved.map((b) => (
        <div key={b.id} className="panel row" style={{ gap: 16 }}>
          <ChampIcon id={b.cfg.champ} size="lg" ring="pink" />
          <div className="grow">
            {editing === b.id ? (
              <form onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('n'); setSaved((l) => l.map((x) => (x.id === b.id ? { ...x, name: v || x.name } : x))); setEditing(null) }} className="row">
                <input name="n" type="text" defaultValue={b.name} aria-label={t('build_name')} autoFocus style={{ maxWidth: 300 }} />
                <button className="btn" type="submit">✔</button>
              </form>
            ) : <h2 style={{ margin: 0 }}>{b.name}</h2>}
            <div className="muted small">{data.champions[b.cfg.champ]?.name} · {t('level')} {b.cfg.level} · {new Date(b.date).toLocaleDateString()}</div>
            <div className="row" style={{ gap: 4, marginTop: 8 }}>{b.cfg.items.map((id, k) => <ItemIcon key={k} id={id} size="sm" />)}</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn primary" onClick={() => { update((s) => { s.me = structuredClone(b.cfg) }); go('calc') }}>{t('load')}</button>
            <button className="btn" onClick={() => { update((s) => { s.me = s.me || structuredClone(b.cfg); if (s.compare.length < 3) s.compare.push([...b.cfg.items]); else s.compare[2] = [...b.cfg.items] }); go('compare') }}>{t('load_compare')}</button>
            <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(link(b.cfg)); setCopied(b.id); setTimeout(() => setCopied(null), 1500) } catch { /* ignore */ } }}>🔗 {copied === b.id ? t('copied') : t('share_link')}</button>
            <button className="btn ghost" onClick={() => setEditing(b.id)}>✎ {t('rename')}</button>
            <button className="btn ghost danger" onClick={() => setSaved((l) => l.filter((x) => x.id !== b.id))}>🗑 {t('delete')}</button>
          </div>
        </div>
      ))}
    </div>
  )
}
