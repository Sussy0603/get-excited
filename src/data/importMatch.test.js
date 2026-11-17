import { it, expect } from 'vitest'
import { toConfig } from './importMatch.js'
import { normalize } from './ddragon.js'
import { FIXTURE } from './fixture.js'
const data = normalize(FIXTURE)
it('turns a Riot match player into a build', () => {
  const c = toConfig({ champ: 'jinx', level: 14, items: ['3031', '6672', '0', '999999'], keystone: 8008, minors: [8014, 9104], shards: [5005, 5008, 5001], summoners: [4, 7] }, data)
  expect(c.champ).toBe('Jinx')
  expect(c.items).toEqual(['3031', '6672'])
  expect(c.runes.keystone).toBe('LethalTempoTemp')
  expect(c.runes.minors).toEqual(['CoupDeGrace', 'LegendAlacrity'])
  expect(c.shards).toEqual(['as', 'adaptive', 'hpScale'])
  expect(c.summoners).toEqual(['SummonerFlash', 'SummonerHeal'])
})
