import type { Result } from '@/types/api'
import { useAppStore } from '@/store/appStore'

export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

function messageFromBody(body: unknown): string | undefined {
  if (!body) return undefined
  if (typeof body === 'string') return body
  if (typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message
    return typeof message === 'string' ? message : undefined
  }
  return undefined
}

function asErrorMessage(codeOrStatus: number, message?: string) {
  const raw = (message ?? '').trim()
  const compact = raw.replace(/^\s*(HTTP\s*)?\d+(\s*[:：-]\s*)?/i, '').trim()

  if (codeOrStatus === 401 || codeOrStatus === 40100) {
    if (!compact || compact.includes('未登录') || compact.includes('Unauthorized')) return '请先登录'
  }
  if (codeOrStatus === 403 || codeOrStatus === 40300) return '没有权限执行此操作'
  if (codeOrStatus >= 500 || codeOrStatus === 50000) return compact && !compact.includes('HTTP') ? compact : '系统繁忙，请稍后再试'

  if (!compact) return '请求失败，请稍后再试'
  if (compact.includes('用户名或密码') || compact.includes('账号或密码')) return '账号或密码错误'
  if (compact.includes('邮箱或验证码')) return '邮箱或验证码错误'
  if (compact.includes('该邮箱尚未注册')) return '该邮箱尚未注册'
  if (compact.includes('邮箱查询过于频繁') || compact.includes('邮箱查询请求过多')) return compact
  if (compact.includes('Email already registered') || compact.includes('邮箱已被注册')) return '邮箱已被注册'
  if (compact.includes('Username already exists') || compact.includes('账号已存在')) return '账号已存在'
  if (compact.includes('Verification code was sent recently')) return '验证码发送太频繁，请稍后再试'
  if (compact.includes('Verification code expired') || compact.includes('验证码已过期')) return '验证码已过期，请重新获取'
  if (compact.includes('Verification code is invalid') || compact.includes('验证码不正确')) return '验证码不正确'
  if (compact.includes('Too many verification attempts')) return '验证码尝试次数过多，请重新获取'
  if (compact.includes('Email must not be blank') || compact.includes('email:')) return '请输入邮箱'
  if (compact.includes('Username can only contain')) return '账号只能包含字母、数字和下划线，长度 3-64'
  if (compact.includes('Nickname must not be blank')) return '请输入昵称'
  if (compact.includes('Password length must be 6-72')) return '密码长度需为 6-72 位'
  if (compact.includes('Failed to fetch') || compact.includes('NetworkError')) return '网络连接失败，请确认后端服务正在运行'

  return compact
}

async function parseJsonSafe(res: Response) {
  const text = await res.text().catch(() => '')
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit & { parseResult?: boolean; auth?: boolean },
): Promise<T> {
  const token = useAppStore.getState().token

  let res: Response
  try {
    res = await fetch(API_BASE + path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch (e) {
    throw new Error(asErrorMessage(0, e instanceof Error ? e.message : String(e)))
  }

  // HTTP layer
  if (!res.ok) {
    const body = await parseJsonSafe(res)
    throw new Error(asErrorMessage(res.status, messageFromBody(body) ?? res.statusText))
  }

  // JSON layer
  const json = (await res.json()) as unknown

  // if it's a Result<T>, enforce code==0
  if (init?.parseResult) {
    const r = json as Result<unknown>
    if (typeof r?.code === 'number' && r.code !== 0) {
      // auth expired
      if (r.code === 40100 && init?.auth && token) {
        useAppStore.getState().logout()
      }
      throw new Error(asErrorMessage(r.code, r.message ?? 'Error'))
    }
  }

  return json as T
}

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, { method: 'GET', ...init })
}

export async function getResult<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<Result<T>> {
  return requestJson<Result<T>>(path, { method: 'GET', parseResult: true, ...init })
}

export async function postResult<T>(
  path: string,
  body: unknown,
  init?: RequestInit & { auth?: boolean },
): Promise<Result<T>> {
  return requestJson<Result<T>>(path, {
    method: 'POST',
    parseResult: true,
    body: JSON.stringify(body ?? {}),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

export async function putResult<T>(
  path: string,
  body: unknown,
  init?: RequestInit & { auth?: boolean },
): Promise<Result<T>> {
  return requestJson<Result<T>>(path, {
    method: 'PUT',
    parseResult: true,
    body: JSON.stringify(body ?? {}),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}
