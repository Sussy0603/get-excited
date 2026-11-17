import { useState } from 'react'
import { toPng } from 'html-to-image'
import { useStore, encodeShare } from '../state/store.jsx'

const base = () => `${location.origin}${location.pathname}`

export default function ShareBar({ targetRef, route = 'calc', onSave }) {
  const { state, t } = useStore()
  const [msg, setMsg] = useState('')
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 1800) }

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); flash(t('copied')) } catch { window.open(text, '_blank') }
  }
  const link = () => `${base()}#/${route}?s=${encodeShare(state)}`
  const overlay = () => `${base()}#/overlay?s=${encodeShare(state)}`

  const exportPng = async () => {
    if (!targetRef?.current) return
    try {
      const url = await toPng(targetRef.current, { backgroundColor: '#0a0910', pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = url
      a.download = `get-excited-${state.me?.champ || 'fight'}.png`
      a.click()
    } catch (e) {
      console.warn(e)
      flash('Image export blocked by the browser')
    }
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      {onSave && !naming && <button className="btn" onClick={() => { setName(`${state.me?.champ || 'Build'} ${new Date().toLocaleDateString()}`); setNaming(true) }}>💾 {t('save_build')}</button>}
      {onSave && naming && (
        <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); onSave(name.trim() || 'Build'); setNaming(false); flash('✔') }}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-label={t('build_name')} style={{ width: 200 }} autoFocus />
          <button className="btn" type="submit">✔</button>
          <button className="btn ghost" type="button" onClick={() => setNaming(false)}>✕</button>
        </form>
      )}
      <button className="btn" onClick={() => copy(link())}>🔗 {t('share_link')}</button>
      {targetRef && <button className="btn" onClick={exportPng}>🖼 {t('export_png')}</button>}
      <button className="btn" onClick={() => copy(overlay())} title={t('overlay_hint')}>📺 {t('overlay')}</button>
      {msg && <span className="chip pink pop" role="status">{msg}</span>}
    </div>
  )
}
