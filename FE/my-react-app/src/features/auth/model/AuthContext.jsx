import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/authApi'
import { getToken, setToken } from '../../../shared/storage/token'
import { setRefreshHandler, httpClient } from '../../../shared/api/httpClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [user, setUser] = useState(null)

  const saveToken = useCallback((nextToken) => {
    setToken(nextToken)
    setTokenState(nextToken)
  }, [])

  const signOut = useCallback(() => {
    saveToken(null)
    setUser(null)
    localStorage.removeItem('auth_expire_at')
  }, [saveToken])

  const serverSignOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore logout errors (token is client-side)
    } finally {
      saveToken(null)
      setUser(null)
      localStorage.removeItem('auth_expire_at')
    }
  }, [saveToken])

  useEffect(() => {
    let refreshPromise = null;

    setRefreshHandler(async () => {
      const expireAt = localStorage.getItem('auth_expire_at');

      if (!expireAt || new Date() > new Date(expireAt)) {
        signOut();
        return null;
      }

      if (!refreshPromise) {
        refreshPromise = httpClient.post('/api/auth/refresh', {}, { _isRetry: true })
          .then((data) => {
            if (data?.token) {
              saveToken(data.token);
              return data.token;
            }
            throw new Error('No token returned');
          })
          .catch(() => {
            signOut();
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      return refreshPromise;
    });

    return () => setRefreshHandler(null);
  }, [saveToken, signOut]);

  const signIn = useCallback(async ({ email, password, keepSignedIn }) => {
    const normalizedEmail = String(email ?? '').trim().toLowerCase()
    const data = await authApi.login({ email: normalizedEmail, password })
    saveToken(data?.token)
    setUser(data?.user ?? null)

    if (keepSignedIn) {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 7);
      localStorage.setItem('auth_expire_at', expireDate.toISOString());
    } else {
      localStorage.removeItem('auth_expire_at');
    }

    return data
  }, [saveToken])

  const signUp = useCallback(async ({ email, password, name }) => {
    const data = await authApi.register({ email, password, name })
    saveToken(data?.token)
    setUser(data?.user ?? null)
    return data
  }, [saveToken])

  const refreshMe = useCallback(async () => {
    if (!getToken()) return null
    const data = await authApi.me()
    setUser(data?.user ?? null)
    return data
  }, [])

  const value = useMemo(
    () => ({ token, user, signIn, signUp, signOut, serverSignOut, refreshMe }),
    [token, user, signIn, signUp, signOut, serverSignOut, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}