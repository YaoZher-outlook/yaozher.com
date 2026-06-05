import { useState } from 'react'
import { KeyRound, MailCheck, UserPlus, X } from 'lucide-react'

import { login, loginByEmailCode, register, sendLoginCode, sendRegisterCode } from '@/api/auth/auth'
import { useAppStore } from '@/store/appStore'
import type { LoginResponseVo } from '@/types/auth/auth'

type Mode = 'login' | 'register'
type LoginMethod = 'password' | 'emailCode'

export default function AuthPanel({ anchor }: { anchor?: { left: number; top: number } }) {
  const close = useAppStore((s) => s.closeAuthPanel)
  const loginSuccess = useAppStore((s) => s.loginSuccess)
  const ledConfigRaw = useAppStore((s) => s.ledConfigRaw)

  const [mode, setMode] = useState<Mode>('login')
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password')
  const [account, setAccount] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [isHr, setIsHr] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [loginCodeSent, setLoginCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const needsEmailVerification = mode === 'register' && !codeSent

  const completeLogin = (data: LoginResponseVo) => {
    loginSuccess({
      token: data.token,
      id: data.user.id,
      nickname: data.user.nickname,
      uid: `UID: ${data.user.id}`,
      email: data.user.email,
      avatarUrl: data.user.avatar,
      role: data.user.role,
      createTime: data.user.createTime,
    })
    setInfo(`已登录：${data.user.nickname}`)
  }

  const onSubmit = async () => {
    try {
      setLoading(true)
      setError(null)
      setInfo(null)
      const res = loginMethod === 'password'
        ? await login({ username: account.trim(), password })
        : await loginByEmailCode({ email: email.trim(), code: code.trim() })
      const data = res.data
      if (!data) throw new Error('Empty response data')

      completeLogin(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const onSendLoginCode = async () => {
    try {
      setLoading(true)
      setError(null)
      setInfo(null)
      await sendLoginCode(email.trim())
      setLoginCodeSent(true)
      setInfo('验证码已发送。')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const onSendCode = async () => {
    try {
      setLoading(true)
      setError(null)
      setInfo(null)
      await sendRegisterCode(email.trim())
      setCodeSent(true)
      setInfo('Verification code sent. Check your email.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async () => {
    if (!codeSent) {
      setError('先验证邮箱')
      setInfo(null)
      return
    }
    try {
      setLoading(true)
      setError(null)
      setInfo(null)
      await register({
        username: account.trim(),
        password,
        nickname: nickname.trim(),
        email: email.trim(),
        code: code.trim(),
        hr: isHr,
        ledConfig: ledConfigRaw,
      })
      setInfo('Registered. You can sign in now.')
      setMode('login')
      setCode('')
      setIsHr(false)
      setCodeSent(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed z-50 w-[360px] rounded-2xl p-4 glass"
      style={{ left: anchor?.left ?? 24, top: anchor?.top ?? 24 }}
      role="dialog"
      aria-label="login"
    >
      <div className="-mx-4 -mt-4 mb-3 flex items-center justify-between rounded-t-2xl border-b border-white/10 bg-white/5 px-4 py-2">
        <div className="text-xs text-white/60">{mode === 'login' ? 'Login' : 'Register'}</div>
        <button
          type="button"
          onClick={close}
          className="rounded-lg p-2 text-white/60 transition hover:text-white"
          aria-label="close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        {mode === 'login' ? (
          <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/15 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password')
                setError(null)
                setInfo(null)
              }}
              className={[
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition',
                loginMethod === 'password' ? 'bg-white/10 text-[color:var(--led-color)]' : 'text-white/55 hover:text-white',
              ].join(' ')}
            >
              <KeyRound size={14} />
              密码登录
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('emailCode')
                setError(null)
                setInfo(null)
              }}
              className={[
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition',
                loginMethod === 'emailCode' ? 'bg-white/10 text-[color:var(--led-color)]' : 'text-white/55 hover:text-white',
              ].join(' ')}
            >
              <MailCheck size={14} />
              邮箱验证码
            </button>
          </div>
        ) : null}

        {mode === 'register' || loginMethod === 'password' ? (
          <label className="block">
            <div className="mb-1 text-xs text-white/60">{mode === 'login' ? '账号或邮箱' : '账号'}</div>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={mode === 'login' ? 'username or email' : 'username'}
              className="input-base w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]"
            />
          </label>
        ) : null}

        {mode === 'register' ? (
          <>
            <label className="block">
              <div className="mb-1 text-xs text-white/60">Nickname</div>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="nickname"
                className="input-base w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]"
              />
            </label>
          </>
        ) : null}

        {mode === 'register' || loginMethod === 'emailCode' ? (
          <label className="block">
            <div className="mb-1 text-xs text-white/60">Email</div>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setCodeSent(false)
                  setLoginCodeSent(false)
                }}
                placeholder="name@example.com"
                className="input-base min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]"
              />
              <button
                type="button"
                onClick={mode === 'register' ? onSendCode : onSendLoginCode}
                disabled={loading || !email.trim()}
                className={[
                  'btn-ghost inline-flex items-center justify-center gap-1 rounded-xl px-3 text-xs disabled:opacity-50',
                  email.trim() && !(mode === 'register' ? codeSent : loginCodeSent) ? 'verify-mail-pulse' : '',
                ].join(' ')}
              >
                <MailCheck size={15} />
                <span>获取验证码</span>
              </button>
            </div>
            {needsEmailVerification ? <div className="mt-1 text-[11px] text-amber-300">先验证邮箱</div> : null}
          </label>
        ) : null}

        {mode === 'register' || loginMethod === 'password' ? (
          <label className="block">
            <div className="mb-1 text-xs text-white/60">Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              className="input-base w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]"
            />
          </label>
        ) : null}

        {(mode === 'register' && codeSent) || (mode === 'login' && loginMethod === 'emailCode' && loginCodeSent) ? (
          <label className="block">
            <div className="mb-1 text-xs text-white/60">Verification code</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6 digits"
              maxLength={6}
              className="input-base w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]"
            />
          </label>
        ) : null}

        {mode === 'register' ? (
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75">
            <input
              type="checkbox"
              checked={isHr}
              onChange={(e) => setIsHr(e.target.checked)}
              className="h-4 w-4 accent-[var(--led-color)]"
            />
            <span>我是 HR</span>
          </label>
        ) : null}

        {error ? <div className="text-xs text-red-300">{error}</div> : null}
        {info ? <div className="text-xs text-emerald-300">{info}</div> : null}

        <div className="pt-2 space-y-2">
          {mode === 'login' ? (
            <button
              type="button"
              disabled={loading || (loginMethod === 'emailCode' && !loginCodeSent)}
              onClick={onSubmit}
              className="btn-primary w-full rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? '登录中...' : loginMethod === 'emailCode' && !loginCodeSent ? '先获取验证码' : '登录'}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !codeSent}
              onClick={onRegister}
              className="btn-primary w-full rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? 'Registering...' : !codeSent ? '先验证邮箱' : 'Create account'}
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setMode((m) => (m === 'login' ? 'register' : 'login'))
              setCode('')
              setCodeSent(false)
              setLoginCodeSent(false)
              setError(null)
              setInfo(null)
            }}
            className="btn-ghost inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm disabled:opacity-60"
          >
            <UserPlus size={15} />
            {mode === 'login' ? 'Register' : 'Back to login'}
          </button>

          <div className="text-[11px] text-white/40">
            {mode === 'login' ? '登录后将同步个人资料' : 'ADMIN / FRIENDS 仅允许数据库手动授予'}
          </div>
        </div>
      </div>
    </div>
  )
}
