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

export const useCompanyStore = defineStore('company', () => {
  /** 全部公司（数据驱动） */
  const companies = ref<Company[]>(COMPANIES)

  /** 当前上下文：具体公司 id 或 'GROUP' 或 空（未选） */
  const currentCompanyId = ref<CompanyId | 'GROUP' | ''>('')

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

  // ---- actions ----
  /** 登录成功后，用账号初始化公司上下文（尚未选定） */
  function initFromAccount(acc: DemoAccount) {
    pendingAccount.value = acc
    accountCompanies.value = [...acc.companies]
    accountPerm.value = { ...acc.perm }
    isGroupAdmin.value = acc.isGroupAdmin
    currentCompanyId.value = ''
  }

  /** 首次强制选择某具体公司 */
  function selectCompany(id: CompanyId) {
    if (!accountCompanies.value.includes(id)) return
    currentCompanyId.value = id
    pendingAccount.value = null
  }

  /** 首次选择集团总览 */
  function selectGroup() {
    if (!canSwitchGroup.value) return
    currentCompanyId.value = 'GROUP'
    pendingAccount.value = null
  }

  /** 顶栏切换：免重登切换到具体公司 */
  function switchCompany(id: CompanyId) {
    if (!accountCompanies.value.includes(id)) return
    currentCompanyId.value = id
  }

  /** 顶栏切换：免重登切换到集团总览 */
  function switchToGroup() {
    if (!canSwitchGroup.value) return
    currentCompanyId.value = 'GROUP'
  }

  /** 退出登录，清空上下文 */
  function reset() {
    currentCompanyId.value = ''
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
    accountCompanies,
    accountPerm,
    isGroupAdmin,
    pendingAccount,
    isGroup,
    hasSelected,
    currentCompany,
    canSwitchGroup,
    availableCompanies,
    initFromAccount,
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
