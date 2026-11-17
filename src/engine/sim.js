// ─────────────────────────────────────────────────────────────
// sim.js — the FIGHT SIMULATOR.
//
// How it works, like you're five:
//   1. Put everyone on the field.
//   2. Move the clock forward 0.05 seconds.
//   3. Each champ does ONE thing: cast a spell, attack, or move.
//   4. Write down what happened (log + HP snapshot).
//   5. Repeat until one team is dead or time runs out.
//
// Crits use the AVERAGE (no dice), so the same setup always
// gives the same result. That makes it easy to trust and test.
// ─────────────────────────────────────────────────────────────
import { mitigate, critAverage } from './damage.js'
import { hasteCd } from './stats.js'
import { atRank, byLevel } from '../data/champs/_helpers.js'

const RADIUS = 65          // champion "size" for range checks
const ARENA = 1600         // how far anyone can walk (positioning mode)
const MAX_LOG = 4000

export function simulate({ allies, enemies, opts = {} }) {
  return new Sim(allies, enemies, opts).run()
}

class Sim {
  constructor(allies, enemies, opts) {
    this.opts = { duration: 30, dt: 0.05, twoWay: true, positioning: false, frameEvery: 0.1, record: true, ...opts }
    this.t = 0
    this.queue = []
    this.dots = []
    this.log = []
    this.frames = []
    this.shots = []
    this.castSeq = 0
    this.units = []
    allies.forEach((b, i) => this.units.push(this.spawn(b, 'A', i, allies.length)))
    enemies.forEach((b, i) => this.units.push(this.spawn(b, 'B', i, enemies.length)))
    for (const u of this.units) u.def?.hooks?.init?.(u, this)
  }

  // ── Setup ────────────────────────────────────────────────
  spawn(b, side, i, n) {
    const ranged = (b.stats.range || 0) >= 300
    const pos = this.opts.positioning
      ? { x: side === 'A' ? (ranged ? -200 : 0) : (b.dummy ? 700 : 750 + (ranged ? 200 : 0)), y: (i - (n - 1) / 2) * 150 }
      : { x: side === 'A' ? 0 : 450, y: (i - (n - 1) / 2) * 150 }
    const itemFx = (b.items || []).map((it) => it.effect).filter(Boolean)
    return {
      ...b,
      stats: { ...b.stats },
      side,
      pos,
      hp: b.stats.hp,
      maxHp: b.stats.hp,
      st: {},
      buffs: [],
      shields: [],
      cds: {},
      used: {},
      empower: [],
      marks: {},
      tstate: {},
      shredBy: {},
      lowHpUsed: {},
      summUsed: {},
      itemFx,
      nextAttack: 0,
      lockUntil: 0,
      stunUntil: -1,
      invulnUntil: -1,
      stasisUntil: -1,
      exhaustUntil: -1,
      grievousUntil: -1,
      attacks: 0,
      dead: false,
      deathT: null,
      killedBy: null,
      totals: { physical: 0, magic: 0, true: 0, heal: 0, shield: 0, taken: 0, burst: 0, dealtTo: {} },
      firstHitT: null,
    }
  }

  // ── Main loop ────────────────────────────────────────────
  run() {
    const { duration, dt, frameEvery, record } = this.opts
    if (record) this.snap() // starting HP, before anyone acts
    let nextFrame = frameEvery
    for (let step = 0; ; step++) {
      this.t = Math.round(step * dt * 1000) / 1000
      if (this.t > duration) break
      this.runQueue()
      this.tickDots()
      for (const u of this.units) if (!u.dead) this.act(u)
      if (record && this.t >= nextFrame - 1e-9) { this.snap(); nextFrame += frameEvery }
      if (this.done()) break
    }
    if (record) this.snap()
    return this.result()
  }

  done() {
    const aAlive = this.units.some((u) => u.side === 'A' && !u.dead)
    const bAlive = this.units.some((u) => u.side === 'B' && !u.dead)
    return !aAlive || !bAlive
  }

  later(delay, fn) { this.queue.push({ t: this.t + delay, fn }) }
  runQueue() {
    if (!this.queue.length) return
    const due = this.queue.filter((q) => q.t <= this.t + 1e-9)
    this.queue = this.queue.filter((q) => q.t > this.t + 1e-9)
    for (const q of due) q.fn()
  }

