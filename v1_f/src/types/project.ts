export type ProjectDto = {
  id: number
  name: string
  description: string
  coverImage: string
  downloadUrl: string | null
  githubUrl: string
  resourceType?: ProjectResourceType | null
  sortOrder: number
}

export type ProjectResourceType = 'OPEN_SOURCE' | 'WEB_LINK' | 'MC_MODPACK' | 'MC_RESOURCE_PACK' | 'MC_MAP'
