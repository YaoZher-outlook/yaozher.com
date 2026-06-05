import type { Result } from '@/types/api'
import type { ApiKeyStatusVo, ApiKeyUpdateDto, EmailUpdateDto, LedConfigUpdateDto, UserLocationUpdateDto, UserProfileUpdateDto, UserProfileVo } from '@/types/user/user'
import { getResult, postResult, putResult } from '@/api/http'

export async function getProfile(): Promise<Result<UserProfileVo>> {
  return getResult<UserProfileVo>('/api/user/profile', { auth: true })
}

export async function getAdminConfig(): Promise<Result<string>> {
  return getResult<string>('/api/user/admin-config')
}

export async function updateLedConfig(dto: LedConfigUpdateDto): Promise<Result<null>> {
  return postResult<null>('/api/user/config', dto, { auth: true })
}

export async function updateProfile(dto: UserProfileUpdateDto): Promise<Result<UserProfileVo>> {
  return putResult<UserProfileVo>('/api/user/profile', dto, { auth: true })
}

export async function sendEmailChangeCode(email: string): Promise<Result<null>> {
  return postResult<null>('/api/user/email/code', { email }, { auth: true })
}

export async function updateEmail(dto: EmailUpdateDto): Promise<Result<UserProfileVo>> {
  return putResult<UserProfileVo>('/api/user/email', dto, { auth: true })
}

export async function updateLocation(dto: UserLocationUpdateDto): Promise<Result<UserProfileVo>> {
  return postResult<UserProfileVo>('/api/user/location', dto, { auth: true })
}

export async function getApiKeyStatus(): Promise<Result<ApiKeyStatusVo>> {
  return getResult<ApiKeyStatusVo>('/api/user/api-key', { auth: true })
}

export async function updateApiKeys(dto: ApiKeyUpdateDto): Promise<Result<null>> {
  return postResult<null>('/api/user/api-key', dto, { auth: true })
}
