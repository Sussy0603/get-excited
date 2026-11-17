import { it, expect } from 'vitest'
import { slotInfo, itemRoles } from './itemRules.js'
import { normalize } from './ddragon.js'
import { FIXTURE } from './fixture.js'
const data = normalize(FIXTURE)
const six = ['3031', '6672', '3036', '3153', '3072', '3046']
it('bot lane: 6 items + boots', () => {
  const s = slotInfo(six, data, true)
  expect(s.canAddItem).toBe(false)
  expect(s.canAddBoots).toBe(true)
  expect(slotInfo([...six, '3006'], data, true).full).toBe(true)
})
it('others: 6 slots total, boots included', () => {
  expect(slotInfo(six, data, false).canAddBoots).toBe(false)
  expect(slotInfo(['3006', ...six.slice(0, 5)], data, false).full).toBe(true)
})
it('categories like the shop', () => {
  expect(itemRoles(data.items['3031'])).toContain('Marksman')
  expect(itemRoles(data.items['3089'])).toContain('Mage')
  expect(itemRoles(data.items['3075'])).toContain('Tank')
  expect(itemRoles(data.items['3006'])).toEqual(['Boots'])
  expect(itemRoles(data.items['3071'])).toContain('Fighter')
})
