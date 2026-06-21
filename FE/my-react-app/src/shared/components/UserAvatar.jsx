import { env } from '../config/env'

function avatarUrl(user) {
  const value = user?.avatar_url || user?.avatarUrl || ''
  return value.startsWith('/') ? `${env.apiBaseUrl}${value}` : value
}

export default function UserAvatar({ user, initials = '??', className = '' }) {
  const src = avatarUrl(user)
  return <span className={`${className} user-avatar`}>{src ? <img src={src} alt="" /> : initials}</span>
}
