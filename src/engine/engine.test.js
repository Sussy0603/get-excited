// Run with: npm test
import { describe, it, expect } from 'vitest'
import { growth, ranksAt, computeStats } from './stats.js'
import { resistMultiplier, effectiveResist, mitigate, critAverage, ehp } from './damage.js'
import { buildUnit, buildDummies, newConfig } from './build.js'
import { dummyRun, fight, effectiveHp, bestOrder } from './metrics.js'
import { normalize, parseItemStats } from '../data/ddragon.js'
import { FIXTURE } from '../data/fixture.js'
import { CHAMP_DEFS } from '../data/champs/index.js'

const data = normalize(FIXTURE)
const cfg = (champ, extra = {}) => ({ ...newConfig(champ), ...extra })

describe('stat math', () => {
  it('level growth matches Riot formula', () => {
    expect(growth(630, 105, 1)).toBe(630)
    expect(growth(630, 105, 18)).toBeCloseTo(2415, 5)
  })
  it('skill order: R at 6/11/16, all maxed at 18', () => {
    expect(ranksAt(1)).toEqual({ Q: 1, W: 0, E: 0, R: 0 })
    expect(ranksAt(6)).toEqual({ Q: 3, W: 1, E: 1, R: 1 })
    expect(ranksAt(18)).toEqual({ Q: 5, W: 5, E: 5, R: 3 })
    expect(ranksAt(9, ['W', 'Q', 'E']).W).toBe(5)
  })
  it('attack speed caps at 2.5', () => {
    const s = computeStats({ champ: data.champions.Jinx, level: 18, items: [{ stats: { asPct: 500 } }] })
    expect(s.as).toBe(2.5)
  })
})

describe('damage math', () => {
  it('100 armor = half damage', () => expect(resistMultiplier(100)).toBe(0.5))
  it('negative armor = more damage', () => expect(resistMultiplier(-50)).toBeCloseTo(4 / 3, 5))
  it('% pen before flat pen', () => expect(effectiveResist({ resist: 100, penPct: 0.3, flatPen: 10 })).toBeCloseTo(60, 5))
  it('flat pen never below 0', () => expect(effectiveResist({ resist: 10, flatPen: 50 })).toBe(0))
  it('true damage ignores armor', () => expect(mitigate(100, 'true', {}, { armor: 300 })).toBe(100))
  it('average crit', () => expect(critAverage(0.5, 1.75)).toBe(1.375))
  it('effective HP', () => expect(ehp(1000, 100)).toBe(2000))
})

describe('Riot data parsing', () => {
  it('reads item stats from the description', () => {
    expect(parseItemStats(FIXTURE.itemsEn.data['3031'])).toEqual({ ad: 75, crit: 0.25, critDmg: 0.3 })
    expect(parseItemStats(FIXTURE.itemsEn.data['3036']).armorPenPct).toBeCloseTo(0.35)
  })
  it('2026 crit: 200% base, IE adds +30% (no double count)', () => {
    const j = buildUnit(cfg('Jinx', { items: ['3031'] }), data, 'A0')
    expect(j.stats.critDmg).toBeCloseTo(2.3, 5)
    const old = buildUnit(cfg('Jinx', { items: ['3031'] }), { ...data, version: '15.24.1' }, 'A0')
    expect(old.stats.critDmg).toBeCloseTo(2.05, 5)
  })
  it('attaches item passives by English name', () => {
    expect(data.items['6672'].effect.onHit).toBeTypeOf('function')
  })
})

