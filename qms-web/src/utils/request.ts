import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

/**
 * HTTP 请求封装
 * 对应技术栈文档 §6.3: axios 拦截器统一 JWT/401/错误/loading/重试
 */

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截：加 JWT + traceId + loading
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('qms_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    config.headers['X-Trace-Id'] = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return config
  },
  (error) => Promise.reject(error),
)

// 防止并发 401 触发多次跳转登录的标志位
let isRedirectingToLogin = false

// 响应拦截：业务码统一处理 + 401 跳登录 + 错误 toast
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    if (res.code !== undefined && res.code !== 0 && res.code !== 200) {
      // 业务 401:清 token 跳登录(与 HTTP 401 处理一致)
      if (res.code === 401) {
        localStorage.removeItem('qms_token')
        const onLoginPage = window.location.pathname.startsWith('/login')
        if (!onLoginPage && !isRedirectingToLogin) {
          isRedirectingToLogin = true
          ElMessage.error('登录已过期，请重新登录')
          window.location.href = '/login'
        }
      } else {
        ElMessage.error(res.msg || '请求失败')
      }
      return Promise.reject(Object.assign(new Error(res.msg || 'Error'), { response: { status: res.code, data: res } }))
    }
    return res.data ?? res
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      // 会话过期/未认证：清理 token 并跳登录。
      // 仅在非登录页时跳转，避免登录页自身 401 造成的重复跳转/刷屏；
      // 用标志位防止并发请求同时触发多次跳转。
      localStorage.removeItem('qms_token')
      const onLoginPage = window.location.pathname.startsWith('/login')
      if (!onLoginPage && !isRedirectingToLogin) {
        isRedirectingToLogin = true
        ElMessage.error('登录已过期，请重新登录')
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?redirect=${redirect}`
      }
      return Promise.reject(error)
    }
    const msg = error.response?.data?.msg || error.message || '网络异常'
    // 404 等后端未就绪错误,只输出控制台,不弹红色 toast 干扰用户(由各业务页面自行处理回退)
    if (status === 404 || status === 502 || status === 503) {
      console.warn(`[request] ${status} ${msg} (${error.config?.url})`)
    } else {
      ElMessage.error(msg)
    }
    return Promise.reject(error)
  },
)

/**
 * 通用请求方法（后端就绪后使用）
 * Mock 模式下 API 函数直接返回假数据，不走此封装
 */
export const request = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, config)
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config)
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return service.put(url, data, config)
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, config)
  },
}

export default service
