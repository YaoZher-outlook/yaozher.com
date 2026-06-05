export type LoginRequestDto = {
  username: string
  password: string
}

export type EmailCodeLoginRequestDto = {
  email: string
  code: string
}

export type LoginUserVo = {
  id: number
  username: string
  nickname: string
  avatar: string
  email?: string
  role: string
  createTime?: string
}

export type LoginResponseVo = {
  token: string
  user: LoginUserVo
}

export type RegisterRequestDto = {
  username: string
  password: string
  nickname: string
  email: string
  code: string
  hr?: boolean
  ledConfig?: string | null
}
