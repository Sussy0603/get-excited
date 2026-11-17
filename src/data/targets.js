// Non-champion targets: towers, epic monsters, minion waves.
// Approximate mid-game values. They never hit back.
export const TARGETS = {
  champ: { id: 'champ' },
  tower: {
    id: 'tower',
    label: { en: 'Outer tower', fr: 'Tour extérieure' },
    units: [{ name: { en: 'Tower', fr: 'Tour' }, hp: 5000, armor: 40, mr: 40, size: 90, structure: true }],
  },
  dragon: {
    id: 'dragon',
    label: { en: 'Dragon (~15 min)', fr: 'Dragon (~15 min)' },
    units: [{ name: { en: 'Dragon', fr: 'Dragon' }, hp: 5500, armor: 21, mr: 30, size: 100, monster: true, epic: true }],
  },
  baron: {
    id: 'baron',
    label: { en: 'Baron (~25 min)', fr: 'Baron (~25 min)' },
    units: [{ name: { en: 'Baron Nashor', fr: 'Baron Nashor' }, hp: 12000, armor: 120, mr: 70, size: 130, monster: true, epic: true }],
  },
  wave: {
    id: 'wave',
    label: { en: 'Minion wave (~10 min)', fr: 'Vague de sbires (~10 min)' },
    units: [
      ...Array.from({ length: 3 }, (_, i) => ({ name: { en: `Melee minion ${i + 1}`, fr: `Sbire mêlée ${i + 1}` }, hp: 600, armor: 16, mr: 0, size: 48, minion: true })),
      ...Array.from({ length: 3 }, (_, i) => ({ name: { en: `Caster minion ${i + 1}`, fr: `Sbire lanceur ${i + 1}` }, hp: 340, armor: 9, mr: 0, size: 48, minion: true })),
    ],
  },
}
export const TARGET_IDS = ['champ', 'tower', 'dragon', 'baron', 'wave']