describe('simulator', () => {
  const jinx = () => buildUnit(cfg('Jinx', { items: ['3031', '6672'] }), data, 'A0')
  const garen = () => buildUnit(cfg('Garen', { items: ['3075'] }), data, 'B0')

  it('kills a target dummy and is deterministic', () => {
    const a = dummyRun(jinx(), [garen()])
    const b = dummyRun(jinx(), [garen()])
    expect(a.ttk).toBeGreaterThan(1)
    expect(a.ttk).toBeLessThan(30)
    expect(a.ttk).toBe(b.ttk)
    expect(a.dps).toBeGreaterThan(50)
    expect(a.burst).toBeGreaterThan(100)
    const quiet = dummyRun(jinx(), [garen()], { record: false })
    expect(quiet.burst).toBe(a.burst)
  })

  it('more items = faster kill', () => {
    const naked = dummyRun(buildUnit(cfg('Jinx'), data, 'A0'), [garen()])
    const geared = dummyRun(jinx(), [garen()])
    expect(geared.ttk).toBeLessThan(naked.ttk)
  })

  it('two-way fight has a winner', () => {
    const r = fight([jinx()], [garen()], { twoWay: true })
    expect(['A', 'B']).toContain(r.winner)
    expect(r.frames.length).toBeGreaterThan(5)
    expect(r.log.some((e) => e.kind === 'death')).toBe(true)
  })

  it('positioning mode: melee has to walk first', () => {
    const still = dummyRun(buildUnit(cfg('Garen'), data, 'A0'), [jinx()])
    const moving = dummyRun(buildUnit(cfg('Garen'), data, 'A0'), [jinx()], { positioning: true })
    expect(moving.ttk).toBeGreaterThan(still.ttk)
  })

  it('clears a minion wave', () => {
    const r = dummyRun(jinx(), buildDummies('wave'))
    expect(r.ttk).not.toBeNull()
  })

  it('towers ignore ability damage', () => {
    const r = dummyRun(buildUnit(cfg('Lux', { level: 18 }), data, 'A0'), buildDummies('tower'))
    expect(r.split.magic).toBe(0)
  })

  it('effective HP goes up with armor', () => {
    const plain = effectiveHp(buildUnit(cfg('Garen'), data, 'B0'))
    const tanky = effectiveHp(garen())
    expect(tanky.physical).toBeGreaterThan(plain.physical)
  })
})

describe('extras', () => {
  it('best buy order keeps the same items', () => {
    const c = cfg('Jinx', { items: ['3075', '3031', '6672'] })
    const foe = buildUnit(cfg('Garen'), data, 'B0')
    const o = bestOrder(c, data, buildUnit, [foe])
    expect([...o].sort()).toEqual([...c.items].sort())
    expect(o[0]).not.toBe('3075') // a tank item is not Jinx's best first buy
  })
  it('Jinx gets excited on a takedown in a team fight', () => {
    const jinx = buildUnit(cfg('Jinx', { level: 18, items: ['3031', '6672', '3036'] }), data, 'A0')
    const lux = buildUnit(cfg('Lux', { level: 6 }), data, 'B0')
    const lux2 = buildUnit(cfg('Lux', { level: 6 }), data, 'B1')
    const r = fight([jinx], [lux, lux2], { twoWay: false })
    expect(r.log.some((e) => e.label === 'Get Excited!')).toBe(true)
  })
})

describe('every hand-made champion runs without errors', () => {
  const base = data.champions.Jinx
  for (const id of Object.keys(CHAMP_DEFS)) {
    it(id, () => {
      const local = { ...data, champions: { ...data.champions, [id]: { ...base, id, name: id, tags: [] } } }
      const me = buildUnit(cfg(id, { level: 18, items: ['3031', '3124'], runes: { keystone: 'PressTheAttack', minors: ['CoupDeGrace'] } }), local, 'A0')
      const foe = buildUnit(cfg('Garen', { level: 18 }), data, 'B0')
      for (const positioning of [false, true]) {
        const r = fight([me], [foe], { twoWay: true, positioning })
        expect(r.t).toBeGreaterThan(0)
        const mine = r.units[0].totals
        expect(mine.physical + mine.magic + mine.true).toBeGreaterThan(0)
      }
    })
  }
})
