// ─────────────────────────────────────────────────────────────
// META CHAMPS (other roles) — so enemy teams hit back properly.
// ─────────────────────────────────────────────────────────────
import { P, M, T, S, dmg, dot, buff, shield, heal, cc, dash, empower, reset, invuln, atRank, byLevel } from './_helpers.js'

const lvl = (ctx) => ctx.u.stats.level

export const META = {
  // ── GAREN (top) ─────────────────────────────────────────
  Garen: {
    notes: 'E spin can\'t attack while spinning. R is true damage execute.',
    spells: {
      Q: S(8, 300, [empower(1, dmg(P, [30, 60, 90, 120, 150], { ad: 0.5 })), reset(), buff('msPct', 0.35, 2)], { cast: 0 }),
      W: S([23, 21, 19, 17, 15], 0, [shield([80, 125, 170, 215, 260], { bhp: 0.18 }, 0.75), buff('dmgRed', 0.3, [2, 2.5, 3, 3.5, 4])], { cast: 0 }),
      E: S([13, 12, 11, 10, 9], 325, [dot(P, [28, 56, 84, 112, 140], { ad: 2.6 }, 3)], { cast: 3, aoe: true }),
      R: S([120, 100, 80], 400, [dmg(T, [150, 300, 450], { tmiss: [0.25, 0.3, 0.35] })], { when: 'execute' }),
    },
    combo: ['Q', 'W', 'E', 'R'],
  },

  // ── DARIUS (top) ────────────────────────────────────────
  Darius: {
    notes: 'Bleed stacks to 5 → Noxian Might (bonus AD). R +20% per stack.',
    spells: {
      Q: S([9, 8, 7, 6, 5], 460, [dmg(P, [50, 80, 110, 140, 170], { ad: [1, 1.1, 1.2, 1.3, 1.4] }), heal(0, { miss: 0.15 })], { cast: 0.75, aoe: true }),
      W: S([7, 6.5, 6, 5.5, 5], 300, [empower(1, dmg(P, 0, { ad: [0.4, 0.45, 0.5, 0.55, 0.6] })), reset()], { cast: 0 }),
      E: S([24, 21, 18, 15, 12], 535, [dash(300, 'pull')]),
      R: S([120, 100, 80], 460, [dmg(T, [125, 250, 375], { bad: 0.75 }, { extra: (ctx) => 0.2 * ctx.mark('bleed') * (atRank([125, 250, 375], ctx.rank.R) + 0.75 * ctx.bonusAd) })], { when: 'execute' }),
    },
    combo: ['E', 'W', 'Q', 'R'],
    hooks: {
      init: (u) => { if (u.ranks.E) u.stats.armorPenPct = Math.min(0.75, u.stats.armorPenPct + atRank([0.2, 0.25, 0.3, 0.35, 0.4], u.ranks.E)) },
      onHit: (ctx) => { bleed(ctx); return [] },
      onSpell: (ctx, key) => { if (key !== 'R') bleed(ctx) },
    },
  },

  // ── MALPHITE (top) ──────────────────────────────────────
  Malphite: {
    notes: 'Granite Shield (10% max HP) at fight start. E scales with armor.',
    spells: {
      Q: S(8, 625, [dmg(M, [70, 120, 170, 220, 270], { ap: 0.6 })]),
      W: S([12, 11.5, 11, 10.5, 10], 0, [empower(1, dmg(P, [30, 45, 60, 75, 90], { ap: 0.2, armor: 0.15 }))], { cast: 0 }),
      E: S(7, 400, [dmg(M, [70, 110, 150, 190, 230], { ap: 0.6, armor: 0.4 })], { aoe: true }),
      R: S([130, 105, 80], 1000, [dash(1000, 'to'), dmg(M, [200, 300, 400], { ap: 0.9 }), cc(1.5)], { aoe: true }),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: { init: (u, sim) => sim.addShield(u, 0.1 * u.maxHp, 999, 'Granite Shield') },
  },

  // ── SETT (top) ──────────────────────────────────────────
  Sett: {
    notes: 'Grit = damage taken (up to 50% max HP). W uses it when Grit is high.',
    spells: {
      Q: S([9, 8, 7, 6, 5], 0, [empower(2, dmg(P, [10, 20, 30, 40, 50], { thp: 0.02 })), buff('msPct', 0.3, 1.5)], { cast: 0 }),
      W: S([18, 16.5, 15, 13.5, 12], 790, [shield(0, { extra: (ctx) => ctx.u.st.grit || 0 }, 3), dmg(T, [80, 100, 120, 140, 160], {}, { extra: (ctx) => 0.25 * (ctx.u.st.grit || 0) })], { cast: 0.75, aoe: true, ready: (ctx) => (ctx.u.st.grit || 0) > 0.2 * ctx.u.maxHp }),
      E: S([16, 14.5, 13, 11.5, 10], 490, [dmg(P, [50, 70, 90, 110, 130], { ad: 0.6 }), cc(1)], { aoe: true }),
      R: S([120, 100, 80], 400, [dmg(P, [200, 300, 400], { bad: 1.2 }), cc(1.5)], { cast: 1.5 }),
    },
    combo: ['R', 'E', 'Q', 'W'],
    hooks: {
      onTakeDamage: (u, amount) => { u.st.grit = Math.min(0.5 * u.maxHp, (u.st.grit || 0) + amount) },
      onSpell: (ctx, key) => { if (key === 'W') ctx.u.st.grit = 0 },
    },
  },

  // ── LEONA (support) ─────────────────────────────────────
  Leona: {
    notes: 'Lots of crowd control. W Eclipse damage applied right away.',
    spells: {
      Q: S(5, 125, [empower(1, dmg(M, [10, 35, 60, 85, 110], { ap: 0.3 })), cc(1), reset()], { cast: 0 }),
      W: S([14, 13, 12, 11, 10], 0, [buff('armor', [20, 25, 30, 35, 40], 3), buff('mr', [20, 25, 30, 35, 40], 3), dmg(M, [45, 80, 115, 150, 185], { ap: 0.4 })], { cast: 0, aoe: true }),
      E: S([12, 10.5, 9, 7.5, 6], 900, [dash(875, 'to'), dmg(M, [50, 90, 130, 170, 210], { ap: 0.4 }), cc(0.5)]),
      R: S([90, 75, 60], 1200, [dmg(M, [100, 175, 250], { ap: 0.8 }), cc(1.75)], { cast: 0.6, aoe: true }),
    },
    combo: ['R', 'E', 'Q', 'W'],
  },

  // ── NAUTILUS (support) ──────────────────────────────────
  Nautilus: {
    notes: 'First hit on each target roots (6s per target). W shield adds on-hit magic.',
    spells: {
      Q: S([14, 13, 12, 11, 10], 1100, [dash(1000, 'to'), dmg(M, [70, 115, 160, 205, 250], { ap: 0.9 }), cc(0.5)], { cast: 0.5 }),
      W: S(12, 0, [shield([45, 55, 65, 75, 85], { hp: [0.09, 0.1, 0.11, 0.12, 0.13] }, 6), buff('nautW', 1, 6)], { cast: 0 }),
      E: S([7, 6.5, 6, 5.5, 5], 350, [dmg(M, [55, 85, 115, 145, 175], { ap: 0.5 }, { hits: 2 })], { aoe: true }),
      R: S([120, 100, 80], 825, [dmg(M, [150, 275, 400], { ap: 0.8 }), cc(1.5)], { cast: 0.5 }),
    },
    combo: ['Q', 'R', 'W', 'E'],
    hooks: {
      onHit: (ctx) => {
        const out = []
        if (!ctx.mark('stagger') && ctx.t - (ctx.tgtState().staggerT ?? -99) >= 6) {
          ctx.tgtState().staggerT = ctx.t
          ctx.stun(ctx.tgt, byLevel(0.75, 1.75, lvl(ctx)))
          out.push({ dt: P, raw: 8 + 6 * lvl(ctx), label: 'Staggering Blow' })
        }
        if (ctx.buff('nautW') && ctx.rank.W) out.push({ dt: M, raw: atRank([30, 40, 50, 60, 70], ctx.rank.W) + 0.4 * ctx.ap, label: 'Titan\'s Wrath' })
        return out
      },
    },
  },

  // ── THRESH (support) ────────────────────────────────────
  Thresh: {
    notes: 'Set Souls in Stacks (+armor, +AP). Flay passive adds souls + part of AD to attacks.',
    stacks: [{ key: 'souls', label: { en: 'Souls', fr: 'Âmes' }, max: 200, def: 30 }],
    spells: {
      Q: S([20, 18, 16, 14, 12], 1100, [dmg(M, [100, 150, 200, 250, 300], { ap: 0.8 }), cc(1.5), dash(900, 'to')], { cast: 0.5 }),
      W: S([22, 20.5, 19, 17.5, 16], 950, [shield([60, 95, 130, 165, 200], { ap: 0.4 }, 2)], { cast: 0, when: 'lowhp' }),
      E: S([12, 11.5, 11, 10.5, 10], 500, [dmg(M, [75, 110, 145, 180, 215], { ap: 0.4 }), cc(0.75)], { aoe: true }),
      R: S([140, 120, 100], 450, [dmg(M, [250, 400, 550], { ap: 1 })], { cast: 0.75, aoe: true }),
    },
    combo: ['Q', 'E', 'R', 'W'],
    hooks: {
      init: (u) => { const s = u.stacks.souls || 0; u.stats.armor += s; u.stats.ap += s; u.stats.range = 450 },
      onHit: (ctx) => [{ dt: M, raw: (ctx.u.stacks.souls || 0) + 0.3 * ctx.ad, label: 'Flay' }],
    },
  },

  // ── LUX (mid / support) ─────────────────────────────────
  Lux: {
    notes: 'Spells mark the target; the next hit pops Illumination.',
    spells: {
      Q: S([11, 10.5, 10, 9.5, 9], 1300, [dmg(M, [80, 120, 160, 200, 240], { ap: 0.6 }), cc(2)], { cast: 0.25 }),
      W: S([14, 13, 12, 11, 10], 1175, [shield([80, 110, 140, 170, 200], { ap: 0.7 }, 2.5)], { cast: 0, when: 'lowhp' }),
      E: S([10, 9.5, 9, 8.5, 8], 1100, [dmg(M, [70, 120, 170, 220, 270], { ap: 0.8 })], { aoe: true }),
      R: S([60, 50, 40], 3400, [dmg(M, [300, 400, 500], { ap: 1.2 })], { cast: 1, aoe: true }),
    },
    combo: ['Q', 'E', 'R', 'W'],
    hooks: {
      onSpell: (ctx, key) => { if (key !== 'W') ctx.addMark('illum', 1, 6, 1) },
      onHit: (ctx) => popLux(ctx),
      afterSpellHit: (ctx) => popLux(ctx),
    },
  },

  // ── AHRI (mid) ──────────────────────────────────────────
  Ahri: {
    notes: 'Q hits twice (magic out, true back). R = 3 dashes.',
    spells: {
      Q: S(7, 970, [dmg(M, [40, 65, 90, 115, 140], { ap: 0.45 }), dmg(T, [40, 65, 90, 115, 140], { ap: 0.45 })], { aoe: true }),
      W: S([9, 8, 7, 6, 5], 725, [dmg(M, [40, 65, 90, 115, 140], { ap: 0.3 }, { hits: 1.6 })], { cast: 0 }),
      E: S(12, 1000, [dmg(M, [80, 110, 140, 170, 200], { ap: 0.6 }), cc(1.4)]),
      R: S([130, 105, 80], 500, [dash(450, 'side'), dmg(M, [60, 90, 120], { ap: 0.35 }, { hits: 3 })], { cast: 0 }),
    },
    combo: ['E', 'Q', 'W', 'R'],
  },

  // ── SYNDRA (mid) ────────────────────────────────────────
  Syndra: {
    notes: 'R assumes 7 spheres. Spheres from Q are not tracked separately.',
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 800, [dmg(M, [75, 110, 145, 180, 215], { ap: 0.6 })], { aoe: true }),
      W: S([12, 11, 10, 9, 8], 950, [dmg(M, [70, 105, 140, 175, 210], { ap: 0.65 })], { cast: 0.5, aoe: true }),
      E: S([17, 15.5, 14, 12.5, 11], 700, [dmg(M, [75, 115, 155, 195, 235], { ap: 0.45 }), cc(1.5)], { aoe: true }),
      R: S([120, 100, 80], 675, [dmg(M, [90, 130, 170], { ap: 0.2 }, { hits: 7 })], { cast: 0.25, when: 'execute' }),
    },
    combo: ['E', 'Q', 'W', 'R'],
  },

  // ── ZED (mid) ───────────────────────────────────────────
  Zed: {
    notes: 'R Death Mark pops after 3s for a % of damage dealt during it. Energy not simulated.',
    spells: {
      Q: S(6, 900, [dmg(P, [80, 115, 150, 185, 220], { bad: 1.1 }, { hits: 1.6 })], { aoe: true }),
      W: S([20, 19, 18, 17, 16], 650, [dash(650, 'to')], { cast: 0 }),
      E: S([5, 4.5, 4, 3.5, 3], 290, [dmg(P, [65, 85, 105, 125, 145], { bad: 0.65 }, { hits: 1.5 })], { cast: 0, aoe: true }),
      R: S([120, 100, 80], 625, [dash(625, 'to'), invuln(0.95), dmg(P, 0, { ad: 0.65 })], { cast: 0.95 }),
    },
    combo: ['R', 'W', 'E', 'Q'],
    hooks: {
      onSpell: (ctx, key) => {
        if (key !== 'R') return
        const tgt = ctx.tgt
        const start = ctx.u.totals.dealtTo[tgt.key] || 0
        const pct = atRank([0.25, 0.4, 0.55], ctx.rank.R)
        ctx.sim.later(3, () => {
          const during = (ctx.u.totals.dealtTo[tgt.key] || 0) - start
          ctx.sim.deal(ctx.u, tgt, during * pct, P, { label: 'Death Mark' })
        })
      },
      onHit: (ctx) => {
        if (ctx.tgt.hp / ctx.tgt.maxHp >= 0.5 || ctx.t - (ctx.tgtState().cftw ?? -99) < 10) return []
        ctx.tgtState().cftw = ctx.t
        const L = lvl(ctx)
        return [{ dt: M, raw: (L >= 17 ? 0.1 : L >= 7 ? 0.08 : 0.06) * ctx.tgt.maxHp, label: 'Contempt for the Weak' }]
      },
    },
  },

  // ── YASUO (mid / top) ───────────────────────────────────
  Yasuo: {
    asRatio: 0.67,
    notes: 'Crit chance doubled (crits deal 10% less). Flow shield at fight start. Every 3rd Q knocks up; R needs a knock-up.',
    spells: {
      Q: S(4, 475, [dmg(P, [20, 45, 70, 95, 120], { ad: 1.05 }, { crit: true, onHit: true })], { cast: 0.3, aoe: true }),
      W: S([30, 27, 24, 21, 18], 0, [], { when: 'never' }),
      E: S([10, 9, 8, 7, 6], 475, [dash(475, 'to'), dmg(M, [60, 70, 80, 90, 100], { bad: 0.2, ap: 0.6 })], { cast: 0 }),
      R: S([80, 55, 30], 1400, [dmg(P, [200, 350, 500], { bad: 1.5 }), cc(1)], { cast: 0.5, ready: (ctx) => ctx.t - (ctx.tgtState().airborneT ?? -99) < 1 }),
    },
    combo: ['E', 'R', 'Q'],
    hooks: {
      init: (u, sim) => {
        u.stats.crit = Math.min(1, u.stats.crit * 2)
        u.stats.critDmg -= 0.1
        sim.addShield(u, byLevel(125, 600, u.stats.level), 999, 'Way of the Wanderer')
        u.st.q = 0
      },
      cdMod: (u, key, cd) => (key === 'Q' ? Math.max(1.33, cd / (1 + Math.min(111, u.stats.bonusAsPct) / 100)) : cd),
      onSpell: (ctx, key) => {
        if (key !== 'Q') return
        ctx.u.st.q++
        if (ctx.u.st.q >= 3) { ctx.u.st.q = 0; ctx.stun(ctx.tgt, 1); ctx.tgtState().airborneT = ctx.t }
      },
    },
  },

  // ── LEE SIN (jungle) ────────────────────────────────────
  LeeSin: {
    notes: 'Q1 + Q2 combined (Q2 hits harder on low HP). After each spell: 2 fast attacks.',
    spells: {
      Q: S([10, 9, 8, 7, 6], 1200, [dmg(P, [55, 80, 105, 130, 155], { bad: 1.15 }), dash(1100, 'to'), dmg(P, [55, 80, 105, 130, 155], { bad: 1.15 }, { missingMult: 1 })], { cast: 0.5 }),
      W: S(12, 700, [shield([55, 110, 165, 220, 275], { ap: 0.8 }, 2)], { cast: 0, when: 'lowhp' }),
      E: S(10, 350, [dmg(M, [35, 65, 95, 125, 155], { bad: 1 })], { cast: 0, aoe: true }),
      R: S([110, 85, 60], 375, [dmg(P, [175, 400, 625], { bad: 2 }), cc(1)], { cast: 0.25 }),
    },
    combo: ['Q', 'E', 'R', 'W'],
    hooks: {
      onSpell: (ctx) => { ctx.u.st.flurry = 2 },
      asBonus: (u) => ((u.st.flurry || 0) > 0 ? 40 : 0),
      onAttack: (ctx) => { if (ctx.u.st.flurry > 0) ctx.u.st.flurry-- },
    },
  },

  // ── VI (jungle) ─────────────────────────────────────────
  Vi: {
    notes: 'Q assumed fully charged. Every 3rd hit: % max HP bonus damage.',
    spells: {
      Q: S([12, 10.5, 9, 7.5, 6], 725, [dash(725, 'to'), dmg(P, [110, 160, 210, 260, 310], { bad: 1.6 }), cc(0.5)], { cast: 1 }),
      E: S([12, 11, 10, 9, 8], 600, [empower(1, dmg(P, [10, 30, 50, 70, 90], { ad: 1.1, ap: 0.9 })), reset()], { cast: 0, aoe: true }),
      R: S([120, 100, 80], 800, [dash(800, 'to'), dmg(P, [150, 275, 400], { bad: 1.1 }), cc(1.3)], { cast: 0.25 }),
    },
    combo: ['R', 'Q', 'E'],
    hooks: {
      onHit: (ctx) => {
        if (!ctx.rank.W) return []
        ctx.addMark('dent', 1, 4)
        if (ctx.mark('dent') < 3) return []
        ctx.clearMark('dent')
        const pct = atRank([0.04, 0.055, 0.07, 0.085, 0.1], ctx.rank.W) + (0.01 * ctx.bonusAd) / 35
        return [{ dt: P, raw: pct * ctx.tgt.maxHp, label: 'Denting Blows' }]
      },
    },
  },

  // ── JARVAN IV (jungle) ──────────────────────────────────
  JarvanIV: {
    notes: 'E then Q = knock-up. First hit per target deals 8% current HP (6s per target).',
    spells: {
      Q: S([10, 9, 8, 7, 6], 770, [dmg(P, [90, 130, 170, 210, 250], { bad: 1.4 })], { cast: 0.4, aoe: true }),
      W: S(9, 600, [shield([60, 80, 100, 120, 140], { hp: 0.025 }, 3)], { cast: 0, when: 'lowhp' }),
      E: S([12, 11.5, 11, 10.5, 10], 860, [dmg(M, [80, 120, 160, 200, 240], { ap: 0.8 }), buff('asPct', [20, 22, 24, 26, 28], 5)], { cast: 0, aoe: true }),
      R: S([120, 105, 90], 650, [dash(650, 'to'), dmg(P, [200, 325, 450], { bad: 1.5 })], { aoe: true }),
    },
    combo: ['E', 'Q', 'R', 'W'],
    hooks: {
      onSpell: (ctx, key) => {
        if (key === 'E') ctx.u.st.flag = ctx.t
        if (key === 'Q' && ctx.t - (ctx.u.st.flag ?? -99) < 8) { ctx.stun(ctx.tgt, 0.75); ctx.u.dashTo?.(ctx.tgt) }
      },
      onHit: (ctx) => {
        if (ctx.t - (ctx.tgtState().cadence ?? -99) < 6) return []
        ctx.tgtState().cadence = ctx.t
        return [{ dt: P, raw: 0.08 * ctx.tgt.hp, label: 'Martial Cadence' }]
      },
    },
  },
}

function bleed(ctx) {
  ctx.addMark('bleed', 1, 5, 5)
  const n = ctx.mark('bleed')
  if (n >= 5) ctx.giveBuff('ad', byLevel(30, 230, lvl(ctx)), 5, 'Noxian Might')
  const per = byLevel(13, 30, lvl(ctx)) + 0.3 * ctx.bonusAd
  ctx.sim.addDot(ctx.u, ctx.tgt, P, per * n * 0.2, 1, 'Hemorrhage')
}

function popLux(ctx) {
  if (!ctx.mark('illum')) return []
  ctx.clearMark('illum')
  return [{ dt: M, raw: byLevel(20, 190, lvl(ctx)) + 0.2 * ctx.ap, label: 'Illumination' }]
}