  // ── One unit's turn ──────────────────────────────────────
  act(u) {
    if (u.dummy) return
    if (!this.opts.twoWay && u.side === 'B') return
    const t = this.t
    if (t < u.stunUntil || t < u.stasisUntil) return

    const tgt = this.pickTarget(u)
    if (!tgt) return
    const d = this.dist(u, tgt)
    const ctx = this.ctx(u, tgt)
    ctx.dist = d
    u.def?.hooks?.beforeAct?.(ctx)
    this.useSummoners(u, tgt, d)
    if (t < u.lockUntil) return

    for (const key of u.combo || []) if (this.tryCast(u, key, tgt, d, ctx)) return

    const range = this.range(u)
    if (d <= range + RADIUS) {
      if (t >= u.nextAttack) this.attack(u, tgt)
      else if (this.opts.positioning) this.kite(u, tgt, d)
    } else if (this.opts.positioning) this.moveToward(u, tgt, range)
  }

  pickTarget(u) {
    const foes = this.units.filter((x) => x.side !== u.side && !x.dead)
    if (!foes.length) return null
    if (u.targetKey) {
      const f = foes.find((x) => x.key === u.targetKey)
      if (f) return (u.curTgt = f)
    }
    if (u.curTgt && !u.curTgt.dead) return u.curTgt
    // Dummies (minion waves): lowest HP first. Champs: front-to-back.
    const sorted = [...foes].sort((a, b) => {
      if (a.dummy && b.dummy) return a.hp - b.hp
      const fr = (a.stats.range || 0) - (b.stats.range || 0)
      if (Math.abs(fr) > 50) return fr
      return this.dist(u, a) - this.dist(u, b)
    })
    return (u.curTgt = sorted[0])
  }

  // ── Spells ───────────────────────────────────────────────
  tryCast(u, key, tgt, d, ctx) {
    const sp = u.def?.spells?.[key]
    const rank = u.ranks?.[key]
    if (!sp || !rank || sp.toggle) return false
    if (this.t < (u.cds[key] || 0)) return false
    if (sp.when === 'never') return false
    if (key === 'R' && tgt.minion) return false // nobody ults a minion wave
    if (sp.when === 'lowhp' && u.hp / u.maxHp > 0.6) return false
    if (sp.ready && !sp.ready(ctx)) return false
    const hasDmg = sp.effects.some((e) => e.t === 'dmg' || e.t === 'dot')
    if (tgt.structure && hasDmg && !sp.effects.some((e) => e.onHit)) return false // spells don't hurt towers
    const range = atRank(sp.range, rank)
    const dashTo = sp.effects.find((e) => e.t === 'dash' && e.dir === 'to')
    if (range === 0) {
      if (d > this.range(u) + RADIUS + 300) return false // don't pop buffs from across the map
    } else if (d > range + (dashTo && this.opts.positioning ? dashTo.dist : 0) + RADIUS) return false
    if (sp.when === 'execute') {
      const est = this.estimate(u, tgt, sp, rank)
      if (!(est >= tgt.hp + this.shieldOf(tgt) || tgt.hp / tgt.maxHp < 0.3)) return false
    }
    this.cast(u, key, sp, rank, tgt)
    return true
  }

