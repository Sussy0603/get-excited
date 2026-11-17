// ─────────────────────────────────────────────────────────────
// damage.js — how armor and magic resist reduce damage.
// ─────────────────────────────────────────────────────────────

// 100 armor = you take half damage (100 / (100 + 100) = 0.5).
// Negative armor makes you take MORE damage.
export function resistMultiplier(resist) {
  return resist >= 0 ? 100 / (100 + resist) : 2 - 100 / (100 - resist)
}

// Lethality: flat armor penetration.
// ⚠ VERIFY EACH SEASON: Riot has changed whether lethality scales with level.
// Set to true for the old "60% + 40% × level/18" formula.
export const LETHALITY_SCALES_WITH_LEVEL = false
export const lethalityValue = (lethality, level) =>
  LETHALITY_SCALES_WITH_LEVEL ? lethality * (0.6 + (0.4 * level) / 18) : lethality

// Order of operations (Riot's rule): % reduction → % pen → flat pen.
// Flat pen can never push armor below 0.
export function effectiveResist({ resist, reduction = 0, penPct = 0, flatPen = 0 }) {
  let r = resist
  if (r > 0) r = r * (1 - reduction)
  if (r > 0) r = r * (1 - penPct)
  if (r > 0) r = Math.max(0, r - flatPen)
  return r
}

/**
 * mitigate — raw damage in, damage after armor/MR out.
 * @param raw     number
 * @param type    'physical' | 'magic' | 'true'
 * @param src     attacker stats ({ armorPenPct, lethality, magicPen, magicPenPct, level })
 * @param tgt     defender ({ armor, mr, armorShred })
 */
export function mitigate(raw, type, src, tgt) {
  if (type === 'true') return raw
  if (type === 'physical') {
    const r = effectiveResist({
      resist: tgt.armor,
      reduction: tgt.armorShred || 0,
      penPct: src.armorPenPct || 0,
      flatPen: lethalityValue(src.lethality || 0, src.level || 1),
    })
    return raw * resistMultiplier(r)
  }
  const r = effectiveResist({
    resist: tgt.mr,
    reduction: tgt.mrShred || 0,
    penPct: src.magicPenPct || 0,
    flatPen: src.magicPen || 0,
  })
  return raw * resistMultiplier(r)
}

// Effective HP: how much raw damage it takes to kill you.
export const ehp = (hp, resist) => hp / resistMultiplier(resist)

// Average crit: we don't roll dice, we use the average.
// 50% crit with 175% crit damage = 1 + 0.5 × 0.75 = 1.375× damage on average.
export const critAverage = (crit, critDmg) => 1 + crit * (critDmg - 1)
