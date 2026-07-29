import { request } from '@/utils/request'
import type { LoginResponse, CurrentUserVo } from '@/types/auth'

/**
 * 认证相关接口
 * 对应后端：
 *  - POST /api/v1/auth/login
 *  - GET  /api/v1/uop/me
 *  - POST /api/v1/auth/logout
 *  - POST /api/v1/auth/refresh
 *
 * 注：request 的 baseURL 为 /api（见 .env.development 的 VITE_API_BASE），
 * 故此处路径省略 /api 前缀，由 vite proxy 转发到后端 8080。
 */
export const authApi = {
  login: (username: string, password: string) =>
    request.post<LoginResponse>('/v1/auth/login', { username, password }),
  me: () => request.get<CurrentUserVo>('/v1/uop/me'),
  logout: () => request.post('/v1/auth/logout'),
  refresh: () => request.post<LoginResponse>('/v1/auth/refresh'),
}
