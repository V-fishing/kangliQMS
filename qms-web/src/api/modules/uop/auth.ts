/**
 * UOP — Auth API
 * Controller: AuthController  (/api/v1/auth)
 */
import { request } from '@/api/client'
import type { LoginResponse, CurrentUserVo } from '@/api/types/uop'

export const authApi = {
  /** POST /api/v1/auth/login — 账号密码登录 */
  login: (username: string, password: string) =>
    request.post<LoginResponse>('/v1/auth/login', { username, password }),

  /** POST /api/v1/auth/logout */
  logout: () => request.post('/v1/auth/logout'),

  /** POST /api/v1/auth/refresh — 刷新令牌 */
  refresh: () => request.post<LoginResponse>('/v1/auth/refresh'),

  /** GET /api/v1/uop/me — 当前用户信息 (免鉴权) */
  me: () => request.get<CurrentUserVo>('/v1/uop/me'),
}
