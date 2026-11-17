// Turns a match from the import server into Get Excited configs.
import { configFor } from '../state/store.jsx'

const SUMMONER_IDS = {
  1: 'SummonerBoost', 3: 'SummonerExhaust', 4: 'SummonerFlash', 6: 'SummonerHaste', 7: 'SummonerHeal',
  11: 'SummonerSmite', 12: 'SummonerTeleport', 14: 'SummonerDot', 21: 'SummonerBarrier',
}
// Stat shard ids → our shard ids (offense, flex, defense rows)
const SHARD_IDS = {
  5008: 'adaptive', 5005: 'as', 5007: 'ah', 5010: 'ms', 5001: 'hpScale', 5011: 'hpFlat', 5013: 'tenacity', 5002: 'hpFlat', 5003: 'tenacity',
}

export const IMPORT_API_DEFAULT = import.meta.env?.VITE_IMPORT_API || ''

export async function fetchMatches(api, riotId, region) {
  const url = `${api.replace(/\/$/, '')}/matches?id=${encodeURIComponent(riotId)}&region=${region}&count=5`
  const r = await fetch(url)
  const j = await r.json().catch(() => ({ error: 'bad_response' }))
  if (!r.ok || j.error) throw new Error(j.error || `http_${r.status}`)
  return j
}

export function toConfig(p, data) {
  const id = Object.keys(data.champions).find((k) => k.toLowerCase() === (p.champ || '').toLowerCase())
  if (!id) return null
  const byId = {}
  for (const tr of data.trees) for (const slot of tr.slots) for (const r of slot) byId[r.id] = r.key
  return configFor(id, data, {
    level: p.level || 11,
    items: p.items.filter((x) => data.items[x]),
    runes: { keystone: byId[p.keystone] || null, minors: p.minors.map((x) => byId[x]).filter(Boolean).slice(0, 5) },
    shards: p.shards.map((x) => SHARD_IDS[x] || 'adaptive'),
    summoners: p.summoners.map((x) => SUMMONER_IDS[x]).filter(Boolean),
  })
}
