// ─────────────────────────────────────────────────────────────
// TANKS & SUPPORTS — simplified kits. Ally heals/shields are
// applied to themselves (the sim has no ally targeting for supports).
// ─────────────────────────────────────────────────────────────
import { P, M, T, S, dmg, dot, buff, shield, heal, cc, dash, empower, reset, invuln, atRank, byLevel } from './_helpers.js'

const lvl = (ctx) => ctx.u.stats.level
const SIMPLE = 'Simplified kit: main damage, CC, shields/heals (support heals/shields go on themselves).'

export const TANKS_SUPPORTS = {
  Alistar: {
    notes: `${SIMPLE} W-Q combo. R: 55-75% damage reduction.`,
    spells: {
      Q: S([15, 14, 13, 12, 11], 375, [dmg(M, [60, 100, 140, 180, 220], { ap: 0.8 }), cc(1)], { cast: 0.25, aoe: true }),
      W: S([14, 13, 12, 11, 10], 650, [dash(650, 'to'), dmg(M, [55, 110, 165, 220, 275], { ap: 1 }), cc(0.75)]),
      E: S([12, 11.5, 11, 10.5, 10], 350, [dot(M, [80, 110, 140, 170, 200], { ap: 0.4 }, 5), cc(1)], { cast: 0, aoe: true }),
      R: S([120, 100, 80], 0, [buff('dmgRed', [0.55, 0.65, 0.75], 7)], { cast: 0, when: 'lowhp' }),
    },
    combo: ['W', 'Q', 'E', 'R'],
  },
  Amumu: {
    notes: `${SIMPLE} W burns % max HP. Curse: magic damage taken becomes partly true.`,
    spells: {
      Q: S([12, 11.5, 11, 10.5, 10], 1100, [dash(1100, 'to'), dmg(M, [70, 95, 120, 145, 170], { ap: 0.85 }), cc(1)], { cast: 0.25 }),
      W: S(1, 350, [dot(M, [12, 16, 20, 24, 28], { thp: 0.01 }, 6, { hits: 6 })], { cast: 0, aoe: true }),
      E: S([9, 8.5, 8, 7.5, 7], 350, [dmg(M, [65, 100, 135, 170, 205], { ap: 0.5 })], { cast: 0, aoe: true }),
      R: S([150, 125, 100], 550, [dmg(M, [200, 300, 400], { ap: 0.8 }), cc(1.5)], { cast: 0.25, aoe: true }),
    },
    combo: ['Q', 'R', 'E', 'W'],
  },
  Bard: {
    notes: `${SIMPLE} Meeps (chimes) approximated. Q stun assumed (wall/second target).`,
    spells: {
      Q: S([11, 10, 9, 8, 7], 950, [dmg(M, [80, 125, 170, 215, 260], { ap: 0.65 }), cc([1, 1.2, 1.4, 1.6, 1.8])], { aoe: true }),
      W: S(14, 800, [heal([30, 60, 90, 120, 150], { ap: 0.3 })], { cast: 0, when: 'lowhp' }),
      R: S([110, 95, 80], 3400, [cc(2.5)], { cast: 0.5, when: 'never' }),
    },
    combo: ['Q', 'W'],
    hooks: { onHit: (ctx) => [{ dt: M, raw: 35 + 0.3 * ctx.ap + 2 * (ctx.u.stacks.chimes || 10), label: 'Traveler\'s Call' }] },
    stacks: [{ key: 'chimes', label: { en: 'Chimes', fr: 'Carillons' }, max: 100, def: 10 }],
  },
  Blitzcrank: {
    notes: `${SIMPLE} Hook assumed landed. Passive mana shield at fight start.`,
    spells: {
      Q: S([20, 19, 18, 17, 16], 1150, [dmg(M, [105, 155, 205, 255, 305], { ap: 1.2 }), cc(0.65), dash(1000, 'pull')], { cast: 0.25 }),
      W: S(15, 0, [buff('asPct', [30, 38, 46, 54, 62], 5), buff('msPct', 0.7, 2.5)], { cast: 0 }),
      E: S([9, 8, 7, 6, 5], 300, [empower(1, dmg(P, 0, { ad: 1, ap: 0.25 })), cc(1), reset()], { cast: 0 }),
      R: S([60, 40, 20], 600, [dmg(M, [275, 400, 525], { ap: 1 })], { cast: 0.25, aoe: true }),
    },
    combo: ['Q', 'E', 'R', 'W'],
    hooks: { init: (u, sim) => sim.addShield(u, 0.35 * u.stats.mana, 10, 'Mana Barrier') },
  },
  Braum: {
    notes: `${SIMPLE} 4 hits = stun (Concussive Blows). E blocks — not simulated.`,
    spells: {
      Q: S([10, 9, 8, 7, 6], 1050, [dmg(M, [75, 125, 175, 225, 275], { hp: 0.025 })]),
      W: S([14, 13, 12, 11, 10], 650, [buff('armor', [10, 14, 18, 22, 26], 3), buff('mr', [10, 14, 18, 22, 26], 3)], { cast: 0 }),
      E: S([16, 14.5, 13, 11.5, 10], 0, [buff('dmgRed', [0.35, 0.4, 0.45, 0.5, 0.55], 3)], { cast: 0, when: 'lowhp' }),
      R: S([140, 120, 100], 1250, [dmg(M, [150, 300, 450], { ap: 0.6 }), cc([1, 1.25, 1.5])], { cast: 0.5, aoe: true }),
    },
    combo: ['Q', 'R', 'W', 'E'],
    hooks: { onHit: (ctx) => { ctx.addMark('concussive', 1, 4); if (ctx.mark('concussive') < 4) return []; ctx.clearMark('concussive'); ctx.stun(ctx.tgt, byLevel(1.25, 1.75, lvl(ctx))); return [{ dt: M, raw: 16 + 10 * lvl(ctx), label: 'Concussive Blows' }] }, onSpell: (ctx, key) => { if (key === 'Q') ctx.addMark('concussive', 1, 4) } },
  },
  Ivern: {
    notes: `${SIMPLE} Daisy approximated as on-hit. Shields on himself.`,
    spells: {
      Q: S([14, 12.5, 11, 9.5, 8], 1100, [dmg(M, [80, 125, 170, 215, 260], { ap: 0.7 }), cc([1.2, 1.4, 1.6, 1.8, 2])]),
      W: S(20, 1600, [buff('ivernW', 1, 3)], { cast: 0 }),
      E: S([11, 10, 9, 8, 7], 750, [shield([80, 115, 150, 185, 220], { ap: 0.75 }, 2), dmg(M, [70, 90, 110, 130, 150], { ap: 0.8 })], { cast: 0, aoe: true }),
      R: S([140, 130, 120], 800, [], { cast: 0 }),
    },
    combo: ['Q', 'E', 'W', 'R'],
    hooks: { onHit: (ctx) => { const out = []; if (ctx.buff('ivernW')) out.push({ dt: M, raw: atRank([30, 37.5, 45, 52.5, 60], ctx.rank.W || 1) + 0.3 * ctx.ap, label: 'Brushmaker' }); if (ctx.u.used.R) out.push({ dt: M, raw: byLevel(70, 220, lvl(ctx)) * 0.5 + 0.15 * ctx.ap, label: 'Daisy!' }); return out } },
  },
  Janna: {
    notes: `${SIMPLE} Mostly peel. Shield on herself. R heals.`,
    spells: {
      Q: S([12, 11.5, 11, 10.5, 10], 1100, [dmg(M, [60, 85, 110, 135, 160], { ap: 0.5 }), cc(0.5)], { aoe: true }),
      W: S([8, 7.5, 7, 6.5, 6], 650, [dmg(M, [70, 100, 130, 160, 190], { ap: 0.6 })]),
      E: S([16, 15, 14, 13, 12], 800, [shield([80, 110, 140, 170, 200], { ap: 0.55 }, 4), buff('ad', [10, 15, 20, 25, 30], 4)], { cast: 0, when: 'lowhp' }),
      R: S([130, 115, 100], 725, [heal([90, 145, 200], { ap: 0.5 }, {}), dot(M, 0, {}, 3)], { cast: 3, when: 'lowhp' }),
    },
    combo: ['Q', 'W', 'E', 'R'],
  },
  Kennen: {
    notes: `${SIMPLE} 3 Mark of the Storm = stun.`,
    spells: {
      Q: S([7, 6.25, 5.5, 4.75, 4], 1050, [dmg(M, [75, 120, 165, 210, 255], { ap: 0.85 })]),
      W: S([12, 10.75, 9.5, 8.25, 7], 750, [dmg(M, [70, 95, 120, 145, 170], { ap: 0.8 })], { cast: 0, aoe: true }),
      E: S([10, 9, 8, 7, 6], 200, [dmg(M, [80, 120, 160, 200, 240], { ap: 0.8 }), buff('asPct', [40, 50, 60, 70, 80], 4)], { cast: 0 }),
      R: S([120, 120, 120], 550, [dot(M, [40, 75, 110], { ap: 0.225 }, 3, { hits: 6 })], { cast: 0, aoe: true }),
    },
    combo: ['E', 'R', 'Q', 'W'],
    hooks: { afterSpellHit: (ctx) => { ctx.addMark('storm', 1, 6); if (ctx.mark('storm') >= 3) { ctx.clearMark('storm'); ctx.stun(ctx.tgt, byLevel(1.25, 1.75, lvl(ctx))) } return [] } },
  },
  Lulu: {
    notes: `${SIMPLE} Pix adds on-hit. Polymorph = disable. Shields/R on herself.`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 925, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.4 }, { hits: 1.5 })], { aoe: true }),
      W: S([17, 16, 15, 14, 13], 650, [cc([1.2, 1.4, 1.6, 1.8, 2])], { cast: 0 }),
      E: S(8, 650, [dmg(M, [80, 120, 160, 200, 240], { ap: 0.4 }), shield([75, 115, 155, 195, 235], { ap: 0.45 }, 2.5)]),
      R: S([120, 100, 80], 900, [heal([300, 450, 600], { ap: 0.5 }), cc(0.75)], { cast: 0, when: 'lowhp' }),
    },
    combo: ['W', 'E', 'Q', 'R'],
    hooks: { onHit: (ctx) => [{ dt: M, raw: 3 * (byLevel(5, 39, lvl(ctx)) + 0.05 * ctx.ap), label: 'Pix' }] },
  },
  Maokai: {
    notes: `${SIMPLE} Passive heal every few attacks. Saplings assumed hitting.`,
    spells: {
      Q: S([8, 7, 6, 5, 4], 600, [dmg(M, [65, 110, 155, 200, 245], { ap: 0.4, thp: 0.02 }), cc(0.25)], { aoe: true }),
      W: S([13, 12, 11, 10, 9], 525, [dash(525, 'to'), dmg(M, [60, 85, 110, 135, 160], { ap: 0.4 }), cc([1, 1.1, 1.2, 1.3, 1.4])]),
      E: S(14, 1100, [dmg(M, [55, 80, 105, 130, 155], { ap: 0.05, thp: 0.07 })], { aoe: true }),
      R: S([130, 110, 90], 3000, [dmg(M, [150, 225, 300], { ap: 0.75 }), cc(1.5)], { aoe: true }),
    },
    combo: ['W', 'Q', 'R', 'E'],
    hooks: { onHit: (ctx) => { ctx.u.st.sap = (ctx.u.st.sap || 0) + 1; if (ctx.u.st.sap >= 4) { ctx.u.st.sap = 0; ctx.sim.healUnit(ctx.u, byLevel(5, 45, lvl(ctx)) + byLevel(0.045, 0.1, lvl(ctx)) * ctx.u.maxHp, 'Sap Magic') } return [] } },
  },
  Milio: {
    notes: `${SIMPLE} Heals and shields on himself. Fired Up adds burn to attacks.`,
    spells: {
      Q: S([12, 11.5, 11, 10.5, 10], 1000, [dmg(M, [90, 145, 200, 255, 310], { ap: 1.2 }), cc(0.75)]),
      W: S([23, 22, 21, 20, 19], 650, [heal([15, 30, 45, 60, 75], { ap: 0.4 }, {}), buff('range', [50, 75, 100, 125, 150], 5)], { cast: 0 }),
      E: S([20, 19, 18, 17, 16], 650, [shield([60, 85, 110, 135, 160], { ap: 0.6 }, 2.5)], { cast: 0, when: 'lowhp' }),
      R: S([160, 145, 130], 700, [heal([150, 225, 300], { ap: 0.5 })], { cast: 0, when: 'lowhp' }),
    },
    combo: ['Q', 'W', 'E', 'R'],
    hooks: { onHit: (ctx) => [{ dt: M, raw: byLevel(15, 50, lvl(ctx)) + 0.2 * ctx.ap, label: 'Fired Up!' }] },
  },
  Nami: {
    notes: `${SIMPLE} W bounce heals herself. E empowers her attacks.`,
    spells: {
      Q: S([14, 13, 12, 11, 10], 875, [dmg(M, [75, 130, 185, 240, 295], { ap: 0.7 }), cc(1.5)], { cast: 1, aoe: true }),
      W: S(9, 725, [dmg(M, [70, 110, 150, 190, 230], { ap: 0.5 }), heal([60, 85, 110, 135, 160], { ap: 0.3 })]),
      E: S(11, 800, [buff('namiE', [20, 30, 40, 50, 60], 6)], { cast: 0 }),
      R: S([120, 110, 100], 2750, [dmg(M, [150, 250, 350], { ap: 0.6 }), cc(1)], { cast: 0.5, aoe: true }),
    },
    combo: ['Q', 'E', 'W', 'R'],
    hooks: { onHit: (ctx) => { const e = ctx.buff('namiE'); return e ? [{ dt: M, raw: e + 0.2 * ctx.ap, label: 'Tidecaller\'s Blessing' }] : [] } },
  },
  Nunu: {
    notes: `${SIMPLE} Snowball assumed max size. R channel assumed full.`,
    spells: {
      Q: S([12, 11, 10, 9, 8], 125, [dmg(T, [60, 100, 140, 180, 220], { ap: 0.65, bhp: 0.05 }), heal([75, 110, 145, 180, 215], { ap: 0.9, bhp: 0.1 })], { cast: 0.25 }),
      W: S([14, 13, 12, 11, 10], 1000, [dash(800, 'to'), dmg(M, [180, 225, 270, 315, 360], { ap: 1.5 }), cc(1)], { cast: 2 }),
      E: S(14, 690, [dmg(M, [16, 24, 32, 40, 48], { ap: 0.15 }, { hits: 9 }), cc([0.5, 0.75, 1, 1.25, 1.5])], { aoe: true }),
      R: S([110, 100, 90], 650, [shield([65, 75, 85], { ap: 1.5, bhp: 0.2 }, 3), dmg(M, [625, 950, 1275], { ap: 3 })], { cast: 3, aoe: true }),
    },
    combo: ['W', 'E', 'R', 'Q'],
  },
  Ornn: {
    notes: `${SIMPLE} Brittle: next CC hit deals % max HP. No item upgrades.`,
    spells: {
      Q: S([9, 8.5, 8, 7.5, 7], 800, [dmg(P, [20, 45, 70, 95, 120], { ad: 1.1 })], { aoe: true }),
      W: S([12, 11.5, 11, 10.5, 10], 500, [buff('dmgRed', 0.3, 0.75), dot(M, 0, { thp: [0.12, 0.13, 0.14, 0.15, 0.16] }, 0.75), buff('brittle', 1, 6)], { cast: 0.75 }),
      E: S([16, 15, 14, 13, 12], 650, [dash(650, 'to'), dmg(P, [80, 125, 170, 215, 260], { barmor: 0.4, bhp: 0 }), cc(1.25)], { aoe: true }),
      R: S([140, 120, 100], 2500, [dmg(M, [125, 175, 225], { ap: 0.2 }, { hits: 2 }), cc(1)], { cast: 1, aoe: true }),
    },
    combo: ['W', 'E', 'Q', 'R'],
    hooks: { init: (u) => { u.stats.armor *= 1.1; u.stats.mr *= 1.1; u.stats.hp *= 1.1 } },
  },
  Pyke: {
    notes: `${SIMPLE} R executes under a set HP threshold. Bonus HP doesn't count (converted to AD).`,
    spells: {
      Q: S([10, 9.5, 9, 8.5, 8], 1100, [dmg(P, [100, 150, 200, 250, 300], { bad: 0.6 }), cc(0.5), dash(400, 'pull')], { cast: 0.5 }),
      W: S([12, 11.5, 11, 10.5, 10], 0, [buff('msPct', 0.5, 5)], { cast: 0, when: 'never' }),
      E: S([15, 14, 13, 12, 11], 550, [dash(550, 'to'), dmg(P, [100, 150, 200, 250, 300], { bad: 1 }), cc(1.25)]),
      R: S([120, 100, 80], 750, [dmg(T, 0, {}, { extra: (ctx) => ctx.tgt.hp })], { aoe: true, ready: (ctx) => ctx.tgt.hp < byLevel(250, 600, lvl(ctx)) + 0.8 * ctx.bonusAd }),
    },
    combo: ['R', 'E', 'Q'],
  },
  Rakan: {
    notes: `${SIMPLE} Passive shield every ~40s. W knock-up.`,
    spells: {
      Q: S([12, 11, 10, 9, 8], 900, [dmg(M, [70, 115, 160, 205, 250], { ap: 0.7 }), heal([30, 45, 60, 75, 90], { ap: 0.5 })]),
      W: S([18, 16.5, 15, 13.5, 12], 650, [dash(650, 'to'), dmg(M, [70, 120, 170, 220, 270], { ap: 0.8 }), cc(1)], { aoe: true }),
      E: S([20, 18, 16, 14, 12], 700, [shield([50, 75, 100, 125, 150], { ap: 0.8 }, 3)], { cast: 0, when: 'lowhp' }),
      R: S([110, 95, 80], 400, [dmg(M, [100, 200, 300], { ap: 0.5 }), cc([1, 1.25, 1.5])], { cast: 0, aoe: true }),
    },
    combo: ['W', 'R', 'Q', 'E'],
    hooks: { init: (u, sim) => sim.addShield(u, byLevel(33, 254, u.stats.level) + 0.9 * u.stats.ap, 999, 'Fey Feathers') },
  },
  Rammus: {
    notes: `${SIMPLE} W: armor up + returns damage to attackers. Taunt = stun.`,
    spells: {
      Q: S([16, 13.5, 11, 8.5, 6], 800, [dash(600, 'to'), dmg(M, [100, 130, 160, 190, 220], { ap: 1 }), cc(1)], { cast: 0 }),
      W: S(6, 0, [buff('armor', [35, 45, 55, 65, 75], 6), buff('mr', [15, 20, 25, 30, 35], 6), buff('asPct', [20, 25, 30, 35, 40], 6)], { cast: 0 }),
      E: S([12, 11.5, 11, 10.5, 10], 325, [cc([1.2, 1.4, 1.6, 1.8, 2])], { cast: 0 }),
      R: S([110, 90, 70], 800, [dash(800, 'to'), dmg(M, [100, 175, 250], { ap: 0.6 }), cc(0.75), dot(M, [20, 40, 60], { ap: 0.1 }, 4, { hits: 4 })], { aoe: true }),
    },
    combo: ['Q', 'E', 'W', 'R'],
    hooks: { onHit: (ctx) => [{ dt: M, raw: 10 + 0.1 * ctx.u.stats.armor, label: 'Spiked Shell' }] },
  },
  Rell: {
    notes: `${SIMPLE} Steals armor/MR on hit. Dismounted after W1.`,
    spells: {
      Q: S([10, 9.5, 9, 8.5, 8], 685, [dmg(M, [70, 115, 160, 205, 250], { ap: 0.5 })], { aoe: true }),
      W: S([13, 12, 11, 10, 9], 500, [dash(500, 'to'), dmg(M, [70, 105, 140, 175, 210], { ap: 0.6 }), cc(1), shield([35, 60, 85, 110, 135], { bhp: 0.13 }, 2)], { aoe: true }),
      E: S([12, 11.5, 11, 10.5, 10], 1500, [cc(1)], { cast: 0 }),
      R: S([120, 100, 80], 450, [dot(M, [120, 200, 280], { ap: 1.1 }, 2), cc(0.75)], { cast: 0, aoe: true }),
    },
    combo: ['W', 'R', 'Q', 'E'],
    hooks: { onHit: (ctx) => { ctx.giveBuff('armor', 0.08 * ctx.tgt.stats.armor, 4); ctx.giveBuff('mr', 0.08 * ctx.tgt.stats.mr, 4); return [{ dt: M, raw: byLevel(7, 75, lvl(ctx)), label: 'Break the Mold' }] } },
  },
  Renata: {
    notes: `${SIMPLE} Bailout/Hostile Takeover on allies not simulated.`,
    spells: {
      Q: S([16, 14, 12, 10, 8], 900, [dmg(M, [80, 125, 170, 215, 260], { ap: 0.8 }), cc(1)]),
      W: S([28, 27, 26, 25, 24], 800, [buff('asPct', [20, 22.5, 25, 27.5, 30], 4)], { cast: 0 }),
      E: S([14, 13, 12, 11, 10], 800, [dmg(M, [65, 95, 125, 155, 185], { ap: 0.55 }), shield([50, 70, 90, 110, 130], { ap: 0.5 }, 3)], { aoe: true }),
      R: S([150, 130, 110], 2000, [cc([2, 2.5, 3])], { aoe: true }),
    },
    combo: ['R', 'Q', 'E', 'W'],
    hooks: { onHit: (ctx) => [{ dt: P, raw: (byLevel(0.01, 0.06, lvl(ctx)) + (0.02 * ctx.ap) / 100) * ctx.tgt.maxHp, label: 'Leverage' }] },
  },
  Shen: {
    notes: `${SIMPLE} Ki shield; Q attacks deal % max HP. R on allies not simulated.`,
    spells: {
      Q: S([8, 7.25, 6.5, 5.75, 5], 300, [empower(3, dmg(M, [10, 15, 20, 25, 30], { thp: 0.025 }))], { cast: 0 }),
      W: S([18, 16.5, 15, 13.5, 12], 0, [buff('dmgRed', 0.5, 2)], { cast: 0 }),
      E: S([18, 16, 14, 12, 10], 600, [dash(600, 'to'), dmg(P, [60, 85, 110, 135, 160], { bhp: 0.15 }), cc(1.5)]),
      R: S([200, 180, 160], 25000, [], { when: 'never' }),
    },
    combo: ['E', 'Q', 'W'],
    hooks: { onSpell: (ctx) => { if (ctx.t - (ctx.u.st.ki ?? -99) > 8) { ctx.u.st.ki = ctx.t; ctx.sim.addShield(ctx.u, byLevel(50, 101, lvl(ctx)) + 0.12 * ctx.u.stats.bonusHp, 2.5, 'Ki Barrier') } } },
  },
  Singed: {
    notes: `${SIMPLE} Poison trail approximated as constant DoT. Fling = short CC.`,
    spells: {
      Q: S(1, 300, [dot(M, [40, 60, 80, 100, 120], { ap: 0.6 }, 2)], { cast: 0, aoe: true }),
      W: S([17, 16, 15, 14, 13], 1000, [cc(0.5)], { cast: 0.25 }),
      E: S([10, 9.5, 9, 8.5, 8], 125, [dmg(M, [50, 60, 70, 80, 90], { ap: 0.75, thp: [0.06, 0.065, 0.07, 0.075, 0.08] }), cc(1)]),
      R: S([100, 90, 80], 0, [buff('armor', [30, 60, 90], 25), buff('mr', [30, 60, 90], 25), buff('ap', [30, 60, 90], 25)], { cast: 0 }),
    },
    combo: ['R', 'E', 'Q', 'W'],
  },
  Sion: {
    notes: `${SIMPLE} Q fully charged. W shield then blast. Second life not simulated.`,
    spells: {
      Q: S([10, 9, 8, 7, 6], 600, [dmg(P, [70, 135, 200, 265, 330], { ad: [1.35, 1.575, 1.8, 2.025, 2.25] }), cc(1.5)], { cast: 2, aoe: true }),
      W: S([15, 14, 13, 12, 11], 550, [shield([60, 85, 110, 135, 160], { ap: 0.4, hp: [0.08, 0.09, 0.1, 0.11, 0.12] }, 6), dmg(M, [40, 65, 90, 115, 140], { ap: 0.4, thp: [0.1, 0.11, 0.12, 0.13, 0.14] })], { cast: 0, aoe: true }),
      E: S([12, 11, 10, 9, 8], 800, [dmg(M, [65, 100, 135, 170, 205], { ap: 0.55 })], { aoe: true }),
      R: S([140, 100, 60], 7500, [dash(1500, 'to'), dmg(P, [150, 300, 450], { bad: 0.4 }, { hits: 2 }), cc(1.25)], { cast: 1, aoe: true }),
    },
    combo: ['R', 'W', 'E', 'Q'],
    stacks: [{ key: 'sionHp', label: { en: 'Bonus HP from W', fr: 'PV bonus du W' }, max: 3000, def: 300 }],
    hooks: { init: (u) => { const n = u.stacks.sionHp || 0; u.stats.hp += n; u.stats.bonusHp += n; u.hp = u.maxHp = u.stats.hp } },
  },
  Sona: {
    notes: `${SIMPLE} Power chord every 3 spells. Heals herself.`,
    spells: {
      Q: S(8, 825, [dmg(M, [50, 80, 110, 140, 170], { ap: 0.4 })], { aoe: true }),
      W: S(10, 1000, [heal([30, 50, 70, 90, 110], { ap: 0.2 }, {}), shield([25, 50, 75, 100, 125], { ap: 0.3 }, 1.5)], { cast: 0, when: 'lowhp' }),
      E: S(12, 430, [buff('msPct', 0.2, 3)], { cast: 0, when: 'never' }),
      R: S([140, 120, 100], 1000, [dmg(M, [150, 250, 350], { ap: 0.5 }), cc(1.5)], { aoe: true }),
    },
    combo: ['R', 'Q', 'W'],
    hooks: { onSpell: (ctx) => { ctx.u.st.chord = (ctx.u.st.chord || 0) + 1 }, onHit: (ctx) => { if ((ctx.u.st.chord || 0) < 3) return []; ctx.u.st.chord = 0; return [{ dt: M, raw: byLevel(20, 240, lvl(ctx)) + 0.2 * ctx.ap, label: 'Power Chord' }] } },
  },
  Soraka: {
    notes: `${SIMPLE} Heals herself (Q heal over time). Ally heals not simulated.`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 800, [dmg(M, [85, 120, 155, 190, 225], { ap: 0.35 }), heal([50, 65, 80, 95, 110], { ap: 0.3 })], { aoe: true }),
      W: S([6, 5, 4, 3, 2], 550, [], { when: 'never' }),
      E: S(20, 925, [dmg(M, [70, 95, 120, 145, 170], { ap: 0.4 }, { hits: 2 }), cc([1, 1.25, 1.5, 1.75, 2])], { cast: 1.5, aoe: true }),
      R: S([160, 145, 130], 25000, [heal([150, 250, 350], { ap: 0.55 })], { cast: 0, when: 'lowhp' }),
    },
    combo: ['E', 'Q', 'R'],
  },
  TahmKench: {
    notes: `${SIMPLE} 3 stacks = devour (stun). Grey health becomes a shield.`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 900, [dmg(M, [80, 130, 180, 230, 280], { ap: 0.9 }), heal([10, 15, 20, 25, 30], { ap: 0.0, miss: 0.04 })]),
      W: S([20, 18, 16, 14, 12], 1000, [dash(1000, 'to'), dmg(M, [100, 135, 170, 205, 240], { ap: 1 }), cc(0.66)], { cast: 1.35, aoe: true }),
      E: S(3, 0, [shield(0, { extra: (ctx) => 0.4 * (ctx.u.totals.taken || 0) }, 2)], { cast: 0, when: 'lowhp' }),
      R: S([120, 100, 80], 250, [dmg(M, [100, 250, 400], { ap: 0, thp: [0.15, 0.2, 0.25] }), cc(2.5)], { cast: 0.25, ready: (ctx) => ctx.mark('tahm') >= 3 }),
    },
    combo: ['R', 'W', 'Q', 'E'],
    hooks: { onHit: (ctx) => { ctx.addMark('tahm', 1, 5, 3); return [{ dt: M, raw: byLevel(8, 60, lvl(ctx)) + 0.025 * ctx.u.stats.bonusHp, label: 'An Acquired Taste' }] }, onSpell: (ctx, key) => { if (key === 'Q') ctx.addMark('tahm', 1, 5, 3) } },
  },
  Taric: {
    notes: `${SIMPLE} Bravado: double attack after each spell. Cosmic Radiance invulnerability.`,
    spells: {
      Q: S([15, 14, 13, 12, 11], 300, [heal([30, 40, 50, 60, 70], { ap: 0.2, hp: 0.01 }, {})], { cast: 0, when: 'lowhp' }),
      W: S(15, 800, [buff('armor', [10, 11, 12, 13, 14], 4)], { cast: 0 }),
      E: S([17, 16, 15, 14, 13], 610, [dmg(M, [90, 130, 170, 210, 250], { ap: 0.5, barmor: 0.5 }), cc(1.25)], { cast: 1, aoe: true }),
      R: S([180, 150, 120], 400, [invuln(2.5)], { cast: 2.5, when: 'lowhp' }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: { onSpell: (ctx) => { ctx.u.st.bravado = 2 }, onHit: (ctx) => { if (!ctx.u.st.bravado) return []; ctx.u.st.bravado--; return [{ dt: M, raw: 21 + 4 * lvl(ctx) + 0.15 * ctx.u.stats.bonusArmor, label: 'Bravado' }] }, asBonus: (u) => ((u.st.bravado || 0) > 0 ? 100 : 0) },
  },
  Yuumi: {
    notes: `${SIMPLE} Not attached to an ally (sim is standalone).`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 1150, [dmg(M, [60, 100, 140, 180, 220], { ap: 0.2 }), dmg(M, [40, 70, 100, 130, 160], { ap: 0.3 })]),
      E: S(12, 0, [heal([70, 90, 110, 130, 150], { ap: 0.25 }), buff('asPct', [25, 30, 35, 40, 45], 3)], { cast: 0, when: 'lowhp' }),
      R: S([130, 115, 100], 1100, [dmg(M, [60, 80, 100], { ap: 0.2 }, { hits: 5 }), cc(1.75)], { cast: 3.5, aoe: true }),
    },
    combo: ['Q', 'R', 'E'],
  },
  Zac: {
    notes: `${SIMPLE} E slam assumed max range. Blobs (heals) not tracked.`,
    spells: {
      Q: S([15, 13.5, 12, 10.5, 9], 800, [dmg(M, [40, 55, 70, 85, 100], { ap: 0.3, hp: 0.025 }, { hits: 2 }), cc(0.5)]),
      W: S([5, 4.5, 4, 3.5, 3], 350, [dmg(M, [35, 50, 65, 80, 95], { thp: 0.05 })], { cast: 0, aoe: true }),
      E: S([22, 19, 16, 13, 10], 1200, [dash(1200, 'to'), dmg(M, [60, 105, 150, 195, 240], { ap: 0.8 }), cc(1)], { cast: 1, aoe: true }),
      R: S([120, 105, 90], 300, [dmg(M, [150, 250, 350], { ap: 0.7 }, { hits: 2 }), cc(1)], { cast: 2.5, aoe: true }),
    },
    combo: ['E', 'R', 'Q', 'W'],
  },
}
