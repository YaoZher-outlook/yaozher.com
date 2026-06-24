import type { Result } from '@/types/api'
import type { ProjectDto } from '@/types/project'
import { cachedRequest, invalidateCache } from './cache'
import { getResult } from './http'

const PROJECT_LIST_CACHE = 'project:list'

export async function getProjectList(opts?: { force?: boolean }): Promise<Result<ProjectDto[]>> {
  return cachedRequest(
    PROJECT_LIST_CACHE,
    5 * 60 * 1000,
    () => getResult<ProjectDto[]>('/api/project/list'),
    opts,
  )
}

export function invalidateProjectListCache() {
  invalidateCache(PROJECT_LIST_CACHE)
}
