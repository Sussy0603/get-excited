import { it, expect } from 'vitest'
import { normalizeRunes } from './RunePage.jsx'
import { normalize } from '../data/ddragon.js'
import { FIXTURE } from '../data/fixture.js'
const { trees } = normalize(FIXTURE)
it('old saved builds (keystone + minors) open as a full rune page', () => {
  const p = normalizeRunes({ keystone: 'LethalTempoTemp', minors: ['Triumph', 'LegendAlacrity', 'CoupDeGrace'] }, trees)
  expect(p.primary).toBe('Precision')
  expect(p.pPicks).toEqual(['Triumph', 'LegendAlacrity', 'CoupDeGrace'])
  expect(p.secondary).toBe('Domination')
})
