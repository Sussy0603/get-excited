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

  // ✔ checked: 150–200 melee / 120–160 ranged, +0–50% by target missing HP
  'kraken slayer': {
    desc: 'Every 3rd attack: bonus physical damage (up to +50% vs low HP)',
    onHit: everyN(3, 'kraken', (ctx) => {
      const miss = 1 - ctx.tgt.hp / ctx.tgt.maxHp
      const base = ranged(ctx) ? byLevel(120, 160, ctx.u.stats.level) : byLevel(150, 200, ctx.u.stats.level)
      return [{ dt: P, raw: base * (1 + 0.5 * miss), label: 'Kraken Slayer' }]
    }),
  },

  'blade of the ruined king': {
    desc: 'On-hit: % of target current HP',
    // ✔ checked: 9% melee / 6% ranged of current HP (patch 25.24+)
    onHit: (ctx) => [{ dt: P, raw: (ranged(ctx) ? 0.06 : 0.09) * ctx.tgt.hp, label: 'Mist\'s Edge' }],
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

  // ── 2026 items & more passives ─────────────────────────────
  // "approx" = effect simulated with an estimated number.
  'fiendhunter bolts': {
    desc: 'Ultimate haste; after your ultimate, attacks get +50% attack speed for 3 attacks', approx: true,
    ultHaste: 30,
    afterUlt: (ctx) => { ctx.u.st.fiend = 3 },
    asBonus: (u) => ((u.st.fiend || 0) > 0 ? 50 : 0),
    onHit: (ctx) => { if (ctx.u.st.fiend > 0) ctx.u.st.fiend--; return [] },
  },
  'hexoptics c44': { desc: 'Magnification: more damage at long range (≈+7%)', approx: true, amp: (ctx) => (ctx.u.stats.range >= 500 ? 1.07 : 1) },
  'actualizer': { desc: 'Feast: takedowns give 15% omnivamp for 8s', onTakedown: (ctx) => ctx.giveBuff('omnivampBuff', 0.15, 8, 'Feast') },
  'endless hunger': { desc: 'Takedowns: bonus omnivamp (≈+10% for 8s)', approx: true, onTakedown: (ctx) => ctx.giveBuff('omnivampBuff', 0.1, 8, 'Endless Hunger') },
  'dusk and dawn': { desc: 'Spellblade (magic)', approx: true, spellblade: (ctx) => ({ dt: M, raw: 0.5 * ctx.u.stats.baseAd + 0.3 * ctx.ap }) },
  'protoplasm harness': { desc: 'Heal when under 30% HP (≈25% max HP over time)', approx: true, lowHp: { at: 0.3, fn: (u, sim) => sim.healUnit(u, 0.25 * u.maxHp, 'Protoplasm') } },
  'stormrazor': { desc: 'Energized: 100 magic damage', onHit: everyN(4, 'storm', () => [{ dt: M, raw: 100, label: 'Bolt' }]) },
  'voltaic cyclosword': { desc: 'Energized: bonus physical damage', approx: true, onHit: everyN(4, 'volt', () => [{ dt: P, raw: 100, label: 'Firmament' }]) },
  'hextech gunblade': { desc: 'Active: magic bolt at fight start', approx: true, onCast: (ctx) => { if (ctx.u.st.gunblade) return; ctx.u.st.gunblade = true; ctx.sim.deal(ctx.u, ctx.tgt, byLevel(175, 253, ctx.u.stats.level) + 0.3 * ctx.ap, M, { label: 'Lightning Bolt' }) } },
  'yun tal wildarrows': { desc: 'Flurry: +30% attack speed in fights (approx.)', approx: true, onHit: (ctx) => { if (ctx.t - (ctx.u.st.yunT ?? -99) >= 30) { ctx.u.st.yunT = ctx.t; ctx.giveBuff('asPct', 30, 6, 'Flurry') } return [] } },
  'sundered sky': { desc: 'First hit on a champ: crit + heal (every 8s per target)', approx: true, onHit: (ctx) => { if (ctx.t - (ctx.tgtState().skyT ?? -99) < 8) return []; ctx.tgtState().skyT = ctx.t; ctx.sim.healUnit(ctx.u, ctx.u.stats.baseAd + 0.06 * (ctx.u.maxHp - ctx.u.hp), 'Lightshield'); return [{ dt: P, raw: 0.1 * ctx.ad + (ctx.u.stats.critDmg - 1) * ctx.ad * (1 - ctx.u.stats.crit), label: 'Lightshield Strike' }] } },
  'titanic hydra': { desc: 'On-hit: % of your max HP', onHit: (ctx) => [{ dt: P, raw: (ranged(ctx) ? 0.0075 : 0.015) * ctx.u.maxHp, label: 'Colossus' }] },
  'ravenous hydra': { desc: 'Attacks cleave nearby enemies', bolts: 0.4 },
  "death's dance": { desc: 'Delays 30% of physical damage (≈15% reduction)', approx: true, takenMult: (type) => (type === 'physical' ? 0.85 : 1) },
  'heartsteel': { desc: 'Every 30s per target: big physical hit', approx: true, onHit: (ctx) => { if (ctx.t - (ctx.tgtState().heartT ?? -99) < 30) return []; ctx.tgtState().heartT = ctx.t; return [{ dt: P, raw: 70 + 0.06 * ctx.u.stats.bonusHp, label: 'Colossal Consumption' }] } },
  'sunfire aegis': { desc: 'Burns nearby enemies', approx: true, onHit: (ctx) => [{ dt: M, raw: (20 + 0.01 * ctx.u.stats.bonusHp) / Math.max(0.5, ctx.as), label: 'Immolate' }] },
  'hollow radiance': { desc: 'Burns nearby enemies (magic)', approx: true, onHit: (ctx) => [{ dt: M, raw: (15 + 0.01 * ctx.u.stats.bonusHp) / Math.max(0.5, ctx.as), label: 'Immolate' }] },
  "rabadon's deathcap": { desc: '+30% ability power', apMult: 1.3 },
  'shadowflame': { desc: 'Magic damage crits targets under 40% HP (≈+10%)', approx: true, amp: (ctx) => (ctx.tgt.hp / ctx.tgt.maxHp < 0.4 && !ctx.tags.auto ? 1.1 : 1) },
  'horizon focus': { desc: 'More damage at long range (≈+8%)', approx: true, amp: (ctx) => (!ctx.tags.auto && ctx.u.stats.range >= 450 ? 1.08 : 1) },
  'riftmaker': { desc: 'Damage ramps up in combat (≈+6%)', approx: true, amp: (ctx) => (ctx.t > 3 ? 1.06 : 1) },
  'spear of shojin': { desc: 'Ability damage ramps up (≈+8%)', approx: true, amp: (ctx) => (!ctx.tags.auto && ctx.t > 2 ? 1.08 : 1) },
  "luden's companion": { desc: 'First ability hit: bonus magic burst', approx: true, onSpellHit: (ctx) => { if (ctx.t - (ctx.u.st.ludenT ?? -99) < 12) return; ctx.u.st.ludenT = ctx.t; ctx.sim.deal(ctx.u, ctx.tgt, 150 + 0.2 * ctx.ap, M, { label: 'Fire', rune: true }) } },
  'blackfire torch': { desc: 'Abilities burn (smaller Liandry)', approx: true, onSpellHit: (ctx) => ctx.sim.addDot(ctx.u, ctx.tgt, M, 20 + 0.03 * ctx.ap * 3, 3, 'Baleful Blaze', 'torch') },
  'muramana': { desc: 'On-hit: % of max mana', onHit: (ctx) => [{ dt: P, raw: 0.015 * ctx.u.stats.mana, label: 'Shock' }] },
  'experimental hexplate': { desc: 'After your ultimate: +30% attack speed for 8s', ultHaste: 30, afterUlt: (ctx) => ctx.giveBuff('asPct', 30, 8, 'Overdrive') },
  'guardian angel': { desc: 'Revive once at 50% base HP after 4s', revive: (u) => 0.5 * u.stats.baseHp + 0.3 * (u.stats.mana || 0) },
  "seraph's embrace": { desc: 'Shield when under 30% HP', lowHp: { at: 0.3, fn: (u, sim) => sim.addShield(u, 200 + 0.2 * (u.stats.mana || 0), 3, 'Lifeline') } },
  'hubris': { desc: 'Takedowns give AD (assumes 10 stacks: +25 AD)', approx: true, stats: { ad: 25 } },
  "jak'sho, the protean": { desc: 'Resists grow in combat (≈+15% after 3s)', approx: true, onHit: (ctx) => { if (ctx.t >= 3 && !ctx.u.st.jak) { ctx.u.st.jak = true; ctx.giveBuff('armor', 0.15 * ctx.u.stats.armor, 30, 'Voidborn'); ctx.giveBuff('mr', 0.15 * ctx.u.stats.mr, 30, 'Voidborn') } return [] } },
}

// Effect for an item, by its English name.
export const itemEffect = (enName) => ITEM_EFFECTS[(enName || '').toLowerCase().trim()] || null
