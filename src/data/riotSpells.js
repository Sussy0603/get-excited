// ─────────────────────────────────────────────────────────────
// riotSpells.js — Riot's official per-champion spell data
// (cooldowns, costs, ranges), loaded live for the current patch.
// When it's loaded, it REPLACES the numbers typed in our kit files.
// ─────────────────────────────────────────────────────────────
const cache = new Map()

export const setSpellData = (id, spells) => cache.set(id, spells)
export const hasSpellData = (id) => cache.has(id)
export const getSpellData = (id) => cache.get(id)

// Merge Riot's cooldowns / costs / ranges into one of our kit files.
// Returns a NEW def (never changes the original).
export function withRiotSpells(def, id) {
  const riot = cache.get(id)
  if (!def || !riot) return def
  const spells = {}
  for (const [k, sp] of Object.entries(def.spells || {})) {
    const r = riot[k]
    if (!r) { spells[k] = sp; continue }
    const next = { ...sp }
    // keepCd: our cooldown stands in for charges/ammo, so we keep it
    if (!sp.keepCd && Array.isArray(r.cooldown) && r.cooldown.some((x) => x > 0)) next.cd = r.cooldown
    if (Array.isArray(r.cost) && r.costType !== 'none') next.cost = r.cost
    // Riot uses 25000 for "global / self" — keep our self-cast 0 in that case
    const range = Array.isArray(r.range) ? r.range : null
    if (range && range[0] < 25000 && atLeastOne(sp.range)) next.range = range
    spells[k] = next
  }
  return { ...def, spells, riotData: true }
}

const atLeastOne = (v) => (Array.isArray(v) ? v.some((x) => x > 0) : v > 0)
