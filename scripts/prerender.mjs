// ─────────────────────────────────────────────────────────────
// prerender.mjs — runs after `vite build`.
// Makes one real HTML page per champion (/builds/jinx/) so Google
// can find them, plus sitemap.xml and robots.txt.
// Each page loads the normal app and jumps to #/builds/<Champ>.
// ─────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { CHAMP_DEFS } from '../src/data/champs/index.js'

const SITE = 'https://sussy0603.github.io/get-excited'
const dist = new URL('../dist/', import.meta.url)
const html = readFileSync(new URL('index.html', dist), 'utf8')

// Display names (Riot ids aren't always the real name)
const SPECIAL = {
  MonkeyKing: 'Wukong', Chogath: "Cho'Gath", Kaisa: "Kai'Sa", KogMaw: "Kog'Maw", Khazix: "Kha'Zix", Velkoz: "Vel'Koz",
  RekSai: "Rek'Sai", Belveth: "Bel'Veth", KSante: "K'Sante", Leblanc: 'LeBlanc', DrMundo: 'Dr. Mundo', JarvanIV: 'Jarvan IV',
  Nunu: 'Nunu & Willump', Renata: 'Renata Glasc', AurelionSol: 'Aurelion Sol', TahmKench: 'Tahm Kench',
}
let names = {}
try {
  const v = (await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json())[0]
  const j = await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/champion.json`)).json()
  for (const c of Object.values(j.data)) names[c.id] = c.name
  console.log(`prerender: names from Riot (patch ${v})`)
} catch {
  console.log('prerender: Riot unreachable, using built-in names')
}
const nameOf = (id) => names[id] || SPECIAL[id] || id.replace(/([a-z])([A-Z])/g, '$1 $2')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

const ids = Object.keys({ ...CHAMP_DEFS, ...names }).sort()
const urls = [`${SITE}/`, `${SITE}/builds/`]

const page = ({ title, desc, path, hash, body }) => html
  .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${SITE}${path}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:type" content="website" />
    <script>if (!location.hash) location.replace('#${hash}')</script>`)
  .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

for (const id of ids) {
  const name = nameOf(id)
  const slug = id.toLowerCase()
  const title = `${name} build & damage calculator — Get Excited`
  const desc = `${name} damage calculator for League of Legends: time to kill, DPS, burst, best items and a second-by-second fight simulator. Free, EN/FR.`
  const body = `<main style="padding:24px;font-family:sans-serif"><h1>${esc(name)} build &amp; damage calculator</h1><p>${esc(desc)}</p><p><a href="${SITE}/#/builds/${id}">Open ${esc(name)} in Get Excited</a></p></main>`
  mkdirSync(new URL(`builds/${slug}/`, dist), { recursive: true })
  writeFileSync(new URL(`builds/${slug}/index.html`, dist), page({ title, desc, path: `/builds/${slug}/`, hash: `/builds/${id}`, body }))
  urls.push(`${SITE}/builds/${slug}/`)
}

// Champion list page
mkdirSync(new URL('builds/', dist), { recursive: true })
writeFileSync(new URL('builds/index.html', dist), page({
  title: 'All champions — Get Excited LoL damage calculator',
  desc: 'Builds and damage calculations for every League of Legends champion.',
  path: '/builds/', hash: '/builds',
  body: `<main style="padding:24px;font-family:sans-serif"><h1>All champions</h1><ul>${ids.map((id) => `<li><a href="${SITE}/builds/${id.toLowerCase()}/">${esc(nameOf(id))}</a></li>`).join('')}</ul></main>`,
}))

const today = new Date().toISOString().slice(0, 10)
writeFileSync(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`)
writeFileSync(new URL('robots.txt', dist), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`prerender: ${ids.length} champion pages + sitemap.xml`)
