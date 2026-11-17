// All hand-made champion files in one place.
import { MARKSMEN } from './marksmen.js'
import { META } from './meta.js'

export const CHAMP_DEFS = { ...MARKSMEN, ...META }

// ✅ Champions checked in the Practice Tool.
// Add a champ id here once its numbers match the game (within ~2%).
export const VERIFIED = new Set([])

// What we know about a champ's abilities:
//  'full'  = hand-made ability file
//  'autos' = basic attacks only (abilities not added yet)
export const abilityStatus = (champId) => (CHAMP_DEFS[champId] ? 'full' : 'autos')

// Default combo when the player hasn't edited it.
export const defaultCombo = (champId) => CHAMP_DEFS[champId]?.combo || []
