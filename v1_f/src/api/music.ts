import { getResult } from '@/api/http'
import { cachedRequest, invalidateCache } from '@/api/cache'
import type { Result } from '@/types/api'
import type { MusicPlaylistVo } from '@/types/music'

export function getMusicPlaylists(): Promise<Result<MusicPlaylistVo[]>> {
  return cachedRequest(
    'music:playlists',
    10 * 60 * 1000,
    () => getResult<MusicPlaylistVo[]>('/api/music/playlists'),
  )
}

export function getMusicCover(params: { artist?: string; title: string }): Promise<Result<string | null>> {
  const query = new URLSearchParams()
  if (params.artist) query.set('artist', params.artist)
  query.set('title', params.title)
  const key = `music:cover:${query.toString()}`
  return cachedRequest(
    key,
    24 * 60 * 60 * 1000,
    () => getResult<string | null>(`/api/music/cover?${query.toString()}`),
  )
}

export function invalidateMusicCache() {
  invalidateCache('music:')
}
