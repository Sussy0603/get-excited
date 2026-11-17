// "Import a match" window: Riot ID → last 5 games → load a build.
import { useEffect, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { ChampIcon, ItemIcon } from './Icon.jsx'
import { fetchMatches, toConfig, IMPORT_API_DEFAULT } from '../data/importMatch.js'

const REGIONS = ['na', 'euw', 'eune', 'kr', 'br', 'lan', 'las', 'oce', 'jp', 'tr', 'ru']

export default function ImportMatch({ onClose }) {
  const { state, update, data, t } = useStore()
  const imp = state.importer || {}
  const [riotId, setRiotId] = useState(imp.riotId || '')
  const [region, setRegion] = useState(imp.region || 'na')
  const [api, setApi] = useState(imp.api || IMPORT_API_DEFAULT)
  const [status, setStatus] = useState('idle') // idle | loading | error | done
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const search = async (e) => {
    e.preventDefault()
    update((s) => { s.importer = { riotId, region, api } })
    setStatus('loading')
    try {
      setResult(await fetchMatches(api, riotId, region))
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const load = (m, withEnemies) => {
    const me = toConfig(m.me, data)
    update((s) => {
      if (me) s.me = me
      if (withEnemies) {
        s.enemies = [0, 1, 2, 3, 4].map((i) => (m.enemies[i] ? toConfig(m.enemies[i], data) : null))
        s.allies = [me, ...m.allies.map((p) => toConfig(p, data))].slice(0, 5)
        s.focus = 0
        s.target = 'champ'
      }
    })
    onClose()
  }

  const ERRORS = {
    not_found: t('imp_err_notfound'), key_expired: t('imp_err_key'), rate_limited: t('imp_err_rate'),
    no_key: t('imp_err_key'), bad_riot_id: t('imp_err_id'),
  }

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('import')} style={{ width: 'min(760px, 100%)' }}>
        <div className="modal-head">
          <h2 className="grow">📥 {t('import')}</h2>
          <button className="btn" onClick={onClose} aria-label={t('close')}>✕</button>
        </div>
        <form className="modal-tools" onSubmit={search}>
          <label className="field grow">Riot ID
            <input type="text" value={riotId} onChange={(e) => setRiotId(e.target.value)} placeholder="Name#TAG" required />
          </label>
          <label className="field">{t('region')}
            <select value={region} onChange={(e) => setRegion(e.target.value)}>{REGIONS.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}</select>
          </label>
          <label className="field" style={{ flexBasis: '100%' }}>{t('import_api')}
            <input type="text" value={api} onChange={(e) => setApi(e.target.value)} placeholder="https://get-excited-import.yourname.workers.dev" required />
          </label>
          <button className="btn primary" type="submit" disabled={status === 'loading'}>{status === 'loading' ? '…' : t('search_games')}</button>
        </form>
        <div style={{ overflow: 'auto', padding: '14px 18px' }}>
          {!api && <p className="muted small">{t('import_setup')}</p>}
          {status === 'error' && <p className="notice">⚠ {ERRORS[error] || `${t('imp_err')} (${error})`}</p>}
          {status === 'done' && !result.matches.length && <p className="muted">{t('imp_none')}</p>}
          {status === 'done' && result.matches.map((m) => (
            <div key={m.id} className="mini" style={{ marginBottom: 8, borderColor: m.win ? 'var(--cyan)' : 'var(--pink)' }}>
              <ChampIcon id={Object.keys(data.champions).find((k) => k.toLowerCase() === m.me.champ.toLowerCase())} ring={m.win ? 'cyan' : 'pink'} />
              <div>
                <b>{m.win ? t('win') : t('loss')}</b> · <span className="num">{m.me.kda}</span> · <span className="muted small">{t('level')} {m.me.level} · {m.durationMin} min · {new Date(m.date).toLocaleDateString()}</span>
                <div className="items">{m.me.items.map((id, i) => <ItemIcon key={i} id={id} size="sm" />)}</div>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <button className="btn small" onClick={() => load(m, false)}>{t('imp_my_build')}</button>
                <button className="btn small" onClick={() => load(m, true)}>{t('imp_whole_game')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
