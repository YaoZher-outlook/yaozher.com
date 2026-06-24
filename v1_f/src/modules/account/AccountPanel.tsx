import { useState } from 'react'
import { ImageUp, LogOut, MailCheck, Save, X } from 'lucide-react'

import { resolveAssetUrl } from '@/api/assets'
import { uploadAvatar } from '@/api/upload'
import { sendEmailChangeCode, updateEmail as updateBoundEmail } from '@/api/user/user'
import { useAppStore } from '@/store/appStore'

export default function AccountPanel({ anchor }: { anchor?: { left: number; top: number } }) {
  const setOpen = useAppStore((s) => s.setAccountPanelOpen)
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)
  const saveProfileToServer = useAppStore((s) => s.saveProfileToServer)
  const bootstrapAuthProfile = useAppStore((s) => s.bootstrapAuthProfile)
  const bumpAssetVersion = useAppStore((s) => s.bumpAssetVersion)
  const assetVersion = useAppStore((s) => s.assetVersion)

  const [nickname, setNickname] = useState(user.nickname)
  const [email, setEmail] = useState(user.email ?? '')
  const [emailCode, setEmailCode] = useState('')
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [avatar, setAvatar] = useState(user.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const emailChanged = email.trim().toLowerCase() !== (user.email ?? '').trim().toLowerCase()

  const onAvatarFile = async (file?: File) => {
    if (!file) return
    try {
      setSaving(true)
      setError(null)
      setOk(null)
      const res = await uploadAvatar(file)
      if (res.data) {
        setAvatar(res.data)
        bumpAssetVersion()
        await bootstrapAuthProfile()
        setOk('Avatar updated')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setOk(null)
      if (emailChanged) {
        if (!emailCodeSent || emailCode.trim().length !== 6) {
          throw new Error('Verify the new email before saving')
        }
        await updateBoundEmail({ email: email.trim(), code: emailCode.trim() })
      }
      await saveProfileToServer({
        nickname: nickname.trim(),
        avatar: avatar.trim(),
      })
      await bootstrapAuthProfile()
      setEmailCode('')
      setEmailCodeSent(false)
      setOk('Profile saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const onSendEmailCode = async () => {
    try {
      setSaving(true)
      setError(null)
      setOk(null)
      if (!emailChanged) {
        throw new Error('Enter a new email address first')
      }
      await sendEmailChangeCode(email.trim())
      setEmailCodeSent(true)
      setOk('Verification code sent')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed z-[95] w-[min(380px,calc(100vw-24px))] rounded-2xl p-4 glass"
      style={{ left: anchor?.left ?? 'calc(8rem + 12px)', top: anchor?.top ?? 18 }}
      role="dialog"
      aria-label="account"
    >
      <div className="-mx-4 -mt-4 mb-3 flex items-center justify-between rounded-t-2xl border-b border-white/10 bg-white/5 px-4 py-2">
        <div>
          <div className="text-sm font-semibold tracking-wide">Account</div>
          <div className="text-[11px] text-white/45">Profile synced with backend</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-2 text-white/60 transition hover:text-white"
          aria-label="close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-white/5">
            {resolveAssetUrl(avatar, assetVersion) ? (
              <img src={resolveAssetUrl(avatar, assetVersion)} alt="avatar" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <label className="glass inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70 hover:text-white">
            <ImageUp size={14} />
            Upload avatar
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onAvatarFile(e.target.files?.[0])}
            />
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-xs text-white/60">Nickname</div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[color:var(--led-color)]"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs text-white/60">Email</div>
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailCode('')
              setEmailCodeSent(false)
            }}
            placeholder="name@example.com"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-[color:var(--led-color)]"
          />
        </label>

        {emailChanged ? (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit verification code"
              inputMode="numeric"
              className="min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-[color:var(--led-color)]"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSendEmailCode()}
              className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70 transition hover:text-white disabled:opacity-50"
            >
              <MailCheck size={14} />
              {emailCodeSent ? 'Resend' : 'Send code'}
            </button>
          </div>
        ) : null}

        {error ? <div className="text-xs text-red-300">{error}</div> : null}
        {ok ? <div className="text-xs text-emerald-300">{ok}</div> : null}

        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
          style={{
            background: 'var(--led-color)',
            boxShadow: '0 0 18px color-mix(in srgb, var(--led-color) 55%, transparent)',
          }}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save profile'}
        </button>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white"
          style={{ background: 'rgba(255, 60, 60, 0.22)', border: '1px solid rgba(255,60,60,0.25)' }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <LogOut size={16} />
            Logout
          </span>
        </button>
      </div>
    </div>
  )
}
