<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import echarts from '@/utils/echarts'
import { useChartResize } from '@/composables/useChartResize'
useChartResize(() => [pieInst, lineInst])
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { BANNERS } from '@/config/banners'
import type { RoleId } from '@/mock/roles'
import { sqmApi } from '@/api'
import type { Supplier, NcItem } from '@/types/sqm'
import KpiCard from '@/components/common/KpiCard.vue'

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const router = useRouter()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 供应商质量总览',
  desc: '供应商绩效、审核与来料异常一屏掌控',
}

// 权限：可处理来料异常 / 发起与处理审核（sqe / qmanager / sysadmin）
const canHandle = computed(() => (['sqe', 'qmanager', 'sysadmin'] as RoleId[]).includes(authStore.role))

// ---- 真实后端数据 ----
const kpi = ref({
  totalSuppliers: 0, qualifiedSuppliers: 0, observingSuppliers: 0, rectifyingSuppliers: 0,
  monthAudits: 0, pendingAbnormal: 0, incomingPassRate: 0, ncOpenCount: 0,
})
const suppliers = ref<Supplier[]>([])
const auditStatusDist = ref<{ name: string; value: number }[]>([])
const monthlyTrend = ref<{ month: string; rate: number }[]>([])
const supplierRanking = ref<{ supId: string; supName: string; score: number; delivery: number; quality: number; service: number }[]>([])
const abnormalRecords = ref<{ id: string; supName: string; partName: string; level: string; status: string; handler: string }[]>([])
const auditPlans = ref<{ id: string; supName: string; type: string; planDate: string; auditor: string; status: string }[]>([])
const ncs = ref<NcItem[]>([])

const pendingAbnormal = computed(() => abnormalRecords.value.filter((a) => a.status !== '已关闭'))
const upcomingAudits = computed(() => auditPlans.value.filter((p) => p.status !== '已完成'))

