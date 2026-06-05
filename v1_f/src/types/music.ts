export type MusicTrackVo = {
  id: string
  title: string
  artist: string
  fileName: string
  url: string
  coverUrl?: string | null
  lyricUrl?: string | null
}

export type MusicPlaylistVo = {
  id: string
  name: string
  tracks: MusicTrackVo[]
}
