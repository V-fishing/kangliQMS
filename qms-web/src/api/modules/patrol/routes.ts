/**
 * Patrol — Routes API
 * Controller: PatlRouteController  (/api/v1/patrol/routes)
 *
 * Permissions:
 *   patl.route.list   — GET /, GET /{id}
 *   patl.route.create — POST, PUT, DELETE
 */
import { request } from '@/api/client'
import type { PatlRoute, PatlRouteVo } from '@/api/types/patrol'

export const patrolRoutesApi = {
  list: () => request.get<PatlRoute[]>('/v1/patrol/routes'),
  getById: (id: string) => request.get<PatlRouteVo>(`/v1/patrol/routes/${id}`),
  create: (data: Partial<PatlRoute>) => request.post<PatlRoute>('/v1/patrol/routes', data),
  update: (id: string, data: Partial<PatlRoute>) =>
    request.put<void>(`/v1/patrol/routes/${id}`, data),
  delete: (id: string) => request.delete<void>(`/v1/patrol/routes/${id}`),
}
