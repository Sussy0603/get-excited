// ─────────────────────────────────────────────────────────────
// Calculator — the main screen.
// Left: your build. Right: target, numbers, and the fight replay.
// ─────────────────────────────────────────────────────────────
import { useMemo, useRef, useState } from 'react'
import { useStore, sampleFight } from '../state/store.jsx'
import UnitEditor from '../components/UnitEditor.jsx'
import { ChampIcon } from '../components/Icon.jsx'
import { HpChart, Donut } from '../components/Charts.jsx'
import FightLog from '../components/FightLog.jsx'
import Arena from '../components/Arena.jsx'
import ShareBar from '../components/ShareBar.jsx'
import ImportMatch from '../components/ImportMatch.jsx'
import StatsVs from '../components/StatsVs.jsx'
import { buildUnit, buildDummies } from '../engine/build.js'
import { dummyRun, fight, effectiveHp, enemyMix } from '../engine/metrics.js'
import { TARGETS, TARGET_IDS } from '../data/targets.js'
import { L } from '../i18n.js'

export const fmtS = (v) => (v == null ? '—' : `${v.toFixed(2)}`)
export const fmt = (v) => (v == null ? '—' : Math.round(v).toLocaleString())

export function useFightSetup() {
  const { state, data, lang } = useStore()
  const { me, enemies, target, opts, focus } = state
  return useMemo(() => {
    const meU = buildUnit(me, data, 'A0')
    const foes = enemies.map((c, i) => (c ? buildUnit(c, data, `B${i}`) : null))
    const dummies = target === 'champ' ? [] : buildDummies(target, lang)
    const focusIdx = foes[focus] ? focus : foes.findIndex(Boolean)
    const focusFoe = focusIdx >= 0 ? foes[focusIdx] : null
    return { meU, foes, dummies, focusIdx, focusFoe, opts, target }
  }, [me, enemies, target, opts, focus, data, lang])
}

