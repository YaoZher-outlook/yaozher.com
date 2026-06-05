import type { Result } from '@/types/api'
import { API_BASE, requestJson } from '@/api/http'

export async function uploadFile(file: File): Promise<Result<string>> {
  const form = new FormData()
  form.append('file', file)
  return requestJson<Result<string>>('/api/upload', {
    method: 'POST',
    auth: true,
    parseResult: true,
    body: form,
  })
}

export async function uploadAvatar(file: File): Promise<Result<string>> {
  const form = new FormData()
  form.append('file', file)
  return requestJson<Result<string>>('/api/upload/avatar', {
    method: 'POST',
    auth: true,
    parseResult: true,
    body: form,
  })
}

export async function uploadBackground(file: File): Promise<Result<string>> {
  const form = new FormData()
  form.append('file', file)
  return requestJson<Result<string>>('/api/upload/background', {
    method: 'POST',
    auth: true,
    parseResult: true,
    body: form,
  })
}

export function toUploadUrl(url: string) {
  return url.startsWith('/') ? `${API_BASE}${url}` : url
}
