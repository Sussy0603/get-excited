// ─────────────────────────────────────────────────────────────
// runes.js — what each rune DOES in a fight.
// Keys match Riot's runesReforged.json "key" field.
// Names/icons come from Riot's data; this file is just the math.
//
// Hooks (all optional):
//   stats(u)       always-on stats (Legend: Alacrity…)
//   asBonus(u)     extra attack speed %
//   adBonus(u)     extra AD
//   amp(ctx)       outgoing damage multiplier
//   onHit(ctx)     on basic attack → [{dt, raw, label}]
//   onSpellHit(ctx) on ability hit → [{dt, raw, label}]
//   onDamage(ctx)  any damage you deal to a champion (Electrocute…)
//   takenFlat(u)   flat reduction on damage you take (Bone Plating)
//   healOnDmg(u)   % of damage healed (Conqueror at max)
// ─────────────────────────────────────────────────────────────
import { byLevel } from './champs/_helpers.js'

const L = (u) => u.stats.level
const isRanged = (u) => u.stats.range >= 300
const adaptive = (u) => (u.stats.bonusAd >= u.stats.ap ? 'physical' : 'magic')
const adaptiveRaw = (u, base) => base + 0.1 * u.stats.bonusAd + 0.05 * u.stats.ap

export const RUNE_EFFECTS = {
  // ── Keystones ─────────────────────────────────────────────
  LethalTempoTemp: {
    desc: 'Attacks stack up to 6× attack speed',
    onHit: (ctx) => { ctx.u.st.lt = Math.min(6, (ctx.u.st.lt || 0) + 1); return [] },
    asBonus: (u) => (u.st.lt || 0) * byLevel(isRanged(u) ? 3 : 4, isRanged(u) ? 8 : 9, L(u)),
  },
  PressTheAttack: {
    desc: '3 hits: burst + target takes 8% more damage',
    onHit: (ctx) => {
      ctx.addMark('pta', 1, 4, 3)
      if (ctx.mark('pta') !== 3 || ctx.tgtState().ptaDone) return []
      ctx.tgtState().ptaDone = true
      ctx.tgtState().exposedUntil = ctx.t + 5
      return [{ dt: adaptive(ctx.u), raw: byLevel(40, 174, L(ctx.u)), label: 'Press the Attack' }]
    },
    amp: (ctx) => (ctx.t < (ctx.tgtState().exposedUntil ?? -1) ? 1.08 : 1),
  },
  Conqueror: {
    desc: 'Stacks AD; heals at max stacks',
    onHit: (ctx) => { ctx.u.st.conq = Math.min(12, (ctx.u.st.conq || 0) + (isRanged(ctx.u) ? 1 : 2)); return [] },
    onSpellHit: (ctx) => { ctx.u.st.conq = Math.min(12, (ctx.u.st.conq || 0) + 2); return [] },
    adBonus: (u) => (u.st.conq || 0) * byLevel(1.08, 2.4, L(u)),
    healOnDmg: (u) => ((u.st.conq || 0) >= 12 ? (isRanged(u) ? 0.05 : 0.08) : 0),
  },
  FleetFootwork: {
    desc: 'Every ~5 attacks: heal',
    onHit: (ctx) => {
      ctx.u.st.fleet = (ctx.u.st.fleet || 0) + 1
      if (ctx.u.st.fleet < 5) return []
      ctx.u.st.fleet = 0
      const amt = (byLevel(10, 100, L(ctx.u)) + 0.1 * ctx.bonusAd + 0.05 * ctx.ap) * (isRanged(ctx.u) ? 0.6 : 1)
      ctx.sim.healUnit(ctx.u, amt, 'Fleet Footwork')
      return []
    },
  },
  HailOfBlades: {
    desc: 'First 3 attacks: +110% attack speed',
    onHit: (ctx) => { ctx.u.st.hob = (ctx.u.st.hob ?? 3) - 1; return [] },
    asBonus: (u) => ((u.st.hob ?? 3) > 0 ? 110 : 0),
  },
  Electrocute: {
    desc: '3 separate hits in 3s: burst',
    onDamage: (ctx) => {
      if (ctx.tags.dot || ctx.tags.rune) return []
      if (ctx.t < (ctx.u.st.elecCd ?? -1)) return []
      const s = ctx.tgtState()
      s.eHits = (s.eHits || []).filter((x) => ctx.t - x.t < 3)
      if (s.eHits.some((x) => x.id === ctx.tags.castId)) return []
      s.eHits.push({ t: ctx.t, id: ctx.tags.castId })
      if (s.eHits.length < 3) return []
      s.eHits = []
      ctx.u.st.elecCd = ctx.t + byLevel(25, 20, L(ctx.u))
      return [{ dt: adaptive(ctx.u), raw: adaptiveRaw(ctx.u, byLevel(30, 220, L(ctx.u))), label: 'Electrocute' }]
    },
  },
  DarkHarvest: {
    desc: 'Below 50% HP: burst (+5 per soul)',
    onDamage: (ctx) => {
      if (ctx.tags.rune || ctx.t < (ctx.u.st.dhCd ?? -1)) return []
      if (ctx.tgt.hp / ctx.tgt.maxHp >= 0.5) return []
      ctx.u.st.dhCd = ctx.t + 25
      const souls = ctx.u.stacks.souls || 0
      return [{ dt: adaptive(ctx.u), raw: adaptiveRaw(ctx.u, byLevel(20, 60, L(ctx.u)) + 5 * souls), label: 'Dark Harvest' }]
    },
  },
  FirstStrike: {
    desc: 'First hit: +7% damage for 3s',
    onDamage: (ctx) => { if (ctx.u.st.fsUntil == null) ctx.u.st.fsUntil = ctx.t + 3; return [] },
    amp: (ctx) => (ctx.t < (ctx.u.st.fsUntil ?? -1) ? 1.07 : 1),
  },
  GraspOfTheUndying: {
    desc: 'Every 4s: % max HP hit + heal',
    onHit: (ctx) => {
      if (ctx.t - (ctx.u.st.graspT ?? -99) < 4) return []
      ctx.u.st.graspT = ctx.t
      const pct = isRanged(ctx.u) ? 0.021 : 0.035
      ctx.sim.healUnit(ctx.u, 0.013 * ctx.u.maxHp * (isRanged(ctx.u) ? 0.6 : 1), 'Grasp')
      return [{ dt: 'magic', raw: pct * ctx.u.maxHp, label: 'Grasp of the Undying' }]
    },
  },
  SummonAery: {
    desc: 'Hits send Aery for bonus damage',
    onDamage: (ctx) => {
      if (ctx.tags.rune || ctx.t < (ctx.u.st.aeryT ?? -1)) return []
      ctx.u.st.aeryT = ctx.t + 2
      return [{ dt: adaptive(ctx.u), raw: byLevel(10, 50, L(ctx.u)) + 0.1 * ctx.bonusAd + 0.05 * ctx.ap, label: 'Aery' }]
    },
  },
  ArcaneComet: {
    desc: 'Ability hits: comet',
    onSpellHit: (ctx) => {
      if (ctx.t < (ctx.u.st.cometT ?? -1)) return []
      ctx.u.st.cometT = ctx.t + byLevel(20, 8, L(ctx.u))
      return [{ dt: adaptive(ctx.u), raw: byLevel(30, 130, L(ctx.u)) + 0.05 * ctx.bonusAd + 0.1 * ctx.ap, label: 'Arcane Comet' }]
    },
  },
  VeteranAftershock: {
    desc: 'After you CC: resists, then a blast',
    onCC: (ctx) => {
      if (ctx.t < (ctx.u.st.aftT ?? -1)) return
      ctx.u.st.aftT = ctx.t + 20
      ctx.giveBuff('armor', 35 + 0.8 * ctx.u.stats.bonusArmor, 2.5)
      ctx.giveBuff('mr', 35 + 0.8 * ctx.u.stats.bonusMr, 2.5)
      const tgt = ctx.tgt
      ctx.sim.later(2.5, () => ctx.sim.deal(ctx.u, tgt, byLevel(25, 120, L(ctx.u)) + 0.08 * ctx.u.stats.bonusHp, 'magic', { label: 'Aftershock', rune: true }))
    },
  },

  // ── Minor runes ───────────────────────────────────────────
  CoupDeGrace: { desc: '+8% damage vs targets under 40% HP', amp: (ctx) => (ctx.tgt.hp / ctx.tgt.maxHp < 0.4 ? 1.08 : 1) },
  CutDown: {
    desc: '+5-15% damage vs bigger targets',
    amp: (ctx) => {
      const ratio = ctx.tgt.maxHp / ctx.u.maxHp - 1
      if (ratio < 0.1) return 1
      return 1 + 0.05 + 0.1 * Math.min(1, (ratio - 0.1) / 0.9)
    },
  },
  LastStand: {
    desc: '+5-11% damage when you are low',
    amp: (ctx) => {
      const f = ctx.u.hp / ctx.u.maxHp
      if (f >= 0.6) return 1
      return 1 + 0.05 + 0.06 * Math.min(1, (0.6 - f) / 0.3)
    },
  },
  LegendAlacrity: { desc: 'Attack speed (uses Legend stacks)', stats: (u) => ({ asPct: 3 + 1.5 * (u.stacks.legend ?? 10) }) },
  LegendBloodline: { desc: 'Life steal (uses Legend stacks)', stats: (u) => ({ lifesteal: 0.0035 * (u.stacks.legend ?? 10) * 1.5, hp: (u.stacks.legend ?? 10) >= 10 ? 85 : 0 }) },
  LegendHaste: { desc: 'Ability haste (uses Legend stacks)', stats: (u) => ({ ah: 1.5 * (u.stacks.legend ?? 10) }) },
  Conditioning: { desc: '+8 armor/MR (+3%) after 12 min', stats: () => ({ armor: 8, mr: 8 }) },
  Overgrowth: { desc: '+3.5% max HP (full stacks)', statsPct: { hp: 0.035 } },
  Revitalize: { desc: '+5% heal and shield power', stats: () => ({ healShieldPower: 0.05 }) },
  BonePlating: {
    desc: 'Next 3 hits from a champ deal less',
    takenFlat: (u) => byLevel(30, 60, u.stats.level),
  },
  TasteOfBlood: {
    desc: 'Heal on champion hit (20s)',
    onDamage: (ctx) => {
      if (ctx.t - (ctx.u.st.tobT ?? -99) < 20) return []
      ctx.u.st.tobT = ctx.t
      ctx.sim.healUnit(ctx.u, byLevel(16, 40, L(ctx.u)) + 0.1 * ctx.bonusAd + 0.05 * ctx.ap, 'Taste of Blood')
      return []
    },
  },
  CheapShot: {
    desc: 'True damage vs stunned targets',
    onDamage: (ctx) => {
      if (ctx.tags.rune || ctx.t < (ctx.u.st.csT ?? -1) || ctx.t >= ctx.tgt.stunUntil) return []
      ctx.u.st.csT = ctx.t + 4
      return [{ dt: 'true', raw: byLevel(10, 45, L(ctx.u)), label: 'Cheap Shot' }]
    },
  },
  Scorch: {
    desc: 'Ability hits burn',
    onSpellHit: (ctx) => {
      if (ctx.t < (ctx.u.st.scorchT ?? -1)) return []
      ctx.u.st.scorchT = ctx.t + 10
      ctx.sim.addDot(ctx.u, ctx.tgt, 'magic', byLevel(20, 40, L(ctx.u)), 1, 'Scorch')
      return []
    },
  },
  SuddenImpact: {
    desc: '+lethality after a dash',
    onDash: (ctx) => ctx.giveBuff('lethality', byLevel(5, 10, L(ctx.u)), 4),
  },
  AbsoluteFocus: {
    desc: '+AD/AP while above 70% HP',
    adBonus: (u) => (u.hp / u.maxHp > 0.7 ? byLevel(1.8, 18, u.stats.level) * (u.stats.bonusAd >= u.stats.ap ? 1 : 0) : 0),
  },
}

export const runeEffect = (key) => RUNE_EFFECTS[key] || null

// Summoner spells (keys match Riot's summoner.json ids)
export const SUMMONERS = {
  SummonerDot: { desc: 'Ignite: true damage over 5s + Grievous Wounds', range: 600 },
  SummonerExhaust: { desc: 'Exhaust: target deals 35% less damage for 3s', range: 650 },
  SummonerHeal: { desc: 'Heal when under 30% HP', range: 0 },
  SummonerBarrier: { desc: 'Shield when under 30% HP', range: 0 },
  SummonerFlash: { desc: 'Flash: gap close (positioning mode)', range: 400 },
  SummonerHaste: { desc: 'Ghost: move speed', range: 0 },
  SummonerBoost: { desc: 'Cleanse: removes a stun', range: 0 },
  SummonerSmite: { desc: 'Smite: 600 true to monsters (1200 vs epic when execute)', range: 500 },
  SummonerTeleport: { desc: 'Teleport: no effect in a fight', range: 0 },
}