  cast(u, key, sp, rank, tgt) {
    const t = this.t
    let cd = atRank(sp.cd, rank)
    if (u.def?.hooks?.cdMod) cd = u.def.hooks.cdMod(u, key, cd)
    u.cds[key] = t + hasteCd(cd, this.ah(u))
    u.lockUntil = t + (sp.cast ?? 0.25)
    u.used[key] = (u.used[key] || 0) + 1
    if (u.itemFx.some((f) => f.spellblade) && t >= (u.sbCd || 0)) u.spellbladeReady = true
    const castId = ++this.castSeq
    this.push({ kind: 'cast', src: u.key, tgt: tgt.key, label: key })
    if (sp.effects.some((e) => e.t === 'dmg' || e.t === 'dot')) this.shots.push({ t, src: u.key, tgt: tgt.key, kind: 'spell' })

    const ctx = this.ctx(u, tgt)
    const area = sp.aoe ? this.aoeTargets(u, tgt) : [tgt]
    const hit = new Set()
    for (const e of sp.effects) {
      switch (e.t) {
        case 'dmg':
          for (const x of e.aoe || sp.aoe ? area : [tgt]) {
            let raw = this.raw(e, rank, u, x)
            if (e.crit) raw *= critAverage(this.crit(u), u.stats.critDmg)
            const dealt = this.deal(u, x, raw, e.dt, { ability: key, castId, label: key })
            if (dealt > 0) hit.add(x)
            if (e.onHit) this.onHitEffects(u, x, castId)
          }
          break
        case 'dot':
          for (const x of e.aoe || sp.aoe ? area : [tgt]) {
            let raw = this.raw(e, rank, u, x)
            if (e.crit) raw *= critAverage(this.crit(u), u.stats.critDmg)
            this.addDot(u, x, e.dt, raw, atRank(e.dur, rank), key)
            hit.add(x)
          }
          break
        case 'buff': this.giveBuff(u, e.stat, atRank(e.val, rank), atRank(e.dur, rank), key); break
        case 'shield': this.addShield(u, this.raw(e, rank, u, tgt), atRank(e.dur, rank), key); break
        case 'heal': this.healUnit(u, this.raw(e, rank, u, tgt) + (e.miss || 0) * (u.maxHp - u.hp), key); break
        case 'cc': for (const x of area) this.stun(x, atRank(e.dur, rank), u); break
        case 'dash': this.doDash(u, tgt, e.dist, e.dir); break
        case 'empower': u.empower.push({ n: e.n, effect: e.effect, rank, key }); break
        case 'reset': u.nextAttack = t; break
        case 'invuln': u.invulnUntil = t + atRank(e.dur, rank); break
      }
    }
    u.def?.hooks?.onSpell?.(ctx, key)

    for (const x of hit) {
      const c = this.ctx(u, x)
      const extra = [
        ...(u.def?.hooks?.afterSpellHit?.(c, key) || []),
        ...u.runes.flatMap((r) => r.onSpellHit?.(c) || []),
      ]
      for (const f of u.itemFx) f.onSpellHit?.(c)
      for (const l of extra) this.deal(u, x, l.raw, l.dt, { label: l.label, castId, rune: true })
    }
  }

  // Raw (pre-armor) damage of an effect against target x.
  raw(e, rank, u, x) {
    const R = (v) => atRank(v, rank)
    let v =
      R(e.base) + R(e.ad) * this.ad(u) + R(e.bad) * this.bonusAd(u) + R(e.ap) * this.ap(u) +
      R(e.thp) * x.maxHp + R(e.tmiss) * (x.maxHp - x.hp) + R(e.tcur) * x.hp +
      R(e.hp) * u.maxHp + R(e.bhp) * (u.stats.bonusHp || 0) +
      R(e.armor) * this.armor(u) + R(e.barmor) * (u.stats.bonusArmor || 0)
    if (e.extra) v += e.extra(this.ctx(u, x))
    if (e.missingMult) v *= 1 + e.missingMult * (1 - x.hp / x.maxHp)
    const hits = typeof e.hits === 'function' ? e.hits(this.ctx(u, x)) : R(e.hits ?? 1)
    return Math.max(0, v * hits)
  }

  estimate(u, tgt, sp, rank) {
    let sum = 0
    for (const e of sp.effects) {
      if (e.t !== 'dmg' && e.t !== 'dot') continue
      let raw = this.raw(e, rank, u, tgt)
      if (e.crit) raw *= critAverage(this.crit(u), u.stats.critDmg)
      sum += mitigate(raw, e.dt, this.penStats(u), this.defStats(tgt))
    }
    return sum
  }