async function loadData() {
  try {
    const [dashKpi, supList, auditRecs, plans, ncList, abnormals, ranking] = await Promise.all([
      sqmApi.getKpi(),
      sqmApi.getSuppliers(),
      sqmApi.getAuditRecords(),
      sqmApi.getAuditPlans(),
      sqmApi.getNcItems(),
      sqmApi.getAbnormals(),
      sqmApi.getPerformanceRanking(),
    ])
    suppliers.value = supList
    ncs.value = ncList
    const supMap: Record<string, { name: string; status: string }> = {}
    suppliers.value.forEach((s) => { supMap[s.id] = { name: s.name, status: s.status } })
    // KPI 行：全部来自真实后端接口
    kpi.value = {
      totalSuppliers: suppliers.value.length,
      qualifiedSuppliers: suppliers.value.filter((s) => s.status === '合格').length,
      observingSuppliers: suppliers.value.filter((s) => s.status === '观察').length,
      rectifyingSuppliers: suppliers.value.filter((s) => s.status === '整改中').length,
      monthAudits: plans.length,
      pendingAbnormal: abnormals.filter((a) => a.status !== '已关闭').length || dashKpi.pendingAbnormals,
      incomingPassRate: dashKpi.passRate,
      ncOpenCount: ncList.filter((n) => n.status !== '已关闭').length,
    }
    // 审核状态分布：从审核记录聚合 result
    const distMap: Record<string, number> = {}
    auditRecs.forEach((r) => { distMap[r.result] = (distMap[r.result] || 0) + 1 })
    auditStatusDist.value = Object.entries(distMap).map(([name, value]) => ({ name, value }))
    // 来料合格率趋势：用后端 dashboard trend7d（近7天真实数据）
    if (dashKpi.trend7d && dashKpi.trend7d.length) {
      monthlyTrend.value = dashKpi.trend7d.map((t) => ({ month: t.date, rate: t.passRate }))
    }
    // 供应商绩效排名：基于真实绩效数据前端聚合（含等级字段）
    supplierRanking.value = ranking.map((m) => ({
      supId: String(m.supplierId ?? ''),
      supName: supMap[String(m.supplierId ?? '')]?.name || String(m.supplierName ?? ''),
      score: Number(m.score ?? 0) || 0,
      delivery: Number(m.delivery ?? 0) || 0,
      quality: Number(m.quality ?? 0) || 0,
      service: Number(m.service ?? 0) || 0,
      level: m.level || '',
      period: m.period || '',
    }))
    // 待处理来料异常
    abnormalRecords.value = abnormals.map((a) => ({
      id: a.id, supName: a.supName || supMap[a.supId]?.name || a.supId,
      partName: a.partName, level: a.level, status: a.status, handler: a.handler,
    }))
    // 审核计划
    auditPlans.value = plans.map((p) => ({
      id: p.id, supName: p.supName || supMap[p.supId]?.name || p.supId,
      type: p.type, planDate: p.planDate, auditor: p.auditor, status: p.status,
    }))
    // 图表重渲染
    nextTickRender()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
onMounted(loadData)

// ---- 根据权限进入真实流程（带入记录 id，目标页自动下钻到该条详情） ----
// 只读（详情/查看）：目标页面 Abnormal/Audit 对更宽角色开放只读，无条件跳转
function viewAbnormal(id: string) { router.push({ path: '/sqm/abnormal', query: { id } }) }
function viewAudit(id: string) { router.push({ path: '/sqm/audit', query: { id } }) }
// 写操作（处理/开始审核）：仅 sqe / qmanager / sysadmin 可发起
function handleAbnormal(id: string) {
  if (!canHandle.value) { ElMessage.warning('当前角色无处理来料异常权限'); return }
  router.push({ path: '/sqm/abnormal', query: { id } })
}
function startAudit(id: string) {
  if (!canHandle.value) { ElMessage.warning('当前角色无发起/处理审核权限'); return }
  router.push({ path: '/sqm/audit', query: { id } })
}

// ---- 8 大 KPI 点击预览 ----
const preview = ref<{ title: string; headers: string[]; rows: (string | number)[][] } | null>(null)
const showPreview = ref(false)
const supRow = (s: Supplier): (string | number)[] => [s.code, s.name, s.category, s.level, s.status, s.contact, s.tel]
function openPreview(key: string) {
  const supHeaders = ['编号', '名称', '类别', '等级', '状态', '联系人', '电话']
  switch (key) {
    case 'suppliers': preview.value = { title: `全部供应商（共 ${suppliers.value.length} 家）`, headers: supHeaders, rows: suppliers.value.map(supRow) }; break
    case 'qualified': preview.value = { title: '合格供应商', headers: supHeaders, rows: suppliers.value.filter((s) => s.status === '合格').map(supRow) }; break
    case 'observing': preview.value = { title: '观察期供应商', headers: supHeaders, rows: suppliers.value.filter((s) => s.status === '观察').map(supRow) }; break
    case 'rectifying': preview.value = { title: '整改中供应商', headers: supHeaders, rows: suppliers.value.filter((s) => s.status === '整改中').map(supRow) }; break
    case 'auditPlans': preview.value = { title: '本月审核计划', headers: ['计划号', '供应商', '类型', '计划日期', '审核员', '状态'], rows: auditPlans.value.map((p) => [p.id, p.supName, p.type, p.planDate, p.auditor, p.status]) }; break
    case 'abnormal': preview.value = { title: '待处理来料异常', headers: ['异常单号', '供应商', '物料', '等级', '状态', '处理人'], rows: abnormalRecords.value.filter((a) => a.status !== '已关闭').map((a) => [a.id, a.supName, a.partName, a.level, a.status, a.handler]) }; break
    case 'nc': preview.value = { title: '未关闭不符合项', headers: ['NC 单号', '供应商', '描述', '等级', '状态'], rows: ncs.value.filter((n) => n.status !== '已关闭').map((n) => [n.id, n.supName, n.desc, n.level, n.status]) }; break
    case 'passRate': preview.value = { title: '来料合格率趋势（近 7 天 · 真实数据）', headers: ['日期', '合格率 %'], rows: monthlyTrend.value.map((m) => [m.month, m.rate]) }; break
    default: preview.value = null
  }
  if (preview.value) showPreview.value = true
}

// ---- 状态药丸（对齐 HTML stPill / lvlPill） ----
const stMap: Record<string, string> = {
  待检: 'y', 进行中: 'b', 已完成: 'g', 超时: 'r', 合格: 'g', 不合格: 'r', 正常: 'g', 锁定: 'r',
  '待首检': 'y', 充足: 'g', 尚可: 'y', 不足: 'r', 严重: 'r', 一般: 'y', 观察项: 'gray', 待确认: 'y',
  已关闭: 'g', '待提交': 'y', 整改中: 'b', '待启动': 'gray', '超期': 'r', 即将到期: 'y', 报警: 'r',
  预警: 'y', '待处理': 'y', '待验证': 'p', '8D进行中': 'b', 'CAPA执行中': 'p', 计划中: 'y', 待执行: 'y',
  待审核: 'gray', 启用: 'g', 观察: 'y',
}
function pillCls(s: string) { return stMap[s] || 'y' }

// ---- 图表 option（对齐 HTML renderSqmDash） ----
const pieRef = ref<HTMLDivElement>()
const lineRef = ref<HTMLDivElement>()
let pieInst: echarts.ECharts | null = null
let lineInst: echarts.ECharts | null = null

function pieOption() {
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: auditStatusDist.value,
    }],
  }
}
function trendOption() {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: monthlyTrend.value.map((m) => m.month), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', min: 80, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'line', data: monthlyTrend.value.map((m) => m.rate), smooth: true,
      areaStyle: { opacity: 0.15 },
      itemStyle: { color: '#10b981' },
      lineStyle: { width: 3 },
      markLine: { data: [{ type: 'average', name: '平均' }] },
    }],
  }
}
function nextTickRender() {
  if (pieRef.value) { if (!pieInst) pieInst = echarts.init(pieRef.value); pieInst.setOption(pieOption()) }
  if (lineRef.value) { if (!lineInst) lineInst = echarts.init(lineRef.value); lineInst.setOption(trendOption()) }
}
onMounted(() => { nextTickRender() })
onBeforeUnmount(() => { pieInst?.dispose(); lineInst?.dispose() })
</script>

