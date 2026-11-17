// ─────────────────────────────────────────────────────────────
// itemEffects.js — item PASSIVES and ACTIVES.
// Item STATS (AD, crit, armor…) come automatically from Riot's data.
// This file only adds the special effects, matched by English item name.
//
// Hook names:
//   stats         extra stats Riot's data doesn't list (e.g. crit damage)
//   onHit(ctx)    extra damage on each basic attack → [{ dt, raw, label }]
//   spellblade    next attack after a spell deals bonus damage
//   onSpellHit    when an ability hits (e.g. Liandry's burn)
//   grievous      your damage applies Grievous Wounds (-40% healing)
//   lowHp         triggers once when HP drops under a threshold
//   shred         armor shred per physical hit (Black Cleaver)
//   execute       kill instantly under X% HP (Collector)
//   critTaken     multiplier on crits you take (Randuin's)
//   healMult      bonus healing received (Spirit Visage)
//   reflect       damage back to attackers (Thornmail)
//   slowAttackers attackers lose attack speed (Frozen Heart)
// ─────────────────────────────────────────────────────────────
import { byLevel } from './champs/_helpers.js'

const P = 'physical', M = 'magic'

// Counter helper for "every Nth attack" items.
const everyN = (n, key, fn) => (ctx) => {
  ctx.u.st[key] = (ctx.u.st[key] || 0) + 1
  if (ctx.u.st[key] < n) return []
  ctx.u.st[key] = 0
  return fn(ctx)
}

const ranged = (ctx) => ctx.u.stats.range >= 300

