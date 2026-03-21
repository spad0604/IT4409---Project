import { AuthProvider } from '../../features/auth/model/AuthContext'

export function AppProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}
