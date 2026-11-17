// ─────────────────────────────────────────────────────────────
// ddragon.js — loads Riot's official game data ("Data Dragon").
// Always the latest patch. Cached in the browser per patch.
// If Riot's server can't be reached, we fall back to a small
// built-in sample so the site still works (with a banner).
// ─────────────────────────────────────────────────────────────
import { FIXTURE } from './fixture.js'
import { itemEffect } from './itemEffects.js'

const ROOT = 'https://ddragon.leagueoflegends.com'
const CDN = `${ROOT}/cdn`
export const LOCALES = { en: 'en_US', fr: 'fr_FR' }

export const img = {
  champ: (v, file) => `${CDN}/${v}/img/champion/${file}`,
  item: (v, file) => `${CDN}/${v}/img/item/${file}`,
  spell: (v, file) => `${CDN}/${v}/img/spell/${file}`,
  passive: (v, file) => `${CDN}/${v}/img/passive/${file}`,
  rune: (icon) => `${CDN}/img/${icon}`,
}

async function getJSON(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

const cacheGet = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const cacheSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full or blocked: fine */ } }

// patch = null → latest. Otherwise a version like "15.20.1".
export async function loadData(lang = 'en', patch = null) {
  const loc = LOCALES[lang] || 'en_US'
  try {
    const all = await getJSON(`${ROOT}/api/versions.json`)
    // Only real patches ("15.20.1"), newest first, last ~40.
    const versions = all.filter((x) => /^\d+\.\d+\.\d+$/.test(x)).slice(0, 40)
    const v = patch && versions.includes(patch) ? patch : versions[0]
    const key = `ge:dd:${v}:${loc}`
    const cached = cacheGet(key)
    if (cached) return hydrate({ ...cached, versions, latest: versions[0], offline: false })

    const base = `${CDN}/${v}/data`
    const [champs, itemsEn, itemsLoc, runes, summs] = await Promise.all([
      getJSON(`${base}/${loc}/champion.json`),
      getJSON(`${base}/en_US/item.json`),
      loc === 'en_US' ? null : getJSON(`${base}/${loc}/item.json`),
      getJSON(`${base}/${loc}/runesReforged.json`),
      getJSON(`${base}/${loc}/summoner.json`),
    ])
    const data = normalize({ version: v, champs, itemsEn, itemsLoc: itemsLoc || itemsEn, runes, summs })
    // Item effects are functions → can't be cached. Store without them, re-attach on load.
    cacheSet(key, stripFx(data))
    return { ...data, versions, latest: versions[0] }
  } catch (err) {
    console.warn('[Get Excited] Riot data unavailable, using offline sample.', err)
    return { ...normalize(FIXTURE), versions: [], latest: null, offline: true }
  }
}

function stripFx(data) {
  const items = {}
  for (const [id, it] of Object.entries(data.items)) items[id] = { ...it, effect: undefined }
  return { ...data, items }
}

// Re-attach item effects (functions) after reading from cache.
export function hydrate(data) {
  for (const it of Object.values(data.items)) it.effect = itemEffect(it.enName)
  return data
}

// ── Turn Riot's JSON into what the app needs ─────────────────
export function normalize({ version, champs, itemsEn, itemsLoc, runes, summs }) {
  const champions = {}
  for (const c of Object.values(champs.data)) {
    champions[c.id] = { id: c.id, key: c.key, name: c.name, title: c.title, tags: c.tags, stats: c.stats, image: c.image?.full, partype: c.partype }
  }

  const items = {}
  for (const [id, en] of Object.entries(itemsEn.data)) {
    if (!keepItem(en)) continue
    const loc = itemsLoc.data[id] || en
    items[id] = {
      id,
      name: loc.name,
      enName: en.name,
      gold: en.gold.total,
      stats: parseItemStats(en),
      effect: itemEffect(en.name),
      image: en.image?.full,
      tags: en.tags || [],
      starter: isStarterRaw(en),
      complete: !(en.into && en.into.length) || (en.tags || []).includes('Boots') || isStarterRaw(en),
      plaintext: loc.plaintext || '',
    }
  }

  const runeByKey = {}
  const trees = (runes || []).map((tree) => ({
    id: tree.id, key: tree.key, name: tree.name, icon: tree.icon,
    slots: tree.slots.map((s) => s.runes.map((r) => {
      const rr = { id: r.id, key: r.key, name: r.name, icon: r.icon, desc: stripTags(r.shortDesc || ''), tree: tree.key }
      runeByKey[r.key] = rr
      return rr
    })),
  }))

  const summoners = {}
  for (const s of Object.values(summs.data)) {
    if (s.modes && !s.modes.includes('CLASSIC')) continue
    summoners[s.id] = { id: s.id, name: s.name, image: s.image?.full }
  }

  return { version, champions, items, trees, runeByKey, summoners }
}

// Starter items: Doran's, Cull, Dark Seal, Tear, World Atlas, jungle pets…
export const isStarterRaw = (it) =>
  (it.gold?.total ?? it.gold) <= 500 &&
  ((it.tags || []).includes('Lane') || /Doran|Cull|Dark Seal|Tear of the Goddess|World Atlas|Seedling|Pup|Hatchling/i.test(it.name))

function keepItem(it) {
  if (!it.maps?.['11']) return false
  if (!it.gold?.purchasable || it.gold.total < 300) return false
  if (it.consumed || it.requiredChampion || it.requiredAlly || it.inStore === false) return false
  const tags = it.tags || []
  if (tags.includes('Consumable') || tags.includes('Trinket')) return false
  if (tags.includes('Jungle') && !isStarterRaw(it)) return false
  return true
}

const STAT_NAMES = {
  'attack damage': ['ad'],
  'ability power': ['ap'],
  'health': ['hp'],
  'armor': ['armor'],
  'magic resist': ['mr'],
  'attack speed': ['asPct', 1],
  'critical strike chance': ['crit', 0.01],
  'critical strike damage': ['critDmg', 0.01],
  'lethality': ['lethality'],
  'armor penetration': ['armorPenPct', 0.01],
  'magic penetration': ['magicPen', 1, 'magicPenPct', 0.01],
  'life steal': ['lifesteal', 0.01],
  'omnivamp': ['omnivamp', 0.01],
  'ability haste': ['ah'],
  'move speed': ['msFlat', 1, 'msPct', 0.01],
  'mana': ['mana'],
  'heal and shield power': ['healShieldPower', 0.01],
}

const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// Reads the <stats> block of an item description:
// "<attention>65</attention> Attack Damage<br><attention>25%</attention> Critical Strike Chance"
export function parseItemStats(it) {
  const out = {}
  const m = (it.description || '').match(/<stats>([\s\S]*?)<\/stats>/i)
  if (m) {
    for (const line of m[1].split(/<br\s*\/?>/i)) {
      const txt = stripTags(line)
      const mm = txt.match(/^([\d.]+)\s*(%?)\s+(.+)$/)
      if (!mm) continue
      const val = parseFloat(mm[1])
      const pct = mm[2] === '%'
      const spec = STAT_NAMES[mm[3].toLowerCase().trim()]
      if (!spec) continue
      let [k, mul = 1] = spec
      if (spec.length === 4 && pct) { k = spec[2]; mul = spec[3] }
      else if (spec.length === 4) { k = spec[0]; mul = spec[1] }
      out[k] = (out[k] || 0) + val * mul
    }
  }
  if (Object.keys(out).length) return out
  // Fallback: Riot's numeric stats object
  const s = it.stats || {}
  const f = {
    ad: s.FlatPhysicalDamageMod, ap: s.FlatMagicDamageMod, hp: s.FlatHPPoolMod, armor: s.FlatArmorMod,
    mr: s.FlatSpellBlockMod, asPct: s.PercentAttackSpeedMod ? s.PercentAttackSpeedMod * 100 : 0,
    crit: s.FlatCritChanceMod, lifesteal: s.PercentLifeStealMod, msFlat: s.FlatMovementSpeedMod,
    msPct: s.PercentMovementSpeedMod, mana: s.FlatMPPoolMod,
  }
  for (const k in f) if (f[k]) out[k] = f[k]
  return out
}

// Per-champion details (ability names + icons), loaded on demand.
const detailCache = {}
export async function loadChampDetail(version, lang, id) {
  const k = `${version}:${lang}:${id}`
  if (detailCache[k]) return detailCache[k]
  try {
    const j = await getJSON(`${CDN}/${version}/data/${LOCALES[lang] || 'en_US'}/champion/${id}.json`)
    const c = j.data[id]
    detailCache[k] = {
      passive: { name: c.passive.name, image: c.passive.image.full },
      spells: Object.fromEntries(['Q', 'W', 'E', 'R'].map((key, i) => [key, { name: c.spells[i].name, image: c.spells[i].image.full }])),
    }
  } catch {
    detailCache[k] = null
  }
  return detailCache[k]
}