  // ── Basic attacks ────────────────────────────────────────
  attack(u, tgt) {
    const t = this.t
    const as = this.as(u, tgt)
    u.nextAttack = t + 1 / as
    u.lockUntil = t + Math.min(0.25, 0.3 / as)
    const castId = ++this.castSeq
    const ctx = this.ctx(u, tgt)
    const hooks = u.def?.hooks
    let raw, dt = 'physical'
    if (u.def?.autoOverride) ({ raw, dt } = u.def.autoOverride(ctx))
    else raw = this.ad(u) * (hooks?.attackMult?.(ctx) ?? 1) * (1 + this.buffSum(u, 'attackMult'))

    const critTaken = tgt.itemFx.reduce((m, f) => m * (f.critTaken || 1), 1)
    raw *= critAverage(this.crit(u), 1 + (u.stats.critDmg - 1) * critTaken)

    this.shots.push({ t, src: u.key, tgt: tgt.key, kind: 'atk' })
    if (u.def?.attackSplit) {
      const m = u.def.attackSplit.magic
      this.deal(u, tgt, raw * (1 - m), 'physical', { auto: true, castId, label: 'Attack' })
      this.deal(u, tgt, raw * m, 'magic', { auto: true, castId, label: 'Attack' })
    } else this.deal(u, tgt, raw, dt, { auto: true, castId, label: 'Attack' })

    this.onHitEffects(u, tgt, castId)
    hooks?.onAttack?.(ctx)
    u.attacks++

    // Runaan's bolts
    const bolts = u.itemFx.find((f) => f.bolts)
    if (bolts) {
      const others = this.aoeTargets(u, tgt).filter((x) => x !== tgt).slice(0, 2)
      for (const x of others) {
        this.deal(u, x, raw * bolts.bolts, 'physical', { auto: true, castId, label: 'Runaan\'s bolt' })
        this.onHitEffects(u, x, castId)
      }
    }
  }

  onHitEffects(u, tgt, castId) {
    if (tgt.dead) return
    const t = this.t
    const ctx = this.ctx(u, tgt)
    const list = []
    if (u.empower.length) {
      const em = u.empower[0]
      list.push({ dt: em.effect.dt, raw: this.raw(em.effect, em.rank, u, tgt), label: em.key })
      if (--em.n <= 0) u.empower.shift()
    }
    if (u.spellbladeReady && t >= (u.sbCd || 0)) {
      const best = u.itemFx.filter((f) => f.spellblade).map((f) => f.spellblade(ctx)).sort((a, b) => b.raw - a.raw)[0]
      if (best) list.push({ ...best, label: 'Spellblade' })
      u.spellbladeReady = false
      u.sbCd = t + 1.5
    }
    list.push(...(u.def?.hooks?.onHit?.(ctx) || []))
    for (const f of u.itemFx) if (f.onHit) list.push(...f.onHit(ctx))
    for (const r of u.runes) if (r.onHit) list.push(...r.onHit(ctx))
    for (const l of list) if (l.raw > 0) this.deal(u, tgt, l.raw, l.dt, { auto: true, onHit: true, castId, label: l.label })
  }

