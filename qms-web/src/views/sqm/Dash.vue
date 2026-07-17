<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import echarts from '@/utils/echarts'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { BANNERS } from '@/mock/roles'
import { COMPANY_KPI } from '@/mock/company'
import KpiCard from '@/components/common/KpiCard.vue'

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 供应商质量总览',
  desc: '供应商绩效、审核与来料异常一屏掌控',
}

// ---- 数据（对齐 HTML MOCK.sqm） ----
const kpi = computed(() => {
  const k = companyStore.kpi() || COMPANY_KPI.MZ
  return {
    totalSuppliers: 8, qualifiedSuppliers: 5, observingSuppliers: 2, rectifyingSuppliers: 1,
    monthAudits: 3, pendingAbnormal: k.supplierAbn, incomingPassRate: k.auditPass, ncOpenCount: 4,
  }
})
const auditStatusDist = [
  { name: '已通过', value: 3 },
  { name: '有条件通过', value: 2 },
  { name: '整改中', value: 2 },
  { name: '待执行', value: 3 },
]
const monthlyTrend = [
  { month: '2024-07', rate: 91.2 }, { month: '2024-08', rate: 92.5 }, { month: '2024-09', rate: 90.8 },
  { month: '2024-10', rate: 93.1 }, { month: '2024-11', rate: 94.0 }, { month: '2024-12', rate: 95.2 },
  { month: '2025-01', rate: 94.5 },
]
const supplierRanking = [
  { supId: 'SUP001', supName: '江苏精密电子有限公司', score: 96, delivery: 98, quality: 95, service: 95 },
  { supId: 'SUP002', supName: '广东华塑新材料', score: 94, delivery: 96, quality: 93, service: 93 },
  { supId: 'SUP006', supName: '深圳鑫源半导体', score: 93, delivery: 95, quality: 92, service: 92 },
  { supId: 'SUP004', supName: '上海电子连接器厂', score: 91, delivery: 93, quality: 90, service: 90 },
  { supId: 'SUP008', supName: '福建厦门口电子', score: 85, delivery: 88, quality: 83, service: 84 },
  { supId: 'SUP003', supName: '浙江精工金属制品', score: 82, delivery: 85, quality: 80, service: 81 },
  { supId: 'SUP007', supName: '河北钢铁精密加工', score: 79, delivery: 82, quality: 77, service: 78 },
  { supId: 'SUP005', supName: '山东鲁南包装材料', score: 71, delivery: 75, quality: 68, service: 70 },
]
const abnormalRecords = [
  { id: 'ABN-2025-001', supName: '河北钢铁精密加工', partName: '传动轴', level: '严重', status: '待处理', handler: '赵SQE' },
  { id: 'ABN-2025-002', supName: '山东鲁南包装材料', partName: '包装纸箱', level: '一般', status: '整改中', handler: '孙SQE' },
  { id: 'ABN-2024-156', supName: '浙江精工金属制品', partName: '金属支架', level: '严重', status: '已关闭', handler: '赵SQE' },
  { id: 'ABN-2024-148', supName: '福建厦门口电子', partName: '贴片电阻', level: '一般', status: '待验证', handler: '钱SQE' },
  { id: 'ABN-2024-135', supName: '山东鲁南包装材料', partName: '包装纸箱', level: '严重', status: '已关闭', handler: '孙SQE' },
]
const auditPlans = [
  { id: 'AP-2025-001', supName: '浙江精工金属制品', type: '年度复审', planDate: '2025-01-20', auditor: '赵审核员, 钱工程师', status: '待执行' },
  { id: 'AP-2025-002', supName: '山东鲁南包装材料', type: '专项审核', planDate: '2025-01-25', auditor: '孙主管, 李工程师', status: '待执行' },
  { id: 'AP-2025-003', supName: '江苏精密电子有限公司', type: '年度复审', planDate: '2025-02-10', auditor: '周审核员, 吴工程师', status: '计划中' },
  { id: 'AP-2025-004', supName: '河北钢铁精密加工', type: '飞行检查', planDate: '2025-02-15', auditor: '郑审核员', status: '计划中' },
  { id: 'AP-2024-089', supName: '广东华塑新材料', type: '年度复审', planDate: '2024-12-20', auditor: '王审核员, 冯工程师', status: '已完成' },
]

