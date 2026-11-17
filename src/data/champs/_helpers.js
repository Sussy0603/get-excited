// ─────────────────────────────────────────────────────────────
// Tiny helpers so each champion file stays short and readable.
//
// HOW A CHAMPION FILE WORKS
//   spells: { Q, W, E, R } — each has a cooldown (cd), range,
//           cast time, and a list of "effects".
//   Numbers can be:
//     • a single number        → same at every rank
//     • an array [r1, r2, …]   → one value per rank
//   combo: the default order the sim tries abilities in.
//   hooks: special rules (passives) the generic effects can't express.
//
// EFFECT TYPES
//   dmg     damage (physical / magic / true) with ratios
//   dot     damage over time
//   buff    temporary stat boost on self
//   shield  shield on self
//   heal    heal self
//   cc      stun / root / knock-up on the target
//   dash    move toward or away (matters in positioning mode)
//   empower next N basic attacks deal extra damage
//   reset   resets the basic attack timer
// ─────────────────────────────────────────────────────────────

export const P = 'physical'
export const M = 'magic'
export const T = 'true'

// dmg(type, base, ratios, extras)
// ratios: ad (total AD), bad (bonus AD), ap, thp (% target max HP),
//         tmiss (% target missing HP), tcur (% target current HP),
//         hp (% own max HP), bhp (% own bonus HP), barmor (bonus armor)
export const dmg = (dt, base, r = {}, x = {}) => ({ t: 'dmg', dt, base, ...r, ...x })
export const dot = (dt, base, r = {}, dur = 3, x = {}) => ({ t: 'dot', dt, base, ...r, dur, ...x })
export const buff = (stat, val, dur, x = {}) => ({ t: 'buff', stat, val, dur, ...x })
export const shield = (base, r = {}, dur = 2.5) => ({ t: 'shield', base, ...r, dur })
export const heal = (base, r = {}) => ({ t: 'heal', base, ...r })
export const cc = (dur) => ({ t: 'cc', dur })
export const dash = (dist, dir = 'to') => ({ t: 'dash', dist, dir })
export const empower = (n, effect, x = {}) => ({ t: 'empower', n, effect, ...x })
export const reset = () => ({ t: 'reset' })
export const invuln = (dur) => ({ t: 'invuln', dur })

// Value at a given rank (1-5). Arrays are per rank.
export const atRank = (v, rank) =>
  Array.isArray(v) ? v[Math.max(0, Math.min(v.length - 1, rank - 1))] : v ?? 0

// Value that scales with champion level from min (lvl 1) to max (lvl 18).
export const byLevel = (min, max, level) => min + ((max - min) * (level - 1)) / 17

// Spell shortcut: S(cd, range, effects, extras)
export const S = (cd, range, effects, x = {}) => ({ cd, range, effects, cast: 0.25, ...x })