export const ITEM_EFFECTS = {
  // Infinity Edge: its crit damage is a normal stat now (read from Riot's data).

  'kraken slayer': {
    desc: 'Every 3rd attack: bonus physical damage (more vs low HP)',
    onHit: everyN(3, 'kraken', (ctx) => {
      const miss = 1 - ctx.tgt.hp / ctx.tgt.maxHp
      return [{ dt: P, raw: byLevel(140, 310, ctx.u.stats.level) * (1 + 0.75 * Math.min(1, miss / 0.7)), label: 'Kraken Slayer' }]
    }),
  },

  'blade of the ruined king': {
    desc: 'On-hit: % of target current HP',
    onHit: (ctx) => [{ dt: P, raw: Math.max(15, (ranged(ctx) ? 0.06 : 0.09) * ctx.tgt.hp), label: 'Mist\'s Edge' }],
  },

  'the collector': { desc: 'Executes under 5% HP', execute: 0.05 },

  'immortal shieldbow': {
    desc: 'Shield when under 30% HP (once)',
    lowHp: { at: 0.3, fn: (u, sim) => sim.addShield(u, byLevel(320, 720, u.stats.level), 3, 'Lifeline') },
  },

  "sterak's gage": {
    desc: 'Shield = 60% bonus HP when under 30% HP',
    lowHp: { at: 0.3, fn: (u, sim) => sim.addShield(u, 0.6 * u.stats.bonusHp, 4, 'Lifeline') },
  },

  'maw of malmortius': {
    desc: 'Magic shield when under 30% HP',
    lowHp: { at: 0.3, fn: (u, sim) => sim.addShield(u, 200 + 1.125 * u.stats.bonusAd, 2.5, 'Lifeline', 'magic') },
  },

  "zhonya's hourglass": {
    desc: 'Stasis for 2.5s when under 25% HP',
    lowHp: { at: 0.25, fn: (u, sim) => sim.stasis(u, 2.5, 'Zhonya\'s') },
  },
  'stopwatch': {
    desc: 'Stasis for 2.5s when under 25% HP',
    lowHp: { at: 0.25, fn: (u, sim) => sim.stasis(u, 2.5, 'Stopwatch') },
  },

  'mortal reminder': { desc: 'Grievous Wounds', grievous: true },
  "executioner's calling": { desc: 'Grievous Wounds', grievous: true },
  'chempunk chainsword': { desc: 'Grievous Wounds', grievous: true },
  'morellonomicon': { desc: 'Grievous Wounds', grievous: true },
  'oblivion orb': { desc: 'Grievous Wounds', grievous: true },
  'bramble vest': { desc: 'Grievous Wounds on attackers', reflect: { base: 3, barmor: 0.1 }, grievousOnHitTaken: true },
  'thornmail': { desc: 'Reflects magic damage + Grievous Wounds on attackers', reflect: { base: 10, barmor: 0.1 }, grievousOnHitTaken: true },

  "guinsoo's rageblade": {
    desc: 'On-hit magic + stacking attack speed',
    onHit: (ctx) => {
      ctx.u.st.guinsoo = Math.min(4, (ctx.u.st.guinsoo || 0) + 1)
      return [{ dt: M, raw: 30, label: 'Wrath' }]
    },
    asBonus: (u) => 8 * (u.st.guinsoo || 0),
  },
  "nashor's tooth": { desc: 'On-hit magic', onHit: (ctx) => [{ dt: M, raw: 15 + 0.2 * ctx.ap, label: 'Icathian Bite' }] },
  "wit's end": { desc: 'On-hit magic', onHit: (ctx) => [{ dt: M, raw: byLevel(15, 80, ctx.u.stats.level), label: 'Fray' }] },
  'terminus': { desc: 'On-hit magic', onHit: (ctx) => [{ dt: M, raw: 30, label: 'Shadow' }] },
  'statikk shiv': { desc: 'Energized: magic every ~4 attacks', onHit: everyN(4, 'statikk', () => [{ dt: M, raw: 60, label: 'Electroshock' }]) },
  'rapid firecannon': { desc: 'Energized: magic every ~4 attacks', onHit: everyN(4, 'rfc', () => [{ dt: M, raw: 40, label: 'Sharpshooter' }]) },
  "runaan's hurricane": { desc: 'Bolts hit 2 more enemies', bolts: 0.55 },

  'navori flickerblade': {
    desc: 'Attacks lower basic ability cooldowns by 15%',
    onHit: (ctx) => {
      for (const k of ['Q', 'W', 'E']) {
        const left = (ctx.u.cds[k] || 0) - ctx.t
        if (left > 0) ctx.u.cds[k] -= left * 0.15
      }
      return []
    },
  },

  'sheen': { desc: 'Spellblade', spellblade: (ctx) => ({ dt: P, raw: ctx.u.stats.baseAd }) },
  'essence reaver': { desc: 'Spellblade', spellblade: (ctx) => ({ dt: P, raw: ctx.u.stats.baseAd + 0.4 * ctx.bonusAd }) },
  'trinity force': { desc: 'Spellblade', spellblade: (ctx) => ({ dt: P, raw: 2 * ctx.u.stats.baseAd }) },
  'iceborn gauntlet': { desc: 'Spellblade', spellblade: (ctx) => ({ dt: P, raw: ctx.u.stats.baseAd }) },
  'lich bane': { desc: 'Spellblade (magic)', spellblade: (ctx) => ({ dt: M, raw: 0.75 * ctx.u.stats.baseAd + 0.45 * ctx.ap }) },

  'black cleaver': { desc: 'Physical hits shred 6% armor (max 30%)', shred: { per: 0.06, max: 0.3 } },

  "liandry's torment": {
    desc: 'Abilities burn 2% max HP/s for 3s',
    onSpellHit: (ctx) => ctx.sim.addDot(ctx.u, ctx.tgt, M, 0.06 * ctx.tgt.maxHp, 3, 'Torment', 'liandry'),
  },

  "randuin's omen": { desc: '-30% damage from crits', critTaken: 0.7 },
  'spirit visage': { desc: '+25% healing and shields received', healMult: 0.25 },
  'frozen heart': { desc: 'Attackers lose 20% attack speed', slowAttackers: 0.2 },

  'bloodthirster': {
    desc: 'Life steal overheal becomes a shield',
    overheal: (u) => byLevel(165, 315, u.stats.level),
  },

  'eclipse': {
    desc: 'Every 2 hits within 2s: 6% max HP + shield',
    onHit: everyN(2, 'eclipse', (ctx) => {
      if (ctx.t - (ctx.u.st.eclipseT ?? -99) < 6) return []
      ctx.u.st.eclipseT = ctx.t
      ctx.sim.addShield(ctx.u, 80 + 0.2 * ctx.bonusAd, 2, 'Eclipse')
      return [{ dt: P, raw: 0.06 * ctx.tgt.maxHp, label: 'Ever Rising Moon' }]
    }),
  },
}

// Effect for an item, by its English name.
export const itemEffect = (enName) => ITEM_EFFECTS[(enName || '').toLowerCase().trim()] || null