const pendingAbnormal = abnormalRecords.filter((a) => a.status !== '已关闭')
const upcomingAudits = auditPlans.filter((p) => p.status !== '已完成')

// ---- 状态药丸（对齐 HTML stPill / lvlPill） ----
const stMap: Record<string, string> = {
  待检: 'y', 进行中: 'b', 已完成: 'g', 超时: 'r', 合格: 'g', 不合格: 'r', 正常: 'g', 锁定: 'r',
  '待首检': 'y', 充足: 'g', 尚可: 'y', 不足: 'r', 严重: 'r', 一般: 'y', 观察项: 'gray', 待确认: 'y',
  已关闭: 'g', '待提交': 'y', 整改中: 'b', '待启动': 'gray', '超期': 'r', 即将到期: 'y', 报警: 'r',
  预警: 'y', '待处理': 'y', '待验证': 'p', '8D进行中': 'b', 'CAPA执行中': 'p', 计划中: 'y', 待执行: 'y',
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
      data: auditStatusDist,
    }],
  }
}
function trendOption() {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: monthlyTrend.map((m) => m.month), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', min: 80, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'line', data: monthlyTrend.map((m) => m.rate), smooth: true,
      areaStyle: { opacity: 0.15 },
      itemStyle: { color: '#10b981' },
      lineStyle: { width: 3 },
      markLine: { data: [{ type: 'average', name: '平均' }] },
    }],
  }
}

onMounted(() => {
  if (pieRef.value) { pieInst = echarts.init(pieRef.value); pieInst.setOption(pieOption()) }
  if (lineRef.value) { lineInst = echarts.init(lineRef.value); lineInst.setOption(trendOption()) }
})
onBeforeUnmount(() => { pieInst?.dispose(); lineInst?.dispose() })

function onAbnormalHandle(id: string) { ElMessage({ message: `处理 ${id}（演示）`, duration: 1200 }) }
function onAuditStart(id: string) { ElMessage({ message: `开始审核 ${id}（演示）`, duration: 1200 }) }
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

    <!-- KPI 行（对齐 HTML kpi-row，8 项） -->
    <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr)">
      <KpiCard label="供应商总数" :value="kpi.totalSuppliers" unit="家" />
      <KpiCard label="合格供应商" :value="kpi.qualifiedSuppliers" unit="家" status="ok" />
      <KpiCard label="观察期供应商" :value="kpi.observingSuppliers" unit="家" status="warn" />
      <KpiCard label="整改中供应商" :value="kpi.rectifyingSuppliers" unit="家" status="bad" />
      <KpiCard label="本月审核计划" :value="kpi.monthAudits" unit="次" />
      <KpiCard label="待处理异常" :value="kpi.pendingAbnormal" unit="项" status="warn" />
      <KpiCard label="来料合格率" :value="kpi.incomingPassRate" unit="%" status="ok" />
      <KpiCard label="未关闭不符合项" :value="kpi.ncOpenCount" unit="项" />
    </div>

    <!-- 审核分布 + 合格率趋势 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>审核状态分布</h3><span class="sr-tag">SR-SQA-001</span></div>
        <div class="qms-card__body"><div ref="pieRef" class="chart-container"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>来料合格率趋势（近7个月）</h3><span class="sr-tag">SR-SBM-013</span><span class="sr-tag">SR-SBM-014</span><span class="sr-tag">SR-SBM-017</span></div>
        <div class="qms-card__body"><div ref="lineRef" class="chart-container"></div></div>
      </div>
    </div>

    <!-- 绩效排名 + 待处理异常 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>供应商绩效排名</h3><span class="sr-tag">SR-SBM-014</span><span class="sr-tag">SR-SBM-015</span><span class="sr-tag">SR-SBM-016</span></div>
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
        <div class="qms-card__header"><h3>待处理来料异常</h3><span class="sr-tag">SR-CAR-001</span><span class="sr-tag">SR-CAR-002</span></div>
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
              <template #default="{ row }"><el-button size="small" @click="onAbnormalHandle(row.id)">处理</el-button></template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 即将到期审核提醒 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>即将到期审核提醒</h3><span class="sr-tag">SR-SQA-001</span><span class="sr-tag">SR-SQA-005</span></div>
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
            <template #default="{ row }"><el-button size="small" @click="onAuditStart(row.id)">开始审核</el-button></template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sqm-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
