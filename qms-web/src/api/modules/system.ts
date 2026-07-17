/**
 * 系统管理 API 服务骨架
 * 当前返回 mock 数据，后端就绪后替换为 request 调用
 */
import type { SysUser, SysOrg } from '@/types/system'
import { MOCK_USERS, MOCK_ORGS } from '@/mock/system'

export const systemApi = {
  getUsers: async (): Promise<SysUser[]> => MOCK_USERS,
  getOrgs: async (): Promise<SysOrg[]> => MOCK_ORGS,
}