  // ── Damage pipeline ──────────────────────────────────────
  deal(src, tgt, raw, type, tags = {}) {
    const t = this.t
    if (!tgt || tgt.dead || !(raw > 0)) return 0
    if (t < tgt.invulnUntil || t < tgt.stasisUntil) return 0
    if (tgt.structure && !tags.auto && !tags.dot) return 0

    const ctx = this.ctx(src, tgt)
    ctx.tags = tags
    let amp = 1
    for (const r of src.runes) if (r.amp) amp *= r.amp(ctx)
    if (t < src.exhaustUntil) amp *= 0.65

    let dmg = mitigate(raw * amp, type, this.penStats(src), this.defStats(tgt))
    dmg *= 1 - Math.min(0.8, this.buffSum(tgt, 'dmgRed'))

    // Bone Plating: next 3 hits from a champ reduced (55s cooldown)
    const bp = tgt.runes.find((r) => r.takenFlat)
    if (bp && !src.dummy && !tags.dot) {
      const s = tgt.st
      if (s.bpLeft == null && t >= (s.bpCd ?? -1)) { s.bpLeft = 3; s.bpUntil = t + 1.5; s.bpCd = t + 55 }
      if (s.bpLeft > 0 && t < s.bpUntil) { dmg = Math.max(0, dmg - bp.takenFlat(tgt)); s.bpLeft-- }
      else if (s.bpLeft != null && (s.bpLeft <= 0 || t >= s.bpUntil)) s.bpLeft = null
    }

    // Shields soak first
    let rem = dmg
    tgt.shields = tgt.shields.filter((s) => s.until > t && s.amt > 0)
    for (const s of tgt.shields) {
      if (rem <= 0) break
      if (s.kind === 'magic' && type !== 'magic') continue
      const take = Math.min(s.amt, rem)
      s.amt -= take
      rem -= take
    }
    tgt.hp -= rem
    if (src.firstHitT == null) src.firstHitT = t
    src.totals[type] += dmg
    if (t - src.firstHitT <= 3 + 1e-9) src.totals.burst += dmg
    src.totals.dealtTo[tgt.key] = (src.totals.dealtTo[tgt.key] || 0) + dmg
    tgt.totals.taken += dmg
    this.push({ kind: 'dmg', src: src.key, tgt: tgt.key, label: tags.label || 'Hit', amount: dmg, dtype: type })

    // Grievous Wounds, armor shred
    if (src.itemFx.some((f) => f.grievous) && !tgt.dummy) tgt.grievousUntil = Math.max(tgt.grievousUntil, t + 3)
    const shred = src.itemFx.find((f) => f.shred)
    if (shred && type === 'physical') tgt.shredBy[src.key] = Math.min(shred.shred.max, (tgt.shredBy[src.key] || 0) + shred.shred.per)

    // Healing from damage: life steal (attacks), omnivamp (all), Conqueror
    let h = 0
    if (tags.auto) h += dmg * this.lifesteal(src)
    h += dmg * (src.stats.omnivamp || 0) * (tags.dot ? 0.33 : 1)
    for (const r of src.runes) if (r.healOnDmg) h += dmg * r.healOnDmg(src)
    if (h > 0) this.healUnit(src, h, null, true)

    tgt.def?.hooks?.onTakeDamage?.(tgt, dmg)

    // Thornmail / Bramble reflect on basic attacks
    if (tags.auto && !tags.onHit && !tags.reflect) {
      for (const f of tgt.itemFx) {
        if (!f.reflect) continue
        this.deal(tgt, src, f.reflect.base + f.reflect.barmor * (tgt.stats.bonusArmor || 0), 'magic', { reflect: true, label: 'Thorns' })
        if (f.grievousOnHitTaken) src.grievousUntil = Math.max(src.grievousUntil, t + 3)
      }
    }

    // Runes that react to damage (Electrocute, Dark Harvest…)
    if (!tags.rune && !tags.reflect && !tgt.dummy) {
      for (const r of src.runes) {
        if (!r.onDamage) continue
        for (const l of r.onDamage(ctx)) this.deal(src, tgt, l.raw, l.dt, { rune: true, label: l.label, castId: tags.castId })
      }
    }

    // The Collector execute
    const ex = src.itemFx.find((f) => f.execute)
    if (ex && tgt.hp > 0 && !tgt.dummy && tgt.hp / tgt.maxHp < ex.execute) this.deal(src, tgt, tgt.hp, 'true', { rune: true, label: 'Execute' })

    if (tgt.hp > 0) this.checkLowHp(tgt)
    if (tgt.hp <= 0 && !tgt.dead) this.kill(tgt, src)
    return dmg
  }

  kill(u, src) {
    u.dead = true
    u.hp = 0
    u.deathT = this.t
    u.killedBy = src?.key
    this.push({ kind: 'death', src: src?.key, tgt: u.key, label: 'Kill' })
  }

  checkLowHp(u) {
    const f = u.hp / u.maxHp
    for (const it of u.items || []) {
      const e = it.effect
      if (e?.lowHp && !u.lowHpUsed[it.id] && f < e.lowHp.at) { u.lowHpUsed[it.id] = true; e.lowHp.fn(u, this) }
    }
    if (f < 0.3) {
      for (const s of u.summoners || []) {
        if (u.summUsed[s]) continue
        if (s === 'SummonerHeal') { u.summUsed[s] = true; this.healUnit(u, byLevel(80, 318, u.stats.level), 'Heal') }
        if (s === 'SummonerBarrier') { u.summUsed[s] = true; this.addShield(u, byLevel(105, 411, u.stats.level), 2.5, 'Barrier') }
      }
    }
  }

