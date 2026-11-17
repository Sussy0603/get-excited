// Enemy team: 5 slots. The Calculator fights the one in focus.
import { useStore, sampleFight } from '../state/store.jsx'
import UnitEditor from '../components/UnitEditor.jsx'

export default function Enemies() {
  const { state, update, t, data } = useStore()
  const setSlot = (i, cfg) => update((s) => { s.enemies[i] = cfg })
  return (
    <div className="stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}><span className="tag">5</span> {t('nav_enemies')}</h2>
          <p className="hint" style={{ margin: '6px 0 0' }}>{t('enemies_hint')}</p>
        </div>
        {!state.enemies.some(Boolean) && (
          <button className="btn" onClick={() => update((s) => { s.enemies = sampleFight(data).enemies })}>🎲 {t('load_sample')}</button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16, alignItems: 'start' }}>
        {state.enemies.map((cfg, i) => (
          <div key={i} className="stack" style={{ gap: 8 }}>
            {cfg && (
              <label className="toggle small">
                <input type="radio" name="focus" checked={state.focus === i} onChange={() => update((s) => { s.focus = i })} />
                {t('focus')}
              </label>
            )}
            <UnitEditor cfg={cfg} onChange={(c) => setSlot(i, c)} label={`${t('enemy')} ${i + 1}`} accent="pink" compact
              onRemove={cfg ? () => setSlot(i, null) : undefined} />
          </div>
        ))}
      </div>
    </div>
  )
}
