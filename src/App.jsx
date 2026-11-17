// ─────────────────────────────────────────────────────────────
// App — the frame around every screen: logo, tabs, settings, footer.
// Routes: #/calc  #/enemies  #/team  #/compare  #/saved  #/overlay
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useStore } from './state/store.jsx'
import Calculator from './screens/Calculator.jsx'
import Enemies from './screens/Enemies.jsx'
import Team from './screens/Team.jsx'
import Compare from './screens/Compare.jsx'
import Saved from './screens/Saved.jsx'
import Overlay from './screens/Overlay.jsx'

const SCREENS = { calc: Calculator, enemies: Enemies, team: Team, compare: Compare, saved: Saved }
const TABS = [['calc', 'nav_calc'], ['enemies', 'nav_enemies'], ['team', 'nav_team'], ['compare', 'nav_compare'], ['saved', 'nav_saved']]

export default function App() {
  const { state, update, data, route, t, saved } = useStore()
  const [prefsOpen, setPrefsOpen] = useState(false)

  // Reading preferences live on <html> so CSS can react.
  useEffect(() => {
    const h = document.documentElement
    h.dataset.calm = state.prefs.calm ? '1' : '0'
    h.dataset.easy = state.prefs.easyFont ? '1' : '0'
    h.dataset.big = state.prefs.bigText ? '1' : '0'
    h.lang = state.lang
  }, [state.prefs, state.lang])

  useEffect(() => {
    if (!prefsOpen) return
    const close = (e) => { if (!e.target.closest('.prefs')) setPrefsOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [prefsOpen])

  if (!data) return <div className="loading"><span className="spin">{t('loading')}</span></div>
  if (route.route === 'overlay') return <Overlay />

  const Screen = SCREENS[route.route] || Calculator
  const enemyCount = state.enemies.filter(Boolean).length

  return (
    <>
      <div className="mobile-gate">
        <div className="logo">GET <span>EXCITED</span></div>
        <p>{t('mobile_gate')}</p>
      </div>

      <div className="app">
        <header className="topbar">
          <a className="logo" href="#/calc" aria-label="Get Excited — home">GET <span>EXCITED</span><small>{t('tagline')}</small></a>
          <nav className="nav" aria-label="Main">
            {TABS.map(([id, key]) => (
              <a key={id} href={`#/${id}`} aria-current={(route.route || 'calc') === id ? 'page' : undefined}>
                {t(key)}
                {id === 'enemies' && enemyCount > 0 && <span className="tiny"> ({enemyCount})</span>}
                {id === 'saved' && saved.length > 0 && <span className="tiny"> ({saved.length})</span>}
              </a>
            ))}
          </nav>
          <span className="spacer" />
          {data.versions?.length > 0 && (
            <label className="row small muted" style={{ gap: 6 }}>
              {t('patch')}
              <select value={state.patch || ''} onChange={(e) => update((s) => { s.patch = e.target.value || null })} style={{ width: 'auto', padding: '6px 10px' }} aria-label={t('patch')}>
                <option value="">{t('latest')} ({data.latest})</option>
                {data.versions.slice(1).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          )}
          {data.reloading && <span className="chip cyan">…</span>}
          <div className="seg" role="group" aria-label="Language">
            <button aria-pressed={state.lang === 'en'} onClick={() => update((s) => { s.lang = 'en' })}>EN</button>
            <button aria-pressed={state.lang === 'fr'} onClick={() => update((s) => { s.lang = 'fr' })}>FR</button>
          </div>
          <div className="prefs">
            <button className="btn" aria-expanded={prefsOpen} onClick={() => setPrefsOpen(!prefsOpen)}>Aa {t('prefs')}</button>
            {prefsOpen && (
              <div className="prefs-pop">
                {[['calm', 'calm'], ['easyFont', 'easy_font'], ['bigText', 'big_text']].map(([k, label]) => (
                  <label key={k} className="toggle">
                    <input type="checkbox" checked={state.prefs[k]} onChange={(e) => update((s) => { s.prefs[k] = e.target.checked })} />
                    {t(label)}
                  </label>
                ))}
              </div>
            )}
          </div>
        </header>

        {data.offline && <div className="notice" role="status">⚠ {t('offline')}</div>}
        {state.patch && data.version !== data.latest && <div className="notice" role="status">⏪ {t('patch')} {data.version} — {t('old_patch')}</div>}

        <main><Screen /></main>

        <footer className="footer">
          <div>{t('made_by')} · {t('patch')} {data.version}</div>
          <div>{t('legal')}</div>
        </footer>
      </div>
    </>
  )
}