  useSummoners(u, tgt, d) {
    for (const s of u.summoners || []) {
      if (u.summUsed[s]) continue
      if (s === 'SummonerDot' && !tgt.dummy && d <= 600 + RADIUS) {
        u.summUsed[s] = true
        this.addDot(u, tgt, 'true', 70 + 20 * u.stats.level, 5, 'Ignite')
        tgt.grievousUntil = Math.max(tgt.grievousUntil, this.t + 5)
      }
      if (s === 'SummonerExhaust' && !tgt.dummy && this.opts.twoWay && d <= 650 + RADIUS) {
        u.summUsed[s] = true
        tgt.exhaustUntil = this.t + 3
        this.push({ kind: 'cc', src: u.key, tgt: tgt.key, label: 'Exhaust' })
      }
      if (s === 'SummonerSmite' && tgt.monster && tgt.hp <= (tgt.epic ? 1200 : 600)) {
        u.summUsed[s] = true
        this.deal(u, tgt, tgt.epic ? 1200 : 600, 'true', { label: 'Smite', rune: true })
      }
      if (!this.opts.positioning) continue
      const range = this.range(u)
      if (s === 'SummonerHaste' && d > range + RADIUS) { u.summUsed[s] = true; this.giveBuff(u, 'msPct', 0.3, 10, 'Ghost') }
      if (s === 'SummonerFlash' && range < 300 && d > range + RADIUS && d < range + RADIUS + 400) {
        u.summUsed[s] = true
        this.stepToward(u, tgt.pos, Math.min(400, d - range))
        this.push({ kind: 'cast', src: u.key, tgt: tgt.key, label: 'Flash' })
      }
    }
  }

  // ── Effects helpers (also used by champ/item/rune hooks) ─
  addDot(src, tgt, type, total, dur, label, unique) {
    if (!tgt || tgt.dead || !(total > 0)) return
    if (unique) {
      const old = this.dots.find((d) => d.src === src && d.tgt === tgt && d.unique === unique)
      if (old) this.dots.splice(this.dots.indexOf(old), 1)
    }
    const ticks = Math.max(1, Math.round(dur / 0.5))
    this.dots.push({ src, tgt, type, per: total / ticks, left: ticks, next: this.t + 0.5, label, unique })
  }
  tickDots() {
    for (const d of this.dots) {
      while (d.left > 0 && d.next <= this.t + 1e-9) {
        this.deal(d.src, d.tgt, d.per, d.type, { dot: true, label: d.label })
        d.left--
        d.next += 0.5
      }
    }
    this.dots = this.dots.filter((d) => d.left > 0 && !d.tgt.dead)
  }

  healUnit(u, amt, label, isVamp = false) {
    if (u.dead || !(amt > 0)) return
    let m = 1 + u.itemFx.reduce((s, f) => s + (f.healMult || 0), 0)
    if (this.t < u.grievousUntil) m *= 0.6
    amt *= m
    const real = Math.min(u.maxHp - u.hp, amt)
    u.hp += real
    u.totals.heal += real
    const bt = u.itemFx.find((f) => f.overheal)
    if (isVamp && bt && amt > real) {
      let sh = u.shields.find((s) => s.label === 'Overheal')
      if (!sh) { sh = { amt: 0, until: 1e9, kind: 'all', label: 'Overheal' }; u.shields.push(sh) }
      sh.amt = Math.min(bt.overheal(u), sh.amt + (amt - real))
    }
    if (label && real > 0) this.push({ kind: 'heal', src: u.key, tgt: u.key, label, amount: real })
  }

  addShield(u, amt, dur, label, kind = 'all') {
    if (u.dead || !(amt > 0)) return
    amt *= 1 + (u.stats.healShieldPower || 0) + u.itemFx.reduce((s, f) => s + (f.healMult || 0), 0)
    u.shields.push({ amt, until: this.t + dur, kind, label })
    u.totals.shield += amt
    this.push({ kind: 'shield', src: u.key, tgt: u.key, label, amount: amt })
  }

  stun(x, dur, src) {
    if (!x || x.dead || x.structure || !(dur > 0)) return
    if ((x.summoners || []).includes('SummonerBoost') && !x.summUsed.SummonerBoost) {
      x.summUsed.SummonerBoost = true
      this.push({ kind: 'cc', src: x.key, tgt: x.key, label: 'Cleanse' })
      return
    }
    x.stunUntil = Math.max(x.stunUntil, this.t + dur)
    this.push({ kind: 'cc', src: src?.key, tgt: x.key, label: `CC ${dur.toFixed(1)}s` })
    if (src) for (const r of src.runes) r.onCC?.(this.ctx(src, x))
  }

