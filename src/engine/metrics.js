// ─────────────────────────────────────────────────────────────
// metrics.js — the numbers on the results cards.
// Everything here runs the simulator, so the numbers on screen
// always agree with the fight replay.
// ─────────────────────────────────────────────────────────────
import { simulate } from './sim.js'
import { ehp } from './damage.js'

const total = (tot) => tot.physical + tot.magic + tot.true

/**
 * Hit a target that doesn't fight back.
 * Returns time-to-kill (null = didn't die in 30s), DPS, 3s burst, damage split.
 */
export function dummyRun(me, foes, opts = {}) {
  const res = simulate({ allies: [me], enemies: foes, opts: { ...opts, twoWay: false } })
  const mine = res.units.find((u) => u.side === 'A')
  const dead = res.units.filter((u) => u.side === 'B')
  const allDead = dead.every((u) => u.dead)
  const ttk = allDead ? Math.max(...dead.map((u) => u.deathT)) : null
  const start = mine.firstHitT ?? 0
  const span = Math.max(0.5, (ttk ?? res.t) - start)
  const dmg = total(mine.totals)
  const burst = mine.totals.burst // damage in the first 3s after the first hit
  return {
    ttk: ttk == null ? null : ttk - start,
    dps: dmg / span,
    burst,
    split: { physical: mine.totals.physical, magic: mine.totals.magic, true: mine.totals.true },
    damage: dmg,
    res,
  }
}

/** A full two-way (or one-way) fight with replay data. */
export function fight(allies, enemies, opts = {}) {
  return simulate({ allies, enemies, opts })
}

/** Effective HP vs physical, magic, and a mix. */
export function effectiveHp(unit, mix = { physical: 0.5, magic: 0.5, true: 0 }) {
  const hp = unit.stats.hp
  const phys = ehp(hp, unit.stats.armor)
  const mag = ehp(hp, unit.stats.mr)
  const sum = (mix.physical || 0) + (mix.magic || 0) + (mix.true || 0) || 1
  // EHP vs a mix = HP ÷ (weighted average of damage taken per point)
  const perPoint = ((mix.physical || 0) * (hp / phys) + (mix.magic || 0) * (hp / mag) + (mix.true || 0)) / sum
  return { physical: phys, magic: mag, mixed: hp / perPoint, mix }
}

/** Damage-type mix the enemy team deals (used for mixed EHP). */
export function enemyMix(enemies, me, opts = {}) {
  const sum = { physical: 0, magic: 0, true: 0 }
  for (const e of enemies) {
    const r = dummyRun(e, [me], { ...opts, record: false, duration: 10 })
    sum.physical += r.split.physical
    sum.magic += r.split.magic
    sum.true += r.split.true
  }
  return sum
}

/** Gold breakpoints: stats after 1, 2, 3… items in buy order. */
export function breakpoints(cfg, data, build, foe, opts = {}) {
  const out = []
  for (let n = 0; n <= cfg.items.length; n++) {
    const c = { ...cfg, items: cfg.items.slice(0, n) }
    const me = build(c, data, 'A0')
    const r = dummyRun(me, [foe], { ...opts, record: false })
    out.push({ n, gold: me.gold, dps: r.dps, ttk: r.ttk, burst: r.burst })
  }
  return out
}

/**
 * Best buy order (greedy): at each step, buy the item that adds the most
 * DPS per gold spent. 6 items = only 21 quick sims, so it's instant.
 */
export function bestOrder(cfg, data, build, foes, opts = {}) {
  const left = [...cfg.items]
  const order = []
  let prev = dummyRun(build({ ...cfg, items: [] }, data, 'A0'), foes, { ...opts, record: false }).dps
  while (left.length) {
    let best = null
    for (const id of left) {
      const dps = dummyRun(build({ ...cfg, items: [...order, id] }, data, 'A0'), foes, { ...opts, record: false }).dps
      const gold = data.items[id]?.gold || 1
      const score = (dps - prev) / gold
      if (!best || score > best.score) best = { id, dps, score }
    }
    order.push(best.id)
    left.splice(left.indexOf(best.id), 1)
    prev = best.dps
  }
  return order
}

/**
 * Best next item vs a target: try every allowed item, rank by time-to-kill.
 * candidates = item ids to try. Returns [{ id, ttk, dps, gain, gold }] best first.
 */
export function bestNextItem(cfg, data, build, foes, candidates, opts = {}) {
  const base = dummyRun(build(cfg, data, 'A0'), foes, { ...opts, record: false })
  const baseTtk = base.ttk ?? 30
  return candidates.map((id) => {
    const r = dummyRun(build({ ...cfg, items: [...cfg.items, id] }, data, 'A0'), foes, { ...opts, record: false })
    const ttk = r.ttk ?? 30
    return { id, ttk: r.ttk, dps: r.dps, gain: baseTtk - ttk, dpsGain: r.dps - base.dps, gold: data.items[id]?.gold || 0 }
  }).sort((a, b) => (a.ttk ?? 99) - (b.ttk ?? 99) || b.dps - a.dps)
}
