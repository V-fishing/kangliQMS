/**
 * API Client — re-exports the shared axios request instance
 *
 * All API module files import `request` from here.
 * The actual axios setup lives in @/utils/request.ts
 * (JWT interceptor, 401 handling, business-code dispatch).
 */
export { request } from '@/utils/request'
