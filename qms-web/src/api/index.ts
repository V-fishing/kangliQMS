/**
 * API barrel export
 *
 * New structure (per-controller):
 *   import { fiaTasksApi, usersApi, spcAlarmsApi } from '@/api'
 *
 * Old flat files (fia.ts, ncm.ts, etc.) remain in ./modules/ for backward
 * compatibility during migration. Views will be migrated incrementally.
 */
// ── UOP ──
export { authApi } from './modules/uop/auth'
export { usersApi } from './modules/uop/users'
export { rolesApi } from './modules/uop/roles'
export { menusApi } from './modules/uop/menus'
export { orgsApi } from './modules/uop/orgs'
export { dictsApi } from './modules/uop/dicts'
export { delegationsApi } from './modules/uop/delegations'

// ── FIA ──
export { fiaTasksApi } from './modules/fia/tasks'
export { fiaApprovalsApi } from './modules/fia/approvals'
export { fiaStdsApi } from './modules/fia/stds'
export { fiaTriggersApi } from './modules/fia/triggers'
export { fiaSignConfigApi } from './modules/fia/sign-config'
export { fiaInterceptConfigApi } from './modules/fia/intercept-config'
export { fiaWoLockApi } from './modules/fia/wo-lock'

// ── SPC ──
export { spcParamsApi } from './modules/spc/params'
export { spcSubgroupsApi } from './modules/spc/subgroups'
export { spcAlarmsApi } from './modules/spc/alarms'
export { spcRulesApi } from './modules/spc/rules'
export { spcCapabilityApi } from './modules/spc/capability'
export { spcControlLimitsApi } from './modules/spc/control-limits'
export { spcCollectTasksApi } from './modules/spc/collect-tasks'
export { spcNotifyChannelsApi } from './modules/spc/notify-channels'
export { spcGlobalConfigApi } from './modules/spc/global-config'
export { spcDashboardApi } from './modules/spc/dashboard'

// ── NCM ──
export { ncmDefectDictsApi } from './modules/ncm/defect-dicts'
export { ncmDefectRecordsApi } from './modules/ncm/defect-records'
export { ncm8dApi } from './modules/ncm/8d-reports'
export { ncmCapaApi } from './modules/ncm/capas'
export { ncmCorrectiveActionsApi } from './modules/ncm/corrective-actions'
export { ncmFishboneApi } from './modules/ncm/fishbones'
export { ncmFilterSchemesApi } from './modules/ncm/filter-schemes'
export { ncmEscalationsApi } from './modules/ncm/escalations'
export { ncmDailyReportConfigApi } from './modules/ncm/daily-report-config'
export { ncmBiReportsApi } from './modules/ncm/bi-reports'

// ── SQM ──
export { sqmSuppliersApi } from './modules/sqm/suppliers'
export { sqmAuditsApi } from './modules/sqm/audits'
export { sqmAbnormalsApi } from './modules/sqm/abnormals'
export { sqmChangesApi } from './modules/sqm/changes'
export { sqmFmeaApi } from './modules/sqm/fmea'
export { sqmTraceApi } from './modules/sqm/trace'
export { sqmPerformanceApi } from './modules/sqm/performance'
export { sqmGradeRulesApi } from './modules/sqm/grade-rules'
export { sqmSharesApi } from './modules/sqm/shares'
export { sqmEscalationsApi } from './modules/sqm/escalations'
export { sqmSupplierCertsApi } from './modules/sqm/supplier-certs'
export { sqmMeasuresApi } from './modules/sqm/measures'
export { sqmVerificationsApi } from './modules/sqm/verifications'
export { sqmAuditFreqRulesApi } from './modules/sqm/audit-freq-rules'
export { sqmStrictInspectsApi } from './modules/sqm/strict-inspects'
export { sqmAnalysisApi } from './modules/sqm/analysis'

// ── Patrol ──
export { patrolRoutesApi } from './modules/patrol/routes'
export { patrolTasksApi } from './modules/patrol/tasks'
export { patrolAbnormalsApi } from './modules/patrol/abnormals'

// ── Archive ──
export { archiveApi } from './modules/archive'

// ── Backward compatibility: old flat API objects (used by existing views) ──
export { overviewApi } from './modules/overview'
export { fiaApi } from './modules/fia'
export { spcApi } from './modules/spc'
export { ncmApi } from './modules/ncm'
export { sqmApi, mapSuppliers } from './modules/sqm'
export { systemApi } from './modules/system'
export { qsmApi } from './modules/qsm'
export { tlmApi } from './modules/tlm'
