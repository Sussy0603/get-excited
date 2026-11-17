// ─────────────────────────────────────────────────────────────
// stats.js — turns "champ + level + items + runes" into numbers.
// Pure functions only (no React), so they are easy to test.
// ─────────────────────────────────────────────────────────────

// Riot's per-level growth formula.
// A stat does NOT grow in a straight line: it grows a bit faster at high levels.
export const growth = (base, perLevel, level) =>
  base + perLevel * (level - 1) * (0.7025 + 0.0175 * (level - 1))

// Every stat a unit can have. Units:
//  asPct      = bonus attack speed in PERCENT (25 means +25%)
//  crit, lifesteal, omnivamp, armorPenPct, magicPenPct, msPct,
//  critDmg, healShieldPower = FRACTIONS (0.25 means 25%)
export const emptyStats = () => ({
  ad: 0, ap: 0, hp: 0, armor: 0, mr: 0, asPct: 0, crit: 0,
  lethality: 0, armorPenPct: 0, magicPen: 0, magicPenPct: 0,
  lifesteal: 0, omnivamp: 0, ah: 0, msFlat: 0, msPct: 0, mana: 0,
  healShieldPower: 0, critDmg: 0,
})

export function addStats(a, b) {
  const out = { ...a }
  for (const k in b) out[k] = (out[k] || 0) + (b[k] || 0)
  return out
}

// Stat shards (the 3 little rows under runes).
export const SHARDS = {
  adaptive: { id: 'adaptive', label: { en: 'Adaptive force', fr: 'Force adaptative' } },
  as: { id: 'as', label: { en: '10% attack speed', fr: '10 % vitesse d\'attaque' } },
  ah: { id: 'ah', label: { en: '8 ability haste', fr: '8 accélération' } },
  ms: { id: 'ms', label: { en: '2% move speed', fr: '2 % vitesse' } },
  hpScale: { id: 'hpScale', label: { en: 'Health (scaling)', fr: 'PV (évolutifs)' } },
  hpFlat: { id: 'hpFlat', label: { en: '65 health', fr: '65 PV' } },
  tenacity: { id: 'tenacity', label: { en: 'Tenacity', fr: 'Ténacité' } },
}
export const SHARD_ROWS = [
  ['adaptive', 'as', 'ah'],
  ['adaptive', 'ms', 'hpScale'],
  ['hpFlat', 'tenacity', 'hpScale'],
]

function shardStats(shards = [], level, adaptiveIsAd) {
  const s = emptyStats()
  for (const id of shards) {
    if (id === 'adaptive') adaptiveIsAd ? (s.ad += 5.4) : (s.ap += 9)
    if (id === 'as') s.asPct += 10
    if (id === 'ah') s.ah += 8
    if (id === 'ms') s.msPct += 0.02
    if (id === 'hpScale') s.hp += 10 + (170 / 17) * (level - 1)
    if (id === 'hpFlat') s.hp += 65
  }
  return s
}

// Which way "adaptive" goes: AD if the champ is more AD than AP.
export function prefersAd(champ, bonus) {
  const ad = bonus.ad || 0
  const ap = bonus.ap || 0
  if (ad !== ap) return ad > ap
  return !(champ.tags || []).includes('Mage') // tie: mages go AP
}

/**
 * computeStats — the final numbers for one champion.
 * @param champ    ddragon champion entry ({ stats, tags })
 * @param def      our hand-made ability file (may be null)
 * @param level    1-18
 * @param items    parsed items ({ stats, effect })
 * @param shards   ['as','adaptive','hpScale']
 * @param extra    extra flat stats (from runes, stacks…)
 */
export function computeStats({ champ, def, level, items = [], shards = [], extra = {}, baseCritDmg = 2 }) {
  const b = champ.stats
  const base = {
    hp: growth(b.hp, b.hpperlevel, level),
    ad: growth(b.attackdamage, b.attackdamageperlevel, level),
    armor: growth(b.armor, b.armorperlevel, level),
    mr: growth(b.spellblock, b.spellblockperlevel, level),
    mana: growth(b.mp || 0, b.mpperlevel || 0, level),
  }

  // Bonus stats = items + shards + extras
  let bonus = emptyStats()
  for (const it of items) bonus = addStats(bonus, it.stats || {})
  for (const it of items) if (it.effect?.stats) bonus = addStats(bonus, it.effect.stats)
  bonus = addStats(bonus, extra)
  bonus = addStats(bonus, shardStats(shards, level, prefersAd(champ, bonus)))

  // Attack speed: base × (1 + bonus%) but the bonus uses the "AS ratio".
  const asBase = b.attackspeed
  const asRatio = def?.asRatio ?? asBase
  const levelAsPct = growth(0, b.attackspeedperlevel || 0, level)
  const bonusAsPct = levelAsPct + bonus.asPct

  const ms = (b.movespeed + bonus.msFlat) * (1 + bonus.msPct)

  return {
    level,
    baseAd: base.ad,
    bonusAd: bonus.ad,
    ad: base.ad + bonus.ad,
    ap: bonus.ap,
    baseHp: base.hp,
    bonusHp: bonus.hp,
    hp: base.hp + bonus.hp,
    mana: base.mana + bonus.mana,
    armor: base.armor + bonus.armor,
    bonusArmor: bonus.armor,
    mr: base.mr + bonus.mr,
    bonusMr: bonus.mr,
    asBase,
    asRatio,
    bonusAsPct,
    as: Math.min(2.5, asBase + asRatio * (bonusAsPct / 100)),
    crit: Math.min(1, bonus.crit),
    critDmg: baseCritDmg + bonus.critDmg,
    lethality: bonus.lethality,
    armorPenPct: Math.min(0.75, bonus.armorPenPct),
    magicPen: bonus.magicPen,
    magicPenPct: Math.min(0.6, bonus.magicPenPct),
    lifesteal: bonus.lifesteal,
    omnivamp: bonus.omnivamp,
    ah: bonus.ah,
    ms,
    range: b.attackrange + (def?.rangeBonus || 0),
    healShieldPower: bonus.healShieldPower,
  }
}

// Ability ranks at a given level, from the "max order" (e.g. Q > W > E).
// Standard skill path: R at 6/11/16, main ability maxed first.
export function ranksAt(level, maxOrder = ['Q', 'W', 'E']) {
  const [P, S, T] = maxOrder
  const path = [P, S, T, P, P, 'R', P, S, P, S, 'R', S, S, T, T, 'R', T, T]
  const r = { Q: 0, W: 0, E: 0, R: 0 }
  for (let i = 0; i < level; i++) r[path[i]]++
  return r
}

// Ability haste → cooldown
export const hasteCd = (cd, ah) => (cd * 100) / (100 + ah)
