import { useEffect, useRef } from 'react'

import { resolveAssetUrl } from '@/api/assets'
import { getMusicPlaylists } from '@/api/music'

function firstTwoTrackUrls() {
  return getMusicPlaylists().then((res) => {
    const tracks = res.data?.find((playlist) => playlist.tracks.length)?.tracks ?? []
    return tracks.slice(0, 2).map((track) => resolveAssetUrl(track.url)).filter(Boolean) as string[]
  })
}

export default function MusicPreloader() {
  const linksRef = useRef<HTMLLinkElement[]>([])
  const audiosRef = useRef<HTMLAudioElement[]>([])

  useEffect(() => {
    let cancelled = false
    let timer = 0

    const warmup = () => {
      timer = window.setTimeout(() => {
        void firstTwoTrackUrls()
          .then((urls) => {
            if (cancelled || !urls.length) return

            const [first, next] = urls
            if (first) {
              const link = document.createElement('link')
              link.rel = 'preload'
              link.as = 'audio'
              link.href = first
              link.setAttribute('fetchpriority', 'high')
              document.head.appendChild(link)
              linksRef.current.push(link)

              const audio = new Audio()
              audio.preload = 'auto'
              audio.src = first
              audio.load()
              audiosRef.current.push(audio)
            }

            if (next && next !== first) {
              const audio = new Audio()
              audio.preload = 'metadata'
              audio.src = next
              audio.load()
              audiosRef.current.push(audio)
            }
          })
          .catch(() => undefined)
      }, 450)
    }

    if (document.readyState === 'complete') warmup()
    else window.addEventListener('load', warmup, { once: true })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('load', warmup)
      linksRef.current.forEach((link) => link.remove())
      audiosRef.current.forEach((audio) => {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      })
      linksRef.current = []
      audiosRef.current = []
    }
  }, [])

  return null
}
