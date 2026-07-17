<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import echarts from '@/utils/echarts'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { healthDims, improvementSuggestions, qsmKpi } from '@/mock/qsm'
import type { HealthDim, ImprovementSuggestion } from '@/types/qsm'

const authStore = useAuthStore()
const banner = BANNERS.qsm?.[authStore.role] || {
  title: 'QSM · 体系合规监控',
  desc: '多维度体系健康度汇聚、预警与改进建议闭环',
}

const dims = ref<HealthDim[]>(JSON.parse(JSON.stringify(healthDims)))
const suggestions = ref<ImprovementSuggestion[]>(
  JSON.parse(JSON.stringify(improvementSuggestions)),
)

// 是否低于阈值（预警）
function isWarn(d: HealthDim) {
  return d.value < d.threshold
}
const warnCount = ref(dims.value.filter(isWarn).length)

const stMap: Record<string, string> = {
  已采纳: 'g', 未采纳: 'gray', 采纳: 'g',
}
function pillCls(s: string) {
  return stMap[s] || 'y'
}

// 采纳 / 不采纳改进建议（§18 采纳建议 + 决策原因）
function adopt(s: ImprovementSuggestion) {
  s.adopted = true
  s.decisionReason = ''
  s.trackResult = '改进跟踪中（演示）'
  ElMessage.success(`已采纳建议 ${s.id}`)
}
function reject(s: ImprovementSuggestion) {
  s.adopted = false
  s.decisionReason = '经评审暂不纳入本期改进计划'
  ElMessage.info(`已记录 ${s.id} 不采纳决策原因`)
}

// 体系健康度维度对比图（实际值 vs 预警阈值）
const barRef = ref<HTMLDivElement>()
let barInst: echarts.ECharts | null = null
function barOption() {
  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}' } },
    xAxis: { type: 'category', data: dims.value.map((d) => d.name), axisLabel: { rotate: 20, fontSize: 11 } },
    series: [
      {
        name: '当前值', type: 'bar', barWidth: 18,
        data: dims.value.map((d) => d.value),
        itemStyle: {
          color: (p: any) => (p.data < dims.value[p.dataIndex].threshold ? '#d9534f' : '#10b981'),
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '预警阈值', type: 'line', symbol: 'rect', symbolSize: 9,
        data: dims.value.map((d) => d.threshold),
        itemStyle: { color: '#f0ad4e' }, lineStyle: { type: 'dashed' },
      },
    ],
  }
}

onMounted(() => {
  if (barRef.value) {
    barInst = echarts.init(barRef.value)
    barInst.setOption(barOption())
  }
})
onBeforeUnmount(() => barInst?.dispose())
</script>

<template>
  <div class="qsm-health">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🩺</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- KPI 行（对齐 HTML kpi-row，6 项） -->
    <div class="kpi-row" style="grid-template-columns: repeat(3, 1fr)">
      <KpiCard label="内审计划中" :value="qsmKpi.auditPlan" unit="项" />
      <KpiCard label="内审进行中" :value="qsmKpi.auditDoing" unit="项" />
      <KpiCard label="未关闭不符合项" :value="qsmKpi.ncOpen" unit="项" status="warn" />
      <KpiCard label="严重未关闭" :value="qsmKpi.ncSevere" unit="项" status="bad" />
      <KpiCard label="体系综合健康度" :value="qsmKpi.healthScore" unit="分" status="ok" />
      <KpiCard label="内审整改完成率" :value="qsmKpi.rectifyRate" unit="%" />
    </div>

    <!-- 预警提示 -->
    <el-alert
      v-if="warnCount > 0"
      type="warning"
      show-icon
      :closable="false"
      :title="`体系健康度预警：${warnCount} 个维度低于预警阈值，请关注改进`"
    />

    <!-- 维度对比图 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>体系健康度维度对比（当前值 vs 预警阈值）</h3>
        <span class="sr-tag">SR-QSM-012</span><span class="sr-tag">SR-QSM-013</span>
      </div>
      <div class="qms-card__body"><div ref="barRef" class="chart-container"></div></div>
    </div>

    <!-- 维度明细表 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>维度明细与预警</h3>
        <span class="sr-tag">SR-QSM-014</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="dims" border size="small">
          <el-table-column prop="name" label="维度" min-width="150" />
          <el-table-column label="当前值" width="100">
            <template #default="{ row }">
              <b :style="{ color: isWarn(row) ? '#d9534f' : '#2f7d32' }">
                {{ row.value }}{{ row.unit }}
              </b>
            </template>
          </el-table-column>
          <el-table-column label="预警阈值" width="100">
            <template #default="{ row }">{{ row.threshold }}{{ row.unit }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <span class="qms-pill" :class="isWarn(row) ? 'r' : 'g'">
                {{ isWarn(row) ? '预警' : '正常' }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 改进建议闭环 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>体系改进建议与决策跟踪</h3>
        <span class="sr-tag">SR-QSM-015</span><span class="sr-tag">SR-QSM-016</span><span class="sr-tag">SR-QSM-017</span><span class="sr-tag">SR-QSM-018</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="suggestions" border size="small">
          <el-table-column prop="id" label="编号" width="120" />
          <el-table-column prop="dim" label="关联维度" width="130" />
          <el-table-column prop="content" label="建议内容" min-width="240" />
          <el-table-column label="决策" width="90">
            <template #default="{ row }">
              <span class="qms-pill" :class="pillCls(row.adopted ? '已采纳' : '未采纳')">
                {{ row.adopted ? '已采纳' : '未采纳' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="decisionReason" label="决策原因" min-width="200">
            <template #default="{ row }"><span class="meta">{{ row.decisionReason || '—' }}</span></template>
          </el-table-column>
          <el-table-column prop="trackResult" label="改进效果" min-width="180">
            <template #default="{ row }"><span class="meta">{{ row.trackResult || '—' }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button v-if="!row.adopted" size="small" type="primary" @click="adopt(row)">采纳</el-button>
              <el-button v-if="row.adopted" size="small" @click="reject(row)">暂不采纳</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.qsm-health {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.meta {
  font-size: 11px;
  color: #8492a6;
}
</style>
