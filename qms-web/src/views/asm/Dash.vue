<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import echarts from '@/utils/echarts'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import KpiCard from '@/components/common/KpiCard.vue'
import { asmWorkorders, asmSatisfactions } from '@/mock/asm'

const authStore = useAuthStore()
const banner = BANNERS.asm?.[authStore.role] || {
  title: 'ASM · 售后管理总览',
  desc: '售后工单处理、客户满意度跟进一屏掌控',
}

const kpi = computed(() => {
  const total = asmWorkorders.length
  const doing = asmWorkorders.filter((w) => w.status === '处理中').length
  const confirm = asmWorkorders.filter((w) => w.status === '待确认').length
  const closed = asmWorkorders.filter((w) => w.status === '已关闭').length
  const scored = asmWorkorders.filter((w) => w.score != null)
  const avg = scored.length ? scored.reduce((s, w) => s + (w.score || 0), 0) / scored.length : 0
  const low = scored.filter((w) => (w.score || 0) <= 2).length
  return {
    total, doing, confirm, closed,
    avg: Number(avg.toFixed(1)),
    lowRate: scored.length ? Number(((low / scored.length) * 100).toFixed(1)) : 0,
  }
})

// 工单类型分布
const typeDist = computed(() => {
  const map: Record<string, number> = {}
  asmWorkorders.forEach((w) => { map[w.type] = (map[w.type] || 0) + 1 })
  return Object.entries(map).map(([name, value]) => ({ name, value }))
})

// 满意度评分分布
const scoreDist = computed(() => {
  const buckets = [1, 2, 3, 4, 5].map((s) => ({
    score: `${s}分`,
    count: asmSatisfactions.filter((x) => x.score === s).length,
  }))
  return buckets
})

const followUpList = computed(() => asmSatisfactions.filter((s) => s.status === '跟进中'))

const stMap: Record<string, string> = {
  新建: 'gray', 处理中: 'b', 待确认: 'y', 已关闭: 'g', 已归档: 'g', 跟进中: 'y',
}
function pillCls(s: string) { return stMap[s] || 'y' }

const pieRef = ref<HTMLDivElement>()
const barRef = ref<HTMLDivElement>()
let pieInst: echarts.ECharts | null = null
let barInst: echarts.ECharts | null = null

onMounted(() => {
  if (pieRef.value) {
    pieInst = echarts.init(pieRef.value)
    pieInst.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['40%', '70%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}' },
        data: typeDist.value,
      }],
    })
  }
  if (barRef.value) {
    barInst = echarts.init(barRef.value)
    barInst.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: scoreDist.value.map((s) => s.score) },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar', data: scoreDist.value.map((s) => s.count), barWidth: '50%',
        itemStyle: {
          color: (p: any) => (p.dataIndex <= 1 ? '#c0392b' : p.dataIndex === 2 ? '#d4a017' : '#2f7d32'),
          borderRadius: [4, 4, 0, 0],
        },
      }],
    })
  }
})
onBeforeUnmount(() => { pieInst?.dispose(); barInst?.dispose() })
</script>

<template>
  <div class="asm-dash">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🛠</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="kpi-row" style="grid-template-columns: repeat(6, 1fr)">
      <KpiCard label="工单总数" :value="kpi.total" unit="单" />
      <KpiCard label="处理中" :value="kpi.doing" unit="单" status="warn" />
      <KpiCard label="待客户确认" :value="kpi.confirm" unit="单" status="warn" />
      <KpiCard label="已关闭" :value="kpi.closed" unit="单" status="ok" />
      <KpiCard label="平均满意度" :value="kpi.avg" unit="分" status="ok" />
      <KpiCard label="低分占比" :value="kpi.lowRate" unit="%" :status="kpi.lowRate > 20 ? 'bad' : 'warn'" />
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>工单类型分布</h3><span class="sr-tag">SR-ASM-001</span></div>
        <div class="qms-card__body"><div ref="pieRef" class="chart-container"></div></div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>客户满意度评分分布</h3><span class="sr-tag">SR-ASM-009</span></div>
        <div class="qms-card__body"><div ref="barRef" class="chart-container"></div></div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header"><h3>低分待跟进清单</h3><span class="sr-tag">SR-ASM-010</span><span class="sr-tag">SR-ASM-013</span><span class="sr-tag">SR-ASM-014</span></div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="followUpList" border size="small">
          <el-table-column prop="id" label="满意度单号" width="130" />
          <el-table-column prop="customer" label="客户" />
          <el-table-column prop="score" label="评分" width="70">
            <template #default="{ row }"><b style="color:#c0392b">{{ row.score }}</b></template>
          </el-table-column>
          <el-table-column prop="reason" label="低分诱因" width="120" />
          <el-table-column prop="followUp" label="跟进改进措施" min-width="240" />
          <el-table-column label="关联质量改进" width="140">
            <template #default="{ row }">
              <span v-if="row.linkedTo" class="qms-pill p">{{ row.linkedTo }}</span>
              <span v-else class="meta">—</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span></template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.asm-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
