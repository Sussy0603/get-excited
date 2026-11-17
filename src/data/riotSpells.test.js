import { it, expect } from 'vitest'
import { setSpellData, withRiotSpells } from './riotSpells.js'
import { CHAMP_DEFS } from './champs/index.js'
it("Riot's cooldowns, costs and ranges replace typed values", () => {
  setSpellData('Jinx', { W: { cooldown: [9, 8, 7, 6, 5], cost: [40, 45, 50, 55, 60], range: [1500], costType: 'mana' }, R: { cooldown: [90, 75, 60], cost: [100], range: [25000], costType: 'mana' } })
  const d = withRiotSpells(CHAMP_DEFS.Jinx, 'Jinx')
  expect(d.spells.W.cd).toEqual([9, 8, 7, 6, 5])
  expect(d.spells.W.cost).toEqual([40, 45, 50, 55, 60])
  expect(d.spells.W.range).toEqual([1500])
  expect(d.spells.R.range).toBe(25000) // global stays ours
  expect(CHAMP_DEFS.Jinx.spells.W.cd).toEqual([8, 7, 6, 5, 4]) // original untouched
})