  stasis(u, dur, label) {
    u.stasisUntil = this.t + dur
    this.push({ kind: 'cc', src: u.key, tgt: u.key, label })
  }

  giveBuff(u, stat, val, dur, label) { u.buffs.push({ stat, val, until: this.t + dur, label }) }
  buffSum(u, stat) {
    let s = 0
    for (const b of u.buffs) if (b.stat === stat && b.until > this.t) s += b.val
    return s
  }
  shieldOf(u) { return u.shields.reduce((s, x) => s + (x.until > this.t ? x.amt : 0), 0) }

  // ── Live stats (base stats + buffs + passives) ───────────
  runeSum(u, fn) { return u.runes.reduce((s, r) => s + (r[fn] ? r[fn](u) : 0), 0) }
  ad(u) { return u.stats.ad + this.buffSum(u, 'ad') + this.runeSum(u, 'adBonus') }
  bonusAd(u) { return (u.stats.bonusAd || 0) + this.buffSum(u, 'ad') + this.runeSum(u, 'adBonus') }
  ap(u) { return (u.stats.ap || 0) + this.buffSum(u, 'ap') }
  armor(u) { return u.stats.armor + this.buffSum(u, 'armor') }
  mr(u) { return u.stats.mr + this.buffSum(u, 'mr') }
  crit(u) { return Math.min(1, (u.stats.crit || 0) + this.buffSum(u, 'crit')) }
  ah(u) { return u.stats.ah || 0 }
  lifesteal(u) { return (u.stats.lifesteal || 0) + this.buffSum(u, 'lifesteal') }
  range(u) { return (u.stats.range || 0) + this.buffSum(u, 'range') + (u.def?.hooks?.rangeBonus?.(u, u.ranks) || 0) }
  ms(u) { return (u.stats.ms || 330) * (1 + this.buffSum(u, 'msPct')) }
  as(u, tgt) {
    let v
    if (u.def?.fixedAS) v = u.def.fixedAS
    else {
      const bonus = (u.stats.bonusAsPct || 0) + this.buffSum(u, 'asPct') +
        (u.def?.hooks?.asBonus?.(u, u.ranks) || 0) +
        u.itemFx.reduce((s, f) => s + (f.asBonus ? f.asBonus(u) : 0), 0) +
        this.runeSum(u, 'asBonus')
      v = Math.min(2.5, u.stats.asBase + u.stats.asRatio * (bonus / 100))
    }
    if (tgt?.itemFx?.some((f) => f.slowAttackers)) v *= 0.8
    return Math.max(0.2, v)
  }
  penStats(u) {
    return {
      armorPenPct: u.stats.armorPenPct || 0,
      lethality: (u.stats.lethality || 0) + this.buffSum(u, 'lethality'),
      magicPen: u.stats.magicPen || 0,
      magicPenPct: u.stats.magicPenPct || 0,
      level: u.stats.level || 1,
    }
  }
  defStats(x) {
    const shred = Math.min(0.5, Object.values(x.shredBy).reduce((a, b) => a + b, 0))
    return { armor: this.armor(x), mr: this.mr(x), armorShred: shred }
  }

