import type { Result } from '@/types/api'
import type { ProjectDto } from '@/types/project'
import { getResult } from './http'

export async function getProjectList(): Promise<Result<ProjectDto[]>> {
  return getResult<ProjectDto[]>('/api/project/list')
}
