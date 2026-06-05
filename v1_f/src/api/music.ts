import { getResult } from '@/api/http'
import type { Result } from '@/types/api'
import type { MusicPlaylistVo } from '@/types/music'

export function getMusicPlaylists(): Promise<Result<MusicPlaylistVo[]>> {
  return getResult<MusicPlaylistVo[]>('/api/music/playlists')
}

export function getMusicCover(params: { artist?: string; title: string }): Promise<Result<string | null>> {
  const query = new URLSearchParams()
  if (params.artist) query.set('artist', params.artist)
  query.set('title', params.title)
  return getResult<string | null>(`/api/music/cover?${query.toString()}`)
}
