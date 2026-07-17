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

// 响应拦截：业务码统一处理 + 401 跳登录 + 错误 toast
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    if (res.code !== undefined && res.code !== 0 && res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res.data ?? res
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('qms_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    const msg = error.response?.data?.message || error.message || '网络异常'
    ElMessage.error(msg)
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
