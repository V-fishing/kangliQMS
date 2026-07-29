/**
 * 公司上下文 Store（CompanyContext）
 * 对应设计方案 §6.3 跨公司切换免重登 / §7 数据隔离 / §8 管理员聚合视图
 *
 * 职责：
 *  - 登录后从账号初始化可关联公司
 *  - 强制选择（单家确认 / 多家可选 + 集团总览）
 *  - 提供免重登切换接口（switchCompany / switchToGroup）
 *  - 暴露当前公司与权限，供各模块按 companyId 取数
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { COMPANIES, COMPANY_KPI, EMPTY_PERM } from '@/mock/company'
import type { Company, CompanyId, CompanyPerm, DemoAccount } from '@/types/company'
import { systemApi } from '@/api/modules/system'

export const useCompanyStore = defineStore('company', () => {
  /** 全部公司（数据驱动） */
  const companies = ref<Company[]>(COMPANIES)

  /** 当前上下文：具体公司 id 或 'GROUP' 或 空（未选） */
  const currentCompanyId = ref<CompanyId | 'GROUP' | ''>(localStorage.getItem('qms_company') || '')

  /** 组织代码 -> 真实 orgId(UUID) 映射，来自后端组织树，用于请求携带真实 org_id */
  const orgCodeToId = ref<Record<string, string>>({})

  /** 账号可关联的公司 */
  const accountCompanies = ref<CompanyId[]>([])

  /** 账号对各公司的权限矩阵 */
  const accountPerm = ref<Record<CompanyId, CompanyPerm>>({ ...EMPTY_PERM })

  /** 是否集团/跨公司管理员 */
  const isGroupAdmin = ref(false)

  /** 登录后待选账号（选择完成后清空） */
  const pendingAccount = ref<DemoAccount | null>(null)

  // ---- getters ----
  const isGroup = computed(() => currentCompanyId.value === 'GROUP')
  const hasSelected = computed(() => currentCompanyId.value !== '')
  const currentCompany = computed(
    () => companies.value.find((c) => c.id === currentCompanyId.value) ?? null,
  )
  /** 仅关联 1 家公司时，是否允许进入集团总览（仅集团管理员） */
  const canSwitchGroup = computed(
    () => isGroupAdmin.value || accountCompanies.value.length > 1,
  )
  /** 账号可切换的公司列表 */
  const availableCompanies = computed(() =>
    companies.value.filter((c) => accountCompanies.value.includes(c.id)),
  )
  /**
   * 当前上下文对应的真实 org_id(UUID)。
   * - 集团总览：返回空（由后端按 dataScope=all 返回全部）
   * - 具体公司：优先用后端组织树解析出的 UUID，未加载完成时回退到公司代码(后端可反查)
   * 用于各模块请求携带真实 org_id，避免把业务代码(MZ)当作 UUID 入库。
   */
  const currentOrgId = computed(() => {
    if (isGroup.value) return ''
    const code = currentCompanyId.value as string
    return (orgCodeToId.value[code] as string) || code || ''
  })

  // ---- actions ----
  /** 登录成功后，用账号初始化公司上下文（保留已选公司 if 合法） */
  function initFromAccount(acc: DemoAccount) {
    pendingAccount.value = acc
    accountCompanies.value = [...acc.companies]
    accountPerm.value = { ...acc.perm }
    isGroupAdmin.value = acc.isGroupAdmin
    // 保留已选公司（如果该公司在账号可关联列表中），否则重置为未选
    const saved = localStorage.getItem('qms_company') || ''
    if (saved && (acc.companies.includes(saved as CompanyId) || (saved === 'GROUP' && acc.isGroupAdmin))) {
      currentCompanyId.value = saved as CompanyId | 'GROUP'
    } else {
      currentCompanyId.value = ''
      localStorage.removeItem('qms_company')
    }
    // 拉取组织树，建立 组织代码 -> 真实 org_id(UUID) 映射，供请求携带真实 org_id
    loadOrgIds()
  }

  /** 从后端组织树构建 组织代码 -> org_id(UUID) 映射 */
  async function loadOrgIds() {
    try {
      const orgs = await systemApi.getOrgs()
      const m: Record<string, string> = {}
      for (const o of orgs) {
        if (o.code) m[o.code] = o.id
      }
      orgCodeToId.value = m
    } catch {
      // 失败不阻断主流程： currentOrgId 会回退到公司代码，后端可反查
    }
  }

  /** 首次强制选择某具体公司 */
  function selectCompany(id: CompanyId) {
    if (!accountCompanies.value.includes(id)) return
    currentCompanyId.value = id
    localStorage.setItem('qms_company', id)
    pendingAccount.value = null
  }

  /** 首次选择集团总览 */
  function selectGroup() {
    if (!canSwitchGroup.value) return
    currentCompanyId.value = 'GROUP'
    localStorage.setItem('qms_company', 'GROUP')
    pendingAccount.value = null
  }

  /** 顶栏切换：免重登切换到具体公司 */
  function switchCompany(id: CompanyId) {
    if (!accountCompanies.value.includes(id)) return
    currentCompanyId.value = id
    localStorage.setItem('qms_company', id)
  }

  /** 顶栏切换：免重登切换到集团总览 */
  function switchToGroup() {
    if (!canSwitchGroup.value) return
    currentCompanyId.value = 'GROUP'
    localStorage.setItem('qms_company', 'GROUP')
  }

  /** 退出登录，清空上下文 */
  function reset() {
    currentCompanyId.value = ''
    localStorage.removeItem('qms_company')
    accountCompanies.value = []
    accountPerm.value = { ...EMPTY_PERM }
    isGroupAdmin.value = false
    pendingAccount.value = null
  }

  // ---- 取数辅助 ----
  /** 指定公司权限 */
  function canOperate(id: CompanyId): boolean {
    return accountPerm.value[id] === '可操作'
  }

  /** 当前上下文权限（集团总览一律只读） */
  function currentPerm(): CompanyPerm {
    if (isGroup.value) return '只读'
    if (!currentCompanyId.value) return '无'
    return accountPerm.value[currentCompanyId.value as CompanyId]
  }

  /** 当前公司的核心 KPI（集团视图返回 null） */
  function kpi() {
    if (isGroup.value || !currentCompanyId.value) return null
    return COMPANY_KPI[currentCompanyId.value as CompanyId]
  }

  /** 当前上下文标签（用于顶栏/水印展示） */
  function contextLabel(): string {
    if (isGroup.value) return '集团总览'
    return currentCompany.value?.shortName ?? '未选择'
  }

  return {
    companies,
    currentCompanyId,
    orgCodeToId,
    accountCompanies,
    accountPerm,
    isGroupAdmin,
    pendingAccount,
    isGroup,
    hasSelected,
    currentCompany,
    canSwitchGroup,
    availableCompanies,
    currentOrgId,
    initFromAccount,
    loadOrgIds,
    selectCompany,
    selectGroup,
    switchCompany,
    switchToGroup,
    reset,
    canOperate,
    currentPerm,
    kpi,
    contextLabel,
  }
})
