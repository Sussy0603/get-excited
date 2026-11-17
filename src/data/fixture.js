// Small offline sample in Riot's format. Used when Riot's server
// can't be reached, and by the automated tests.
const st = (hp, hpl, ar, arl, mr, mrl, ad, adl, as, asl, range, ms) => ({
  hp, hpperlevel: hpl, mp: 300, mpperlevel: 40, armor: ar, armorperlevel: arl,
  spellblock: mr, spellblockperlevel: mrl, attackdamage: ad, attackdamageperlevel: adl,
  attackspeed: as, attackspeedperlevel: asl, attackrange: range, movespeed: ms,
})
const champ = (id, name, tags, stats) => ({ id, key: id, name, title: '', tags, stats, image: { full: `${id}.png` } })

const item = (id, name, gold, statsHtml, extra = {}) => ({
  [id]: {
    name, description: `<mainText><stats>${statsHtml}</stats></mainText>`, gold: { total: gold, purchasable: true },
    maps: { 11: true }, tags: [], image: { full: `${id}.png` }, ...extra,
  },
})
const a = (v, label) => `<attention>${v}</attention> ${label}`

export const FIXTURE = {
  version: 'offline',
  champs: {
    data: {
      Jinx: champ('Jinx', 'Jinx', ['Marksman'], st(630, 105, 26, 4.7, 30, 1.3, 59, 3.4, 0.625, 1.4, 525, 325)),
      Caitlyn: champ('Caitlyn', 'Caitlyn', ['Marksman'], st(580, 107, 27, 4.7, 30, 1.3, 60, 3.8, 0.681, 4, 650, 325)),
      Vayne: champ('Vayne', 'Vayne', ['Marksman', 'Assassin'], st(550, 103, 23, 4.6, 30, 1.3, 60, 2.35, 0.658, 3.3, 550, 330)),
      Garen: champ('Garen', 'Garen', ['Fighter', 'Tank'], st(690, 98, 38, 4.2, 32, 1.55, 69, 4.5, 0.625, 3.65, 175, 340)),
      Darius: champ('Darius', 'Darius', ['Fighter', 'Tank'], st(652, 114, 39, 5.2, 32, 2.05, 64, 5, 0.625, 1, 175, 340)),
      Leona: champ('Leona', 'Leona', ['Tank', 'Support'], st(646, 101, 47, 4.8, 32, 2.05, 60, 3, 0.625, 2.9, 125, 335)),
      Lux: champ('Lux', 'Lux', ['Mage', 'Support'], st(580, 99, 21, 5.2, 30, 1.3, 54, 3.3, 0.669, 1, 550, 330)),
      Ahri: champ('Ahri', 'Ahri', ['Mage', 'Assassin'], st(590, 104, 21, 4.2, 30, 1.3, 53, 3, 0.668, 2.2, 550, 330)),
      Malphite: champ('Malphite', 'Malphite', ['Tank', 'Fighter'], st(665, 104, 37, 4.95, 28, 2.05, 62, 4, 0.736, 3.4, 125, 335)),
      Teemo: champ('Teemo', 'Teemo', ['Marksman', 'Assassin'], st(615, 104, 24, 4.95, 30, 1.3, 54, 3, 0.69, 3.38, 500, 330)),
    },
  },
  itemsEn: {
    data: {
      ...item('3031', 'Infinity Edge', 3500, `${a(75, 'Attack Damage')}<br>${a('25%', 'Critical Strike Chance')}<br>${a('30%', 'Critical Strike Damage')}`),
      ...item('6672', 'Kraken Slayer', 3100, `${a(40, 'Attack Damage')}<br>${a('35%', 'Attack Speed')}<br>${a('4%', 'Move Speed')}`),
      ...item('3036', 'Lord Dominik\'s Regards', 3100, `${a(35, 'Attack Damage')}<br>${a('25%', 'Critical Strike Chance')}<br>${a('35%', 'Armor Penetration')}`),
      ...item('3153', 'Blade of The Ruined King', 3200, `${a(40, 'Attack Damage')}<br>${a('25%', 'Attack Speed')}<br>${a('10%', 'Life Steal')}`),
      ...item('3072', 'Bloodthirster', 3400, `${a(80, 'Attack Damage')}<br>${a('15%', 'Life Steal')}`),
      ...item('3046', 'Phantom Dancer', 2650, `${a(20, 'Attack Damage')}<br>${a('60%', 'Attack Speed')}<br>${a('25%', 'Critical Strike Chance')}<br>${a('10%', 'Move Speed')}`),
      ...item('3124', 'Guinsoo\'s Rageblade', 3000, `${a(30, 'Attack Damage')}<br>${a(30, 'Ability Power')}<br>${a('25%', 'Attack Speed')}`),
      ...item('6673', 'Immortal Shieldbow', 3000, `${a(55, 'Attack Damage')}<br>${a('25%', 'Critical Strike Chance')}`),
      ...item('3033', 'Mortal Reminder', 3300, `${a(35, 'Attack Damage')}<br>${a('25%', 'Critical Strike Chance')}<br>${a('35%', 'Armor Penetration')}`),
      ...item('3006', 'Berserker\'s Greaves', 1100, `${a('25%', 'Attack Speed')}<br>${a(45, 'Move Speed')}`, { tags: ['Boots'] }),
      ...item('3075', 'Thornmail', 2450, `${a(150, 'Health')}<br>${a(75, 'Armor')}`),
      ...item('3065', 'Spirit Visage', 2700, `${a(400, 'Health')}<br>${a(50, 'Magic Resist')}<br>${a(10, 'Ability Haste')}`),
      ...item('3089', 'Rabadon\'s Deathcap', 3600, `${a(130, 'Ability Power')}`),
      ...item('3157', 'Zhonya\'s Hourglass', 3250, `${a(105, 'Ability Power')}<br>${a(50, 'Armor')}`),
      ...item('3071', 'Black Cleaver', 3000, `${a(40, 'Attack Damage')}<br>${a(400, 'Health')}<br>${a(20, 'Ability Haste')}`),
      ...item('3053', 'Sterak\'s Gage', 3200, `${a(400, 'Health')}`),
    },
  },
  runes: [
    {
      id: 8000, key: 'Precision', name: 'Precision', icon: '',
      slots: [
        { runes: [
          { id: 8008, key: 'LethalTempoTemp', name: 'Lethal Tempo', icon: '', shortDesc: 'Attack speed stacks' },
          { id: 8005, key: 'PressTheAttack', name: 'Press the Attack', icon: '', shortDesc: '3 hits: burst' },
          { id: 8010, key: 'Conqueror', name: 'Conqueror', icon: '', shortDesc: 'Stacking AD' },
          { id: 8021, key: 'FleetFootwork', name: 'Fleet Footwork', icon: '', shortDesc: 'Heal' },
        ] },
        { runes: [{ id: 9111, key: 'Triumph', name: 'Triumph', icon: '', shortDesc: '' }] },
        { runes: [{ id: 9104, key: 'LegendAlacrity', name: 'Legend: Alacrity', icon: '', shortDesc: '' }] },
        { runes: [
          { id: 8014, key: 'CoupDeGrace', name: 'Coup de Grace', icon: '', shortDesc: '' },
          { id: 8017, key: 'CutDown', name: 'Cut Down', icon: '', shortDesc: '' },
          { id: 8299, key: 'LastStand', name: 'Last Stand', icon: '', shortDesc: '' },
        ] },
      ],
    },
    {
      id: 8100, key: 'Domination', name: 'Domination', icon: '',
      slots: [
        { runes: [
          { id: 8112, key: 'Electrocute', name: 'Electrocute', icon: '', shortDesc: '' },
          { id: 8128, key: 'DarkHarvest', name: 'Dark Harvest', icon: '', shortDesc: '' },
          { id: 9923, key: 'HailOfBlades', name: 'Hail of Blades', icon: '', shortDesc: '' },
        ] },
      ],
    },
  ],
  summs: {
    data: {
      SummonerFlash: { id: 'SummonerFlash', name: 'Flash', modes: ['CLASSIC'], image: { full: 'SummonerFlash.png' } },
      SummonerDot: { id: 'SummonerDot', name: 'Ignite', modes: ['CLASSIC'], image: { full: 'SummonerDot.png' } },
      SummonerHeal: { id: 'SummonerHeal', name: 'Heal', modes: ['CLASSIC'], image: { full: 'SummonerHeal.png' } },
      SummonerBarrier: { id: 'SummonerBarrier', name: 'Barrier', modes: ['CLASSIC'], image: { full: 'SummonerBarrier.png' } },
      SummonerExhaust: { id: 'SummonerExhaust', name: 'Exhaust', modes: ['CLASSIC'], image: { full: 'SummonerExhaust.png' } },
    },
  },
}
// normalize() expects `itemsLoc` too
FIXTURE.itemsLoc = FIXTURE.itemsEn
