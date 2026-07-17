<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { asmSatisfactions } from '@/mock/asm'
import type { AsmSatisfaction } from '@/types/asm'

const authStore = useAuthStore()
const banner = BANNERS.asm?.[authStore.role] || {
  title: 'ASM · 客户满意度',
  desc: '低分诱因分析、跟进改进与质量联动闭环',
}

const list = ref<AsmSatisfaction[]>(JSON.parse(JSON.stringify(asmSatisfactions)))

const kpi = computed(() => {
  const total = list.value.length
  const avg = total ? list.value.reduce((s, x) => s + x.score, 0) / total : 0
  const low = list.value.filter((x) => x.score <= 2).length
  const following = list.value.filter((x) => x.status === '跟进中').length
  return {
    total, avg: Number(avg.toFixed(1)), low,
    lowRate: total ? Number(((low / total) * 100).toFixed(1)) : 0, following,
  }
})

const stMap: Record<string, string> = { 已归档: 'g', 跟进中: 'y' }
function pillCls(s: string) { return stMap[s] || 'y' }
function scoreColor(s: number) { return s <= 2 ? '#c0392b' : s === 3 ? '#d4a017' : '#2f7d32' }

// 跟进改进
const fuVisible = ref(false)
const current = ref<AsmSatisfaction | null>(null)
const fuForm = reactive({ reason: '' as AsmSatisfaction['reason'], followUp: '', linkTo: '' })
function openFollow(row: AsmSatisfaction) {
  current.value = row
  Object.assign(fuForm, { reason: row.reason, followUp: row.followUp, linkTo: row.linkedTo })
  fuVisible.value = true
}
function submitFollow() {
  if (!current.value) return
  current.value.reason = fuForm.reason
  current.value.followUp = fuForm.followUp
  current.value.linkedTo = fuForm.linkTo
  fuVisible.value = false
  ElMessage.success('跟进改进措施已保存')
}
function archive(row: AsmSatisfaction) {
  row.status = '已归档'
  ElMessage.success(`${row.id} 已归档`)
}
function linkCapa(row: AsmSatisfaction) {
  if (!row.linkedTo) {
    row.linkedTo = `CAPA-2025-${String(Math.floor(Math.random() * 90) + 10)}`
  }
  ElMessage.success(`已转入质量改进：${row.linkedTo}（SR-ASM-014）`)
}
</script>

<template>
  <div class="asm-sat">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">⭐</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="kpi-row" style="grid-template-columns: repeat(5, 1fr)">
      <KpiCard label="回访总数" :value="kpi.total" unit="条" />
      <KpiCard label="平均满意度" :value="kpi.avg" unit="分" status="ok" />
      <KpiCard label="低分数量" :value="kpi.low" unit="条" status="bad" />
      <KpiCard label="低分占比" :value="kpi.lowRate" unit="%" :status="kpi.lowRate > 20 ? 'bad' : 'warn'" />
      <KpiCard label="跟进中" :value="kpi.following" unit="条" status="warn" />
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>客户满意度记录</h3>
        <span class="sr-tag">SR-ASM-009</span><span class="sr-tag">SR-ASM-010</span>
        <span class="sr-tag">SR-ASM-013</span><span class="sr-tag">SR-ASM-014</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="list" border size="small">
          <el-table-column prop="id" label="单号" width="130" />
          <el-table-column prop="workorderId" label="关联工单" width="120" />
          <el-table-column prop="customer" label="客户" min-width="150" />
          <el-table-column label="评分" width="70">
            <template #default="{ row }"><b :style="{ color: scoreColor(row.score) }">{{ row.score }}</b></template>
          </el-table-column>
          <el-table-column label="低分诱因" width="110">
            <template #default="{ row }"><span v-if="row.reason">{{ row.reason }}</span><span v-else class="meta">—</span></template>
          </el-table-column>
          <el-table-column prop="followUp" label="跟进改进措施" min-width="220" />
          <el-table-column label="质量联动" width="130">
            <template #default="{ row }">
              <span v-if="row.linkedTo" class="qms-pill p">{{ row.linkedTo }}</span>
              <span v-else class="meta">—</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="openFollow(row)">跟进</el-button>
              <el-button v-if="row.score <= 2 && !row.linkedTo" size="small" type="warning" @click="linkCapa(row)">转CAPA</el-button>
              <el-button v-if="row.status === '跟进中'" size="small" type="primary" @click="archive(row)">归档</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="fuVisible" title="低分诱因分析与跟进改进" width="480px">
      <el-form label-width="90px" v-if="current">
        <el-form-item label="单号"><b>{{ current.id }}</b> · {{ current.customer }}（{{ current.score }}分）</el-form-item>
        <el-form-item label="低分诱因">
          <el-select v-model="fuForm.reason" style="width:100%">
            <el-option label="响应慢" value="响应慢" />
            <el-option label="维修不彻底" value="维修不彻底" />
            <el-option label="服务态度" value="服务态度" />
            <el-option label="无（好评）" value="" />
          </el-select>
        </el-form-item>
        <el-form-item label="改进措施"><el-input v-model="fuForm.followUp" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="关联CAPA"><el-input v-model="fuForm.linkTo" placeholder="如 CAPA-2025-001，可留空" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fuVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFollow">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.asm-sat {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
