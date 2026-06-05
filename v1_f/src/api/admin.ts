import type { Result } from '@/types/api'
import type { NewsDto } from '@/types/news/news'
import type { ProjectDto } from '@/types/project'
import { getResult, postResult, putResult, requestJson } from '@/api/http'

export type AdminNewsSaveDto = {
  title: string
  content: string
  coverImage?: string
  type: string
}

export type AdminProjectSaveDto = {
  name: string
  description?: string
  coverImage?: string
  downloadUrl?: string
  githubUrl?: string
  resourceType?: string
  sortOrder?: number
}

export function listAdminNews(): Promise<Result<Array<NewsDto & { content: string }>>> {
  return getResult<Array<NewsDto & { content: string }>>('/api/admin/news', { auth: true })
}

export function createAdminNews(dto: AdminNewsSaveDto): Promise<Result<NewsDto & { content: string }>> {
  return postResult<NewsDto & { content: string }>('/api/admin/news', dto, { auth: true })
}

export function updateAdminNews(id: number, dto: AdminNewsSaveDto): Promise<Result<NewsDto & { content: string }>> {
  return putResult<NewsDto & { content: string }>(`/api/admin/news/${id}`, dto, { auth: true })
}

export function deleteAdminNews(id: number): Promise<Result<null>> {
  return requestJson<Result<null>>(`/api/admin/news/${id}`, { method: 'DELETE', parseResult: true, auth: true })
}

export function listAdminProjects(): Promise<Result<ProjectDto[]>> {
  return getResult<ProjectDto[]>('/api/admin/project', { auth: true })
}

export function createAdminProject(dto: AdminProjectSaveDto): Promise<Result<ProjectDto>> {
  return postResult<ProjectDto>('/api/admin/project', dto, { auth: true })
}

export function publishAdminProject(form: FormData): Promise<Result<ProjectDto>> {
  return requestJson<Result<ProjectDto>>('/api/admin/project/publish', {
    method: 'POST',
    parseResult: true,
    auth: true,
    body: form,
  })
}

export function updateAdminProject(id: number, dto: AdminProjectSaveDto): Promise<Result<ProjectDto>> {
  return putResult<ProjectDto>(`/api/admin/project/${id}`, dto, { auth: true })
}

export function deleteAdminProject(id: number): Promise<Result<null>> {
  return requestJson<Result<null>>(`/api/admin/project/${id}`, { method: 'DELETE', parseResult: true, auth: true })
}
