# Match import server

A tiny free server that keeps your Riot API key secret.

## One-time setup (about 10 minutes)

1. **Riot key**
   - Go to https://developer.riotgames.com and sign in with your Riot account.
   - Copy the **Development API Key**.
   - ⚠ Dev keys expire every 24 hours. For a permanent key, register a
     "Personal API Key" product on the same site (free, takes a few days to approve).

2. **Cloudflare account** (free plan is enough: 100,000 requests a day)
   - Sign up at https://dash.cloudflare.com/sign-up

3. **Deploy** (in a terminal, inside this `worker` folder)
   ```bash
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put RIOT_KEY     # paste the Riot key when it asks
   ```
   Wrangler prints a URL like `https://get-excited-import.YOURNAME.workers.dev`.

4. **Connect the site**
   - On Get Excited, click **Import a match**, paste that URL in **Import server**. Done.
   - (Or put it in `.env` as `VITE_IMPORT_API=…` before building, so everyone gets it.)

## When the dev key expires
Run `npx wrangler secret put RIOT_KEY` again with the new key.
