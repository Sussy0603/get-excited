// ─────────────────────────────────────────────────────────────
// itemRules.js — item categories (like Riot's shop) + slot rules.
// Riot's data has no "class" field, so we sort items by their stats,
// the same way the in-game shop groups them.
// ─────────────────────────────────────────────────────────────

export const ROLES = ['Starter', 'Fighter', 'Marksman', 'Assassin', 'Mage', 'Tank', 'Support', 'Boots']
export const ROLE_LABEL = {
  Fighter: { en: 'Fighter', fr: 'Combattant' },
  Marksman: { en: 'Marksman', fr: 'Tireur' },
  Assassin: { en: 'Assassin', fr: 'Assassin' },
  Mage: { en: 'Mage', fr: 'Mage' },
  Tank: { en: 'Tank', fr: 'Tank' },
  Support: { en: 'Support', fr: 'Support' },
  Boots: { en: 'Boots', fr: 'Bottes' },
  Starter: { en: 'Starter', fr: 'Départ' },
  Other: { en: 'Other', fr: 'Autres' },
}

export const isBoots = (it) => !!it && (it.tags || []).includes('Boots')

// Which shop categories an item belongs to (can be several).
export function itemRoles(it) {
  if (!it) return []
  if (isBoots(it)) return ['Boots']
  if (it.starter) return ['Starter']
  const s = it.stats || {}
  const tags = it.tags || []
  const r = []
  const tanky = (s.hp || 0) > 0 || (s.armor || 0) > 0 || (s.mr || 0) > 0
  if ((s.crit || 0) > 0 || ((s.asPct || 0) >= 20 && !(s.ap > 0) && !(s.hp > 0)) || tags.includes('OnHit') && (s.ad || 0) > 0) r.push('Marksman')
  if ((s.lethality || 0) > 0) r.push('Assassin')
  if ((s.ad || 0) > 0 && !(s.crit > 0) && !(s.lethality > 0) && (tanky || (s.ah || 0) > 0 || (s.omnivamp || 0) > 0)) r.push('Fighter')
  if ((s.ap || 0) > 0) r.push('Mage')
  if (tanky && !(s.ad > 0) && !(s.ap > 0) && !(s.healShieldPower > 0)) r.push('Tank')
  if ((s.healShieldPower || 0) > 0 || tags.includes('GoldPer') || (tags.includes('ManaRegen') && it.gold < 2600 && !(s.ap > 0))) r.push('Support')
  return r.length ? r : ['Other']
}

// Stat filter chips
export const STAT_FILTERS = [
  { id: 'ad', label: { en: 'Attack damage', fr: 'Dégâts d\'attaque' }, test: (s) => s.ad > 0, words: 'ad attack damage dégâts' },
  { id: 'crit', label: { en: 'Crit', fr: 'Critique' }, test: (s) => s.crit > 0 || s.critDmg > 0, words: 'crit critical critique' },
  { id: 'as', label: { en: 'Attack speed', fr: 'Vitesse d\'attaque' }, test: (s) => s.asPct > 0, words: 'as attack speed vitesse' },
  { id: 'onhit', label: { en: 'On-hit', fr: 'À l\'impact' }, test: (s, it) => (it.tags || []).includes('OnHit'), words: 'on-hit onhit impact' },
  { id: 'leth', label: { en: 'Lethality / armor pen', fr: 'Létalité / pén. armure' }, test: (s) => s.lethality > 0 || s.armorPenPct > 0, words: 'lethality armor pen pénétration létalité' },
  { id: 'ap', label: { en: 'Ability power', fr: 'Puissance' }, test: (s) => s.ap > 0, words: 'ap ability power puissance' },
  { id: 'mpen', label: { en: 'Magic pen', fr: 'Pén. magique' }, test: (s) => s.magicPen > 0 || s.magicPenPct > 0, words: 'magic pen pénétration magique' },
  { id: 'hp', label: { en: 'Health', fr: 'PV' }, test: (s) => s.hp > 0, words: 'health hp pv vie' },
  { id: 'armor', label: { en: 'Armor', fr: 'Armure' }, test: (s) => s.armor > 0, words: 'armor armure' },
  { id: 'mr', label: { en: 'Magic resist', fr: 'Résist. magique' }, test: (s) => s.mr > 0, words: 'mr magic resist résistance' },
  { id: 'ah', label: { en: 'Ability haste', fr: 'Accélération' }, test: (s) => s.ah > 0, words: 'ah ability haste accélération cdr' },
  { id: 'vamp', label: { en: 'Life steal / omnivamp', fr: 'Vol de vie / omnivamp' }, test: (s) => s.lifesteal > 0 || s.omnivamp > 0, words: 'life steal lifesteal omnivamp vol de vie' },
  { id: 'ms', label: { en: 'Move speed', fr: 'Vitesse' }, test: (s) => s.msFlat > 0 || s.msPct > 0, words: 'ms move speed vitesse déplacement' },
  { id: 'mana', label: { en: 'Mana', fr: 'Mana' }, test: (s) => s.mana > 0, words: 'mana' },
]

// Text a search can match: names + stat words.
export function searchText(it) {
  const s = it.stats || {}
  const statWords = STAT_FILTERS.filter((f) => f.test(s, it)).map((f) => f.words).join(' ')
  return `${it.name} ${it.enName} ${it.plaintext || ''} ${statWords} ${itemRoles(it).join(' ')}`.toLowerCase()
}

// ── Slot rules ─────────────────────────────────────────────
// Season 2026: bot laners who finish their Role Quest get a separate
// boots slot → 6 items + boots. Everyone else: 6 slots total.
export const defaultBootSlot = (champ) => (champ?.tags || []).includes('Marksman')

export function slotInfo(items, data, bootSlot) {
  const list = items.map((id) => data.items[id]).filter(Boolean)
  const boots = list.filter(isBoots).length
  const others = list.length - boots
  const max = bootSlot ? 7 : 6
  return {
    boots,
    others,
    canAddBoots: boots === 0 && (bootSlot ? true : list.length < 6),
    canAddItem: bootSlot ? others < 6 : list.length < 6,
    full: list.length >= max,
    max,
  }
}