<template>
  <div class="sqm-dash">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🏭</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }} · 当前公司：{{ companyStore.contextLabel() }}</div>
      </div>
    </div>

    <!-- KPI 行（8 项，点击预览明细） -->
    <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr)">
      <div class="kpi-click" @click="openPreview('suppliers')"><span class="eye">👁 预览</span><KpiCard label="供应商总数" :value="kpi.totalSuppliers" unit="家" /></div>
      <div class="kpi-click" @click="openPreview('qualified')"><span class="eye">👁 预览</span><KpiCard label="合格供应商" :value="kpi.qualifiedSuppliers" unit="家" status="ok" /></div>
      <div class="kpi-click" @click="openPreview('observing')"><span class="eye">👁 预览</span><KpiCard label="观察期供应商" :value="kpi.observingSuppliers" unit="家" status="warn" /></div>
      <div class="kpi-click" @click="openPreview('rectifying')"><span class="eye">👁 预览</span><KpiCard label="整改中供应商" :value="kpi.rectifyingSuppliers" unit="家" status="bad" /></div>
      <div class="kpi-click" @click="openPreview('auditPlans')"><span class="eye">👁 预览</span><KpiCard label="本月审核计划" :value="kpi.monthAudits" unit="次" /></div>
      <div class="kpi-click" @click="openPreview('abnormal')"><span class="eye">👁 预览</span><KpiCard label="待处理异常" :value="kpi.pendingAbnormal" unit="项" status="warn" /></div>
      <div class="kpi-click" @click="openPreview('passRate')"><span class="eye">👁 预览</span><KpiCard label="来料合格率" :value="kpi.incomingPassRate" unit="%" status="ok" /></div>
      <div class="kpi-click" @click="openPreview('nc')"><span class="eye">👁 预览</span><KpiCard label="未关闭不符合项" :value="kpi.ncOpenCount" unit="项" /></div>
    </div>

    <!-- 审核分布 + 合格率趋势 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>审核状态分布</h3></div>
        <div class="qms-card__body"><div ref="pieRef" class="chart-container"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>来料合格率趋势（近7天）</h3></div>
        <div class="qms-card__body"><div ref="lineRef" class="chart-container"></div></div>
      </div>
    </div>

    <!-- 绩效排名 + 待处理异常 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>供应商绩效排名</h3></div>
        <div class="qms-card__body" style="padding: 0">
          <el-table :data="supplierRanking" border size="small">
            <el-table-column label="排名" width="72">
              <template #default="{ $index }"><span class="qms-pill" :class="$index < 3 ? 'g' : 'gray'">{{ $index + 1 }}</span></template>
            </el-table-column>
            <el-table-column label="供应商">
              <template #default="{ row }"><strong>{{ row.supName }}</strong><br><span class="meta">{{ row.supId }}</span></template>
            </el-table-column>
            <el-table-column prop="score" label="综合分" width="80">
              <template #default="{ row }"><b :style="{ color: row.score >= 90 ? '#2f7d32' : '#d4a017' }">{{ row.score }}</b></template>
            </el-table-column>
            <el-table-column prop="delivery" label="交付" width="70" />
            <el-table-column prop="quality" label="质量" width="70" />
            <el-table-column prop="service" label="服务" width="70" />
          </el-table>
        </div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>待处理来料异常</h3></div>
        <div class="qms-card__body" style="padding: 0">
          <el-table :data="pendingAbnormal" border size="small">
            <el-table-column prop="id" label="异常单号" width="120" />
            <el-table-column prop="supName" label="供应商" />
            <el-table-column prop="partName" label="物料" width="90" />
            <el-table-column label="等级" width="80">
              <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.level)">{{ row.level }}</span></template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span></template>
            </el-table-column>
            <el-table-column prop="handler" label="处理人" width="80" />
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button size="small" :type="canHandle ? 'primary' : 'default'" @click="canHandle ? handleAbnormal(row.id) : viewAbnormal(row.id)">{{ canHandle ? '处理' : '详情' }}</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 即将到期审核提醒 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>即将到期审核提醒</h3></div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="upcomingAudits" border size="small">
          <el-table-column prop="id" label="审核计划号" width="120" />
          <el-table-column prop="supName" label="供应商" />
          <el-table-column prop="type" label="审核类型" width="120" />
          <el-table-column prop="planDate" label="计划日期" width="110" />
          <el-table-column prop="auditor" label="审核员" width="140" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" :type="canHandle ? 'primary' : 'default'" @click="canHandle ? startAudit(row.id) : viewAudit(row.id)">{{ canHandle ? '开始审核' : '查看' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 供应商台账：展示所有供应商相关信息（真实数据） -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>供应商台账</h3><span class="tag">{{ suppliers.length }} 家</span></div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <el-table :data="suppliers" border size="small" empty-text="暂无供应商数据">
          <el-table-column prop="code" label="编号" width="120" />
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="category" label="类别" width="110" />
          <el-table-column prop="level" label="等级" width="70" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column prop="contact" label="联系人" width="100" />
          <el-table-column prop="tel" label="电话" width="130" />
          <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
          <el-table-column label="资质" width="80" align="center">
            <template #default="{ row }">{{ (row.qualifications || []).length }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- KPI 明细预览弹窗 -->
    <el-dialog :title="preview?.title || ''" v-model="showPreview" width="780px">
      <div v-if="preview" class="prev-wrap">
        <table class="prev-tbl">
          <thead><tr><th v-for="h in preview.headers" :key="h">{{ h }}</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in preview.rows" :key="i"><td v-for="(c, j) in r" :key="j">{{ c }}</td></tr>
          </tbody>
        </table>
        <div v-if="!preview.rows.length" class="muted" style="padding: 14px">暂无相关数据</div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.kpi-row { display: grid; gap: 14px; }
.kpi-click {
  position: relative;
  cursor: pointer;
  transition: 0.15s;
  border-radius: 8px;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(30, 77, 139, 0.18); }
  .eye {
    position: absolute; top: 6px; right: 8px; z-index: 2;
    font-size: 11px; color: #1e4d8b; opacity: 0; transition: 0.15s;
    background: #eef4fb; border-radius: 8px; padding: 1px 6px;
  }
  &:hover .eye { opacity: 1; }
}
.chart-grid { display: grid; gap: 14px; }
.chart-grid--2 { grid-template-columns: 1fr 1fr; }
@media (max-width: 980px) { .chart-grid--2 { grid-template-columns: 1fr; } }
.chart-container { height: 280px; }
.prev-wrap { max-height: 60vh; overflow: auto; }
.prev-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.prev-tbl th, .prev-tbl td { border-bottom: 1px solid #eef2f7; padding: 8px 10px; text-align: left; }
.prev-tbl th { background: #f7f9fc; color: #5a6b7e; font-weight: 600; position: sticky; top: 0; }
.muted { color: #8a94a6; }
</style>
