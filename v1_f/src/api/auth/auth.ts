import type { Result } from '@/types/api'
import type { EmailCodeLoginRequestDto, LoginRequestDto, LoginResponseVo, RegisterRequestDto } from '@/types/auth/auth'
import { postResult } from '@/api/http'

export async function login(dto: LoginRequestDto): Promise<Result<LoginResponseVo>> {
  return postResult<LoginResponseVo>('/api/auth/login', dto)
}

export async function sendLoginCode(email: string): Promise<Result<null>> {
  return postResult<null>('/api/auth/login/email/code', { email })
}

export async function loginByEmailCode(dto: EmailCodeLoginRequestDto): Promise<Result<LoginResponseVo>> {
  return postResult<LoginResponseVo>('/api/auth/login/email', dto)
}

export async function sendRegisterCode(email: string): Promise<Result<null>> {
  return postResult<null>('/api/auth/register/code', { email })
}

export async function register(dto: RegisterRequestDto): Promise<Result<null>> {
  return postResult<null>('/api/auth/register', dto)
}
