// ─────────────────────────────────────────────────────────────
// FIGHTERS, BRUISERS, JUNGLERS, ASSASSINS — simplified kits.
// Main damage + crowd control + shields/heals. Fiddly mechanics
// (stances, resets, terrain) are skipped and noted.
// ─────────────────────────────────────────────────────────────
import { P, M, T, S, dmg, dot, buff, shield, heal, cc, dash, empower, reset, invuln, atRank, byLevel } from './_helpers.js'

const lvl = (ctx) => ctx.u.stats.level
const SIMPLE = 'Simplified kit: main damage, CC, shields/heals.'
// "every X seconds, the next attack does more" passives
const timed = (key, every, fn) => (ctx) => {
  if (ctx.t - (ctx.u.st[key] ?? -99) < every) return []
  ctx.u.st[key] = ctx.t
  return fn(ctx)
}
// "every Nth hit" passives
const nth = (key, n, fn) => (ctx) => {
  ctx.u.st[key] = (ctx.u.st[key] || 0) + 1
  if (ctx.u.st[key] < n) return []
  ctx.u.st[key] = 0
  return fn(ctx)
}

export const FIGHTERS = {
  Aatrox: {
    notes: `${SIMPLE} Q = all 3 casts, sweet spots assumed. Passive: empowered attack every 15s.`,
    spells: {
      Q: S([14, 12, 10, 8, 6], 625, [dmg(P, [10, 25, 40, 55, 70], { ad: [0.6, 0.675, 0.75, 0.825, 0.9] }, { hits: 3.75 }), cc(0.25)], { cast: 1.2, aoe: true }),
      W: S([20, 18, 16, 14, 12], 825, [dmg(P, [30, 40, 50, 60, 70], { ad: 0.4 }, { hits: 2 })], { cast: 0.25 }),
      E: S([9, 8, 7, 6, 5], 300, [dash(300, 'to')], { cast: 0 }),
      R: S([120, 100, 80], 0, [buff('ad', [30, 50, 70], 10), buff('msPct', 0.6, 3)], { cast: 0, when: 'start' }),
    },
    combo: ['R', 'Q', 'W', 'E'],
    hooks: { onHit: timed('dbs', 15, (ctx) => { ctx.sim.healUnit(ctx.u, 0.5 * byLevel(0.04, 0.13, lvl(ctx)) * ctx.tgt.maxHp, 'Deathbringer'); return [{ dt: P, raw: byLevel(0.04, 0.13, lvl(ctx)) * ctx.tgt.maxHp, label: 'Deathbringer Stance' }] }) },
  },
  Ambessa: {
    notes: `${SIMPLE} Dashes after each spell empower the next attack.`,
    spells: {
      Q: S([9, 8.5, 8, 7.5, 7], 450, [dmg(P, [40, 60, 80, 100, 120], { bad: 0.6, thp: 0.04 }, { hits: 2 })], { aoe: true }),
      W: S([16, 15, 14, 13, 12], 325, [shield([60, 85, 110, 135, 160], { bhp: 0.4 }, 1.5), dmg(P, [50, 75, 100, 125, 150], { bad: 0.5 })], { cast: 0.6, aoe: true }),
      E: S([12, 11, 10, 9, 8], 325, [dmg(P, [40, 65, 90, 115, 140], { bad: 0.4 }, { hits: 2 }), cc(0.3)], { aoe: true }),
      R: S([120, 100, 80], 1100, [dash(1100, 'to'), dmg(P, [150, 250, 350], { bad: 0.8 }), cc(0.75)]),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: { onSpell: (ctx) => { ctx.u.st.drakehound = true }, onHit: (ctx) => { if (!ctx.u.st.drakehound) return []; ctx.u.st.drakehound = false; return [{ dt: P, raw: 0.03 * ctx.tgt.maxHp, label: 'Drakehound\'s Step' }] } },
  },
  Belveth: {
    asRatio: 0.85,
    notes: `${SIMPLE} Bonus attack speed per stack (set Lavender stacks). Attacks deal less but come faster.`,
    stacks: [{ key: 'lavender', label: { en: 'Lavender stacks', fr: 'Cumuls de lavande' }, max: 100, def: 25 }],
    spells: {
      Q: S(16, 400, [dash(400, 'to'), dmg(P, [10, 15, 20, 25, 30], { ad: 1.1 }, { onHit: true })], { cast: 0 }),
      W: S([20, 18, 16, 14, 12], 660, [dmg(M, [70, 110, 150, 190, 230], { bad: 1, ap: 1.25 }), cc(0.75)], { cast: 0.5 }),
      E: S([24, 22, 20, 18, 16], 500, [buff('dmgRed', 0.35, 1.5), dmg(P, [8, 10, 12, 14, 16], { ad: 0.06 }, { hits: 10, missingMult: 3 })], { cast: 1.5, aoe: true }),
      R: S([1, 1, 1], 500, [], { when: 'never' }),
    },
    combo: ['Q', 'W', 'E'],
    hooks: { init: (u) => { u.stats.bonusAsPct += 0.75 * (u.stacks.lavender || 0); u.stats.ad *= 0.9 } },
  },
  Briar: {
    notes: `${SIMPLE} W frenzy: big attack speed, bonus % missing HP on-hit. Heals from bleed.`,
    spells: {
      Q: S([13, 12, 11, 10, 9], 450, [dash(450, 'to'), dmg(P, [60, 100, 140, 180, 220], { bad: 0.8 }), cc(0.5)]),
      W: S([14, 13, 12, 11, 10], 350, [dash(350, 'to'), buff('asPct', [55, 65, 75, 85, 95], 5), buff('briarW', 1, 5)], { cast: 0 }),
      E: S([18, 17, 16, 15, 14], 600, [shield([80, 115, 150, 185, 220], { bhp: 0.12 }, 1), dmg(M, [80, 115, 150, 185, 220], { bad: 1, ap: 1 })], { cast: 1, when: 'lowhp' }),
      R: S([120, 100, 80], 10000, [dash(1500, 'to'), dmg(M, [150, 250, 350], { bad: 0.5, ap: 1.2 })], { when: 'execute' }),
    },
    combo: ['W', 'Q', 'R', 'E'],
    hooks: { onHit: (ctx) => { if (!ctx.buff('briarW')) return []; ctx.sim.healUnit(ctx.u, 0.3 * ctx.ad, 'Snack Attack'); return [{ dt: P, raw: 0.02 * (ctx.tgt.maxHp - ctx.tgt.hp), label: 'Blood Frenzy' }] } },
  },
  Camille: {
    notes: `${SIMPLE} Q second hit assumed fully charged (part true damage). Passive shield vs the target's damage type.`,
    spells: {
      Q: S([9, 8.25, 7.5, 6.75, 6], 300, [empower(1, dmg(P, 0, { ad: [0.2, 0.25, 0.3, 0.35, 0.4] })), empower(1, dmg(T, 0, { ad: [0.4, 0.5, 0.6, 0.7, 0.8] })), reset()], { cast: 0 }),
      W: S([17, 15.5, 14, 12.5, 11], 650, [dmg(P, [70, 100, 130, 160, 190], { bad: 0.6, thp: 0.06 }), heal(0, { extra: (ctx) => 0.03 * ctx.tgt.maxHp })], { cast: 1.5, aoe: true }),
      E: S([16, 14.5, 13, 11.5, 10], 800, [dash(800, 'to'), dmg(P, [60, 95, 130, 165, 200], { bad: 0.75 }), cc(0.75), buff('asPct', [40, 50, 60, 70, 80], 5)], { cast: 0.75 }),
      R: S([140, 115, 90], 475, [dash(475, 'to'), buff('camR', 1, 4)], { cast: 0.75 }),
    },
    combo: ['E', 'R', 'Q', 'W'],
    hooks: {
      init: (u, sim) => sim.addShield(u, 0.2 * u.maxHp, 2, 'Adaptive Defenses'),
      onHit: (ctx) => (ctx.buff('camR') ? [{ dt: M, raw: atRank([5, 10, 15], ctx.rank.R) + atRank([0.04, 0.06, 0.08], ctx.rank.R) * ctx.tgt.hp, label: 'Hextech Ultimatum' }] : []),
    },
  },
  Chogath: {
    notes: `${SIMPLE} Set Feast stacks for bonus HP. R deals true damage.`,
    stacks: [{ key: 'feast', label: { en: 'Feast stacks', fr: 'Cumuls de Festin' }, max: 6, def: 2 }],
    spells: {
      Q: S(7, 950, [dmg(M, [80, 135, 190, 245, 300], { ap: 1 }), cc(1)], { cast: 0.9, aoe: true }),
      W: S([13, 12, 11, 10, 9], 650, [dmg(M, [75, 125, 175, 225, 275], { ap: 0.7 })], { aoe: true }),
      E: S([8, 7, 6, 5, 4], 500, [empower(3, dmg(M, [22, 34, 46, 58, 70], { ap: 0.3, thp: 0.03 }))], { cast: 0 }),
      R: S([80, 70, 60], 175, [dmg(T, [300, 475, 650], { ap: 0.5, bhp: 0.1 })], { when: 'execute' }),
    },
    combo: ['Q', 'W', 'E', 'R'],
    hooks: { init: (u) => { const n = u.stacks.feast || 0; const r = atRank([80, 120, 160], u.ranks.R || 1); if (u.ranks.R) { u.stats.hp += n * r; u.stats.bonusHp += n * r; u.hp = u.maxHp = u.stats.hp } } },
  },
  Diana: {
    notes: `${SIMPLE} Every 3rd attack: bonus magic splash. R damage assumes 1 enemy pulled.`,
    spells: {
      Q: S([8, 7.5, 7, 6.5, 6], 900, [dmg(M, [60, 95, 130, 165, 200], { ap: 0.7 })], { aoe: true }),
      W: S([15, 13.5, 12, 10.5, 9], 200, [shield([40, 55, 70, 85, 100], { ap: 0.45, bhp: 0.1 }, 5), dmg(M, [18, 30, 42, 54, 66], { ap: 0.18 }, { hits: 3 })], { cast: 0, aoe: true }),
      E: S([22, 20, 18, 16, 14], 825, [dash(825, 'to'), dmg(M, [50, 70, 90, 110, 130], { ap: 0.6 })], { cast: 0 }),
      R: S([100, 90, 80], 475, [dmg(M, [200, 300, 400], { ap: 0.6 }), cc(0.25)], { cast: 0.25, aoe: true }),
    },
    combo: ['Q', 'E', 'R', 'W'],
    hooks: { onHit: nth('moon', 3, (ctx) => [{ dt: M, raw: byLevel(20, 250, lvl(ctx)) + 0.5 * ctx.ap, label: 'Moonsilver Blade' }]) },
  },
  DrMundo: {
    notes: `${SIMPLE} Q hits for % current HP. R heals over time.`,
    spells: {
      Q: S(4, 1050, [dmg(M, [80, 130, 180, 230, 280], { tcur: [0.2, 0.225, 0.25, 0.275, 0.3] })], { cast: 0.25 }),
      W: S([17, 16.5, 16, 15.5, 15], 325, [dot(M, [20, 35, 50, 65, 80], {}, 4), dmg(M, [20, 35, 50, 65, 80], { bhp: 0.07 })], { cast: 0, aoe: true }),
      E: S([9, 8.25, 7.5, 6.75, 6], 300, [empower(1, dmg(P, [5, 15, 25, 35, 45], { bhp: 0.07 })), reset()], { cast: 0 }),
      R: S([110, 110, 110], 0, [heal(0, { extra: (ctx) => atRank([0.2, 0.3, 0.4], ctx.rank.R) * (ctx.u.maxHp - ctx.u.stats.baseHp) + atRank([0.1, 0.15, 0.2], ctx.rank.R) * ctx.u.maxHp }), buff('ad', 40, 10)], { cast: 0, when: 'lowhp' }),
    },
    combo: ['Q', 'E', 'W', 'R'],
  },
  Ekko: {
    notes: `${SIMPLE} 3rd hit on a target: bonus magic. R heals by % of recent damage taken.`,
    spells: {
      Q: S([9, 8.5, 8, 7.5, 7], 1075, [dmg(M, [70, 85, 100, 115, 130], { ap: 0.3 }), dmg(M, [40, 65, 90, 115, 140], { ap: 0.6 })], { aoe: true }),
      W: S([20, 18, 16, 14, 12], 1600, [cc(2.25), shield([80, 100, 120, 140, 160], { ap: 1.5 }, 2)], { cast: 3 }),
      E: S([9, 8.5, 8, 7.5, 7], 450, [dash(350, 'to'), empower(1, dmg(M, [50, 75, 100, 125, 150], { ap: 0.4 }))], { cast: 0 }),
      R: S([110, 80, 50], 375, [dmg(M, [200, 350, 500], { ap: 1.75 }), heal([100, 150, 200], { ap: 0.6, miss: 0.2 })], { cast: 0.5, aoe: true, when: 'lowhp' }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: { onHit: (ctx) => { ctx.addMark('resonance', 1, 4); if (ctx.mark('resonance') < 3 || ctx.t - (ctx.tgtState().zT ?? -99) < 5) return []; ctx.clearMark('resonance'); ctx.tgtState().zT = ctx.t; return [{ dt: M, raw: byLevel(30, 140, lvl(ctx)) + 0.9 * ctx.ap, label: 'Z-Drive Resonance' }] } },
  },
  Elise: {
    notes: `${SIMPLE} Human form spells, then spider form attacks (forms not switched).`,
    spells: {
      Q: S(6, 625, [dmg(M, [40, 75, 110, 145, 180], { tcur: 0.04 + 0 })], { cast: 0.25 }),
      W: S(12, 950, [dmg(M, [60, 105, 150, 195, 240], { ap: 0.95 })], { aoe: true }),
      E: S([12, 11.5, 11, 10.5, 10], 1075, [cc([1.5, 1.75, 2, 2.25, 2.5])]),
      R: S(3, 0, [], { when: 'never' }),
    },
    combo: ['E', 'Q', 'W'],
    hooks: { onHit: (ctx) => [{ dt: M, raw: atRank([10, 20, 30, 40], ctx.rank.R || 1) + 0.2 * ctx.ap, label: 'Spider Form' }] },
  },
  Evelynn: {
    notes: `${SIMPLE} Q fires 3 spikes; E deals % max HP. R executes under 30%.`,
    spells: {
      Q: S(4, 800, [dmg(M, [25, 30, 35, 40, 45], { ap: 0.25 }, { hits: 4 })]),
      W: S([15, 14, 13, 12, 11], 1200, [cc([0.75, 1, 1.25, 1.5, 1.75])], { cast: 0.15 }),
      E: S([8, 7.5, 7, 6.5, 6], 300, [dash(200, 'to'), dmg(M, [55, 70, 85, 100, 115], { thp: 0.03 })], { cast: 0 }),
      R: S([100, 80, 60], 500, [dash(700, 'away'), invuln(0.35), dmg(M, [125, 250, 375], { ap: 0.75 }, { missingMult: 1.4 })], { when: 'execute', aoe: true }),
    },
    combo: ['W', 'Q', 'E', 'R'],
  },
  Fiora: {
    notes: `${SIMPLE} Vitals: every 2 hits on a champ ≈ 1 Vital (true % max HP + heal). Riposte not simulated.`,
    spells: {
      Q: S([13, 11.25, 9.5, 7.75, 6], 400, [dash(400, 'to'), dmg(P, [70, 80, 90, 100, 110], { bad: [0.9, 0.95, 1, 1.05, 1.1] }, { onHit: true })]),
      W: S([24, 22, 20, 18, 16], 750, [dmg(M, [110, 150, 190, 230, 270], { ap: 1 })], { cast: 0.75, when: 'lowhp' }),
      E: S([11, 10, 9, 8, 7], 300, [buff('asPct', 50, 4), empower(1, dmg(P, 0, { ad: 0.6 })), reset()], { cast: 0 }),
      R: S([110, 90, 70], 500, [], { cast: 0 }),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: {
      onHit: nth('vital', 2, (ctx) => {
        const pct = 0.03 + (0.04 * ctx.bonusAd) / 100
        ctx.sim.healUnit(ctx.u, byLevel(35, 100, lvl(ctx)), 'Vital')
        return [{ dt: T, raw: pct * ctx.tgt.maxHp, label: 'Duelist\'s Dance' }]
      }),
    },
  },
  Fizz: {
    notes: `${SIMPLE} Flat damage reduction on attacks taken (passive). E dodges.`,
    spells: {
      Q: S([8, 7.5, 7, 6.5, 6], 550, [dash(550, 'to'), dmg(M, [10, 25, 40, 55, 70], { ap: 0.55 }), dmg(P, 0, { ad: 1 }, { onHit: true })]),
      W: S([7, 6, 5, 4, 3], 300, [empower(1, dmg(M, [50, 70, 90, 110, 130], { ap: 0.5 })), reset()], { cast: 0 }),
      E: S([16, 14.5, 13, 11.5, 10], 400, [invuln(0.75), dmg(M, [80, 130, 180, 230, 280], { ap: 0.9 })], { cast: 0.75, aoe: true }),
      R: S([100, 85, 70], 1300, [dmg(M, [300, 400, 500], { ap: 1.2 }), cc(1)], { cast: 0.25, aoe: true }),
    },
    combo: ['R', 'Q', 'W', 'E'],
  },
  Gangplank: {
    notes: `${SIMPLE} Q crits. Barrels assumed (2 per fight). Passive fire every 15s.`,
    spells: {
      Q: S(4.5, 625, [dmg(P, [10, 40, 70, 100, 130], { ad: 1 }, { crit: true, onHit: true })]),
      W: S([22, 20, 18, 16, 14], 0, [heal([45, 70, 95, 120, 145], { ap: 0.9, miss: 0.13 })], { cast: 0.25, when: 'lowhp' }),
      E: S(18, 1000, [dmg(P, 0, { ad: 1 }, { crit: true, extra: (ctx) => atRank([75, 105, 135, 165, 195], ctx.rank.E) })], { aoe: true }),
      R: S([180, 160, 140], 25000, [dot(M, [40, 70, 100], { ap: 0.1 }, 8, { hits: 6 })], { aoe: true, when: 'execute' }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: { onHit: timed('trial', 15, (ctx) => [{ dt: T, raw: byLevel(50, 250, lvl(ctx)) + ctx.bonusAd, label: 'Trial by Fire' }]) },
  },
  Gnar: {
    notes: `${SIMPLE} Mini Gnar (W every 3rd hit). Mega form ult assumed available.`,
    spells: {
      Q: S([17, 14.5, 12, 9.5, 7], 1125, [dmg(P, [5, 45, 85, 125, 165], { ad: 1.15 })], { aoe: true }),
      E: S([22, 19.5, 17, 14.5, 12], 475, [dash(475, 'to'), dmg(P, [50, 85, 120, 155, 190], { hp: 0.06 })], { aoe: true }),
      R: S([90, 60, 30], 475, [dmg(P, [200, 300, 400], { bad: 0.5, ap: 1 }), cc(1.25)], { aoe: true, ready: (ctx) => ctx.t > 6 }),
    },
    combo: ['Q', 'E', 'R'],
    hooks: { onHit: (ctx) => { if (!ctx.rank.W) return []; ctx.addMark('hyper', 1, 3.5); if (ctx.mark('hyper') < 3) return []; ctx.clearMark('hyper'); return [{ dt: M, raw: atRank([0, 10, 20, 30, 40], ctx.rank.W) + atRank([0.06, 0.08, 0.1, 0.12, 0.14], ctx.rank.W) * ctx.tgt.maxHp + ctx.ap, label: 'Hyper' }] } },
  },
  Gragas: {
    notes: `${SIMPLE} W empowered attack deals % max HP.`,
    spells: {
      Q: S([10, 9, 8, 7, 6], 850, [dmg(M, [80, 120, 160, 200, 240], { ap: 0.8 }, { hits: 1.5 })], { cast: 1, aoe: true }),
      W: S([5, 5, 5, 5, 5], 0, [buff('dmgRed', [0.1, 0.12, 0.14, 0.16, 0.18], 2.5), empower(1, dmg(M, [20, 50, 80, 110, 140], { ap: 0.7, thp: 0.07 }))], { cast: 0.75 }),
      E: S([16, 15, 14, 13, 12], 600, [dash(600, 'to'), dmg(M, [80, 125, 170, 215, 260], { ap: 0.6 }), cc(1)], { aoe: true }),
      R: S([120, 100, 80], 1000, [dmg(M, [200, 300, 400], { ap: 0.8 })], { aoe: true }),
    },
    combo: ['E', 'W', 'Q', 'R'],
  },
  Gwen: {
    notes: `${SIMPLE} On-hit % max HP magic. Q assumes full stacks + center snips (true).`,
    spells: {
      Q: S([6.5, 5.75, 5, 4.25, 3.5], 450, [dmg(M, [10, 15, 20, 25, 30], { ap: 0.05 }, { hits: 4 }), dmg(T, [35, 50, 65, 80, 95], { ap: 0.25 })], { aoe: true }),
      W: S([22, 21, 20, 19, 18], 0, [buff('armor', 22, 4), buff('mr', 22, 4)], { cast: 0, when: 'lowhp' }),
      E: S([13, 12.5, 12, 11.5, 11], 350, [dash(350, 'to'), buff('asPct', [35, 45, 55, 65, 75], 4), buff('range', 75, 4)], { cast: 0 }),
      R: S([120, 100, 80], 1350, [dmg(M, [35, 65, 95], { ap: 0.1, thp: 0.01 }, { hits: 9 })], { cast: 0.25, aoe: true }),
    },
    combo: ['E', 'R', 'Q', 'W'],
    hooks: { onHit: (ctx) => { const dmgv = (0.01 + (0.008 * ctx.ap) / 100) * ctx.tgt.maxHp; ctx.sim.healUnit(ctx.u, 0.5 * dmgv, null); return [{ dt: M, raw: dmgv, label: 'Thousand Cuts' }] } },
  },
  Hecarim: {
    notes: `${SIMPLE} E charge assumed full distance. W heals from damage dealt.`,
    spells: {
      Q: S([4, 4, 4, 4, 4], 375, [dmg(P, [60, 90, 120, 150, 180], { bad: 0.9 })], { cast: 0, aoe: true }),
      W: S(14, 525, [dot(M, [20, 30, 40, 50, 60], { ap: 0.2 }, 4), buff('omni', 1, 4)], { cast: 0, aoe: true }),
      E: S([20, 19, 18, 17, 16], 300, [dash(400, 'to'), empower(1, dmg(P, [60, 90, 120, 150, 180], { bad: 1 })), cc(0.25)], { cast: 0 }),
      R: S([140, 120, 100], 1000, [dash(1000, 'to'), dmg(M, [150, 250, 350], { ap: 1 }), cc(1)], { aoe: true }),
    },
    combo: ['E', 'R', 'W', 'Q'],
  },
  Illaoi: {
    notes: `${SIMPLE} Tentacles slam every few seconds. E spirit + R assumed in range.`,
    spells: {
      Q: S([10, 9, 8, 7, 6], 850, [dmg(P, 0, { ad: 1.2 }, { extra: (ctx) => byLevel(9, 162, lvl(ctx)) })], { cast: 0.75, aoe: true }),
      W: S([4, 3.5, 3, 2.5, 2], 350, [empower(1, dmg(P, 0, { thp: [0.03, 0.035, 0.04, 0.045, 0.05] }, { extra: (ctx) => byLevel(9, 162, lvl(ctx)) + 1.2 * ctx.ad })), reset()], { cast: 0 }),
      E: S([16, 15, 14, 13, 12], 950, [dmg(P, 0, { tcur: 0.08 })], { cast: 0.25 }),
      R: S([120, 95, 70], 450, [dmg(P, [150, 250, 350], { bad: 0.5 })], { cast: 0.5, aoe: true }),
    },
    combo: ['E', 'R', 'W', 'Q'],
    hooks: { onAttack: (ctx) => { if (ctx.t - (ctx.u.st.tent ?? -99) >= 4) { ctx.u.st.tent = ctx.t; ctx.sim.deal(ctx.u, ctx.tgt, byLevel(9, 162, lvl(ctx)) + 1.2 * ctx.ad, P, { label: 'Tentacle Slam' }); ctx.sim.healUnit(ctx.u, 0.05 * (ctx.u.maxHp - ctx.u.hp), null) } } },
  },
  Irelia: {
    notes: `${SIMPLE} Passive at max stacks: bonus AS + on-hit magic. Q resets assumed only on low targets.`,
    spells: {
      Q: S([11, 10, 9, 8, 7], 600, [dash(600, 'to'), dmg(P, [5, 25, 45, 65, 85], { ad: 0.6 }, { onHit: true }), heal([9, 10, 11, 12, 13], { ad: 0.2 })], { cast: 0 }),
      W: S([20, 18, 16, 14, 12], 775, [buff('dmgRed', 0.45, 1), dmg(P, [10, 30, 50, 70, 90], { ad: 0.5, ap: 0.4 })], { cast: 1, aoe: true }),
      E: S([18, 16.5, 15, 13.5, 12], 775, [dmg(M, [80, 125, 170, 215, 260], { ap: 0.8 }), cc(0.75)], { aoe: true }),
      R: S([125, 105, 85], 1000, [dmg(M, [125, 250, 375], { ap: 0.7 })], { aoe: true }),
    },
    combo: ['E', 'R', 'Q', 'W'],
    hooks: {
      asBonus: (u) => ((u.st.ionia || 0) >= 4 ? byLevel(7.5, 20, u.stats.level) * 4 : 0),
      onSpell: (ctx) => { ctx.u.st.ionia = Math.min(4, (ctx.u.st.ionia || 0) + 1) },
      onHit: (ctx) => ((ctx.u.st.ionia || 0) >= 4 ? [{ dt: M, raw: byLevel(10, 61, lvl(ctx)) + 0.2 * ctx.bonusAd, label: 'Ionian Fervor' }] : []),
    },
  },
  Jax: {
    notes: `${SIMPLE} Attack speed stacks (passive). E dodges attacks then stuns.`,
    spells: {
      Q: S([8, 7.5, 7, 6.5, 6], 700, [dash(700, 'to'), dmg(P, [65, 105, 145, 185, 225], { bad: 1, ap: 0.6 })]),
      W: S([7, 6, 5, 4, 3], 300, [empower(1, dmg(M, [50, 85, 120, 155, 190], { ap: 0.6 })), reset()], { cast: 0 }),
      E: S([17, 15, 13, 11, 9], 300, [buff('dmgRed', 0.25, 2), dmg(P, [55, 80, 105, 130, 155], { thp: 0.035 }), cc(1)], { cast: 2, aoe: true }),
      R: S([80, 70, 60], 0, [buff('armor', [45, 60, 75], 8), buff('mr', [27, 36, 45], 8), buff('jaxR', 1, 8)], { cast: 0 }),
    },
    combo: ['R', 'Q', 'E', 'W'],
    hooks: {
      asBonus: (u) => Math.min(8, u.attacks || 0) * byLevel(3.5, 11, u.stats.level),
      onHit: nth('jaxR3', 3, (ctx) => (ctx.rank.R ? [{ dt: M, raw: atRank([100, 140, 180], ctx.rank.R) + 0.7 * ctx.ap, label: 'Grandmaster\'s Might' }] : [])),
    },
  },
  Jayce: {
    notes: `${SIMPLE} Cannon form poke (Q through gate) then hammer combo. Form swaps not tracked.`,
    spells: {
      Q: S([8, 7.5, 7, 6.5, 6], 1050, [dmg(P, [60, 110, 160, 210, 260], { bad: 1.2 }, { hits: 1.4 })], { aoe: true }),
      W: S([13, 11.4, 9.8, 8.2, 6.6], 0, [buff('asPct', [30, 40, 50, 60, 70], 3)], { cast: 0 }),
      E: S([16, 16, 16, 16, 16], 240, [dmg(M, 0, { bad: 1, thp: [0.08, 0.104, 0.128, 0.152, 0.176] }), cc(0.5)]),
      R: S(6, 0, [empower(1, dmg(M, [25, 65, 105, 145], { bad: 0.25 }))], { cast: 0 }),
    },
    combo: ['Q', 'E', 'W', 'R'],
  },
  KSante: {
    notes: `${SIMPLE} Base form. Ntofo strikes passive marks deal % max HP.`,
    spells: {
      Q: S([3.5, 3.5, 3.5, 3.5, 3.5], 465, [dmg(P, [30, 60, 90, 120, 150], { barmor: 0.4, bhp: 0.4 }, { extra: (ctx) => 0 })], { aoe: true }),
      W: S([24, 22, 20, 18, 16], 450, [buff('dmgRed', 0.5, 1), dash(450, 'to'), dmg(P, 0, { thp: [0.06, 0.065, 0.07, 0.075, 0.08] }), cc(0.5)], { cast: 1, aoe: true }),
      E: S([10.5, 10, 9.5, 9, 8.5], 250, [dash(250, 'side'), shield([50, 70, 90, 110, 130], { bhp: 0.15 }, 2)], { cast: 0 }),
      R: S([120, 100, 80], 350, [dmg(P, [70, 130, 190], { bad: 0.65 }), cc(0.75), buff('armorPen', 0, 1)], { cast: 0.25 }),
    },
    combo: ['W', 'Q', 'E', 'R'],
    hooks: { onHit: nth('ntofo', 2, (ctx) => [{ dt: P, raw: (0.01 + (0.01 * ctx.u.stats.bonusHp) / 100) * ctx.tgt.maxHp, label: 'Dauntless Instinct' }]) },
  },
  Kayle: {
    notes: `${SIMPLE} Gets ranged at 6, waves at 11. E on-hit % missing HP.`,
    spells: {
      Q: S([12, 11, 10, 9, 8], 900, [dmg(M, [60, 100, 140, 180, 220], { bad: 0.6, ap: 0.5 })], { aoe: true }),
      W: S(15, 900, [heal([55, 80, 105, 130, 155], { ap: 0.25 })], { cast: 0, when: 'lowhp' }),
      E: S([8, 7.5, 7, 6.5, 6], 525, [empower(1, dmg(M, 0, { tmiss: 0.08 + 0 }, { extra: (ctx) => (0.02 * ctx.ap) / 100 * (ctx.tgt.maxHp - ctx.tgt.hp) })), reset()], { cast: 0 }),
      R: S([160, 120, 80], 900, [invuln(2.5), dmg(M, [200, 350, 500], { bad: 1, ap: 0.8 })], { cast: 2.5, when: 'lowhp' }),
    },
    combo: ['Q', 'E', 'W', 'R'],
    hooks: {
      init: (u) => { if (u.stats.level >= 6) u.stats.range = 525 },
      asBonus: (u) => Math.min(5, u.attacks || 0) * 6,
      onHit: (ctx) => {
        const out = [{ dt: M, raw: atRank([15, 20, 25, 30, 35], ctx.rank.E || 1) + 0.1 * ctx.bonusAd + 0.2 * ctx.ap, label: 'Starfire Spellblade' }]
        if (lvl(ctx) >= 11) out.push({ dt: M, raw: byLevel(20, 40, lvl(ctx)) + 0.1 * ctx.bonusAd + 0.25 * ctx.ap, label: 'Divine Ascent' })
        return out
      },
    },
  },
  Kayn: {
    notes: `${SIMPLE} Base form (no Rhaast/Shadow Assassin).`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 350, [dash(350, 'to'), dmg(P, [75, 95, 115, 135, 155], { bad: 0.8 })], { cast: 0.5, aoe: true }),
      W: S([13, 12, 11, 10, 9], 700, [dmg(P, [90, 135, 180, 225, 270], { bad: 1.3 }), cc(0.5)], { cast: 0.55, aoe: true }),
      E: S([21, 19, 17, 15, 13], 0, [heal([90, 100, 110, 120, 130], { bad: 0.4 })], { cast: 0, when: 'lowhp' }),
      R: S([120, 100, 80], 550, [invuln(2.2), dmg(P, [150, 250, 350], { bad: 1.75 })], { cast: 2.2, when: 'execute' }),
    },
    combo: ['W', 'Q', 'R', 'E'],
  },
  Kled: {
    notes: `${SIMPLE} Mounted only (Skaarl). W: every 4th attack deals % max HP.`,
    spells: {
      Q: S(9, 800, [dmg(P, [30, 55, 80, 105, 130], { bad: 0.65 }, { hits: 3 }), dash(300, 'pull')], { cast: 0.25 }),
      E: S([14, 12.5, 11, 9.5, 8], 550, [dash(550, 'to'), dmg(P, [35, 60, 85, 110, 135], { bad: 0.65 }, { hits: 2 })], { cast: 0 }),
      R: S([160, 140, 120], 3000, [dash(3000, 'to'), shield([200, 300, 400], {}, 2), dmg(P, 0, { thp: [0.12, 0.15, 0.18] })]),
    },
    combo: ['R', 'Q', 'E'],
    hooks: { onHit: (ctx) => { if (!ctx.rank.W) return []; ctx.addMark('violent', 1, 4); if (ctx.mark('violent') < 4) return []; ctx.clearMark('violent'); return [{ dt: P, raw: atRank([20, 30, 40, 50, 60], ctx.rank.W) + atRank([0.045, 0.05, 0.055, 0.06, 0.065], ctx.rank.W) * ctx.tgt.maxHp, label: 'Violent Tendencies' }] }, asBonus: (u, r) => (r.W ? 150 : 0) * (Math.min(4, u.attacks || 0) < 4 ? 1 : 0) },
  },
  MasterYi: {
    notes: `${SIMPLE} Every 4th attack hits twice. Q is untargetable. E = bonus true damage on-hit.`,
    spells: {
      Q: S([18, 17.5, 17, 16.5, 16], 600, [invuln(0.9), dmg(P, [30, 60, 90, 120, 150], { ad: 0.5 }, { hits: 1.4, crit: true, onHit: true })], { cast: 0.9 }),
      W: S(28, 0, [buff('dmgRed', [0.4, 0.425, 0.45, 0.475, 0.5], 4), heal([30, 50, 70, 90, 110], { ap: 0.3 })], { cast: 4, when: 'lowhp' }),
      E: S([14, 13, 12, 11, 10], 0, [buff('yiE', [20, 25, 30, 35, 40], 5)], { cast: 0 }),
      R: S(85, 0, [buff('asPct', [25, 35, 45], 7), buff('msPct', 0.35, 7)], { cast: 0 }),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: {
      onHit: (ctx) => {
        const out = []
        const e = ctx.buff('yiE')
        if (e) out.push({ dt: T, raw: e + 0.35 * ctx.bonusAd, label: 'Wuju Style' })
        ctx.u.st.dbl = (ctx.u.st.dbl || 0) + 1
        if (ctx.u.st.dbl >= 4) { ctx.u.st.dbl = 0; out.push({ dt: P, raw: 0.5 * ctx.ad, label: 'Double Strike' }) }
        return out
      },
    },
  },
  MonkeyKing: {
    notes: `${SIMPLE} Wukong. Q shreds armor. R knocks up twice.`,
    spells: {
      Q: S([9, 8.5, 8, 7.5, 7], 300, [empower(1, dmg(P, [20, 45, 70, 95, 120], { bad: 0.45 })), reset()], { cast: 0 }),
      W: S([22, 20, 18, 16, 14], 300, [dash(300, 'side'), invuln(0.3)], { cast: 0, when: 'lowhp' }),
      E: S([10, 9.5, 9, 8.5, 8], 625, [dash(625, 'to'), dmg(M, [80, 110, 140, 170, 200], { ap: 0.8 }), buff('asPct', [35, 40, 45, 50, 55], 5)], { aoe: true }),
      R: S([130, 110, 90], 315, [dot(P, 0, { thp: [0.16, 0.24, 0.32] }, 2, { extra: (ctx) => 2.2 * ctx.ad }), cc(1)], { cast: 0.5, aoe: true }),
    },
    combo: ['E', 'R', 'Q'],
  },
  Mordekaiser: {
    notes: `${SIMPLE} Passive aura burns after 3 hits. R isolates (always 1v1 here).`,
    spells: {
      Q: S([9, 7.75, 6.5, 5.25, 4], 625, [dmg(M, [75, 95, 115, 135, 155], { ap: 0.6 }, { extra: (ctx) => byLevel(5, 107, lvl(ctx)), missingMult: 0 })], { cast: 0.5, aoe: true }),
      W: S([14, 13, 12, 11, 10], 0, [shield(0, { hp: 0.15 }, 4)], { cast: 0, when: 'lowhp' }),
      E: S([18, 16, 14, 12, 10], 900, [dmg(M, [70, 85, 100, 115, 130], { ap: 0.6 }), dash(300, 'pull')], { cast: 0.75, aoe: true }),
      R: S([140, 120, 100], 650, [buff('ad', 25, 7)], { cast: 0.5 }),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: { onHit: (ctx) => { ctx.addMark('dark', 1, 4); return ctx.mark('dark') >= 3 ? [{ dt: M, raw: (byLevel(5, 30, lvl(ctx)) + 0.3 * ctx.ap + 0.01 * ctx.tgt.maxHp) / Math.max(0.5, ctx.as), label: 'Darkness Rise' }] : [] } },
  },
  Naafiri: {
    notes: `${SIMPLE} Packmates attack with her (approximated as bonus on-hit).`,
    spells: {
      Q: S([11, 10, 9, 8, 7], 900, [dmg(P, [35, 45, 55, 65, 75], { bad: 0.2 }, { hits: 2 }), dot(P, [30, 45, 60, 75, 90], { bad: 0.8 }, 4)], { aoe: true }),
      W: S([22, 20, 18, 16, 14], 900, [dash(900, 'to'), dmg(P, [30, 70, 110, 150, 190], { bad: 0.8 }), cc(0.25)]),
      E: S([11, 10.5, 10, 9.5, 9], 350, [dash(350, 'side'), dmg(P, [15, 25, 35, 45, 55], { bad: 0.4 }, { hits: 3 })], { aoe: true }),
      R: S([120, 100, 80], 0, [buff('ad', [15, 25, 35], 10), shield([75, 125, 175], { bad: 1.6 }, 4)], { cast: 0 }),
    },
    combo: ['R', 'W', 'Q', 'E'],
    hooks: { onHit: (ctx) => [{ dt: P, raw: (byLevel(5, 15, lvl(ctx)) + 0.05 * ctx.bonusAd) * 2, label: 'Packmates' }] },
  },
  Nasus: {
    notes: `${SIMPLE} Set Siphoning Strike stacks.`,
    stacks: [{ key: 'qstacks', label: { en: 'Q stacks', fr: 'Cumuls Q' }, max: 1500, def: 200 }],
    spells: {
      Q: S([7.5, 6.5, 5.5, 4.5, 3.5], 300, [empower(1, dmg(P, [40, 60, 80, 100, 120], {}, { extra: (ctx) => ctx.u.stacks.qstacks || 0 })), reset()], { cast: 0 }),
      W: S([15, 14, 13, 12, 11], 600, [], { cast: 0.25 }),
      E: S(11, 650, [dmg(M, [55, 95, 135, 175, 215], { ap: 0.6 }), dot(M, [44, 76, 108, 140, 172], { ap: 0.48 }, 5)], { aoe: true }),
      R: S([120, 100, 80], 0, [buff('ad', 0, 15), dot(M, 0, { thp: [0.03, 0.04, 0.05] }, 15)], { cast: 0 }),
    },
    combo: ['R', 'Q', 'E', 'W'],
    hooks: { init: (u) => { u.stats.lifesteal += byLevel(0.12, 0.24, u.stats.level) } },
  },
  Nidalee: {
    notes: `${SIMPLE} Spear (Q) poke, then cougar combo. Spear assumed max range.`,
    spells: {
      Q: S(6, 1500, [dmg(M, [70, 90, 110, 130, 150], { ap: 0.5 }, { hits: 3 })], { cast: 0.25 }),
      W: S([13, 12, 11, 10, 9], 900, [dot(M, [40, 80, 120, 160, 200], { ap: 0.2 }, 4)]),
      E: S(12, 600, [heal([35, 50, 65, 80, 95], { ap: 0.275 }, {}), buff('asPct', [20, 30, 40, 50, 60], 7)], { cast: 0 }),
      R: S(3, 375, [dmg(M, [70, 130, 190, 250], { ap: 0.45 }, { missingMult: 1.25 })], { aoe: true }),
    },
    combo: ['Q', 'W', 'R', 'E'],
  },
  Nilah: {
    notes: `${SIMPLE} Shared XP/crit passive ignored. W dodges attacks.`,
    spells: {
      Q: S([4, 4, 4, 4, 4], 600, [dmg(P, [5, 10, 15, 20, 25], { ad: [0.9, 1, 1.1, 1.2, 1.3] }, { crit: true })], { aoe: true }),
      W: S([26, 25, 24, 23, 22], 0, [buff('dmgRed', 0.25, 2.25)], { cast: 0, when: 'lowhp' }),
      E: S(26, 550, [dash(550, 'to'), dmg(P, [65, 90, 115, 140, 165], { ad: 0.2 })], { cast: 0 }),
      R: S([110, 90, 70], 450, [dot(P, [60, 120, 180], { bad: 1.4 }, 1), dmg(P, [125, 225, 325], { bad: 1.2 }), cc(0.5)], { cast: 1, aoe: true }),
    },
    combo: ['E', 'Q', 'R', 'W'],
    hooks: { asBonus: (u, r) => (r.Q ? atRank([10, 12.5, 15, 17.5, 20], r.Q) : 0) },
  },
  Nocturne: {
    notes: `${SIMPLE} Passive cleave every ~10s (heals).`,
    spells: {
      Q: S(8, 1200, [dmg(P, [65, 110, 155, 200, 245], { bad: 0.85 }), buff('ad', [20, 30, 40, 50, 60], 5)], { aoe: true }),
      W: S([20, 18, 16, 14, 12], 0, [buff('asPct', [30, 35, 40, 45, 50], 5)], { cast: 0 }),
      E: S([15, 14, 13, 12, 11], 425, [dot(M, [80, 125, 170, 215, 260], { ap: 1 }, 2), cc(1.5)], { cast: 2 }),
      R: S([150, 125, 100], 4000, [dash(2500, 'to'), dmg(P, [150, 275, 400], { bad: 1.2 })], { when: 'execute' }),
    },
    combo: ['R', 'Q', 'E', 'W'],
    hooks: { onHit: timed('umbra', 8, (ctx) => { ctx.sim.healUnit(ctx.u, byLevel(15, 40, lvl(ctx)) + 0.3 * ctx.ap, 'Umbra Blades'); return [{ dt: P, raw: 0.2 * ctx.ad, label: 'Umbra Blades' }] }) },
  },
  Olaf: {
    notes: `${SIMPLE} Attack speed grows as HP drops. R = immune to CC.`,
    spells: {
      Q: S(7, 1000, [dmg(P, [60, 110, 160, 210, 260], { bad: 1 })], { aoe: true }),
      W: S(16, 0, [buff('asPct', [40, 50, 60, 70, 80], 6), shield([10, 45, 80, 115, 150], { miss: 0 }, 2.5)], { cast: 0 }),
      E: S([11, 10, 9, 8, 7], 325, [dmg(T, [70, 115, 160, 205, 250], { ad: 0.5 })], { cast: 0.25 }),
      R: S([100, 90, 80], 0, [buff('ad', [10, 20, 30], 3), buff('armor', [10, 20, 30], 3)], { cast: 0 }),
    },
    combo: ['R', 'W', 'Q', 'E'],
    hooks: { asBonus: (u) => 100 * (1 - u.hp / u.maxHp) },
  },
  Pantheon: {
    notes: `${SIMPLE} Every 5 stacks: empowered spell or attack (crit Q / double W).`,
    spells: {
      Q: S([11, 10.25, 9.5, 8.75, 8], 575, [dmg(P, [70, 100, 130, 160, 190], { bad: 1.15 }, { missingMult: 1 })], { cast: 0.25 }),
      W: S([13, 12, 11, 10, 9], 600, [dash(600, 'to'), dmg(P, 0, { thp: [0.06, 0.065, 0.07, 0.075, 0.08] }, { extra: (ctx) => (0.015 * ctx.bonusAd) / 100 * ctx.tgt.maxHp }), cc(1)], { cast: 0 }),
      E: S([22, 20.5, 19, 17.5, 16], 400, [buff('dmgRed', 0.5, 1.5), dmg(P, [55, 105, 155, 205, 255], { bad: 1.5 })], { cast: 1.5, aoe: true }),
      R: S([180, 165, 150], 5500, [dmg(M, [300, 500, 700], { ap: 1 })], { cast: 2, when: 'never' }),
    },
    combo: ['W', 'Q', 'E'],
  },
  Poppy: {
    notes: `${SIMPLE} Passive shield buckler. E stun assumed (wall).`,
    spells: {
      Q: S([8, 7, 6, 5, 4], 430, [dmg(P, [40, 60, 80, 100, 120], { bad: 1, thp: 0.08 }, { hits: 2 })], { cast: 0.33, aoe: true }),
      W: S([20, 18, 16, 14, 12], 0, [buff('armor', 20, 2), buff('mr', 20, 2)], { cast: 0 }),
      E: S([14, 13, 12, 11, 10], 475, [dash(475, 'to'), dmg(P, [60, 80, 100, 120, 140], { bad: 0.5 }, { hits: 2 }), cc(1.6)]),
      R: S([140, 120, 100], 500, [dmg(P, [200, 300, 400], { bad: 0.9 }), cc(0.75)], { cast: 0.5, aoe: true }),
    },
    combo: ['E', 'Q', 'R', 'W'],
    hooks: { init: (u, sim) => sim.addShield(u, byLevel(0.15, 0.2, u.stats.level) * u.maxHp, 3, 'Iron Ambassador') },
  },
  Qiyana: {
    notes: `${SIMPLE} Grass element assumed. R stun assumed (wall).`,
    spells: {
      Q: S(7, 525, [dmg(P, [50, 85, 120, 155, 190], { bad: 0.9 }, { hits: 1.5 })], { aoe: true }),
      W: S([7, 6, 5, 4, 3], 0, [buff('qiyanaW', 1, 5), buff('asPct', [5, 10, 15, 20, 25], 5)], { cast: 0 }),
      E: S([12, 11, 10, 9, 8], 650, [dash(650, 'to'), dmg(P, [50, 90, 130, 170, 210], { bad: 0.5 })]),
      R: S([120, 100, 80], 875, [dmg(P, [100, 200, 300], { bad: 1.7, thp: 0.1 }), cc(1)], { cast: 0.25, aoe: true }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: { onHit: (ctx) => (ctx.buff('qiyanaW') ? [{ dt: M, raw: atRank([8, 22, 36, 50, 64], ctx.rank.W || 1) + 0.2 * ctx.bonusAd + 0.45 * ctx.ap, label: 'Terrashape' }] : []) },
  },
  RekSai: {
    notes: `${SIMPLE} Burrow/unburrow cycle simplified. E true damage at full Fury.`,
    spells: {
      Q: S(4, 300, [empower(3, dmg(P, [21, 27, 33, 39, 45], { bad: 0.5 }))], { cast: 0 }),
      W: S(4, 0, [dmg(P, [55, 70, 85, 100, 115], { bad: 0.8 }), cc(1)], { cast: 0, ready: (ctx) => ctx.t < 1 }),
      E: S([12, 11.5, 11, 10.5, 10], 250, [dmg(T, 0, { ad: 0.8, thp: [0.08, 0.095, 0.11, 0.125, 0.14] })]),
      R: S([100, 90, 80], 1500, [dash(1500, 'to'), dmg(P, [100, 250, 400], { bad: 1.75 }, { missingMult: 0.25 })], { when: 'execute' }),
    },
    combo: ['W', 'Q', 'E', 'R'],
  },
  Renekton: {
    notes: `${SIMPLE} Fury-empowered W assumed every other cast.`,
    spells: {
      Q: S(8, 325, [dmg(P, [65, 95, 125, 155, 185], { bad: 1 }), heal(0, { extra: (ctx) => 0.33 * (atRank([65, 95, 125, 155, 185], ctx.rank.Q) + ctx.bonusAd) })], { cast: 0.25, aoe: true }),
      W: S([13, 12, 11, 10, 9], 300, [empower(1, dmg(P, [10, 45, 80, 115, 150], { ad: 1.5 }, { hits: 1.5 })), cc(1.25), reset()], { cast: 0 }),
      E: S([16, 15, 14, 13, 12], 450, [dash(450, 'to'), dmg(P, [40, 70, 100, 130, 160], { bad: 0.9 }, { hits: 2 })], { cast: 0, aoe: true }),
      R: S(120, 0, [buff('ad', 0, 15), dot(M, [50, 100, 150], { ap: 0.1 }, 15), heal([175, 350, 525], {})], { cast: 0, when: 'lowhp' }),
    },
    combo: ['E', 'W', 'Q', 'R'],
  },
  Rengar: {
    notes: `${SIMPLE} Leaps from brush at start (Q empowered). Ferocity cycles simplified.`,
    spells: {
      Q: S([6, 5.5, 5, 4.5, 4], 300, [empower(1, dmg(P, [30, 60, 90, 120, 150], { ad: [0, 0.0375, 0.075, 0.1125, 0.15] }, { crit: true })), reset()], { cast: 0 }),
      W: S([16, 14.5, 13, 11.5, 10], 450, [dmg(M, [50, 80, 110, 140, 170], { ap: 0.8 }), heal(0, { extra: (ctx) => 0.5 * (ctx.u.totals.taken * 0.25) })], { cast: 0, aoe: true }),
      E: S(10, 1000, [dmg(P, [55, 100, 145, 190, 235], { bad: 0.8 }), cc(0.5)]),
      R: S([110, 90, 70], 2500, [dash(800, 'to'), empower(1, dmg(P, [50, 75, 100], { bad: 0 })), buff('armorShred', 0, 1)], { when: 'start' }),
    },
    combo: ['R', 'Q', 'E', 'W'],
    hooks: { init: (u) => { u.st.leap = true }, onHit: (ctx) => { if (!ctx.u.st.leap) return []; ctx.u.st.leap = false; return [{ dt: P, raw: 0.5 * ctx.ad, label: 'Unseen Predator' }] } },
  },
  Riven: {
    notes: `${SIMPLE} Every spell charges 1 Runic Blade (bonus attack). Q = 3 casts.`,
    spells: {
      Q: S(13, 275, [dash(275, 'to'), dmg(P, [15, 35, 55, 75, 95], { ad: [0.45, 0.5, 0.55, 0.6, 0.65] }, { hits: 3, missingMult: 0 }), cc(0.75), reset()], { cast: 0.8, aoe: true }),
      W: S([11, 10, 9, 8, 7], 260, [dmg(P, [65, 95, 125, 155, 185], { bad: 1 }), cc(0.75)], { cast: 0, aoe: true }),
      E: S([10, 9, 8, 7, 6], 250, [dash(250, 'to'), shield([80, 105, 130, 155, 180], { bad: 1 }, 1.5)], { cast: 0 }),
      R: S([120, 90, 60], 1100, [buff('ad', 0, 15), dmg(P, [100, 150, 200], { bad: 0.6 }, { missingMult: 2 })], { cast: 0.25, aoe: true, when: 'execute' }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: {
      onSpell: (ctx) => { ctx.u.st.runic = Math.min(3, (ctx.u.st.runic || 0) + 1) },
      onHit: (ctx) => { if (!ctx.u.st.runic) return []; ctx.u.st.runic--; return [{ dt: P, raw: byLevel(0.3, 0.6, lvl(ctx)) * ctx.ad, label: 'Runic Blade' }] },
      init: (u) => { if (u.ranks.R) { u.stats.ad *= 1.2; u.stats.bonusAd = u.stats.ad - u.stats.baseAd } },
    },
  },
  Rumble: {
    notes: `${SIMPLE} Danger Zone (overheat) bonus on-hit assumed half the time.`,
    spells: {
      Q: S(6, 600, [dot(M, [60, 95, 130, 165, 200], { ap: 1.1, thp: 0.06 }, 3, { hits: 1.25 })], { cast: 0, aoe: true }),
      W: S(6, 0, [shield([60, 90, 120, 150, 180], { ap: 0.45 }, 1.5), buff('msPct', 0.25, 1)], { cast: 0 }),
      E: S([6, 5.5, 5, 4.5, 4], 850, [dmg(M, [60, 85, 110, 135, 160], { ap: 0.4 }, { hits: 2 })]),
      R: S([110, 90, 70], 1700, [dot(M, [140, 210, 280], { ap: 0.35 }, 3.5, { hits: 1 })], { aoe: true }),
    },
    combo: ['R', 'Q', 'E', 'W'],
    hooks: { onHit: (ctx) => [{ dt: M, raw: 0.5 * (byLevel(5, 40, lvl(ctx)) + 0.25 * ctx.ap + 0.06 * ctx.tgt.maxHp), label: 'Junkyard Titan' }] },
  },
  Sejuani: {
    notes: `${SIMPLE} Frost stacks → E stun. Passive armor/MR at fight start.`,
    spells: {
      Q: S([20, 18.5, 17, 15.5, 14], 650, [dash(650, 'to'), dmg(M, [90, 140, 190, 240, 290], { ap: 0.6 }), cc(0.5)], { aoe: true }),
      W: S(9, 600, [dmg(P, [20, 25, 30, 35, 40], { ap: 0.2, hp: 0.015 }), dmg(P, [30, 70, 110, 150, 190], { ap: 0.6, hp: 0.06 })], { cast: 1, aoe: true }),
      E: S([1.5, 1.5, 1.5, 1.5, 1.5], 600, [dmg(M, [55, 105, 155, 205, 255], { ap: 0.6 }), cc(1)], { ready: (ctx) => ctx.mark('frost') >= 4 }),
      R: S([120, 100, 80], 1300, [dmg(M, [200, 300, 400], { ap: 0.8 }), cc(1.25)], { aoe: true }),
    },
    combo: ['R', 'Q', 'E', 'W'],
    hooks: {
      init: (u) => { u.stats.armor += 10 + 0.5 * (u.stats.bonusArmor || 0); u.stats.mr += 10 + 0.5 * (u.stats.bonusMr || 0) },
      onHit: (ctx) => { ctx.addMark('frost', 1, 6, 4); return [] },
      onSpell: (ctx, key) => { ctx.addMark('frost', key === 'W' ? 2 : 1, 6, 4); if (key === 'E') ctx.clearMark('frost') },
    },
  },
  Shyvana: {
    notes: `${SIMPLE} Human form E + dragon R damage. Every 3rd attack in Q: double hit.`,
    spells: {
      Q: S([9, 8, 7, 6, 5], 300, [empower(1, dmg(P, 0, { ad: [0.2, 0.35, 0.5, 0.65, 0.8] })), reset()], { cast: 0 }),
      W: S(12, 325, [dot(M, [10, 15, 20, 25, 30], { bad: 0.1, ap: 0.1 }, 3, { hits: 3 }), buff('msPct', 0.3, 3)], { cast: 0, aoe: true }),
      E: S([12, 11, 10, 9, 8], 925, [dmg(M, [60, 100, 140, 180, 220], { ad: 0.3, ap: 0.7 }), buff('shyvE', 1, 5)]),
      R: S(100, 850, [dash(850, 'to'), dmg(M, [150, 250, 350], { ap: 1.3 })], { cast: 0, aoe: true }),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: { onHit: (ctx) => (ctx.buff('shyvE') ? [{ dt: M, raw: 0.035 * ctx.tgt.maxHp, label: 'Flame Breath' }] : []) },
  },
  Skarner: {
    notes: `${SIMPLE} Quakes stack % max HP. R suppresses.`,
    spells: {
      Q: S([10, 9, 8, 7, 6], 300, [empower(3, dmg(P, [10, 20, 30, 40, 50], { bad: 0.2, bhp: 0.05 }))], { cast: 0 }),
      W: S(13, 0, [shield([80, 110, 140, 170, 200], { hp: 0.12 }, 2.5), dmg(M, [40, 65, 90, 115, 140], { ap: 0.6, hp: 0.08 })], { cast: 0, aoe: true }),
      E: S(14, 1000, [dash(800, 'to'), dmg(P, [40, 70, 100, 130, 160], { thp: 0.05 }), cc(1)]),
      R: S([110, 95, 80], 625, [dmg(P, [0, 20, 40], { ap: 1, thp: [0.13, 0.13, 0.13] }), cc(1.75)], { cast: 0.75, aoe: true }),
    },
    combo: ['E', 'R', 'Q', 'W'],
  },
  Talon: {
    notes: `${SIMPLE} Passive bleed after 3 spells hit.`,
    spells: {
      Q: S([8, 7.5, 7, 6.5, 6], 575, [dash(575, 'to'), dmg(P, [65, 85, 105, 125, 145], { bad: 1.1 }, { crit: true }), heal(0, { extra: (ctx) => 10 + 5 * lvl(ctx) })]),
      W: S([9, 8.5, 8, 7.5, 7], 900, [dmg(P, [45, 60, 75, 90, 105], { bad: 0.4 }), dmg(P, [50, 70, 90, 110, 130], { bad: 0.9 })], { aoe: true }),
      E: S([2, 2, 2, 2, 2], 0, [], { when: 'never' }),
      R: S([100, 80, 60], 550, [invuln(1), dmg(P, [90, 135, 180], { bad: 1 }, { hits: 2 })], { cast: 0, aoe: true }),
    },
    combo: ['W', 'Q', 'R'],
    hooks: { onSpell: (ctx) => { ctx.addMark('wound', 1, 6); if (ctx.mark('wound') >= 3) { ctx.clearMark('wound'); ctx.sim.addDot(ctx.u, ctx.tgt, P, byLevel(75, 245, lvl(ctx)) + 2 * ctx.bonusAd, 2, 'Blade\'s End') } } },
  },
  Trundle: {
    notes: `${SIMPLE} R steals % max HP and resists.`,
    spells: {
      Q: S([3.5, 3.5, 3.5, 3.5, 3.5], 300, [empower(1, dmg(P, [20, 40, 60, 80, 100], { ad: [0.15, 0.25, 0.35, 0.45, 0.55] })), buff('ad', [10, 15, 20, 25, 30], 5), reset()], { cast: 0 }),
      W: S(18, 750, [buff('asPct', [30, 50, 70, 90, 110], 8)], { cast: 0 }),
      E: S([24, 21, 18, 15, 12], 1000, [cc(0.5)], { cast: 0.25 }),
      R: S([120, 100, 80], 650, [dot(M, 0, { thp: [0.2, 0.275, 0.35] }, 4), buff('armor', 40, 8), buff('mr', 30, 8)], { cast: 0 }),
    },
    combo: ['R', 'W', 'Q', 'E'],
  },
  Tryndamere: {
    notes: `${SIMPLE} Fury assumed 50 (+crit). R: can't die for 5s.`,
    spells: {
      Q: S([12, 11, 10, 9, 8], 0, [heal([30, 40, 50, 60, 70], { ap: 0.3 }, {}), buff('ad', [5, 10, 15, 20, 25], 10)], { cast: 0, when: 'lowhp' }),
      W: S(14, 850, [buff('enemyAdDown', 1, 4)], { cast: 0.3 }),
      E: S([12, 11, 10, 9, 8], 660, [dash(660, 'to'), dmg(P, [80, 110, 140, 170, 200], { bad: 1.3, ap: 0.8 })], { aoe: true }),
      R: S([120, 100, 80], 0, [invuln(5)], { cast: 0, when: 'lowhp' }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: { init: (u) => { u.stats.crit = Math.min(1, u.stats.crit + 0.2) } },
  },
  Udyr: {
    notes: `${SIMPLE} Wilding Claw then Wingborne Storm. Awakened casts every other time.`,
    spells: {
      Q: S(6, 300, [buff('asPct', [20, 28, 36, 44, 52], 4), empower(2, dmg(P, [5, 11, 17, 23, 29], { bad: 0.25, thp: 0.03 }))], { cast: 0 }),
      W: S(6, 0, [shield([40, 60, 80, 100, 120], { ap: 0.5, bhp: 0.03 }, 4), buff('lifesteal', 0.15, 4)], { cast: 0, when: 'lowhp' }),
      E: S(6, 0, [buff('msPct', 0.3, 2), empower(1, cc(0.75))], { cast: 0 }),
      R: S(6, 370, [dot(M, [20, 34, 48, 62, 76], { ap: 0.5, thp: 0.01 }, 4, { hits: 2 })], { cast: 0, aoe: true }),
    },
    combo: ['R', 'E', 'Q', 'W'],
  },
  Urgot: {
    notes: `${SIMPLE} Leg shotguns = % max HP per leg (5s per leg). R executes under 25%.`,
    spells: {
      Q: S([10, 9.5, 9, 8.5, 8], 800, [dmg(P, [25, 70, 115, 160, 205], { ad: 0.7 })], { aoe: true }),
      W: S([12, 9, 6, 3, 0], 490, [buff('urgotW', 1, 4)], { cast: 0 }),
      E: S([16, 15.5, 15, 14.5, 14], 450, [dash(450, 'to'), shield([60, 80, 100, 120, 140], { bad: 1.5, bhp: 0.15 }, 4), dmg(P, [90, 120, 150, 180, 210], { ad: 1 }), cc(1.25)]),
      R: S([100, 85, 70], 2500, [dmg(P, [100, 225, 350], { bad: 0.5 }), dmg(T, 0, { tcur: 1 }, { cond: true })], { when: 'execute', ready: (ctx) => ctx.tgt.hp / ctx.tgt.maxHp < 0.25 }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: {
      onHit: (ctx) => {
        const out = []
        if (ctx.buff('urgotW')) out.push({ dt: P, raw: 12 + 0.2 * ctx.ad, label: 'Purge' })
        if (ctx.t - (ctx.tgtState().leg ?? -99) >= 2.5) { ctx.tgtState().leg = ctx.t; out.push({ dt: P, raw: byLevel(0.4, 1, lvl(ctx)) * ctx.ad + byLevel(0.02, 0.06, lvl(ctx)) * ctx.tgt.maxHp, label: 'Echoing Flames' }) }
        return out
      },
    },
  },
  Viego: {
    notes: `${SIMPLE} Q passive on-hit % current HP. Possession not simulated.`,
    spells: {
      Q: S([5, 4.5, 4, 3.5, 3], 600, [dmg(P, [25, 40, 55, 70, 85], { ad: 0.7 }, { crit: true, onHit: true })], { cast: 0.35, aoe: true }),
      W: S(8, 900, [dash(300, 'to'), dmg(M, [80, 135, 190, 245, 300], { ap: 1 }), cc(1.25)], { cast: 0.5 }),
      E: S([14, 12, 10, 8, 6], 0, [buff('asPct', [25, 30, 35, 40, 45], 8)], { cast: 0 }),
      R: S([120, 100, 80], 500, [dash(500, 'to'), dmg(P, 0, { ad: 1.2, tmiss: [0.12, 0.16, 0.2] }, { crit: true })], { when: 'execute' }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: { onHit: (ctx) => (ctx.rank.Q ? [{ dt: P, raw: Math.max(atRank([10, 15, 20, 25, 30], ctx.rank.Q), atRank([0.02, 0.03, 0.04, 0.05, 0.06], ctx.rank.Q) * ctx.tgt.hp), label: 'Blade of the Ruined King' }] : []) },
  },
  Volibear: {
    notes: `${SIMPLE} Passive attack speed stacks + chain lightning at 5. W heals on marked target.`,
    spells: {
      Q: S([14, 13, 12, 11, 10], 300, [empower(1, dmg(P, [10, 30, 50, 70, 90], { bad: 1.2 })), cc(1), buff('msPct', 0.2, 4)], { cast: 0 }),
      W: S(5, 325, [dmg(P, [5, 30, 55, 80, 105], { ad: 1, bhp: 0.06 }, { missingMult: 1 }), heal([20, 35, 50, 65, 80], { miss: 0.1 })], { cast: 0.25 }),
      E: S(13, 1200, [dmg(M, [80, 110, 140, 170, 200], { ap: 0.8, thp: [0.11, 0.12, 0.13, 0.14, 0.15] }), shield(0, { hp: 0.15 }, 3)], { cast: 2, aoe: true }),
      R: S([160, 135, 110], 700, [dash(700, 'to'), dmg(P, [300, 500, 700], { bad: 2.5, ap: 1.25 })], { cast: 0.5, aoe: true }),
    },
    combo: ['R', 'Q', 'E', 'W'],
    hooks: {
      asBonus: (u) => Math.min(5, u.attacks || 0) * byLevel(5, 5, u.stats.level),
      onHit: (ctx) => ((ctx.u.attacks || 0) >= 5 ? [{ dt: M, raw: byLevel(11, 60, lvl(ctx)) + 0.4 * ctx.ap, label: 'The Relentless Storm' }] : []),
    },
  },
  Warwick: {
    notes: `${SIMPLE} On-hit magic + heal (more when low). R suppresses.`,
    spells: {
      Q: S([6, 5.5, 5, 4.5, 4], 365, [dash(365, 'to'), dmg(M, 0, { ad: 1.2, ap: 0.9, thp: [0.06, 0.07, 0.08, 0.09, 0.1] }), heal(0, { extra: (ctx) => 0.5 * ctx.ad })], { cast: 0.25 }),
      W: S(80, 0, [buff('asPct', [40, 50, 60, 70, 80], 8)], { cast: 0 }),
      E: S([15, 14, 13, 12, 11], 375, [buff('dmgRed', [0.35, 0.4, 0.45, 0.5, 0.55], 2.5), cc(1)], { cast: 0, aoe: true }),
      R: S([110, 90, 70], 1000, [dash(800, 'to'), dot(M, [175, 350, 525], { bad: 1.67 }, 1.5), heal(0, { extra: (ctx) => atRank([175, 350, 525], ctx.rank.R) })], { cast: 1.5 }),
    },
    combo: ['R', 'Q', 'W', 'E'],
    hooks: { onHit: (ctx) => { const d = byLevel(12, 46, lvl(ctx)) + 0.15 * ctx.bonusAd + 0.1 * ctx.ap; ctx.sim.healUnit(ctx.u, ctx.u.hp / ctx.u.maxHp < 0.5 ? 2.5 * d : d, null); return [{ dt: M, raw: d, label: 'Eternal Hunger' }] } },
  },
  XinZhao: {
    notes: `${SIMPLE} Every 3rd hit: bonus damage + heal. Q 3rd hit knocks up.`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 300, [empower(3, dmg(P, [16, 25, 34, 43, 52], { bad: 0.4 })), cc(0.75), reset()], { cast: 0 }),
      W: S([11, 10.5, 10, 9.5, 9], 1000, [dmg(P, [20, 35, 50, 65, 80], { ad: 0.3 }), dmg(P, [50, 85, 120, 155, 190], { ad: 0.9, ap: 0.65 })], { cast: 0.5, aoe: true }),
      E: S([11, 10.5, 10, 9.5, 9], 650, [dash(650, 'to'), dmg(M, [50, 75, 100, 125, 150], { ap: 0.6 }), buff('asPct', [40, 45, 50, 55, 60], 5)]),
      R: S([120, 110, 100], 450, [dmg(P, [75, 175, 275], { bad: 1, ap: 1.1, tcur: 0.15 }), buff('dmgRed', 0.5, 4)], { cast: 0.35, aoe: true }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: { onHit: nth('det', 3, (ctx) => { ctx.sim.healUnit(ctx.u, byLevel(6, 108, lvl(ctx)) + 0.1 * ctx.ad + 0.55 * ctx.ap, 'Determination'); return [{ dt: P, raw: byLevel(0.15, 0.45, lvl(ctx)) * ctx.ad, label: 'Determination' }] }) },
  },
  Yone: {
    notes: `${SIMPLE} Every 2nd attack: half magic. E soul burst = % of damage during it.`,
    spells: {
      Q: S(4, 450, [dmg(P, [20, 40, 60, 80, 100], { ad: 1.05 }, { crit: true, onHit: true })], { cast: 0.3, aoe: true }),
      W: S([14, 13, 12, 11, 10], 600, [dmg(P, [5, 10, 15, 20, 25], { thp: [0.055, 0.06, 0.065, 0.07, 0.075] }, { hits: 2 }), shield([35, 45, 55, 65, 75], { bad: 0.65 }, 1.5)], { cast: 0.5, aoe: true }),
      E: S([22, 19, 16, 13, 10], 300, [dash(300, 'to')], { cast: 0 }),
      R: S([120, 100, 80], 1000, [dash(1000, 'to'), dmg(P, [200, 400, 600], { ad: 0.8 }), cc(0.75)], { cast: 0.75, aoe: true }),
    },
    combo: ['E', 'R', 'Q', 'W'],
    hooks: {
      init: (u) => { u.stats.crit = Math.min(1, u.stats.crit * 2); u.stats.critDmg -= 0.1 },
      cdMod: (u, key, cd) => (key === 'Q' ? Math.max(1.33, cd / (1 + Math.min(111, u.stats.bonusAsPct) / 100)) : cd),
      attackMult: (ctx) => (ctx.u.attacks % 2 === 1 ? 0.5 : 1),
      onHit: (ctx) => (ctx.u.attacks % 2 === 1 ? [{ dt: M, raw: 0.5 * ctx.ad, label: 'Way of the Hunter' }] : []),
    },
  },
  Yorick: {
    notes: `${SIMPLE} Ghouls + Maiden approximated as bonus on-hit.`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 300, [empower(1, dmg(P, [30, 55, 80, 105, 130], { ad: 0.4 })), heal(0, { miss: 0.12 }), reset()], { cast: 0 }),
      W: S([20, 18, 16, 14, 12], 600, [cc(1)], { cast: 0.25 }),
      E: S([12, 11, 10, 9, 8], 700, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.7, tcur: 0.15 })], { cast: 0.33, aoe: true }),
      R: S([160, 130, 100], 600, [], { cast: 0.5 }),
    },
    combo: ['R', 'E', 'W', 'Q'],
    hooks: { onHit: (ctx) => [{ dt: M, raw: (byLevel(2, 100, lvl(ctx)) * 0.15 + (ctx.rank.R ? 0.15 * ctx.ad : 0)) * 2, label: 'Ghouls & Maiden' }] },
  },
  Shaco: {
    notes: `${SIMPLE} Backstab on Q. Boxes assumed placed (fear).`,
    spells: {
      Q: S([10, 9.5, 9, 8.5, 8], 400, [dash(400, 'to'), empower(1, dmg(P, [25, 35, 45, 55, 65], { bad: 0.5 }, { crit: true }))], { cast: 0 }),
      W: S(16, 425, [cc(1), dot(M, [25, 35, 45, 55, 65], { ap: 0.12 }, 5, { hits: 3 })], { cast: 0.5 }),
      E: S([8, 8, 8, 8, 8], 625, [dmg(M, [70, 95, 120, 145, 170], { bad: 0.75, ap: 0.6 }, { missingMult: 0.5 })]),
      R: S([100, 90, 80], 0, [dmg(M, [150, 225, 300], { ap: 0.7 })], { cast: 0, aoe: true }),
    },
    combo: ['Q', 'W', 'E', 'R'],
    hooks: { onHit: (ctx) => { if (ctx.u.st.backstab) return []; ctx.u.st.backstab = true; return [{ dt: P, raw: byLevel(20, 35, lvl(ctx)) + 0.25 * ctx.bonusAd, label: 'Backstab' }] } },
  },
  Kassadin: {
    notes: `${SIMPLE} Set Riftwalk stacks for bigger R. Passive: 10% magic damage reduction.`,
    spells: {
      Q: S(11, 650, [dmg(M, [65, 95, 125, 155, 185], { ap: 0.7 }), shield([60, 85, 110, 135, 160], { ap: 0.4 }, 1.5)]),
      W: S(7, 300, [empower(1, dmg(M, [50, 75, 100, 125, 150], { ap: 0.8 })), reset()], { cast: 0 }),
      E: S([21, 19, 17, 15, 13], 600, [dmg(M, [80, 105, 130, 155, 180], { ap: 0.8 })], { aoe: true }),
      R: S([5, 3.5, 2], 500, [dash(500, 'to'), dmg(M, [70, 90, 110], { ap: 0.6, mana: 0 }, { extra: (ctx) => 0.02 * ctx.u.stats.mana })], { aoe: true }),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: { init: (u) => { u.stats.mr += 0.1 * u.stats.mr }, onHit: (ctx) => [{ dt: M, raw: atRank([20, 25, 30, 35, 40], ctx.rank.W || 1) + 0.1 * ctx.ap, label: 'Nether Blade' }] },
  },
  Katarina: {
    notes: `${SIMPLE} Daggers picked up (Voracity). R channel assumed full.`,
    spells: {
      Q: S([11, 10, 9, 8, 7], 625, [dmg(M, [80, 110, 140, 170, 200], { ap: 0.35 })]),
      W: S([15, 14, 13, 12, 11], 0, [buff('msPct', 0.5, 1.25)], { cast: 0 }),
      E: S([14, 12.5, 11, 9.5, 8], 725, [dash(725, 'to'), dmg(M, [20, 35, 50, 65, 80], { ad: 0.4, ap: 0.25 }, { onHit: true })], { cast: 0 }),
      R: S([90, 60, 45], 550, [dot(P, [25, 37.5, 50], { bad: 0.18, ap: 0.19 }, 2.5, { hits: 15 })], { cast: 2.5, aoe: true }),
    },
    combo: ['Q', 'E', 'W', 'R'],
    hooks: { onSpell: (ctx, key) => { if (key === 'Q' || key === 'W') ctx.sim.later(1, () => ctx.sim.deal(ctx.u, ctx.tgt, byLevel(68, 240, lvl(ctx)) + 0.6 * ctx.bonusAd + byLevel(0.7, 1, lvl(ctx)) * ctx.ap, M, { label: 'Voracity' })) } },
  },
  Khazix: {
    notes: `${SIMPLE} Isolated target assumed in 1v1 (Q bonus). No evolutions.`,
    spells: {
      Q: S(4, 325, [dmg(P, [70, 95, 120, 145, 170], { bad: 1.15 }, { extra: (ctx) => (ctx.sim.units.filter((x) => x.side === ctx.tgt.side && !x.dead).length <= 1 ? 1.1 * (atRank([70, 95, 120, 145, 170], ctx.rank.Q) + 1.15 * ctx.bonusAd) : 0) })]),
      W: S(9, 1000, [dmg(P, [85, 115, 145, 175, 205], { bad: 1 }), heal([60, 85, 110, 135, 160], { ap: 0.5 })], { aoe: true }),
      E: S([20, 18, 16, 14, 12], 700, [dash(700, 'to'), dmg(P, [65, 100, 135, 170, 205], { bad: 0.2 })], { aoe: true }),
      R: S([100, 85, 70], 0, [buff('msPct', 0.4, 2)], { cast: 0 }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: { onHit: timed('unseen', 10, (ctx) => [{ dt: M, raw: byLevel(14, 150, lvl(ctx)) + 0.4 * ctx.bonusAd, label: 'Unseen Threat' }]) },
  },
  Akali: {
    notes: `${SIMPLE} Shroud (W) assumed. Passive ring empowers attacks after each spell.`,
    spells: {
      Q: S([1.5, 1.5, 1.5, 1.5, 1.5], 500, [dmg(M, [45, 70, 95, 120, 145], { ad: 0.65, ap: 0.6 })], { cast: 0.25, aoe: true }),
      W: S([20, 19, 18, 17, 16], 0, [buff('msPct', 0.3, 2)], { cast: 0, when: 'lowhp' }),
      E: S([16, 14.5, 13, 11.5, 10], 825, [dmg(P, [30, 56, 82, 108, 134], { ad: 0.255, ap: 0.36 }), dash(825, 'to'), dmg(P, [70, 131, 192, 253, 314], { ad: 0.595, ap: 0.84 })]),
      R: S([100, 80, 60], 675, [dash(675, 'to'), dmg(P, [110, 220, 330], { bad: 0.5, ap: 0.3 }), dmg(M, [70, 140, 210], { ap: 0.3 }, { missingMult: 2 })], { cast: 0.25 }),
    },
    combo: ['E', 'Q', 'R', 'W'],
    hooks: { onSpell: (ctx) => { ctx.u.st.ring = true }, onHit: (ctx) => { if (!ctx.u.st.ring) return []; ctx.u.st.ring = false; return [{ dt: M, raw: byLevel(29, 170, lvl(ctx)) + 0.6 * ctx.bonusAd + 0.55 * ctx.ap, label: 'Assassin\'s Mark' }] } },
  },
  Leblanc: {
    notes: `${SIMPLE} Q marks, next spell pops it. R mimics Q.`,
    spells: {
      Q: S([6, 5.75, 5.5, 5.25, 5], 700, [dmg(M, [65, 90, 115, 140, 165], { ap: 0.4 })]),
      W: S([14, 12.75, 11.5, 10.25, 9], 600, [dash(600, 'to'), dmg(M, [75, 115, 155, 195, 235], { ap: 0.65 })], { aoe: true }),
      E: S([14, 13.25, 12.5, 11.75, 11], 865, [dmg(M, [50, 70, 90, 110, 130], { ap: 0.3 }), dmg(M, [80, 120, 160, 200, 240], { ap: 0.7 }), cc(1.5)]),
      R: S([50, 40, 30], 700, [dmg(M, [70, 140, 210], { ap: 0.4 }, { hits: 2 })]),
    },
    combo: ['Q', 'R', 'W', 'E'],
    hooks: { onSpell: (ctx, key) => { if (ctx.mark('sigil')) { ctx.clearMark('sigil'); ctx.sim.deal(ctx.u, ctx.tgt, atRank([65, 90, 115, 140, 165], ctx.rank.Q) + 0.4 * ctx.ap, M, { label: 'Sigil of Malice' }) } if (key === 'Q') ctx.addMark('sigil', 1, 3.5, 1) } },
  },
}
