// ─────────────────────────────────────────────────────────────
// build.js — turns a saved setup ("config") into a fighter the sim
// understands. A config is plain JSON so it can go in a share link.
//
// config = {
//   champ: 'Jinx', level: 11,
//   items: ['3031', '6672'],            // Riot item ids, in buy order
//   maxOrder: ['Q','W','E'],            // which ability is maxed first
//   combo: null | ['W','E','R'],        // null = our default
//   runes: { keystone: 'LethalTempoTemp', minors: ['CoupDeGrace'] },
//   shards: ['as','adaptive','hpScale'],
//   summoners: ['SummonerFlash','SummonerHeal'],
//   stacks: { legend: 10 },
//   target: null | 'B2',                // team mode: who to focus
// }
// ─────────────────────────────────────────────────────────────
import { computeStats, ranksAt } from './stats.js'
import { CHAMP_DEFS, defaultCombo } from '../data/champs/index.js'
import { withRiotSpells } from '../data/riotSpells.js'
import { runeEffect } from '../data/runes.js'
import { TARGETS } from '../data/targets.js'

export const newConfig = (champ = null) => ({
  champ,
  level: 11,
  items: [],
  maxOrder: ['Q', 'W', 'E'],
  combo: null,
  runes: { keystone: null, minors: [] },
  shards: ['adaptive', 'adaptive', 'hpScale'],
  summoners: ['SummonerFlash', 'SummonerDot'],
  stacks: {},
  target: null,
})

export function defaultStacks(champId) {
  const s = { legend: 10, souls: 0 }
  for (const x of CHAMP_DEFS[champId]?.stacks || []) s[x.key] = x.def
  return s
}

// Base crit damage: 200% since season 2026 (patch 16.x / "26.1"), 175% before.
export function baseCritFor(version) {
  const major = parseInt(String(version || '').split('.')[0], 10)
  return Number.isFinite(major) && major < 16 ? 1.75 : 2
}

export function buildUnit(cfg, data, key) {
  const champ = cfg && data.champions[cfg.champ]
  if (!champ) return null
  const def = withRiotSpells(CHAMP_DEFS[champ.id] || null, champ.id)
  const items = (cfg.items || []).map((id) => data.items[id]).filter(Boolean)
  const stacks = { ...defaultStacks(champ.id), ...(cfg.stacks || {}) }
  const runeKeys = [cfg.runes?.keystone, ...(cfg.runes?.minors || [])].filter(Boolean)
  const runes = runeKeys.map((k) => ({ key: k, ...(runeEffect(k) || {}) })).filter((r) => r.desc)

  // Always-on rune stats
  const extra = {}
  const fake = { stacks, stats: { level: cfg.level } }
  for (const r of runes) {
    if (!r.stats) continue
    for (const [k, v] of Object.entries(r.stats(fake))) extra[k] = (extra[k] || 0) + v
  }

  const level = cfg.level || 1
  const stats = computeStats({ champ, def, level, items, shards: cfg.shards || [], extra, baseCritDmg: baseCritFor(data.version) })
  if (def?.rangePerLevel) stats.range += def.rangePerLevel * (level - 1)
  // Multipliers (e.g. Rabadon's Deathcap: +30% AP)
  for (const it of items) {
    if (it.effect?.apMult) stats.ap *= it.effect.apMult
  }
  for (const r of runes) {
    if (r.statsPct?.hp) { const add = stats.hp * r.statsPct.hp; stats.hp += add; stats.bonusHp += add }
  }

  // Resource (mana / energy / none) for the optional resource mode
  const b = champ.stats
  stats.manaRegen = (b.mpregen != null ? b.mpregen + (b.mpregenperlevel || 0) * (level - 1) : 8) / 5
  const partype = champ.partype === 'Energy' ? 'energy' : champ.partype === 'Mana' || champ.partype == null ? 'mana' : 'none'

  return {
    key,
    partype,
    name: champ.name,
    champId: champ.id,
    level,
    stats,
    def,
    ranks: ranksAt(level, cfg.maxOrder),
    combo: cfg.combo?.length ? cfg.combo : defaultCombo(champ.id),
    items,
    runes,
    summoners: cfg.summoners || [],
    stacks,
    targetKey: cfg.target || null,
    gold: items.reduce((s, it) => s + (it.gold || 0), 0),
  }
}

export function buildDummies(targetId, lang = 'en') {
  const t = TARGETS[targetId]
  if (!t?.units) return []
  return t.units.map((d, i) => ({
    key: `T${i}`,
    name: d.name[lang] || d.name.en,
    champId: null,
    dummy: true,
    structure: !!d.structure,
    monster: !!d.monster,
    epic: !!d.epic,
    minion: !!d.minion,
    size: d.size,
    level: 1,
    stats: { hp: d.hp, armor: d.armor, mr: d.mr, ad: 0, ap: 0, range: 0, level: 1, ms: 0, asBase: 0, asRatio: 0, critDmg: 2 },
    def: null,
    ranks: {},
    combo: [],
    items: [],
    runes: [],
    summoners: [],
    stacks: {},
  }))
}
