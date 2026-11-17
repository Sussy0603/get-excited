// ─────────────────────────────────────────────────────────────
// Get Excited — match import server (Cloudflare Worker, free tier)
//
// Why a server? The Riot API key is a SECRET. If it were in the
// website code, anyone could steal it. This tiny server keeps the
// key hidden and only answers one question:
//   "What did <Riot ID> build in their last games?"
//
// GET /matches?id=NyantaNeko%23Nyaah&region=na&count=5
// ─────────────────────────────────────────────────────────────

// Platform → Riot's regional routing
const REGIONAL = {
  na: 'americas', br: 'americas', lan: 'americas', las: 'americas',
  euw: 'europe', eune: 'europe', tr: 'europe', ru: 'europe', me: 'europe',
  kr: 'asia', jp: 'asia',
  oce: 'sea', sg: 'sea', tw: 'sea', vn: 'sea', ph: 'sea', th: 'sea',
}

// Only your own site may call this server.
const ALLOWED_ORIGINS = ['https://sussy0603.github.io', 'http://localhost:5173', 'http://localhost:4173']

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || ''
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    }
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })

    const url = new URL(request.url)
    if (url.pathname !== '/matches') return json({ error: 'not_found' }, 404, cors)

    const riotId = (url.searchParams.get('id') || '').trim()
    const [name, tag] = riotId.split('#')
    const region = (url.searchParams.get('region') || 'na').toLowerCase()
    const count = Math.min(10, Math.max(1, +url.searchParams.get('count') || 5))
    const routing = REGIONAL[region]
    if (!name || !tag) return json({ error: 'bad_riot_id', hint: 'Use Name#TAG' }, 400, cors)
    if (!routing) return json({ error: 'bad_region' }, 400, cors)
    if (!env.RIOT_KEY) return json({ error: 'no_key', hint: 'Run: npx wrangler secret put RIOT_KEY' }, 500, cors)

    // Small cache so refreshing doesn't burn the rate limit
    const cache = caches.default
    const cacheKey = new Request(`https://cache.local/${routing}/${encodeURIComponent(riotId)}/${count}`)
    const hit = await cache.match(cacheKey)
    if (hit) return new Response(hit.body, { headers: cors })

    const riot = async (path) => {
      const r = await fetch(`https://${routing}.api.riotgames.com${path}`, { headers: { 'X-Riot-Token': env.RIOT_KEY } })
      if (!r.ok) throw Object.assign(new Error(`riot_${r.status}`), { status: r.status })
      return r.json()
    }

    try {
      const acct = await riot(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`)
      const ids = await riot(`/lol/match/v5/matches/by-puuid/${acct.puuid}/ids?count=${count}`)
      const matches = await Promise.all(ids.map((id) => riot(`/lol/match/v5/matches/${id}`)))
      const out = matches.map((m) => slim(m, acct.puuid)).filter(Boolean)
      const body = JSON.stringify({ riotId: `${acct.gameName}#${acct.tagLine}`, matches: out })
      ctx.waitUntil(cache.put(cacheKey, new Response(body, { headers: { 'Cache-Control': 'max-age=120' } })))
      return new Response(body, { headers: cors })
    } catch (e) {
      const status = e.status || 500
      const error = status === 404 ? 'not_found' : status === 403 || status === 401 ? 'key_expired' : status === 429 ? 'rate_limited' : 'riot_error'
      return json({ error }, status, cors)
    }
  },
}

// Keep only what the calculator needs.
function slim(m, puuid) {
  const ps = m.info?.participants || []
  const me = ps.find((p) => p.puuid === puuid)
  if (!me) return null
  const player = (p) => ({
    champ: p.championName,
    level: p.champLevel,
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].filter((x) => x > 0).map(String),
    keystone: p.perks?.styles?.[0]?.selections?.[0]?.perk ?? null,
    minors: [
      ...(p.perks?.styles?.[0]?.selections?.slice(1) || []),
      ...(p.perks?.styles?.[1]?.selections || []),
    ].map((s) => s.perk),
    shards: [p.perks?.statPerks?.offense, p.perks?.statPerks?.flex, p.perks?.statPerks?.defense],
    summoners: [p.summoner1Id, p.summoner2Id],
    kda: `${p.kills}/${p.deaths}/${p.assists}`,
    position: p.teamPosition,
  })
  return {
    id: m.metadata.matchId,
    date: m.info.gameEndTimestamp || m.info.gameCreation,
    durationMin: Math.round((m.info.gameDuration || 0) / 60),
    queue: m.info.queueId,
    win: me.win,
    me: player(me),
    enemies: ps.filter((p) => p.teamId !== me.teamId).map(player),
    allies: ps.filter((p) => p.teamId === me.teamId && p.puuid !== puuid).map(player),
  }
}

const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers })
