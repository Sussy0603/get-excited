// ─────────────────────────────────────────────────────────────
// MAGES (mid / bot / support mages) — simplified kits.
// ─────────────────────────────────────────────────────────────
import { P, M, T, S, dmg, dot, buff, shield, heal, cc, dash, empower, reset, invuln, atRank, byLevel } from './_helpers.js'

const lvl = (ctx) => ctx.u.stats.level
const SIMPLE = 'Simplified kit: main damage, CC, shields/heals.'

export const MAGES = {
  Anivia: {
    notes: `${SIMPLE} E deals double on chilled targets (assumed after Q/R).`,
    spells: {
      Q: S([11, 10, 9, 8, 7], 1100, [dmg(M, [50, 70, 90, 110, 130], { ap: 0.25 }), dmg(M, [60, 95, 130, 165, 200], { ap: 0.45 }), cc(1.25)], { cast: 1, aoe: true }),
      W: S(17, 1000, [], { when: 'never' }),
      E: S(4, 650, [dmg(M, [50, 75, 100, 125, 150], { ap: 0.6 }, { hits: 2 })]),
      R: S([4, 3, 2], 750, [dot(M, [30, 45, 60], { ap: 0.125 }, 3, { hits: 6 })], { aoe: true }),
    },
    combo: ['Q', 'R', 'E'],
  },
  Annie: {
    notes: `${SIMPLE} Every 4th spell stuns (Pyromania). Tibbers attacks approximated.`,
    spells: {
      Q: S(4, 625, [dmg(M, [80, 115, 150, 185, 220], { ap: 0.8 })]),
      W: S(8, 600, [dmg(M, [70, 115, 160, 205, 250], { ap: 0.85 })], { aoe: true }),
      E: S(14, 800, [shield([40, 90, 140, 190, 240], { ap: 0.4 }, 3)], { cast: 0 }),
      R: S([120, 100, 80], 600, [dmg(M, [150, 275, 400], { ap: 0.75 }), dot(M, [20, 30, 40], { ap: 0.12 }, 4, { hits: 4 })], { aoe: true }),
    },
    combo: ['R', 'Q', 'W', 'E'],
    hooks: { onSpell: (ctx) => { ctx.u.st.pyro = (ctx.u.st.pyro || 0) + 1; if (ctx.u.st.pyro >= 4) { ctx.u.st.pyro = 0; ctx.stun(ctx.tgt, byLevel(1.25, 1.75, lvl(ctx))) } } },
  },
  AurelionSol: {
    notes: `${SIMPLE} Set Stardust stacks (bigger spells).`,
    stacks: [{ key: 'stardust', label: { en: 'Stardust', fr: 'Poussière d\'étoile' }, max: 500, def: 80 }],
    spells: {
      Q: S(3, 750, [dot(M, [150, 225, 300, 375, 450], { ap: 1.2 }, 2.5, { extra: (ctx) => 0.031 * (ctx.u.stacks.stardust || 0) * 10 })], { cast: 2.5 }),
      W: S([22, 20.5, 19, 17.5, 16], 1500, [dash(1500, 'to')], { cast: 0, when: 'never' }),
      E: S(12, 750, [dot(M, [10, 15, 20, 25, 30], { ap: 0.2 }, 5, { hits: 5, extra: (ctx) => 0.05 * (ctx.u.stacks.stardust || 0) })], { aoe: true }),
      R: S([120, 100, 80], 1250, [dmg(M, [250, 375, 500], { ap: 0.65 }), cc(1)], { aoe: true }),
    },
    combo: ['R', 'E', 'Q'],
  },
  Aurora: {
    notes: `${SIMPLE} Every 3rd hit: % missing HP magic + heal.`,
    spells: {
      Q: S([9, 8.5, 8, 7.5, 7], 900, [dmg(M, [45, 70, 95, 120, 145], { ap: 0.4 }), dmg(M, [45, 70, 95, 120, 145], { ap: 0.4 }, { missingMult: 1 })], { aoe: true }),
      W: S([18, 16.5, 15, 13.5, 12], 450, [dash(450, 'side'), buff('msPct', 0.3, 1.5)], { cast: 0, when: 'lowhp' }),
      E: S([12, 11, 10, 9, 8], 825, [dmg(M, [80, 125, 170, 215, 260], { ap: 0.7 }), dash(300, 'away')], { aoe: true }),
      R: S([110, 90, 70], 700, [dmg(M, [175, 275, 375], { ap: 0.6 }), cc(1)], { cast: 0.5, aoe: true }),
    },
    combo: ['E', 'Q', 'R', 'W'],
    hooks: { onHit: (ctx) => { ctx.addMark('spirit', 1, 4); if (ctx.mark('spirit') < 3) return []; ctx.clearMark('spirit'); const d = (0.03 + (0.02 * ctx.ap) / 100) * (ctx.tgt.maxHp - ctx.tgt.hp); ctx.sim.healUnit(ctx.u, d, 'Spirit Abjuration'); return [{ dt: M, raw: d, label: 'Spirit Abjuration' }] }, onSpell: (ctx) => { ctx.addMark('spirit', 1, 4) } },
  },
  Azir: {
    notes: `${SIMPLE} Soldiers attack for him (W). Range 525 via soldiers.`,
    rangeBonus: 0,
    autoOverride: (ctx) => ({ dt: M, raw: byLevel(50, 170, ctx.u.stats.level) + 0.55 * ctx.ap }),
    spells: {
      Q: S([14, 12, 10, 8, 6], 740, [dmg(M, [70, 90, 110, 130, 150], { ap: 0.3 })], { aoe: true }),
      W: S([1.5, 1.5, 1.5, 1.5, 1.5], 500, [buff('asPct', [20, 30, 40, 50, 60], 5)], { cast: 0 }),
      E: S([19, 18, 17, 16, 15], 1100, [dash(1100, 'to'), shield([70, 110, 150, 190, 230], { ap: 0.7 }, 1.5), dmg(M, [60, 100, 140, 180, 220], { ap: 0.4 }), cc(0.5)]),
      R: S([120, 105, 90], 250, [dmg(M, [200, 400, 600], { ap: 0.75 }), cc(0.5)], { aoe: true }),
    },
    combo: ['W', 'Q', 'E', 'R'],
  },
  Brand: {
    notes: `${SIMPLE} Ablaze burns % max HP; 3 stacks = explosion.`,
    spells: {
      Q: S(8, 1040, [dmg(M, [80, 110, 140, 170, 200], { ap: 0.65 }), cc(1.5)], { ready: (ctx) => ctx.mark('ablaze') > 0 }),
      W: S([10, 9.5, 9, 8.5, 8], 900, [dmg(M, [75, 120, 165, 210, 255], { ap: 0.6 }, { hits: 1.25 })], { cast: 0.75, aoe: true }),
      E: S([10, 9.5, 9, 8.5, 8], 675, [dmg(M, [70, 95, 120, 145, 170], { ap: 0.45 })], { aoe: true }),
      R: S([105, 90, 75], 750, [dmg(M, [100, 200, 300], { ap: 0.25 }, { hits: 3 })], { aoe: true }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: {
      afterSpellHit: (ctx) => {
        ctx.addMark('ablaze', 1, 4, 3)
        ctx.sim.addDot(ctx.u, ctx.tgt, M, 0.03 * ctx.tgt.maxHp, 4, 'Ablaze', 'ablaze')
        if (ctx.mark('ablaze') >= 3) { ctx.clearMark('ablaze'); return [{ dt: M, raw: (byLevel(0.1, 0.14, lvl(ctx)) + (0.02 * ctx.ap) / 100) * ctx.tgt.maxHp, label: 'Ablaze explosion' }] }
        return []
      },
    },
  },
  Cassiopeia: {
    notes: `${SIMPLE} E spam on poisoned targets. Can't buy boots (ignored).`,
    spells: {
      Q: S([3.5, 3.5, 3.5, 3.5, 3.5], 850, [dot(M, [75, 110, 145, 180, 215], { ap: 0.9 }, 3), buff('cassPoison', 1, 3)], { cast: 0.4, aoe: true }),
      W: S([24, 22, 20, 18, 16], 700, [dot(M, [20, 25, 30, 35, 40], { ap: 0.15 }, 5, { hits: 5 })], { aoe: true }),
      E: S(0.75, 700, [dmg(M, 0, { ap: 0.1 }, { extra: (ctx) => byLevel(48, 130, lvl(ctx)) + (ctx.u.st.poisonUntil > ctx.t ? atRank([20, 40, 60, 80, 100], ctx.rank.E) + 0.6 * ctx.ap : 0) })], { cast: 0.125 }),
      R: S([120, 100, 80], 825, [dmg(M, [150, 250, 350], { ap: 0.5 }), cc(2)], { cast: 0.5, aoe: true }),
    },
    combo: ['R', 'Q', 'W', 'E'],
    hooks: { onSpell: (ctx, key) => { if (key === 'Q' || key === 'W') ctx.u.st.poisonUntil = ctx.t + 3 } },
  },
  Fiddlesticks: {
    notes: `${SIMPLE} R from fog assumed. W drains (heals).`,
    spells: {
      Q: S([15, 14.5, 14, 13.5, 13], 575, [dmg(M, 0, { tcur: [0.06, 0.07, 0.08, 0.09, 0.1] }, { extra: (ctx) => (0.02 * ctx.ap) / 100 * ctx.tgt.hp }), cc([1.25, 1.25, 1.25, 1.25, 1.25])]),
      W: S([10, 9.5, 9, 8.5, 8], 650, [dot(M, [120, 180, 240, 300, 360], { ap: 0.7 }, 2), heal(0, { extra: (ctx) => 0.25 * (atRank([120, 180, 240, 300, 360], ctx.rank.W) + 0.7 * ctx.ap) })], { cast: 2, aoe: true }),
      E: S([10, 9, 8, 7, 6], 850, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.5 })], { aoe: true }),
      R: S([140, 110, 80], 800, [dash(800, 'to'), dot(M, [37.5, 62.5, 87.5], { ap: 0.125 }, 5, { hits: 20 })], { cast: 1.5, aoe: true }),
    },
    combo: ['R', 'Q', 'E', 'W'],
  },
  Galio: {
    notes: `${SIMPLE} Passive bonus magic attack every 5s. W taunts.`,
    spells: {
      Q: S([12, 11.5, 11, 10.5, 10], 825, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.75 }), dot(M, 0, { thp: 0.08 }, 1.5)], { aoe: true }),
      W: S([18, 16.5, 15, 13.5, 12], 175, [buff('dmgRed', 0.3, 2), dmg(M, [20, 35, 50, 65, 80], { ap: 0.3 }), cc(1)], { cast: 1, aoe: true }),
      E: S([12, 11, 10, 9, 8], 650, [dash(650, 'to'), dmg(M, [90, 130, 170, 210, 250], { ap: 0.9 }), cc(0.75)]),
      R: S([200, 180, 160], 5500, [], { when: 'never' }),
    },
    combo: ['E', 'Q', 'W'],
    hooks: { onHit: (ctx) => { if (ctx.t - (ctx.u.st.colossal ?? -99) < 5) return []; ctx.u.st.colossal = ctx.t; return [{ dt: M, raw: byLevel(15, 200, lvl(ctx)) + ctx.ad + 0.5 * ctx.ap + 0.6 * ctx.u.stats.bonusMr, label: 'Colossal Smash' }] } },
  },
  Heimerdinger: {
    notes: `${SIMPLE} 3 turrets approximated as bonus damage over time.`,
    spells: {
      Q: S(1, 450, [dot(M, [9, 14, 19, 24, 29], { ap: 0.3 }, 8, { hits: 6 })], { cast: 0, ready: (ctx) => !(ctx.u.st.turretsUp) }),
      W: S([11, 10, 9, 8, 7], 1325, [dmg(M, [50, 75, 100, 125, 150], { ap: 0.45 }, { hits: 2.5 })]),
      E: S(12, 970, [dmg(M, [60, 100, 140, 180, 220], { ap: 0.6 }), cc(1)], { aoe: true }),
      R: S([100, 85, 70], 0, [], { when: 'never' }),
    },
    combo: ['Q', 'E', 'W'],
    hooks: { onSpell: (ctx, key) => { if (key === 'Q') ctx.u.st.turretsUp = true } },
  },
  Hwei: {
    notes: `${SIMPLE} Uses QQ (Devastating Fire), EQ (fear), and R.`,
    spells: {
      Q: S([10, 9.5, 9, 8.5, 8], 800, [dmg(M, [60, 90, 120, 150, 180], { ap: 0.75, thp: 0.035 })], { aoe: true }),
      W: S(16, 0, [shield([90, 125, 160, 195, 230], { ap: 0.6 }, 2.5)], { cast: 0, when: 'lowhp' }),
      E: S([13, 12, 11, 10, 9], 1100, [dmg(M, [60, 90, 120, 150, 180], { ap: 0.6 }), cc([1, 1.15, 1.3, 1.45, 1.6])]),
      R: S([140, 115, 90], 1300, [dot(M, [230, 370, 510], { ap: 1.15 }, 3)], { aoe: true }),
    },
    combo: ['E', 'Q', 'R', 'W'],
  },
  Karma: {
    notes: `${SIMPLE} Mantra Q (R-empowered) used when available.`,
    spells: {
      Q: S([9, 8, 7, 6, 5], 950, [dmg(M, [70, 120, 170, 220, 270], { ap: 0.7 })], { aoe: true }),
      W: S([12, 12, 12, 12, 12], 675, [dmg(M, [40, 65, 90, 115, 140], { ap: 0.45 }, { hits: 2 }), cc([1.75, 2, 2.25, 2.5, 2.75])], { cast: 2 }),
      E: S([10, 9.5, 9, 8.5, 8], 800, [shield([80, 120, 160, 200, 240], { ap: 0.5 }, 2.5)], { cast: 0, when: 'lowhp' }),
      R: S([40, 37, 34, 31], 0, [], { cast: 0 }),
    },
    combo: ['R', 'Q', 'W', 'E'],
    hooks: { onSpell: (ctx, key) => { if (key === 'R') ctx.u.cds.Q = ctx.t; if (key === 'Q' && ctx.u.used.R && ctx.t - (ctx.u.st.mantraT ?? -99) > 2) { ctx.u.st.mantraT = ctx.t; ctx.sim.deal(ctx.u, ctx.tgt, atRank([40, 100, 160, 220], ctx.rank.R) + 0.3 * ctx.ap, M, { label: 'Soulflare' }) } } },
  },
  Karthus: {
    notes: `${SIMPLE} Q spam (double damage single target). R global.`,
    spells: {
      Q: S(1, 875, [dmg(M, [45, 65, 85, 105, 125], { ap: 0.35 }, { hits: 2 })], { cast: 0.25 }),
      W: S(15, 1000, [buff('enemyMrDown', 0.25, 5)], { cast: 0.25 }),
      E: S(0.5, 550, [dot(M, [30, 50, 70, 90, 110], { ap: 0.2 }, 2)], { cast: 0, aoe: true }),
      R: S([200, 180, 160], 25000, [dmg(M, [200, 350, 500], { ap: 0.75 })], { cast: 3, when: 'execute', aoe: true }),
    },
    combo: ['W', 'Q', 'E', 'R'],
  },
  Lillia: {
    notes: `${SIMPLE} Passive dream dust burns % max HP. Q outer edge = true damage.`,
    spells: {
      Q: S([6, 5.5, 5, 4.5, 4], 485, [dmg(M, [35, 50, 65, 80, 95], { ap: 0.4 }), dmg(T, [35, 50, 65, 80, 95], { ap: 0.4 })], { cast: 0, aoe: true }),
      W: S([14, 13, 12, 11, 10], 500, [dmg(M, [240, 300, 360, 420, 480], { ap: 1.05 })], { cast: 0.75 }),
      E: S([18, 18, 18, 18, 18], 750, [dmg(M, [70, 95, 120, 145, 170], { ap: 0.4 })], { aoe: true }),
      R: S([120, 105, 90], 25000, [dmg(M, [100, 150, 200], { ap: 0.3 }), cc(2)], { aoe: true }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: { afterSpellHit: (ctx) => { ctx.sim.addDot(ctx.u, ctx.tgt, M, (0.05 + (0.012 * ctx.ap) / 100) * ctx.tgt.maxHp, 3, 'Dream-Laden Bough', 'dream'); return [] } },
  },
  Lissandra: {
    notes: `${SIMPLE} R self-cast when low (stasis + heal), else on target.`,
    spells: {
      Q: S([8, 7, 6, 5, 4], 725, [dmg(M, [80, 110, 140, 170, 200], { ap: 0.85 })], { aoe: true }),
      W: S([13, 12, 11, 10, 9], 450, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.7 }), cc([1.1, 1.2, 1.3, 1.4, 1.5])], { cast: 0, aoe: true }),
      E: S([24, 21, 18, 15, 12], 1050, [dash(1050, 'to'), dmg(M, [70, 105, 140, 175, 210], { ap: 0.6 })], { aoe: true }),
      R: S([120, 100, 80], 550, [dmg(M, [150, 250, 350], { ap: 0.75 }), cc(1.5)], { aoe: true }),
    },
    combo: ['E', 'W', 'R', 'Q'],
  },
  Malzahar: {
    notes: `${SIMPLE} Voidlings approximated. R suppresses.`,
    spells: {
      Q: S(6, 900, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.55 })], { aoe: true }),
      W: S([10, 9, 8, 7, 6], 150, [dot(M, [12, 14, 16, 18, 20], { ap: 0.4 }, 8, { hits: 6 })], { cast: 0 }),
      E: S(15, 650, [dot(M, [80, 115, 150, 185, 220], { ap: 0.8 }, 4)]),
      R: S([140, 110, 80], 700, [dot(M, [125, 200, 275], { ap: 0.8 }, 2.5), dot(M, 0, { thp: [0.1, 0.15, 0.2] }, 5), cc(2.5)], { cast: 2.5 }),
    },
    combo: ['E', 'W', 'R', 'Q'],
    hooks: { init: (u, sim) => sim.addShield(u, 0.9 * u.maxHp * 0.15, 999, 'Void Shift') },
  },
  Mel: {
    notes: `${SIMPLE} Overwhelm stacks from her hits; R executes when stacks exceed HP. W reflect not simulated.`,
    spells: {
      Q: S([10, 9.5, 9, 8.5, 8], 950, [dmg(M, [13, 15.5, 18, 20.5, 23], { ap: 0.085 }, { hits: [6, 7, 8, 9, 10] })], { aoe: true }),
      W: S([35, 32, 29, 26, 23], 0, [buff('dmgRed', 0.5, 1)], { cast: 0, when: 'lowhp' }),
      E: S([12, 11.5, 11, 10.5, 10], 1050, [dmg(M, [60, 105, 150, 195, 240], { ap: 0.6 }), cc(1)], { aoe: true }),
      R: S([120, 100, 80], 25000, [dmg(M, [100, 150, 200], { ap: 0.3 }, { extra: (ctx) => ctx.mark('overwhelm') * (atRank([4, 7, 10], ctx.rank.R) + 0.035 * ctx.ap) })], { when: 'execute' }),
    },
    combo: ['E', 'Q', 'R', 'W'],
    hooks: {
      afterSpellHit: (ctx) => { ctx.addMark('overwhelm', 3, 4); return [] },
      onHit: (ctx) => { ctx.addMark('overwhelm', 1, 4); return [{ dt: M, raw: 3 * (byLevel(3, 9, lvl(ctx)) + 0.025 * ctx.ap), label: 'Rebel\'s Repartee' }] },
    },
  },
  Morgana: {
    notes: `${SIMPLE} Q long root. E spell shield not simulated.`,
    spells: {
      Q: S([10, 10, 10, 10, 10], 1300, [dmg(M, [80, 135, 190, 245, 300], { ap: 0.9 }), cc([2, 2.25, 2.5, 2.75, 3])], { cast: 0.25 }),
      W: S([12, 11, 10, 9, 8], 900, [dot(M, [60, 110, 160, 210, 260], { ap: 0.7 }, 5, { missingMult: 1.7 })], { aoe: true }),
      E: S([26, 24, 22, 20, 18], 800, [shield([80, 135, 190, 245, 300], { ap: 0.7 }, 5)], { cast: 0, when: 'lowhp' }),
      R: S([120, 110, 100], 625, [dmg(M, [150, 225, 300], { ap: 0.7 }, { hits: 2 }), cc(1.5)], { cast: 3, aoe: true }),
    },
    combo: ['Q', 'W', 'R', 'E'],
  },
  Neeko: {
    notes: `${SIMPLE} Every 3rd attack (W passive) bonus magic.`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 800, [dmg(M, [80, 125, 170, 215, 260], { ap: 0.6 }, { hits: 1.6 })], { aoe: true }),
      W: S([20, 18, 16, 14, 12], 0, [buff('msPct', 0.3, 2)], { cast: 0, when: 'never' }),
      E: S([12, 11, 10, 9, 8], 1000, [dmg(M, [80, 115, 150, 185, 220], { ap: 0.6 }), cc([0.7, 0.9, 1.1, 1.3, 1.5])]),
      R: S([90, 75, 60], 600, [shield([100, 150, 200], { ap: 0.95 }, 2), dmg(M, [200, 425, 650], { ap: 1.3 }), cc(1.25)], { cast: 1.25, aoe: true }),
    },
    combo: ['E', 'R', 'Q'],
    hooks: { onHit: (ctx) => { if (!ctx.rank.W) return []; ctx.addMark('neekoW', 1, 4); if (ctx.mark('neekoW') < 3) return []; ctx.clearMark('neekoW'); return [{ dt: M, raw: atRank([50, 80, 110, 140, 170], ctx.rank.W) + 0.6 * ctx.ap, label: 'Shapesplitter' }] } },
  },
  Orianna: {
    notes: `${SIMPLE} Ball assumed near the target. Passive bonus magic on attacks.`,
    spells: {
      Q: S([6, 5.25, 4.5, 3.75, 3], 825, [dmg(M, [60, 90, 120, 150, 180], { ap: 0.55 })], { aoe: true }),
      W: S([7, 6.5, 6, 5.5, 5], 225, [dmg(M, [60, 105, 150, 195, 240], { ap: 0.7 })], { cast: 0, aoe: true }),
      E: S(9, 1120, [shield([60, 100, 140, 180, 220], { ap: 0.5 }, 2.5)], { cast: 0, when: 'lowhp' }),
      R: S([110, 95, 80], 415, [dmg(M, [250, 400, 550], { ap: 0.95 }), cc(0.75)], { cast: 0.5, aoe: true }),
    },
    combo: ['Q', 'W', 'R', 'E'],
    hooks: { onHit: (ctx) => { ctx.addMark('clockwork', 1, 4, 2); return [{ dt: M, raw: (byLevel(10, 58, lvl(ctx)) + 0.15 * ctx.ap) * (1 + 0.2 * ctx.mark('clockwork')), label: 'Clockwork Windup' }] } },
  },
  Ryze: {
    notes: `${SIMPLE} Q spam with cooldown resets from W/E.`,
    spells: {
      Q: S(5, 1000, [dmg(M, [70, 90, 110, 130, 150], { ap: 0.55 }, { extra: (ctx) => 0.02 * ctx.u.stats.mana, missingMult: 0 })], { cast: 0.25 }),
      W: S([13, 12, 11, 10, 9], 615, [dmg(M, [80, 110, 140, 170, 200], { ap: 0.7 }, { extra: (ctx) => 0.04 * ctx.u.stats.mana }), cc(1)], { cast: 0.25 }),
      E: S([3.5, 3.25, 3, 2.75, 2.5], 615, [dmg(M, [60, 80, 100, 120, 140], { ap: 0.45 }, { extra: (ctx) => 0.02 * ctx.u.stats.mana })], { cast: 0.25, aoe: true }),
      R: S([180, 160, 140], 0, [], { when: 'never' }),
    },
    combo: ['E', 'Q', 'W'],
    hooks: { onSpell: (ctx, key) => { if (key !== 'Q') ctx.u.cds.Q = ctx.t } },
  },
  Seraphine: {
    notes: `${SIMPLE} Every 3rd spell echoes (casts twice). Note bonus damage on attacks.`,
    spells: {
      Q: S([10, 8.75, 7.5, 6.25, 5], 900, [dmg(M, [55, 70, 85, 100, 115], { ap: 0.5 }, { missingMult: 0.6 })], { aoe: true }),
      W: S([22, 21, 20, 19, 18], 800, [shield([50, 70, 90, 110, 130], { ap: 0.2 }, 2.5)], { cast: 0, when: 'lowhp' }),
      E: S([11, 10.5, 10, 9.5, 9], 1300, [dmg(M, [70, 95, 120, 145, 170], { ap: 0.35 }), cc(1)], { aoe: true }),
      R: S([160, 140, 120], 1200, [dmg(M, [150, 200, 250], { ap: 0.6 }), cc([1.25, 1.5, 1.75])], { aoe: true }),
    },
    combo: ['E', 'Q', 'R', 'W'],
    hooks: { onSpell: (ctx) => { ctx.u.st.echo = (ctx.u.st.echo || 0) + 1 }, onHit: (ctx) => [{ dt: M, raw: byLevel(4, 22, lvl(ctx)) + 0.07 * ctx.ap, label: 'Stage Presence' }] },
  },
  Swain: {
    notes: `${SIMPLE} R drains nearby enemies (heals). E roots.`,
    spells: {
      Q: S([7.5, 6.5, 5.5, 4.5, 3.5], 725, [dmg(M, [60, 80, 100, 120, 140], { ap: 0.38 }, { hits: 2 })], { cast: 0.25, aoe: true }),
      W: S([16, 15, 14, 13, 12], 5500, [dmg(M, [80, 115, 150, 185, 220], { ap: 0.55 })], { cast: 1.5 }),
      E: S([10, 9.5, 9, 8.5, 8], 850, [dmg(M, [35, 70, 105, 140, 175], { ap: 0.25 }), dmg(M, [35, 45, 55, 65, 75], { ap: 0.25 }), cc(1.5)], { aoe: true }),
      R: S(120, 650, [dot(M, [20, 40, 60], { ap: 0.1 }, 8, { hits: 8 }), heal([15, 40, 65], { ap: 0.25 }), dmg(M, [150, 225, 300], { ap: 0.6 })], { cast: 0, aoe: true }),
    },
    combo: ['E', 'R', 'Q', 'W'],
  },
  Sylas: {
    notes: `${SIMPLE} Petricite Burst after each spell. W heals more when low. Stolen ults not simulated.`,
    spells: {
      Q: S([10, 9, 8, 7, 6], 775, [dmg(M, [40, 60, 80, 100, 120], { ap: 0.4 }), dmg(M, [60, 115, 170, 225, 280], { ap: 0.9 })], { aoe: true }),
      W: S([13, 11.5, 10, 8.5, 7], 400, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.85 }), heal([25, 50, 75, 100, 125], { ap: 0.4, miss: 0.1 })], { cast: 0 }),
      E: S([13, 12, 11, 10, 9], 800, [dash(400, 'to'), dmg(M, [80, 130, 180, 230, 280], { ap: 1 }), cc(0.5)]),
      R: S([80, 65, 50], 950, [], { when: 'never' }),
    },
    combo: ['E', 'Q', 'W'],
    hooks: { onSpell: (ctx) => { ctx.u.st.petri = Math.min(3, (ctx.u.st.petri || 0) + 1) }, onHit: (ctx) => { if (!ctx.u.st.petri) return []; ctx.u.st.petri--; return [{ dt: M, raw: 1.3 * ctx.ad + 0.25 * ctx.ap, label: 'Petricite Burst' }] } },
  },
  Taliyah: {
    notes: `${SIMPLE} Q on fresh ground (5 rocks).`,
    spells: {
      Q: S([7, 6, 5, 4, 3], 1000, [dmg(M, [45, 65, 85, 105, 125], { ap: 0.5 }, { hits: 2.6 })], { cast: 1, aoe: true }),
      W: S([16, 15, 14, 13, 12], 900, [dmg(M, [60, 80, 100, 120, 140], { ap: 0.4 }), cc(0.75)], { cast: 0.75, aoe: true }),
      E: S([16, 15, 14, 13, 12], 800, [dmg(M, [50, 75, 100, 125, 150], { ap: 0.3 }), dmg(M, [60, 105, 150, 195, 240], { ap: 0.4 })], { aoe: true }),
      R: S([180, 150, 120], 3000, [], { when: 'never' }),
    },
    combo: ['W', 'E', 'Q'],
  },
  TwistedFate: {
    notes: `${SIMPLE} Gold card stun from W. Every 4th attack bonus (E).`,
    spells: {
      Q: S([6, 5.75, 5.5, 5.25, 5], 1450, [dmg(M, [60, 100, 140, 180, 220], { ap: 0.9 })], { aoe: true }),
      W: S([8, 7.5, 7, 6.5, 6], 600, [dmg(M, [15, 22.5, 30, 37.5, 45], { ad: 1, ap: 0.5 }), cc([1, 1.25, 1.5, 1.75, 2])], { cast: 1.5 }),
      R: S([180, 150, 120], 5500, [], { when: 'never' }),
    },
    combo: ['W', 'Q'],
    hooks: { onHit: (ctx) => { if (!ctx.rank.E) return []; ctx.u.st.stack = (ctx.u.st.stack || 0) + 1; if (ctx.u.st.stack < 4) return []; ctx.u.st.stack = 0; return [{ dt: M, raw: atRank([65, 90, 115, 140, 165], ctx.rank.E) + 0.5 * ctx.ap, label: 'Stacked Deck' }] } },
  },
  Veigar: {
    notes: `${SIMPLE} Set bonus AP stacks from Phenomenal Evil. R scales with missing HP.`,
    stacks: [{ key: 'evil', label: { en: 'Evil stacks (AP)', fr: 'Cumuls Maléfice (PA)' }, max: 1000, def: 150 }],
    spells: {
      Q: S([6, 5.5, 5, 4.5, 4], 950, [dmg(M, [80, 120, 160, 200, 240], { ap: [0.45, 0.5, 0.55, 0.6, 0.65] })], { aoe: true }),
      W: S([8, 7.5, 7, 6.5, 6], 900, [dmg(M, [85, 140, 195, 250, 305], { ap: [0.7, 0.8, 0.9, 1, 1.1] })], { cast: 1.2, aoe: true }),
      E: S([20, 18.5, 17, 15.5, 14], 725, [cc([1.5, 1.75, 2, 2.25, 2.5])], { cast: 0.75 }),
      R: S([100, 80, 60], 650, [dmg(M, [175, 250, 325], { ap: 0.65 }, { missingMult: 1.5 })], { when: 'execute' }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: { init: (u) => { u.stats.ap += u.stacks.evil || 0 } },
  },
  Velkoz: {
    notes: `${SIMPLE} 3 hits = Organic Deconstruction (true damage).`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 1100, [dmg(M, [80, 120, 160, 200, 240], { ap: 0.9 })]),
      W: S(1.5, 1050, [dmg(M, [30, 50, 70, 90, 110], { ap: 0.15 }), dmg(M, [45, 75, 105, 135, 165], { ap: 0.25 })], { aoe: true }),
      E: S([16, 15, 14, 13, 12], 810, [dmg(M, [70, 100, 130, 160, 190], { ap: 0.3 }), cc(0.75)], { aoe: true }),
      R: S([120, 100, 80], 1550, [dot(T, [450, 625, 800], { ap: 1.25 }, 2.5)], { cast: 2.5 }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: { afterSpellHit: (ctx) => { ctx.addMark('deconstruct', 1, 7); if (ctx.mark('deconstruct') < 3) return []; ctx.clearMark('deconstruct'); return [{ dt: T, raw: byLevel(33, 170, lvl(ctx)) + 0.5 * ctx.ap, label: 'Organic Deconstruction' }] } },
  },
  Vex: {
    notes: `${SIMPLE} Doom fears dashers; Gloom marks pop on spells.`,
    spells: {
      Q: S([9, 8, 7, 6, 5], 1200, [dmg(M, [60, 105, 150, 195, 240], { ap: 0.7 })], { aoe: true }),
      W: S([20, 18, 16, 14, 12], 475, [shield([50, 80, 110, 140, 170], { ap: 0.75 }, 2.5), dmg(M, [80, 120, 160, 200, 240], { ap: 0.3 }), cc(0.75)], { cast: 0, aoe: true }),
      E: S([13, 13, 13, 13, 13], 800, [dmg(M, [50, 70, 90, 110, 130], { ap: 0.4 })], { aoe: true }),
      R: S([140, 120, 100], 2000, [dash(1000, 'to'), dmg(M, [75, 125, 175], { ap: 0.2 }), dmg(M, [150, 250, 350], { ap: 0.5 })], { cast: 0 }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: { afterSpellHit: (ctx, key) => { if (key === 'E') { ctx.addMark('gloom', 1, 6, 1); return [] } if (!ctx.mark('gloom')) return []; ctx.clearMark('gloom'); return [{ dt: M, raw: byLevel(30, 140, lvl(ctx)) + 0.2 * ctx.ap, label: 'Gloom' }] } },
  },
  Viktor: {
    notes: `${SIMPLE} Augments ignored. Q empowers next attack.`,
    spells: {
      Q: S([9, 8, 7, 6, 5], 600, [dmg(M, [60, 75, 90, 105, 120], { ap: 0.6 }), shield([30, 50, 70, 90, 110], { ap: 0.2 }, 2.5), empower(1, dmg(M, [20, 45, 70, 95, 120], { ad: 1, ap: 0.6 }))]),
      W: S([16, 15, 14, 13, 12], 800, [cc(1.5)], { cast: 1.75 }),
      E: S([12, 11, 10, 9, 8], 1025, [dmg(M, [70, 110, 150, 190, 230], { ap: 0.5 }), dmg(M, [20, 50, 80, 110, 140], { ap: 0.8 })], { aoe: true }),
      R: S([120, 100, 80], 700, [dmg(M, [100, 175, 250], { ap: 0.5 }), dot(M, [65, 105, 145], { ap: 0.45 }, 6.5, { hits: 6.5 })], { aoe: true }),
    },
    combo: ['E', 'Q', 'W', 'R'],
  },
  Vladimir: {
    notes: `${SIMPLE} Q heals (empowered every 3rd). W pool untargetable. Health costs ignored.`,
    spells: {
      Q: S([9, 7.9, 6.8, 5.7, 4.6], 600, [dmg(M, [80, 100, 120, 140, 160], { ap: 0.6 }), heal([20, 25, 30, 35, 40], { ap: 0.35 })]),
      W: S([28, 25, 22, 19, 16], 350, [invuln(2), dot(M, [80, 135, 190, 245, 300], { bhp: 0.1 }, 2), heal(0, { extra: (ctx) => 0.15 * (atRank([80, 135, 190, 245, 300], ctx.rank.W) + 0.1 * ctx.u.stats.bonusHp) })], { cast: 2, aoe: true, when: 'lowhp' }),
      E: S([13, 11, 9, 7, 5], 600, [dmg(M, [60, 90, 120, 150, 180], { ap: 0.8, hp: 0.06 })], { cast: 1, aoe: true }),
      R: S([120, 100, 80], 700, [dmg(M, [150, 250, 350], { ap: 0.7 }), heal(0, { extra: (ctx) => 0.5 * (atRank([150, 250, 350], ctx.rank.R) + 0.7 * ctx.ap) })], { cast: 4, aoe: true }),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: { init: (u) => { u.stats.ap += 0.033 * u.stats.bonusHp; u.stats.hp += 1.6 * u.stats.ap * 0; } },
  },
  Xerath: {
    notes: `${SIMPLE} R: 3-5 shots assumed hitting.`,
    spells: {
      Q: S([9, 8, 7, 6, 5], 1450, [dmg(M, [70, 110, 150, 190, 230], { ap: 0.85 })], { cast: 1, aoe: true }),
      W: S([14, 13, 12, 11, 10], 1000, [dmg(M, [100, 158, 217, 275, 333], { ap: 1.02 })], { cast: 0.5, aoe: true }),
      E: S([13, 12.5, 12, 11.5, 11], 1125, [dmg(M, [80, 110, 140, 170, 200], { ap: 0.45 }), cc([0.5, 0.75, 1, 1.25, 1.5])]),
      R: S([130, 115, 100], 5000, [dmg(M, [180, 230, 280], { ap: 0.45 }, { hits: [4, 5, 6] })], { cast: 3, aoe: true }),
    },
    combo: ['E', 'W', 'Q', 'R'],
  },
  Ziggs: {
    notes: `${SIMPLE} Passive bonus attack every ~6s.`,
    spells: {
      Q: S([6, 5.5, 5, 4.5, 4], 850, [dmg(M, [85, 135, 185, 235, 285], { ap: 0.65 })], { aoe: true }),
      W: S([20, 18, 16, 14, 12], 1000, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.5 })], { aoe: true }),
      E: S([16, 15, 14, 13, 12], 900, [dmg(M, [40, 75, 110, 145, 180], { ap: 0.3 }, { hits: 2 })], { aoe: true }),
      R: S([120, 95, 70], 5000, [dmg(M, [300, 450, 600], { ap: 1.1 })], { cast: 1, aoe: true }),
    },
    combo: ['Q', 'E', 'W', 'R'],
    hooks: { onHit: (ctx) => { if (ctx.t - (ctx.u.st.fuse ?? -99) < 6) return []; ctx.u.st.fuse = ctx.t; return [{ dt: M, raw: byLevel(20, 166, lvl(ctx)) + 0.5 * ctx.ap, label: 'Short Fuse' }] } },
  },
  Zilean: {
    notes: `${SIMPLE} Double bomb (Q-W-Q) stuns. R revives (not simulated).`,
    spells: {
      Q: S([10, 9.5, 9, 8.5, 8], 900, [dmg(M, [75, 115, 165, 230, 300], { ap: 0.9 })], { cast: 0.25, aoe: true }),
      W: S([14, 12, 10, 8, 6], 0, [], { cast: 0 }),
      E: S(15, 550, [cc(1.5)], { cast: 0 }),
      R: S([120, 90, 60], 900, [], { when: 'never' }),
    },
    combo: ['Q', 'W', 'E'],
    hooks: { onSpell: (ctx, key) => { if (key === 'W') ctx.u.cds.Q = ctx.t; if (key === 'Q') { ctx.addMark('bomb', 1, 3); if (ctx.mark('bomb') >= 2) { ctx.clearMark('bomb'); ctx.stun(ctx.tgt, [1.1, 1.2, 1.3, 1.4, 1.5][(ctx.rank.Q || 1) - 1]) } } } },
  },
  Zoe: {
    notes: `${SIMPLE} Q from max range (portal). E sleep doubles the next hit.`,
    spells: {
      Q: S([8.5, 8, 7.5, 7, 6.5], 800, [dmg(M, [50, 80, 110, 140, 170], { ap: 0.6 }, { extra: (ctx) => byLevel(7, 46, lvl(ctx)), hits: 2.5 })], { cast: 0.75, aoe: true }),
      W: S([1, 1, 1, 1, 1], 0, [], { when: 'never' }),
      E: S([16, 15, 14, 13, 12], 800, [cc(1.5), dmg(T, [70, 110, 150, 190, 230], { ap: 0.45 })], { cast: 1.4 }),
      R: S([11, 8, 5], 575, [dash(575, 'to')], { cast: 0, when: 'never' }),
    },
    combo: ['E', 'Q'],
    hooks: { onSpell: (ctx) => { ctx.u.st.sparkles = true }, onHit: (ctx) => { if (!ctx.u.st.sparkles) return []; ctx.u.st.sparkles = false; return [{ dt: M, raw: byLevel(16, 130, lvl(ctx)) + 0.2 * ctx.ap, label: 'More Sparkles!' }] } },
  },
  Zyra: {
    notes: `${SIMPLE} Plants approximated as bonus damage over time.`,
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 800, [dmg(M, [60, 95, 130, 165, 200], { ap: 0.6 }), dot(M, [30, 50, 70, 90, 110], { ap: 0.3 }, 4)], { aoe: true }),
      W: S(18, 850, [], { when: 'never' }),
      E: S([12, 11, 10, 9, 8], 1100, [dmg(M, [60, 95, 130, 165, 200], { ap: 0.5 }), cc([1, 1.25, 1.5, 1.75, 2]), dot(M, [30, 50, 70, 90, 110], { ap: 0.3 }, 4)], { aoe: true }),
      R: S([110, 100, 90], 700, [dmg(M, [180, 265, 350], { ap: 0.7 }), cc(1)], { cast: 2, aoe: true }),
    },
    combo: ['E', 'Q', 'R'],
  },
}
