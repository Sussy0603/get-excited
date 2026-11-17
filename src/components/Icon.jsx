import { useState } from 'react'
import { img } from '../data/ddragon.js'
import { useStore } from '../state/store.jsx'

// Riot icon with a text fallback (offline mode, missing image).
export default function Icon({ kind, file, label = '', size = '', ring = '', round = false, title }) {
  const { data } = useStore()
  const [broken, setBroken] = useState(false)
  const v = data?.version
  let src = null
  if (file && v && v !== 'offline') {
    if (kind === 'champ') src = img.champ(v, file)
    else if (kind === 'item') src = img.item(v, file)
    else if (kind === 'spell' || kind === 'summ') src = img.spell(v, file)
    else if (kind === 'passive') src = img.passive(v, file)
    else if (kind === 'rune') src = img.rune(file)
  }
  const cls = `ico ${size} ${ring ? `ring-${ring}` : ''} ${round ? 'round' : ''}`
  const initials = label.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  if (!src || broken) return <span className={cls} title={title || label} aria-label={label} role="img">{initials || '?'}</span>
  return <img className={cls} src={src} alt={label} title={title || label} crossOrigin="anonymous" loading="lazy" onError={() => setBroken(true)} />
}

export function ChampIcon({ id, ...rest }) {
  const { data } = useStore()
  const c = data?.champions?.[id]
  return <Icon kind="champ" file={c?.image} label={c?.name || id || ''} {...rest} />
}

export function ItemIcon({ id, ...rest }) {
  const { data } = useStore()
  const it = data?.items?.[id]
  return <Icon kind="item" file={it?.image} label={it?.name || id} title={it ? `${it.name} — ${it.gold}` : id} {...rest} />
}
