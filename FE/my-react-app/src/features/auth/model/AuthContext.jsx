import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as authApi from '../api/authApi'
import { getToken, setToken } from '../../../shared/storage/token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [user, setUser] = useState(null)

  const saveToken = useCallback((nextToken) => {
    setToken(nextToken)
    setTokenState(nextToken)
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const normalizedEmail = String(email ?? '').trim().toLowerCase()
    const data = await authApi.login({ email: normalizedEmail, password })
    saveToken(data?.token)
    setUser(data?.user ?? null)
    return data
  }, [saveToken])

  const signUp = useCallback(async ({ email, password, name }) => {
    const data = await authApi.register({ email, password, name })
    saveToken(data?.token)
    setUser(data?.user ?? null)
    return data
  }, [saveToken])

  const signOut = useCallback(() => {
    saveToken(null)
    setUser(null)
  }, [saveToken])

  const refreshMe = useCallback(async () => {
    if (!getToken()) return null
    const data = await authApi.me()
    setUser(data?.user ?? null)
    return data
  }, [])

  const value = useMemo(() => ({ token, user, signIn, signUp, signOut, refreshMe }), [token, user, signIn, signUp, signOut, refreshMe])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
