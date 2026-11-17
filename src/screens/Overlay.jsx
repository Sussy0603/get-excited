// Stream overlay for OBS: a compact results card, transparent background.
// Use ?bg=green for a green screen instead.
import { useEffect, useMemo } from 'react'
import { useStore } from '../state/store.jsx'
import { ChampIcon, ItemIcon } from '../components/Icon.jsx'
import { buildUnit, buildDummies } from '../engine/build.js'
import { dummyRun } from '../engine/metrics.js'
import { TARGETS } from '../data/targets.js'
import { L } from '../i18n.js'
import { fmt } from './Calculator.jsx'

export default function Overlay() {
  const { state, data, t, lang, route } = useStore()
  useEffect(() => {
    document.documentElement.classList.add('overlay-mode')
    return () => document.documentElement.classList.remove('overlay-mode')
  }, [])

  const r = useMemo(() => {
    const me = buildUnit(state.me, data, 'A0')
    if (!me) return null
    const foe = state.enemies[state.focus] || state.enemies.find(Boolean)
    const versus = state.target === 'champ' ? (foe ? [buildUnit(foe, data, 'B0')] : null) : buildDummies(state.target, lang)
    if (!versus) return null
    return { me, versus, run: dummyRun(me, versus, { positioning: state.opts.positioning, resource: state.opts.resource, record: false }) }
  }, [state, data, lang])

  const green = route.params.get('bg') === 'green'
  if (!r) return <div className="overlay-root">—</div>
  const vsName = state.target === 'champ' ? r.versus[0].name : L(TARGETS[state.target].label, lang)

  return (
    <div className={`overlay-root ${green ? 'green' : ''}`}>
      <div className="overlay-card">
        <div className="row">
          <ChampIcon id={r.me.champId} ring="cyan" />
          <div className="grow">
            <div className="logo" style={{ fontSize: '1.2rem', transform: 'none' }}>GET <span>EXCITED</span></div>
            <b>{r.me.name}</b> <span className="muted small">lvl {r.me.level} vs {vsName}</span>
          </div>
          {state.target === 'champ' && <ChampIcon id={r.versus[0].champId} ring="pink" />}
        </div>
        <div className="row" style={{ gap: 4 }}>{r.me.items.map((it, i) => <ItemIcon key={i} id={it.id} size="sm" />)}</div>
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="tile pink"><div className="k">{t('ttk')}</div><div className="v">{r.run.ttk != null ? `${r.run.ttk.toFixed(2)}s` : '30s+'}</div></div>
          <div className="tile cyan"><div className="k">{t('dps')}</div><div className="v">{fmt(r.run.dps)}</div></div>
          <div className="tile"><div className="k">{t('burst')}</div><div className="v">{fmt(r.run.burst)}</div></div>
        </div>
      </div>
    </div>
  )
}
