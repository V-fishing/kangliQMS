/**
 * 系统管理类型定义
 */
import type { RoleId } from '@/mock/roles'

export interface SysUser {
  id: string
  name: string
  account: string
  role: RoleId
  dept: string
  status: 'active' | 'disabled'
  phone?: string
  email?: string
  lastLogin?: string
}

export interface SysOrg {
  id: string
  name: string
  code?: string
  parentId: string
  type: 'company' | 'dept' | 'team'
  leader?: string
  sort?: number
}

export interface SysRole {
  id: RoleId
  name: string
  desc: string
  permissions: string[]
  dataScope: 'ALL' | 'ORG_AND_SUB' | 'SELF'
  userCount: number
}

export interface SysMenu {
  id: string
  parentId: string
  name: string
  path: string
  icon: string
  sort: number
  visible: boolean
  permissions?: string[]
}

export interface SysConfig {
  key: string
  label: string
  value: string | number | boolean
  type: 'string' | 'number' | 'boolean' | 'select'
  options?: { label: string; value: string }[]
  group: string
  desc: string
}
