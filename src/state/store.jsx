// ─────────────────────────────────────────────────────────────
// store.jsx — the app's memory.
//  • Everything the user sets up lives in ONE state object.
//  • Saved to the browser (localStorage) so it reopens where you left off.
//  • Can be squeezed into a link (#/calc?s=…) to share a setup.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { loadData, loadChampDetail } from '../data/ddragon.js'
import { hasSpellData, setSpellData } from '../data/riotSpells.js'
import { newConfig, defaultStacks } from '../engine/build.js'
import { makeT } from '../i18n.js'

const KEY = 'ge:state:v1'
const SAVED_KEY = 'ge:saved:v1'

export const initialState = () => ({
  lang: (typeof navigator !== 'undefined' && navigator.language?.startsWith('fr')) ? 'fr' : 'en',
  prefs: { calm: false, easyFont: false, bigText: false },
  me: null,
  enemies: [null, null, null, null, null],
  focus: 0,
  target: 'champ',
  opts: { twoWay: false, positioning: false },
  allies: [null, null, null, null, null],
  compare: [[], []],
  patch: null, // null = always latest
})

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode / full: ignore */ } }

// ── Share links: state → short text → state ────────────────
const SHARED = ['me', 'enemies', 'focus', 'target', 'opts', 'allies', 'compare', 'patch']
export function encodeShare(state) {
  const pick = Object.fromEntries(SHARED.map((k) => [k, state[k]]))
  const json = JSON.stringify(pick)
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function decodeShare(s) {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(b64))))
  } catch { return null }
}

// ── Hash router: #/calc?s=… ────────────────────────────────
export function parseHash() {
  const h = (typeof location !== 'undefined' ? location.hash : '') || '#/calc'
  const [path, query = ''] = h.slice(1).split('?')
  return { route: path.replace(/^\//, '') || 'calc', params: new URLSearchParams(query) }
}

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => {
    const base = { ...initialState(), ...(read(KEY) || {}) }
    const { params } = parseHash()
    const shared = params.get('s') && decodeShare(params.get('s'))
    return shared ? { ...base, ...shared } : base
  })
  const [saved, setSaved] = useState(() => read(SAVED_KEY) || [])
  const [data, setData] = useState(null)
  const [route, setRoute] = useState(() => parseHash())

  // Load Riot data (again when language changes)
  useEffect(() => {
    let alive = true
    setData((d) => (d ? { ...d, reloading: true } : d))
    loadData(state.lang, state.patch).then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [state.lang, state.patch])

  // Load Riot's spell data (cooldowns/costs/ranges) for every champ in use.
  useEffect(() => {
    if (!data?.version || data.version === 'offline') return
    const ids = new Set([state.me, ...state.enemies, ...state.allies].filter(Boolean).map((c) => c.champ))
    const fromHash = parseHash().route.match(/^builds\/(.+)$/)
    if (fromHash) ids.add(fromHash[1])
    const missing = [...ids].filter((id) => id && !hasSpellData(id))
    if (!missing.length) return
    let alive = true
    Promise.all(missing.map((id) => loadChampDetail(data.version, 'en', id).then((d) => d && setSpellData(id, d.spells)))).then(() => {
      if (alive) setData((d) => ({ ...d, spellRev: (d.spellRev || 0) + 1 })) // recompute everything
    })
    return () => { alive = false }
  }, [state.me, state.enemies, state.allies, data?.version, route])

  useEffect(() => write(KEY, state), [state])
  useEffect(() => write(SAVED_KEY, saved), [saved])

  useEffect(() => {
    const on = () => setRoute(parseHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // update(s => { s.me.level = 12 }) — edit a copy, then swap it in.
  const update = useCallback((fn) => setState((prev) => {
    const next = structuredClone(prev)
    fn(next)
    return next
  }), [])

  const value = useMemo(() => ({
    state, update, data, route, saved, setSaved,
    t: makeT(state.lang), lang: state.lang,
    go: (r) => { location.hash = `#/${r}` },
  }), [state, update, data, route, saved])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// A ready-to-go config for a champ (with sensible defaults).
export function configFor(champId, data, extra = {}) {
  const c = newConfig(champId)
  c.stacks = defaultStacks(champId)
  const tags = data?.champions?.[champId]?.tags || []
  if (tags.includes('Mage')) c.shards = ['adaptive', 'adaptive', 'hpScale']
  else if (tags.includes('Marksman')) c.shards = ['as', 'adaptive', 'hpScale']
  else c.shards = ['adaptive', 'adaptive', 'hpFlat']
  return { ...c, ...extra }
}

// Sample fight for the empty state. Only uses items/champs that exist.
export function sampleFight(data) {
  const has = (id) => !!data.items[id]
  const pick = (...ids) => ids.filter(has)
  const champ = (id, fallback) => (data.champions[id] ? id : fallback)
  const kp = (k) => (data.runeByKey[k] ? k : null)
  const me = configFor(champ('Jinx', Object.keys(data.champions)[0]), data, {
    level: 11,
    items: pick('3006', '3031', '6672'),
    runes: { keystone: kp('LethalTempoTemp'), minors: ['CoupDeGrace', 'LegendAlacrity'].filter(kp) },
    summoners: ['SummonerFlash', 'SummonerHeal'],
  })
  const foe = (id, items, keystone) => configFor(champ(id, 'Garen'), data, { level: 11, items: pick(...items), runes: { keystone: kp(keystone), minors: [] } })
  return {
    me,
    enemies: [
      foe('Garen', ['3075', '3053'], 'Conqueror'),
      foe('Darius', ['3071', '3053'], 'Conqueror'),
      foe('Ahri', ['3089', '3157'], 'Electrocute'),
      foe('Leona', ['3075', '3065'], 'VeteranAftershock'),
      foe('Lux', ['3089'], 'ArcaneComet'),
    ],
    focus: 0,
  }
}
