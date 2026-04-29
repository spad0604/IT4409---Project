import { httpClient } from '../../../shared/api/httpClient'

export function getHealth() {
  return httpClient.get('/api/health')
}
