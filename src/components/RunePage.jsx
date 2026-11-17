// ─────────────────────────────────────────────────────────────
// RunePage — like the League client:
//   Primary tree:   1 keystone + 1 rune in each of the 3 rows
//   Secondary tree: 2 runes, from 2 different rows (not the keystone row)
// Runes the sim can't do yet are dimmed (still selectable).
// ─────────────────────────────────────────────────────────────
import { useStore } from '../state/store.jsx'
import Icon from './Icon.jsx'
import { RUNE_EFFECTS } from '../data/runes.js'

// Turn any saved rune setup (old or new format) into a full page.
export function normalizeRunes(r = {}, trees = []) {
  const treeOf = (key) => trees.find((tr) => tr.slots.some((row) => row.some((x) => x.key === key)))?.key
  const primary = r.primary || treeOf(r.keystone) || trees[0]?.key
  const pTree = trees.find((t) => t.key === primary)
  const minors = r.minors || []
  const pPicks = r.pPicks || [1, 2, 3].map((i) => minors.find((k) => pTree?.slots[i]?.some((x) => x.key === k)) || null)
  const leftovers = minors.filter((k) => !pPicks.includes(k))
  const secondary = r.secondary || treeOf(leftovers[0]) || trees.find((t) => t.key !== primary)?.key
  const sPicks = r.sPicks || leftovers.slice(0, 2)
  return { primary, keystone: r.keystone || null, pPicks, secondary, sPicks }
}

const withMinors = (p) => ({ ...p, minors: [...p.pPicks, ...p.sPicks].filter(Boolean) })

export default function RunePage({ runes, onChange }) {
  const { data, t } = useStore()
  const trees = data.trees || []
  const page = normalizeRunes(runes, trees)
  const pTree = trees.find((x) => x.key === page.primary)
  const sTree = trees.find((x) => x.key === page.secondary)
  const set = (patch) => onChange(withMinors({ ...page, ...patch }))

  const setPrimary = (key) => {
    const secondary = page.secondary === key ? trees.find((x) => x.key !== key)?.key : page.secondary
    onChange(withMinors({ primary: key, keystone: null, pPicks: [null, null, null], secondary, sPicks: secondary === page.secondary ? page.sPicks : [] }))
  }
  const setSecondary = (key) => set({ secondary: key, sPicks: [] })

  const pickPrimary = (row, key) => { const p = [...page.pPicks]; p[row - 1] = p[row - 1] === key ? null : key; set({ pPicks: p }) }
  const pickSecondary = (row, key) => {
    const rowOf = (k) => sTree.slots.findIndex((r) => r.some((x) => x.key === k))
    if (page.sPicks.includes(key)) return set({ sPicks: page.sPicks.filter((k) => k !== key) })
    let picks = page.sPicks.filter((k) => rowOf(k) !== row) // one per row
    picks = [...picks, key].slice(-2) // max 2, oldest drops
    set({ sPicks: picks })
  }

  const RuneBtn = ({ r, on, onClick, big }) => {
    const sim = !!RUNE_EFFECTS[r.key]
    return (
      <button className={`rune ${on ? 'on' : ''} ${sim ? '' : 'nosim'} ${big ? 'big' : ''}`} onClick={onClick} aria-pressed={on}
        title={`${r.name}${sim ? ` — ${RUNE_EFFECTS[r.key].desc}` : ` (${t('not_simulated')})`}`}>
        <Icon kind="rune" file={r.icon} label={r.name} size={big ? '' : 'sm'} round />
      </button>
    )
  }

  const TreeTabs = ({ value, onPick, exclude }) => (
    <div className="row" style={{ gap: 4 }}>
      {trees.filter((x) => x.key !== exclude).map((tr) => (
        <button key={tr.key} className={`rune tree ${value === tr.key ? 'on' : ''}`} onClick={() => onPick(tr.key)} aria-pressed={value === tr.key} title={tr.name}>
          <Icon kind="rune" file={tr.icon} label={tr.name} size="sm" round />
        </button>
      ))}
    </div>
  )

  return (
    <div className="runepage">
      <div className="rune-col">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>{t('primary_tree')} <span className="tag-name">{pTree?.name}</span></h3>
        </div>
        <TreeTabs value={page.primary} onPick={setPrimary} />
        {pTree && (
          <>
            <div className="rune-row keystones">
              {pTree.slots[0].map((r) => <RuneBtn key={r.key} r={r} big on={page.keystone === r.key} onClick={() => set({ keystone: page.keystone === r.key ? null : r.key })} />)}
            </div>
            {[1, 2, 3].map((row) => (
              <div key={row} className="rune-row">
                {(pTree.slots[row] || []).map((r) => <RuneBtn key={r.key} r={r} on={page.pPicks[row - 1] === r.key} onClick={() => pickPrimary(row, r.key)} />)}
              </div>
            ))}
          </>
        )}
      </div>
      <div className="rune-col">
        <h3 style={{ margin: 0 }}>{t('secondary_tree')} <span className="tag-name">{sTree?.name}</span> <span className="tiny muted">({page.sPicks.length}/2)</span></h3>
        <TreeTabs value={page.secondary} onPick={setSecondary} exclude={page.primary} />
        {sTree && [1, 2, 3].map((row) => (
          <div key={row} className="rune-row">
            {(sTree.slots[row] || []).map((r) => <RuneBtn key={r.key} r={r} on={page.sPicks.includes(r.key)} onClick={() => pickSecondary(row, r.key)} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
