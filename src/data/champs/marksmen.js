// ─────────────────────────────────────────────────────────────
// MARKSMEN — hand-made ability files.
// Numbers are our best reading of current values. Each champ is
// "unverified" until checked in the Practice Tool (see VERIFIED in index.js).
// ─────────────────────────────────────────────────────────────
import { P, M, T, S, dmg, dot, buff, shield, cc, dash, empower, reset, invuln, atRank, byLevel } from './_helpers.js'

const lvl = (ctx) => ctx.u.stats.level

export const MARKSMEN = {
  // ── JINX ──────────────────────────────────────────────────
  Jinx: {
    asRatio: 0.625,
    notes: 'Checked vs patch 26 data (W, Q, R). Minigun: 3 stacks, +30–130% AS. Rockets (positioning mode, out of minigun range): +100–200 range, 110% AD splash, 10% less bonus AS. Get Excited!: takedowns give move + attack speed (AS value estimated).',
    spells: {
      Q: { toggle: true, cd: 0.9, range: 0, effects: [] },
      W: S([8, 7, 6, 5, 4], 1450, [dmg(P, [10, 60, 110, 160, 210], { ad: 1.4 })], { cast: 0.5 }),
      E: S([24, 20.5, 17, 13.5, 10], 900, [dmg(M, [70, 120, 170, 220, 270], { ap: 1 }), cc(1.5)], { cast: 0.4, aoe: true }),
      R: S([85, 65, 45], 25000, [dmg(P, [200, 350, 500], { bad: 1.2, tmiss: [0.25, 0.3, 0.35] })], { cast: 0.6, when: 'execute', aoe: true }),
    },
    combo: ['W', 'E', 'R'],
    hooks: {
      init: (u) => { u.st.rev = 0; u.st.rocket = false },
      // Rockets: +range, 110% damage, splash. Minigun: stacking attack speed.
      rangeBonus: (u, rank) => (u.st.rocket ? atRank([100, 125, 150, 175, 200], rank.Q) : 0),
      // Minigun: up to 3 stacks, +30–130% total. Rockets: 10% less bonus attack speed.
      asBonus: (u, rank) => (u.st.rocket ? -0.1 * (u.stats.bonusAsPct || 0) : u.st.rev * atRank([30, 55, 80, 105, 130], rank.Q) / 3),
      attackMult: (ctx) => (ctx.u.st.rocket ? 1.1 : 1),
      onAttack: (ctx) => { if (!ctx.u.st.rocket) ctx.u.st.rev = Math.min(3, ctx.u.st.rev + 1) },
      // Get Excited! — 175% move speed decaying over 6s (≈ +90% on average)
      // ⚠ exact attack speed value not confirmed — +50% (decaying) used
      onTakedown: (ctx) => { ctx.giveBuff('msPct', 0.9, 6, 'Get Excited!'); ctx.giveBuff('asPct', 50, 6, 'Get Excited!'); ctx.sim.push({ kind: 'buff', src: ctx.u.key, tgt: ctx.u.key, label: 'Get Excited!' }) },
      // Positioning: switch to rockets if the target is out of minigun range.
      beforeAct: (ctx) => {
        if (!ctx.rank.Q) return
        const minigunRange = ctx.u.stats.range
        const want = ctx.sim.opts.positioning && ctx.dist > minigunRange + 65
        if (want !== ctx.u.st.rocket) { ctx.u.st.rocket = want; ctx.u.st.rev = 0 }
      },
    },
  },

  // ── CAITLYN ───────────────────────────────────────────────
  Caitlyn: {
    asRatio: 0.568,
    notes: 'Headshot every 6th attack; E guarantees the next one. Traps (W) not simulated.',
    spells: {
      Q: S([10, 9, 8, 7, 6], 1300, [dmg(P, [50, 95, 140, 185, 230], { ad: [1.25, 1.45, 1.65, 1.85, 2.05] })], { cast: 0.625 }),
      E: S([16, 14, 12, 10, 8], 750, [dmg(M, [80, 130, 180, 230, 280], { ap: 0.8 }), dash(390, 'away')], { cast: 0.15 }),
      R: S([90, 75, 60], 3500, [dmg(P, [300, 525, 750], { bad: 1.7 })], { cast: 1, when: 'execute' }),
    },
    combo: ['E', 'Q', 'R'],
    hooks: {
      init: (u) => { u.st.hs = 0 },
      onSpell: (ctx, key) => { if (key === 'E') ctx.u.st.hs = 5 },
      onHit: (ctx) => {
        ctx.u.st.hs++
        if (ctx.u.st.hs < 6) return []
        ctx.u.st.hs = 0
        const L = lvl(ctx)
        const mult = L >= 13 ? 0.8 : L >= 7 ? 0.7 : 0.6
        return [{ dt: P, raw: ctx.ad * mult * (1 + ctx.u.stats.crit), label: 'Headshot' }]
      },
    },
  },

  // ── ASHE ─────────────────────────────────────────────────
  Ashe: {
    asRatio: 0.658,
    notes: 'Q needs 4 Focus stacks from attacks, then turns attacks into a flurry.',
    spells: {
      Q: S(0, 600, [buff('asPct', [20, 30, 40, 50, 60], 6), buff('attackMult', [0.1, 0.175, 0.25, 0.325, 0.4], 6)], { cast: 0, ready: (ctx) => ctx.u.st.focus >= 4 }),
      W: S([14, 11.5, 9, 6.5, 4], 1200, [dmg(P, [20, 35, 50, 65, 80], { bad: 1.1 })], { aoe: true }),
      R: S([100, 80, 60], 25000, [dmg(M, [250, 450, 650], { ap: 1.2 }), cc(2)]),
    },
    combo: ['R', 'Q', 'W'],
    hooks: {
      init: (u) => { u.st.focus = 0 },
      onAttack: (ctx) => { ctx.u.st.focus = Math.min(4, ctx.u.st.focus + 1) },
      onSpell: (ctx, key) => { if (key === 'Q') ctx.u.st.focus = 0 },
    },
  },

  // ── EZREAL ───────────────────────────────────────────────
  Ezreal: {
    asRatio: 0.625,
    notes: 'Q applies on-hit and lowers all cooldowns by 1.5s. Passive: +10% AS per spell hit (max 5).',
    spells: {
      Q: S([5.5, 5.25, 5, 4.75, 4.5], 1150, [dmg(P, [20, 45, 70, 95, 120], { ad: 1.3, ap: 0.4 }, { onHit: true })]),
      W: S(12, 1150, [dmg(M, [80, 135, 190, 245, 300], { bad: 1, ap: 0.9 })]),
      E: S([26, 23, 20, 17, 14], 475, [dash(475, 'away'), dmg(M, [80, 130, 180, 230, 280], { bad: 0.6, ap: 0.75 })]),
      R: S(120, 25000, [dmg(M, [350, 550, 750], { bad: 1, ap: 1.1 })], { cast: 1, when: 'execute', aoe: true }),
    },
    combo: ['W', 'Q', 'R', 'E'],
    hooks: {
      init: (u) => { u.st.force = 0 },
      asBonus: (u) => u.st.force * 10,
      onSpell: (ctx, key) => {
        ctx.u.st.force = Math.min(5, ctx.u.st.force + 1)
        if (key === 'Q') for (const k of ['W', 'E', 'R']) ctx.u.cds[k] = Math.max(ctx.t, (ctx.u.cds[k] || 0) - 1.5)
      },
    },
  },

  // ── KAI'SA ───────────────────────────────────────────────
  Kaisa: {
    asRatio: 0.644,
    notes: 'Plasma stacks pop on the 5th for % missing HP. Evolutions not simulated (all unevolved).',
    spells: {
      Q: S([10, 9, 8, 7, 6], 600, [dmg(P, [40, 55, 70, 85, 100], { bad: 0.5, ap: 0.3 }, { hits: 2.25 })]),
      W: S([22, 20, 18, 16, 14], 3000, [dmg(M, [30, 55, 80, 105, 130], { ad: 1.3, ap: 0.45 })], { cast: 0.4 }),
      E: S([16, 14.5, 13, 11.5, 10], 0, [buff('asPct', [40, 50, 60, 70, 80], 4)], { cast: 0.5 }),
      R: S([130, 100, 70], [1500, 2250, 3000], [dash(500, 'to'), shield([70, 90, 110], { ad: 1, ap: 1.2 }, 2)]),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: {
      onSpell: (ctx, key) => { if (key === 'W') ctx.addMark('plasma', 2, 4) },
      onHit: (ctx) => {
        const L = lvl(ctx)
        const stacks = ctx.mark('plasma')
        const out = [{ dt: M, raw: byLevel(4, 30, L) + 0.12 * ctx.ap + stacks * (byLevel(1, 8, L) + 0.03 * ctx.ap), label: 'Caustic Wounds' }]
        if (stacks >= 4) {
          ctx.clearMark('plasma')
          out.push({ dt: M, raw: (0.15 + (0.025 * ctx.ap) / 100) * (ctx.tgt.maxHp - ctx.tgt.hp), label: 'Plasma burst' })
        } else ctx.addMark('plasma', 1, 4)
        return out
      },
    },
  },

  // ── VAYNE ────────────────────────────────────────────────
  Vayne: {
    asRatio: 0.658,
    notes: 'W: every 3rd hit deals % max HP true damage. E wall stun not simulated.',
    spells: {
      Q: S([4, 3.5, 3, 2.5, 2], 300, [dash(300, 'side'), empower(1, dmg(P, 0, { ad: [0.75, 0.85, 0.95, 1.05, 1.15], ap: 0.5 })), reset()], { cast: 0.15 }),
      E: S([20, 18, 16, 14, 12], 550, [dmg(P, [50, 85, 120, 155, 190], { bad: 0.5 })]),
      R: S([100, 85, 70], 0, [buff('ad', [25, 40, 55], [8, 10, 12])], { cast: 0, when: 'start' }),
    },
    combo: ['R', 'Q', 'E'],
    hooks: {
      onHit: (ctx) => {
        if (!ctx.rank.W) return []
        ctx.addMark('bolts', 1, 3.5)
        if (ctx.mark('bolts') < 3) return []
        ctx.clearMark('bolts')
        const pct = atRank([0.04, 0.055, 0.07, 0.085, 0.1], ctx.rank.W)
        const min = atRank([40, 55, 70, 85, 100], ctx.rank.W)
        return [{ dt: T, raw: Math.max(min, pct * ctx.tgt.maxHp), label: 'Silver Bolts' }]
      },
    },
  },

  // ── JHIN ─────────────────────────────────────────────────
  Jhin: {
    asRatio: 0.625,
    fixedAS: 0.75,
    notes: '4 shots then a 2.5s reload. Bonus AS and crit turn into AD. 4th shot always crits. R uses the minimum damage (no missing-HP boost) — low estimate.',
    spells: {
      Q: S([7, 6.5, 6, 5.5, 5], 550, [dmg(P, [45, 70, 95, 120, 145], { ad: [0.35, 0.425, 0.5, 0.575, 0.65], ap: 0.6 })]),
      W: S(12, 2520, [dmg(P, [70, 105, 140, 175, 210], { ad: 0.5 }), cc(1.5)], { cast: 0.75 }),
      R: S([120, 105, 90], 3500, [dmg(P, [320, 640, 960], { ad: 1.25 })], { cast: 2.5, when: 'execute' }),
    },
    combo: ['W', 'Q', 'R'],
    hooks: {
      init: (u) => {
        u.st.ammo = 4
        const s = u.stats
        const mult = 1 + byLevel(0.04, 0.44, s.level) + 0.3 * s.crit + 0.0025 * s.bonusAsPct
        s.ad = s.baseAd * mult + s.bonusAd * mult
        s.bonusAd = s.ad - s.baseAd
        s.jhinCrit = s.crit
        s.crit = 0
      },
      attackMult: (ctx) => {
        if (ctx.u.st.ammo !== 1) return 1
        const L = lvl(ctx)
        const miss = L >= 11 ? 0.25 : L >= 6 ? 0.2 : 0.15
        const missing = (ctx.tgt.maxHp - ctx.tgt.hp) * miss
        return 1.5 + 0.0 + missing / Math.max(1, ctx.ad)
      },
      onAttack: (ctx) => {
        ctx.u.st.ammo--
        if (ctx.u.st.ammo <= 0) { ctx.u.st.ammo = 4; ctx.u.nextAttack = ctx.t + 2.5 }
      },
    },
  },

  // ── MISS FORTUNE ─────────────────────────────────────────
  MissFortune: {
    asRatio: 0.656,
    notes: 'Love Tap on the first hit per target. R channel assumes most waves hit.',
    spells: {
      Q: S([7, 6, 5, 4, 3], 650, [dmg(P, [20, 45, 70, 95, 120], { ad: 1, ap: 0.35 }, { onHit: true, crit: true })]),
      W: S(12, 0, [buff('asPct', [40, 55, 70, 85, 100], 4)], { cast: 0 }),
      E: S([18, 16, 14, 12, 10], 1000, [dot(M, [70, 100, 130, 160, 190], { ap: 0.8 }, 2)], { aoe: true }),
      R: S([120, 110, 100], 1450, [dot(P, 0, { ad: 8, ap: 3 }, 3, { crit: true })], { cast: 3, aoe: true }),
    },
    combo: ['W', 'Q', 'E', 'R'],
    hooks: {
      onHit: (ctx) => {
        if (ctx.mark('lovetap')) return []
        ctx.addMark('lovetap', 1, 999)
        return [{ dt: P, raw: ctx.ad * byLevel(0.5, 1, lvl(ctx)), label: 'Love Tap' }]
      },
    },
  },

  // ── LUCIAN ───────────────────────────────────────────────
  Lucian: {
    asRatio: 0.638,
    notes: 'After each spell the next attack fires twice. Passive hits lower E by 2s.',
    spells: {
      Q: S([9, 8, 7, 6, 5], 500, [dmg(P, [90, 130, 170, 210, 250], { bad: 1 })], { cast: 0.4 }),
      W: S(14, 900, [dmg(M, [75, 110, 145, 180, 215], { ap: 0.9 })]),
      E: S([19, 17.75, 16.5, 15.25, 14], 425, [dash(425, 'side'), reset()], { cast: 0.1 }),
      R: S([90, 75, 60], 1200, [dot(P, [225, 450, 675], { ad: 3.75, ap: 2.25 }, 3)], { cast: 3 }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: {
      onSpell: (ctx) => { ctx.u.st.double = true },
      onHit: (ctx) => {
        if (!ctx.u.st.double) return []
        ctx.u.st.double = false
        ctx.u.cds.E = Math.max(ctx.t, (ctx.u.cds.E || 0) - 2)
        return [{ dt: P, raw: ctx.ad * byLevel(0.5, 1, lvl(ctx)), label: 'Lightslinger' }]
      },
    },
  },

  // ── DRAVEN ───────────────────────────────────────────────
  Draven: {
    asRatio: 0.679,
    notes: 'Assumes every axe is caught (perfect Draven).',
    spells: {
      Q: S([12, 11, 10, 9, 8], 0, [], { cast: 0, when: 'start' }),
      W: S([12, 11, 10, 9, 8], 0, [buff('asPct', [30, 35, 40, 45, 50], 3), buff('msPct', 0.5, 1.5)], { cast: 0 }),
      E: S([18, 17, 16, 15, 14], 1050, [dmg(P, [75, 110, 145, 180, 215], { bad: 0.5 })], { aoe: true }),
      R: S([100, 90, 80], 25000, [dmg(P, [175, 275, 375], { bad: [1.1, 1.3, 1.5] }, { hits: 2 })], { when: 'execute', aoe: true }),
    },
    combo: ['Q', 'W', 'E', 'R'],
    hooks: {
      onSpell: (ctx, key) => { if (key === 'Q') ctx.u.st.axes = true },
      onHit: (ctx) => {
        if (!ctx.u.st.axes || !ctx.rank.Q) return []
        const r = ctx.rank.Q
        return [{ dt: P, raw: atRank([40, 45, 50, 55, 60], r) + atRank([0.75, 0.85, 0.95, 1.05, 1.15], r) * ctx.bonusAd, label: 'Spinning Axe' }]
      },
    },
  },

  // ── SAMIRA ───────────────────────────────────────────────
  Samira: {
    asRatio: 0.658,
    notes: 'R unlocks after 3 different moves (style). Projectile block on W not simulated.',
    spells: {
      Q: S([6, 5, 4, 3, 2], 950, [dmg(P, [0, 5, 10, 15, 20], { ad: [0.85, 0.95, 1.05, 1.15, 1.25] }, { crit: true })]),
      W: S([30, 28, 26, 24, 22], 325, [dmg(P, [20, 35, 50, 65, 80], { bad: 0.8 }, { hits: 2 })], { cast: 0.75, aoe: true }),
      E: S([20, 18, 16, 14, 12], 600, [dash(600, 'to'), dmg(M, [50, 60, 70, 80, 90], { bad: 0.2 }), buff('asPct', [30, 35, 40, 45, 50], 3)]),
      R: S(5, 600, [dmg(P, [0, 10, 20], { ad: 0.5 }, { hits: 10, crit: true })], { cast: 2, aoe: true, ready: (ctx) => (ctx.u.st.style || 0) >= 3 }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: {
      onSpell: (ctx, key) => {
        if (key === 'R') { ctx.u.st.style = 0; ctx.u.st.used = {}; return }
        ctx.u.st.used = ctx.u.st.used || {}
        if (!ctx.u.st.used[key]) { ctx.u.st.used[key] = true; ctx.u.st.style = (ctx.u.st.style || 0) + 1 }
      },
      onHit: (ctx) => {
        const miss = 1 - ctx.tgt.hp / ctx.tgt.maxHp
        return [{ dt: M, raw: byLevel(2, 19, lvl(ctx)) + 0.35 * ctx.ad * miss, label: 'Daredevil Impulse' }]
      },
    },
  },

  // ── XAYAH ────────────────────────────────────────────────
  Xayah: {
    asRatio: 0.625,
    notes: 'Feathers from Q (2), attacks after spells (1 each, max 3) and R (5). E pulls them all.',
    spells: {
      Q: S([10, 9, 8, 7, 6], 1100, [dmg(P, [45, 60, 75, 90, 105], { bad: 0.5 }, { hits: 2 })]),
      W: S([20, 19, 18, 17, 16], 0, [buff('asPct', [35, 40, 45, 50, 55], 4)], { cast: 0 }),
      E: S([12, 11, 10, 9, 8], 2000, [dmg(P, [55, 65, 75, 85, 95], { bad: 0.6 }, { hits: (ctx) => ctx.u.st.feathers })], { cast: 0.1, ready: (ctx) => ctx.u.st.feathers >= 3 }),
      R: S([120, 110, 100], 1100, [invuln(1.5), dmg(P, [200, 300, 400], { bad: 1 })], { cast: 1.5, aoe: true }),
    },
    combo: ['W', 'Q', 'R', 'E'],
    hooks: {
      init: (u) => { u.st.feathers = 0; u.st.clean = 0 },
      onSpell: (ctx, key) => {
        if (key === 'Q') ctx.u.st.feathers += 2
        if (key === 'R') ctx.u.st.feathers += 5
        if (key === 'E') { if (ctx.u.st.feathers >= 3) ctx.stun(ctx.tgt, 1.25); ctx.u.st.feathers = 0 }
        ctx.u.st.clean = 3
      },
      onAttack: (ctx) => { if (ctx.u.st.clean > 0) { ctx.u.st.clean--; ctx.u.st.feathers++ } },
    },
  },

  // ── TWITCH ───────────────────────────────────────────────
  Twitch: {
    asRatio: 0.679,
    notes: 'Venom stacks (max 6) deal true damage over time. E fires at 6 stacks.',
    spells: {
      Q: S(16, 0, [buff('asPct', [45, 50, 55, 60, 65], [10, 11, 12, 13, 14])], { cast: 0, when: 'start' }),
      W: S([13, 12, 11, 10, 9], 950, [], { aoe: true }),
      E: S([12, 11, 10, 9, 8], 1200, [dmg(P, [20, 30, 40, 50, 60], {}, {
        extra: (ctx) => ctx.mark('venom') * (atRank([15, 20, 25, 30, 35], ctx.rank.E) + 0.35 * ctx.bonusAd + 0.333 * ctx.ap),
      })], { ready: (ctx) => ctx.mark('venom') >= 6 || ctx.tgt.hp / ctx.tgt.maxHp < 0.25 }),
      R: S(90, 1100, [buff('ad', [30, 45, 60], 6), buff('range', 300, 6)], { cast: 0 }),
    },
    combo: ['Q', 'R', 'W', 'E'],
    hooks: {
      onSpell: (ctx, key) => { if (key === 'W') ctx.addMark('venom', 2, 6, 6) },
      onHit: (ctx) => {
        ctx.addMark('venom', 1, 6, 6)
        const L = lvl(ctx)
        const perStack = (L >= 17 ? 5 : L >= 13 ? 4 : L >= 9 ? 3 : L >= 5 ? 2 : 1) + 0.03 * ctx.ap
        // venom ticks 1/sec: we add 1 attack-interval worth of venom per hit
        return [{ dt: T, raw: perStack * ctx.mark('venom') / Math.max(0.5, ctx.as), label: 'Deadly Venom' }]
      },
    },
  },

  // ── TRISTANA ─────────────────────────────────────────────
  Tristana: {
    asRatio: 0.679,
    rangePerLevel: 8,
    notes: 'E bomb gains +30% per stack (attacks/spells), bursts at 4 stacks.',
    spells: {
      Q: S([20, 19, 18, 17, 16], 0, [buff('asPct', [50, 65, 80, 95, 110], 7)], { cast: 0 }),
      W: S([22, 20.5, 19, 17.5, 16], 900, [dash(900, 'to'), dmg(M, [95, 145, 195, 245, 295], { ap: 0.5 })], { aoe: true, when: 'execute' }),
      E: S([16, 15.5, 15, 14.5, 14], 600, [], { cast: 0.15 }),
      R: S([100, 85, 70], 600, [dmg(M, [300, 400, 500], { ap: 1 })], { when: 'execute' }),
    },
    combo: ['E', 'Q', 'R', 'W'],
    hooks: {
      onSpell: (ctx, key) => {
        if (key === 'E') { ctx.u.st.bomb = { stacks: 0, tgt: ctx.tgt, at: ctx.t + 4 }; return }
        if (ctx.u.st.bomb) ctx.u.st.bomb.stacks++
      },
      onHit: (ctx) => {
        const b = ctx.u.st.bomb
        if (!b || b.tgt !== ctx.tgt) return []
        b.stacks++
        if (b.stacks < 4 && ctx.t < b.at) return []
        ctx.u.st.bomb = null
        const r = ctx.rank.E
        const raw = (atRank([70, 80, 90, 100, 110], r) + atRank([0.5, 0.75, 1, 1.25, 1.5], r) * ctx.bonusAd + 0.5 * ctx.ap) * (1 + 0.3 * Math.min(4, b.stacks))
        return [{ dt: P, raw, label: 'Explosive Charge' }]
      },
    },
  },

  // ── VARUS ────────────────────────────────────────────────
  Varus: {
    asRatio: 0.658,
    notes: 'W on-hit applies Blight (max 3). Spells pop Blight for % max HP.',
    spells: {
      Q: S([16, 15, 14, 13, 12], 1595, [dmg(P, [80, 150, 220, 290, 360], { bad: 1.2 })], { cast: 1.25, ready: (ctx) => ctx.mark('blight') >= 3 || !ctx.rank.W }),
      E: S([18, 16, 14, 12, 10], 925, [dmg(P, [60, 100, 140, 180, 220], { bad: 0.9 })], { aoe: true, ready: (ctx) => ctx.mark('blight') >= 3 || !ctx.rank.W }),
      R: S([100, 80, 60], 1370, [dmg(M, [150, 250, 350], { ap: 1 }), cc(2)]),
    },
    combo: ['R', 'E', 'Q'],
    hooks: {
      onHit: (ctx) => {
        if (!ctx.rank.W) return []
        ctx.addMark('blight', 1, 6, 3)
        return [{ dt: M, raw: atRank([7, 10.5, 14, 17.5, 21], ctx.rank.W) + 0.3 * ctx.ap, label: 'Blighted Quiver' }]
      },
      afterSpellHit: (ctx) => {
        const n = ctx.mark('blight')
        if (!n || !ctx.rank.W) return []
        ctx.clearMark('blight')
        const pct = atRank([0.03, 0.035, 0.04, 0.045, 0.05], ctx.rank.W) + (0.025 * ctx.ap) / 100
        return [{ dt: M, raw: n * pct * ctx.tgt.maxHp, label: 'Blight burst' }]
      },
    },
  },

  // ── SIVIR ────────────────────────────────────────────────
  Sivir: {
    asRatio: 0.625,
    notes: 'Spell shield (E) not simulated.',
    spells: {
      Q: S([10, 9, 8, 7, 6], 1250, [dmg(P, [15, 30, 45, 60, 75], { ad: [0.8, 0.85, 0.9, 0.95, 1], ap: 0.6 }, { hits: 2, crit: true })], { aoe: true }),
      W: S([12, 10.5, 9, 7.5, 6], 0, [buff('asPct', [20, 25, 30, 35, 40], 4)], { cast: 0 }),
      R: S([120, 100, 80], 1000, [buff('msPct', [0.2, 0.25, 0.3], 8)], { cast: 0 }),
    },
    combo: ['W', 'Q', 'R'],
  },

  // ── KOG'MAW ──────────────────────────────────────────────
  KogMaw: {
    asRatio: 0.665,
    notes: 'W adds range and % max HP magic on-hit. R cost is approximated as a longer cooldown.',
    spells: {
      Q: S(8, 1200, [dmg(M, [90, 140, 190, 240, 290], { ap: 0.7 })]),
      W: S(17, 0, [buff('range', [130, 150, 170, 190, 210], 8), buff('kogW', [0.0375, 0.045, 0.0525, 0.06, 0.0675], 8)], { cast: 0, when: 'start' }),
      E: S(12, 1360, [dmg(M, [75, 120, 165, 210, 255], { ap: 0.7 })], { aoe: true }),
      R: S([4, 3.5, 3], [1300, 1550, 1800], [dmg(M, [100, 140, 180], { bad: 0.65, ap: 0.35 }, { missingMult: 1 })], { aoe: true, keepCd: true }),
    },
    combo: ['W', 'Q', 'E', 'R'],
    hooks: {
      asBonus: (u, rank) => (rank.Q ? atRank([10, 15, 20, 25, 30], rank.Q) : 0),
      onHit: (ctx) => {
        const pct = ctx.buff('kogW')
        if (!pct) return []
        return [{ dt: M, raw: (pct + (0.01 * ctx.ap) / 100) * ctx.tgt.maxHp, label: 'Bio-Arcane Barrage' }]
      },
    },
  },

  // ── APHELIOS ─────────────────────────────────────────────
  Aphelios: {
    asRatio: 0.658,
    notes: 'SIMPLIFIED: the 5 weapons are averaged into one generic Q.',
    spells: {
      Q: S(9, 1450, [dmg(P, [60, 80, 100, 120, 140], { bad: [0.42, 0.6, 0.78, 0.96, 1.14], ap: 1 })]),
      R: S([120, 110, 100], 1300, [dmg(P, [125, 175, 225], { bad: 0.2, ap: 1 })], { aoe: true }),
    },
    combo: ['Q', 'R'],
    hooks: {
      init: (u) => { const s = u.stats; const pts = Math.min(6, Math.floor(s.level / 3)); s.ad += 4.5 * pts; s.bonusAd += 4.5 * pts; s.bonusAsPct += 6 * pts; s.lethality += 1.5 * pts },
    },
  },

  // ── ZERI ─────────────────────────────────────────────────
  Zeri: {
    asRatio: 0.547,
    notes: 'Her basic attack IS Burst Fire (Q). Range 825.',
    rangeBonus: 325,
    autoOverride: (ctx) => ({ dt: P, raw: atRank([15, 17, 19, 21, 23], ctx.rank.Q || 1) + atRank([1.04, 1.08, 1.12, 1.16, 1.2], ctx.rank.Q || 1) * ctx.ad }),
    spells: {
      W: S([13, 12, 11, 10, 9], 1200, [dmg(P, [20, 60, 100, 140, 180], { ad: 1.3, ap: 0.25 })], { cast: 0.55 }),
      E: S([23, 21.5, 20, 18.5, 17], 300, [dash(300, 'side')], { cast: 0 }),
      R: S([100, 85, 70], 825, [dmg(M, [200, 300, 400], { bad: 0.85, ap: 1.1 }), buff('asPct', 25, 5)], { aoe: true }),
    },
    combo: ['R', 'W', 'E'],
  },

  // ── SMOLDER ──────────────────────────────────────────────
  Smolder: {
    asRatio: 0.638,
    notes: 'Set Dragon Practice stacks in Stacks. 125+ adds an explosion, 225+ executes under 6.5%.',
    stacks: [{ key: 'practice', label: { en: 'Dragon Practice', fr: 'Entraînement draconique' }, max: 400, def: 125 }],
    spells: {
      Q: S([5.5, 5, 4.5, 4, 3.5], 550, [dmg(P, [60, 75, 90, 105, 120], { bad: 1.3 }, { extra: (ctx) => 0.4 * (ctx.u.stacks.practice || 0) })]),
      W: S([12, 11, 10, 9, 8], 1050, [dmg(P, [25, 50, 75, 100, 125], { bad: 0.5, ap: 0.8 })], { aoe: true }),
      E: S([24, 22, 20, 18, 16], 0, [buff('msPct', 1, 1.25)], { cast: 0 }),
      R: S([140, 110, 80], 3500, [dmg(P, [200, 300, 400], { bad: 1.1, ap: 1 })], { aoe: true }),
    },
    combo: ['Q', 'W', 'R'],
    hooks: {
      afterSpellHit: (ctx, key) => {
        if (key !== 'Q') return []
        const st = ctx.u.stacks.practice || 0
        const out = []
        if (st >= 125) out.push({ dt: M, raw: 0.6 * (ctx.bonusAd), label: 'Q explosion' })
        if (st >= 225 && ctx.tgt.hp / ctx.tgt.maxHp < 0.065) out.push({ dt: T, raw: ctx.tgt.hp, label: 'Execute' })
        return out
      },
    },
  },

  // ── KALISTA ──────────────────────────────────────────────
  Kalista: {
    asRatio: 0.694,
    notes: 'Attacks deal 90% AD and stick spears. E rips them out.',
    spells: {
      Q: S(8, 1200, [dmg(P, [20, 85, 150, 215, 280], { ad: 1.05 })], { cast: 0.25 }),
      E: S([14, 12.5, 11, 9.5, 8], 1100, [dmg(P, [10, 20, 30, 40, 50], { ad: 0.7 }, {
        extra: (ctx) => Math.max(0, ctx.mark('spear') - 1) * (atRank([8, 12, 16, 20, 24], ctx.rank.E) + atRank([0.2, 0.25, 0.3, 0.35, 0.4], ctx.rank.E) * ctx.ad),
      })], { cast: 0, ready: (ctx) => ctx.mark('spear') >= 6 || ctx.tgt.hp / ctx.tgt.maxHp < 0.2 }),
    },
    combo: ['Q', 'E'],
    hooks: {
      attackMult: () => 0.9,
      onHit: (ctx) => { ctx.addMark('spear', 1, 4, 99); return [] },
      onSpell: (ctx, key) => { if (key === 'Q') ctx.addMark('spear', 1, 4, 99); if (key === 'E') ctx.clearMark('spear') },
    },
  },

  // ── CORKI ────────────────────────────────────────────────
  Corki: {
    asRatio: 0.638,
    notes: 'Basic attacks deal 80% magic / 20% physical.',
    attackSplit: { magic: 0.8 },
    spells: {
      Q: S([8, 7.5, 7, 6.5, 6], 825, [dmg(M, [70, 115, 160, 205, 250], { bad: 0.7, ap: 0.5 })], { aoe: true }),
      W: S([20, 19, 18, 17, 16], 600, [dash(600, 'to'), dot(M, [60, 90, 120, 150, 180], { ap: 0.4 }, 1)], { when: 'execute' }),
      E: S(16, 600, [dot(M, [60, 90, 120, 150, 180], { bad: 0.6 }, 4)], { cast: 0 }),
      R: S([3, 2.5, 2], 1300, [dmg(M, [80, 115, 150], { ad: [0.15, 0.45, 0.75], ap: 0.12 })], { aoe: true, keepCd: true }),
    },
    combo: ['R', 'Q', 'E', 'W'],
  },

  // ── SENNA ────────────────────────────────────────────────
  Senna: {
    asRatio: 0.4,
    notes: 'Set Mist souls in Stacks (+AD, +range, +crit).',
    stacks: [{ key: 'souls', label: { en: 'Mist souls', fr: 'Âmes de brume' }, max: 200, def: 40 }],
    spells: {
      Q: S([15, 14.5, 14, 13.5, 13], 600, [dmg(P, [30, 65, 100, 135, 170], { bad: 0.5 })], { cast: 0.4 }),
      W: S([11, 10.5, 10, 9.5, 9], 1250, [dmg(P, [70, 115, 160, 205, 250], { bad: 0.7 }), cc(1.25)], { cast: 0.25 }),
      R: S([160, 140, 120], 25000, [dmg(P, [250, 400, 550], { bad: 1.15, ap: 0.7 })], { cast: 1, when: 'execute', aoe: true }),
    },
    combo: ['W', 'Q', 'R'],
    hooks: {
      init: (u) => {
        const n = u.stacks.souls || 0
        u.stats.ad += 0.75 * n; u.stats.bonusAd += 0.75 * n
        u.stats.range += 25 * Math.floor(n / 20)
        u.stats.crit = Math.min(1, u.stats.crit + 0.1 * Math.floor(n / 20))
      },
      onAttack: (ctx) => { ctx.u.cds.Q = Math.max(ctx.t, (ctx.u.cds.Q || 0) - 1) },
    },
  },

  // ── KINDRED ──────────────────────────────────────────────
  Kindred: {
    asRatio: 0.625,
    notes: 'Set Marks in Stacks (adds range and Wolf damage). R (no-death zone) not simulated.',
    stacks: [{ key: 'marks', label: { en: 'Marks', fr: 'Marques' }, max: 20, def: 4 }],
    spells: {
      Q: S(9, 340, [dash(300, 'side'), dmg(P, [40, 65, 90, 115, 140], { bad: 0.75 }), buff('asPct', 35, 4)], { aoe: true }),
      W: S([18, 17, 16, 15, 14], 500, [dot(M, [25, 30, 35, 40, 45], { bad: 0.2 }, 3, { extra: (ctx) => (0.01 + 0.01 * (ctx.u.stacks.marks || 0)) * ctx.tgt.hp })], { cast: 0 }),
      E: S([14, 13, 12, 11, 10], 500, [dmg(P, [80, 100, 120, 140, 160], { bad: 0.8, tmiss: 0.08 })]),
    },
    combo: ['W', 'Q', 'E'],
    hooks: { init: (u) => { const m = u.stacks.marks || 0; if (m >= 4) u.stats.range += 75 + 25 * Math.floor((m - 4) / 3) } },
  },

  // ── GRAVES ───────────────────────────────────────────────
  Graves: {
    asRatio: 0.49,
    notes: 'Shotgun: assumes close range (most pellets hit). Reloads after 2 shells.',
    spells: {
      Q: S([14, 12.5, 11, 9.5, 8], 800, [dmg(P, [45, 60, 75, 90, 105], { bad: 0.8 }), dmg(P, [85, 120, 155, 190, 225], { bad: [0.4, 0.7, 1, 1.3, 1.6] })], { aoe: true }),
      W: S([26, 24, 22, 20, 18], 950, [dmg(M, [60, 110, 160, 210, 260], { ap: 0.6 })], { aoe: true }),
      E: S([16, 15, 14, 13, 12], 375, [dash(375, 'side'), buff('armor', [24, 36, 48, 60, 72], 4), reset()], { cast: 0 }),
      R: S([120, 90, 60], 1000, [dmg(P, [275, 425, 575], { bad: 1.5 })], { when: 'execute', aoe: true }),
    },
    combo: ['E', 'Q', 'W', 'R'],
    hooks: {
      init: (u) => { u.st.shells = 2 },
      attackMult: () => 1.4,
      onAttack: (ctx) => {
        ctx.u.st.shells--
        if (ctx.u.st.shells <= 0) { ctx.u.st.shells = 2; ctx.u.nextAttack = Math.max(ctx.u.nextAttack, ctx.t + 1.2) }
      },
    },
  },

  // ── QUINN ────────────────────────────────────────────────
  Quinn: {
    asRatio: 0.668,
    notes: 'Harrier marks every ~8s (and from Q/E). Popping a mark gives Heightened Senses AS.',
    spells: {
      Q: S([11, 10, 9, 8, 7], 1025, [dmg(P, [20, 40, 60, 80, 100], { ad: [0.8, 0.9, 1, 1.1, 1.2], ap: 0.5 })], { aoe: true }),
      E: S([12, 11, 10, 9, 8], 675, [dash(300, 'away'), dmg(P, [40, 70, 100, 130, 160], { bad: 0.2 }), cc(0.5)]),
    },
    combo: ['E', 'Q'],
    hooks: {
      onSpell: (ctx) => ctx.addMark('harrier', 1, 4, 1),
      onHit: (ctx) => {
        if (!ctx.mark('harrier') && ctx.t - (ctx.u.st.lastMark ?? -99) >= 8) { ctx.u.st.lastMark = ctx.t; ctx.addMark('harrier', 1, 4, 1) }
        if (!ctx.mark('harrier')) return []
        ctx.clearMark('harrier')
        if (ctx.rank.W) ctx.giveBuff('asPct', atRank([28, 36, 44, 52, 60], ctx.rank.W), 2)
        return [{ dt: P, raw: byLevel(10, 95, lvl(ctx)) + 1.2 * ctx.bonusAd, label: 'Harrier' }]
      },
    },
  },

  // ── AKSHAN ───────────────────────────────────────────────
  Akshan: {
    asRatio: 0.4,
    notes: 'Attacks fire twice (2nd shot ~50%). Every 3rd hit deals bonus magic.',
    spells: {
      Q: S([8, 7.25, 6.5, 5.75, 5], 850, [dmg(P, [5, 25, 45, 65, 85], { ad: 0.8 }, { hits: 2 })], { aoe: true }),
      E: S([18, 16.5, 15, 13.5, 12], 500, [dash(500, 'to'), dmg(P, [30, 45, 60, 75, 90], { bad: 0.175 }, { hits: 6, crit: true })], { cast: 1 }),
      R: S([100, 85, 70], 2500, [dmg(P, [100, 150, 200], { ad: 0.5 }, { missingMult: 3 })], { cast: 1.5, when: 'execute' }),
    },
    combo: ['Q', 'E', 'R'],
    hooks: {
      attackMult: () => 1.5,
      onHit: (ctx) => {
        ctx.addMark('dirty', 1, 2)
        if (ctx.mark('dirty') < 3) return []
        ctx.clearMark('dirty')
        return [{ dt: M, raw: byLevel(10, 165, lvl(ctx)) + 0.6 * ctx.ap, label: 'Dirty Fighting' }]
      },
    },
  },

  // ── YUNARA ───────────────────────────────────────────────
  Yunara: {
    asRatio: 0.65,
    notes: 'APPROXIMATE: newer champion, least-certain numbers of the roster. Q empowers attacks (on-hit magic + attack speed), R transcends her abilities.',
    spells: {
      Q: S([10, 9, 8, 7, 6], 0, [buff('asPct', [30, 40, 50, 60, 70], 5), buff('yunQ', [15, 25, 35, 45, 55], 5)], { cast: 0 }),
      W: S([12, 11, 10, 9, 8], 1000, [dmg(M, [60, 95, 130, 165, 200], { bad: 0.8, ap: 0.5 })], { aoe: true }),
      E: S([16, 15, 14, 13, 12], 450, [dash(450, 'side'), buff('msPct', 0.4, 2)], { cast: 0 }),
      R: S([100, 85, 70], 0, [buff('ad', [20, 35, 50], 10), buff('asPct', [20, 30, 40], 10)], { cast: 0 }),
    },
    combo: ['R', 'Q', 'W', 'E'],
    hooks: {
      onHit: (ctx) => {
        const q = ctx.buff('yunQ')
        return q ? [{ dt: M, raw: q + 0.2 * ctx.ap + 0.1 * ctx.bonusAd, label: 'Cultivation of Spirit' }] : []
      },
    },
  },

  // ── TEEMO ────────────────────────────────────────────────
  Teemo: {
    asRatio: 0.69,
    notes: 'E poison on every hit. R mushroom assumed stepped on.',
    spells: {
      Q: S(7, 680, [dmg(M, [80, 125, 170, 215, 260], { ap: 0.8 })]),
      W: S(17, 0, [buff('msPct', [0.2, 0.28, 0.36, 0.44, 0.52], 3)], { cast: 0 }),
      R: S([30, 25, 20], 600, [dot(M, [200, 325, 450], { ap: 0.55 }, 4)], { aoe: true, keepCd: true }),
    },
    combo: ['Q', 'R'],
    hooks: {
      onHit: (ctx) => {
        if (!ctx.rank.E) return []
        const r = ctx.rank.E
        // on-hit + 1 attack-interval worth of the poison
        return [
          { dt: M, raw: atRank([14, 25, 36, 47, 58], r) + 0.3 * ctx.ap, label: 'Toxic Shot' },
          { dt: M, raw: ((atRank([24, 48, 72, 96, 120], r) + 0.4 * ctx.ap) / 4) / Math.max(0.5, ctx.as), label: 'Poison' },
        ]
      },
    },
  },
}
