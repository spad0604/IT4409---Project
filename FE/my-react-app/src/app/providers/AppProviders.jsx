import { AuthProvider } from '../../features/auth/model/AuthContext'
import { ThemeProvider } from './ThemeContext'

export function AppProviders({ children }) {
  return <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
}