export default function Calculator() {
  const { state, update, data, t, lang, setSaved, go } = useStore()
  const exportRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const { meU, foes, dummies, focusIdx, focusFoe, opts, target } = useFightSetup()

  const results = useMemo(() => {
    if (!meU) return null
    const versus = target === 'champ' ? (focusFoe ? [focusFoe] : null) : dummies
    if (!versus) return { perEnemy: [] }
    const perEnemy = target === 'champ'
      ? foes.map((f, i) => (f ? { i, f, r: dummyRun(meU, [f], { positioning: opts.positioning, record: false }) } : null)).filter(Boolean)
      : []
    const main = dummyRun(meU, versus, { positioning: opts.positioning, record: false })
    const replay = fight([meU], versus, { twoWay: target === 'champ' && opts.twoWay, positioning: opts.positioning })
    const liveFoes = foes.filter(Boolean)
    const mix = liveFoes.length ? enemyMix(liveFoes, meU, { positioning: opts.positioning }) : undefined
    const ehp = effectiveHp(meU, mix && (mix.physical + mix.magic + mix.true) > 0 ? mix : undefined)
    return { perEnemy, main, replay, ehp }
  }, [meU, foes, dummies, focusFoe, opts, target])

  const setMe = (cfg) => update((s) => { s.me = cfg })
  const loadSample = () => update((s) => Object.assign(s, sampleFight(data)))

  if (!state.me) {
    return (
      <div className="cols">
        <UnitEditor cfg={null} onChange={setMe} label={t('me')} />
        <div className="panel empty">
          <div className="big">{t('empty_title')}</div>
          <p className="muted">{t('empty_body')}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={loadSample}>🎲 {t('load_sample')}</button>
            <button className="btn" onClick={() => setImporting(true)}>📥 {t('import')}</button>
          </div>
        </div>
        {importing && <ImportMatch onClose={() => setImporting(false)} />}
      </div>
    )
  }

  const save = (name) => setSaved((list) => [{ id: Date.now().toString(36), name, date: new Date().toISOString(), cfg: state.me }, ...list])
  const killed = results?.main?.ttk != null
  const twoWayWinner = results?.replay && target === 'champ' && opts.twoWay ? results.replay.winner : undefined

  return (
    <div className="cols">
      <UnitEditor cfg={state.me} onChange={setMe} label={t('me')} />

      <div className="stack">
        {/* Controls */}
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between', gap: 16 }}>
            <div className="stack" style={{ gap: 8 }}>
              <h3 style={{ margin: 0 }}>{t('target')}</h3>
              <div className="seg" role="group" aria-label={t('target')}>
                {TARGET_IDS.map((id) => (
                  <button key={id} aria-pressed={target === id} onClick={() => update((s) => { s.target = id })}>
                    {id === 'champ' ? t('target_champ') : L(TARGETS[id].label, lang)}
                  </button>
                ))}
              </div>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <label className="toggle" title={target !== 'champ' ? '—' : ''}>
                <input type="checkbox" checked={opts.twoWay} disabled={target !== 'champ'} onChange={(e) => update((s) => { s.opts.twoWay = e.target.checked })} />
                {t('two_way')}
              </label>
              <label className="toggle" title={t('positioning_hint')}>
                <input type="checkbox" checked={opts.positioning} onChange={(e) => update((s) => { s.opts.positioning = e.target.checked })} />
                {t('positioning')} <span className="tiny muted">({t('positioning_hint')})</span>
              </label>
            </div>
          </div>
          <div className="section row" style={{ justifyContent: 'space-between' }}>
            <ShareBar targetRef={exportRef} onSave={save} />
            <button className="btn" onClick={() => setImporting(true)}>📥 {t('import')}</button>
          </div>
        </div>
        {importing && <ImportMatch onClose={() => setImporting(false)} />}

        {target === 'champ' && !focusFoe && (
          <div className="panel empty">
            <div className="big">{t('add_enemy')}</div>
            <p className="muted">{t('enemies_hint')}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary" onClick={() => go('enemies')}>+ {t('nav_enemies')}</button>
              <button className="btn" onClick={loadSample}>🎲 {t('load_sample')}</button>
            </div>
          </div>
        )}

        {results?.main && (
          <div ref={exportRef} className="stack" style={{ background: 'var(--bg)', borderRadius: 14 }}>
            {/* Big numbers */}
            <div className="tiles">
              <div className="tile pink">
                <div className="k">{t('ttk')}</div>
                <div className="v pop" key={results.main.ttk}>{killed ? <>{fmtS(results.main.ttk)}<small>{t('seconds')}</small></> : <span style={{ fontSize: '1.1rem' }}>{t('no_kill')}</span>}</div>
                <div className="sub">vs {target === 'champ' ? focusFoe?.name : L(TARGETS[target].label, lang)}</div>
                {killed && <div className="boom" key={`b${results.main.ttk}`}>BOOM!</div>}
              </div>
              <div className="tile cyan">
                <div className="k">{t('dps')}</div>
                <div className="v">{fmt(results.main.dps)}</div>
                <div className="sub">{t('physical')}+{t('magic')}+{t('true')}</div>
              </div>
              <div className="tile">
                <div className="k">{t('burst')}</div>
                <div className="v">{fmt(results.main.burst)}</div>
                <div className="sub">{target === 'champ' && focusFoe ? `${Math.round((results.main.burst / focusFoe.stats.hp) * 100)}% HP` : ''}</div>
              </div>
              <div className="tile">
                <div className="k">{t('ehp')}</div>
                <div className="v">{fmt(results.ehp.mixed)}</div>
                <div className="sub">{fmt(results.ehp.physical)} {t('vs_phys')} · {fmt(results.ehp.magic)} {t('vs_magic')}</div>
              </div>
            </div>

            {target === 'champ' && focusFoe && (
              <StatsVs me={meU} foe={focusFoe} foes={foes.filter(Boolean)}
                onFocus={(key) => update((s) => { s.focus = +key.slice(1) })} />
            )}

            <div className="row" style={{ alignItems: 'stretch', gap: 'var(--gap)' }}>
              {target === 'champ' && results.perEnemy.length > 0 && (
                <div className="panel grow">
                  <h3>{t('ttk_each')}</h3>
                  <div className="ttk-list">
                    {(() => {
                      const max = Math.max(...results.perEnemy.map((x) => x.r.ttk ?? 30))
                      return results.perEnemy.map(({ i, f, r }) => (
                        <button key={i} className="ttk-row" aria-pressed={i === focusIdx} onClick={() => update((s) => { s.focus = i })} title={t('focus')}>
                          <ChampIcon id={f.champId} size="sm" />
                          <span className="small">{f.name}</span>
                          <span className="bar"><i style={{ width: `${((r.ttk ?? 30) / max) * 100}%` }} /></span>
                          <span className="num small">{r.ttk != null ? `${r.ttk.toFixed(2)}s` : '30s+'}</span>
                        </button>
                      ))
                    })()}
                  </div>
                </div>
              )}
              <div className="panel">
                <h3>{t('split')}</h3>
                <Donut split={results.main.split} />
              </div>
            </div>

            {/* The fight */}
            <div className="panel">
              {twoWayWinner !== undefined && (
                <div className={`banner ${twoWayWinner === 'A' ? 'win' : 'lose'}`}>
                  {twoWayWinner === 'A' ? t('winner_you') : twoWayWinner === 'B' ? t('winner_them') : t('winner_none')}
                </div>
              )}
              <h3>{t('hp_chart')}</h3>
              <HpChart res={results.replay} />
            </div>
            <div className="panel">
              <h3>{t('arena')}</h3>
              <Arena res={results.replay} />
            </div>
            <div className="panel">
              <h3>{t('fight_log')}</h3>
              <FightLog res={results.replay} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