  // ── Positioning ──────────────────────────────────────────
  dist(a, b) {
    if (!this.opts.positioning) return 0
    return Math.max(0, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) - (b.dummy ? (b.size || 65) - RADIUS : 0))
  }
  stepToward(u, p, len) {
    const dx = p.x - u.pos.x, dy = p.y - u.pos.y
    const L = Math.hypot(dx, dy) || 1
    u.pos.x = clamp(u.pos.x + (dx / L) * len)
    u.pos.y = clamp(u.pos.y + (dy / L) * len)
  }
  moveToward(u, tgt, range) {
    const d = this.dist(u, tgt)
    this.stepToward(u, tgt.pos, Math.min(this.ms(u) * this.opts.dt, Math.max(0, d - range)))
  }
  kite(u, tgt, d) {
    const myR = this.range(u)
    const theirR = this.range(tgt)
    if (myR < 300 || theirR >= myR || tgt.dummy) return
    if (d > theirR + RADIUS * 2 + 40) return
    if (this.t > u.nextAttack - 0.1) return
    this.stepToward(u, { x: 2 * u.pos.x - tgt.pos.x, y: 2 * u.pos.y - tgt.pos.y }, this.ms(u) * this.opts.dt * 0.8)
  }
  doDash(u, tgt, dist, dir) {
    if (!this.opts.positioning) return
    if (dir === 'to') this.stepToward(u, tgt.pos, Math.max(0, Math.min(dist, this.dist(u, tgt) - RADIUS)))
    else if (dir === 'away') this.stepToward(u, { x: 2 * u.pos.x - tgt.pos.x, y: 2 * u.pos.y - tgt.pos.y }, dist)
    else if (dir === 'side') {
      const dx = tgt.pos.x - u.pos.x, dy = tgt.pos.y - u.pos.y
      this.stepToward(u, { x: u.pos.x - dy, y: u.pos.y + dx }, dist * 0.6)
    } else if (dir === 'pull') this.stepToward(tgt, u.pos, Math.max(0, this.dist(u, tgt) - RADIUS * 2))
    for (const r of u.runes) r.onDash?.(this.ctx(u, tgt))
  }
  aoeTargets(u, tgt) {
    const foes = this.units.filter((x) => x.side !== u.side && !x.dead)
    if (foes.every((x) => x.minion)) return foes
    if (this.opts.positioning) return foes.filter((x) => x === tgt || Math.hypot(x.pos.x - tgt.pos.x, x.pos.y - tgt.pos.y) < 350)
    return [tgt, ...foes.filter((x) => x !== tgt).slice(0, 2)]
  }

  // ── Context object handed to hooks ───────────────────────
  ctx(u, tgt) {
    const sim = this
    const marksFor = () => {
      if (!tgt) return {}
      tgt.marks[u.key] = tgt.marks[u.key] || {}
      return tgt.marks[u.key]
    }
    const mark = (name) => {
      const m = marksFor()[name]
      return m && m.until > sim.t ? m.n : 0
    }
    return {
      sim, u, tgt, t: this.t, rank: u.ranks || {}, dist: 0, tags: {},
      ad: this.ad(u), bonusAd: this.bonusAd(u), ap: this.ap(u), as: this.as(u),
      mark,
      addMark: (name, n = 1, dur = 4, max = Infinity) => { marksFor()[name] = { n: Math.min(max, mark(name) + n), until: sim.t + dur } },
      clearMark: (name) => { delete marksFor()[name] },
      tgtState: () => { if (!tgt) return {}; tgt.tstate[u.key] = tgt.tstate[u.key] || {}; return tgt.tstate[u.key] },
      stun: (x, d) => sim.stun(x, d, u),
      giveBuff: (s, v, d, l) => sim.giveBuff(u, s, v, d, l),
      buff: (s) => sim.buffSum(u, s),
    }
  }

  // ── Recording ────────────────────────────────────────────
  push(e) { if (this.opts.record && this.log.length < MAX_LOG) this.log.push({ t: this.t, ...e }) }
  snap() {
    this.frames.push({
      t: this.t,
      u: this.units.map((u) => ({ k: u.key, x: Math.round(u.pos.x), y: Math.round(u.pos.y), hp: Math.max(0, Math.round(u.hp)), sh: Math.round(this.shieldOf(u)), dead: u.dead })),
    })
  }
  result() {
    const aAlive = this.units.some((u) => u.side === 'A' && !u.dead)
    const bAlive = this.units.some((u) => u.side === 'B' && !u.dead)
    return {
      t: this.t,
      winner: aAlive && !bAlive ? 'A' : bAlive && !aAlive ? 'B' : null,
      units: this.units.map((u) => ({
        key: u.key, name: u.name, side: u.side, champId: u.champId, dummy: !!u.dummy,
        maxHp: u.maxHp, hp: Math.max(0, u.hp), dead: u.dead, deathT: u.deathT, killedBy: u.killedBy,
        totals: u.totals, firstHitT: u.firstHitT, range: u.stats.range,
      })),
      frames: this.frames,
      log: this.log,
      shots: this.shots,
    }
  }
}

const clamp = (v) => Math.max(-ARENA, Math.min(ARENA, v))
