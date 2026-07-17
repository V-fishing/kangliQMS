<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { tools, toolMaints, toolRepairs } from '@/mock/tlm'
import type { Tool, ToolMaint, ToolRepair } from '@/types/tlm'

const authStore = useAuthStore()
const banner = BANNERS.tlm?.[authStore.role] || {
  title: 'TLM · 保养管理',
  desc: '周/月/年保养计划、临期提醒与维修精度验证',
}

const toolList = ref<Tool[]>(JSON.parse(JSON.stringify(tools)))
const maints = ref<ToolMaint[]>(JSON.parse(JSON.stringify(toolMaints)))
const repairs = ref<ToolRepair[]>(JSON.parse(JSON.stringify(toolRepairs)))

const today = new Date('2025-01-25')
function daysTo(d: string) {
  if (!d || d === '—') return Infinity
  return Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000)
}
function toolName(id: string) { return toolList.value.find((t) => t.id === id)?.name || id }

// 临期保养提醒
const maintDue = computed(() =>
  toolList.value
    .filter((t) => t.status !== '报废' && t.nextMaint !== '—')
    .map((t) => ({ ...t, days: daysTo(t.nextMaint) }))
    .filter((t) => t.days <= 7)
    .sort((a, b) => a.days - b.days),
)
function dueLevel(days: number) {
  if (days < 0) return { txt: '已逾期', cls: 'r' }
  if (days <= 3) return { txt: '紧急', cls: 'r' }
  return { txt: '临期', cls: 'y' }
}

const kpi = computed(() => ({
  dueCount: maintDue.value.length,
  overdue: maintDue.value.filter((t) => t.days < 0).length,
  maintTotal: maints.value.length,
  repairPending: repairs.value.filter((r) => !r.precisionVerified && r.result === '修复合格').length,
}))

// 执行保养
const maintVisible = ref(false)
const mForm = reactive({ toolId: '', type: '周保养' as ToolMaint['type'], result: '完成' as ToolMaint['result'], operator: '' })
function openMaint(t: Tool) {
  Object.assign(mForm, { toolId: t.id, type: '周保养', result: '完成', operator: '' })
  maintVisible.value = true
}
function submitMaint() {
  if (!mForm.operator) { ElMessage.warning('请填写保养人'); return }
  const id = `TM-${String(maints.value.length + 1).padStart(3, '0')}`
  maints.value.unshift({
    id, toolId: mForm.toolId, type: mForm.type,
    date: new Date().toISOString().slice(0, 10), result: mForm.result, operator: mForm.operator,
  })
  const tool = toolList.value.find((t) => t.id === mForm.toolId)
  if (tool) {
    const add = mForm.type === '周保养' ? 7 : mForm.type === '月保养' ? 30 : 365
    tool.nextMaint = new Date(today.getTime() + add * 86400000).toISOString().slice(0, 10)
    if (mForm.result === '异常') { tool.status = '维修中'; ElMessage.warning('保养发现异常，工装已转维修') }
  }
  maintVisible.value = false
  ElMessage.success('保养记录已登记，下次保养日期已更新')
}

// 维修精度验证
function verifyPrecision(r: ToolRepair) {
  r.precisionVerified = true
  const tool = toolList.value.find((t) => t.id === r.toolId)
  if (tool && r.result === '修复合格') { tool.status = '使用中'; tool.lock = '正常' }
  ElMessage.success(`${toolName(r.toolId)} 维修精度验证合格，恢复使用（SR-TLM-016）`)
}
</script>

<template>
  <div class="tlm-maint">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🛡</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr)">
      <KpiCard label="临期保养" :value="kpi.dueCount" unit="套" status="warn" />
      <KpiCard label="已逾期" :value="kpi.overdue" unit="套" status="bad" />
      <KpiCard label="累计保养记录" :value="kpi.maintTotal" unit="次" />
      <KpiCard label="待精度验证" :value="kpi.repairPending" unit="项" status="warn" />
    </div>

    <div class="qms-card">
      <div class="qms-card__header"><h3>临期保养提醒（7天内）</h3><span class="sr-tag">SR-TLM-008</span><span class="sr-tag">SR-TLM-009</span></div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="maintDue" border size="small">
          <el-table-column prop="code" label="一物一码" width="130" />
          <el-table-column prop="name" label="工装名称" min-width="140" />
          <el-table-column prop="nextMaint" label="下次保养" width="110" />
          <el-table-column label="剩余" width="120">
            <template #default="{ row }">
              <span class="qms-pill" :class="dueLevel(row.days).cls">{{ dueLevel(row.days).txt }}</span>
              <span class="meta">{{ row.days < 0 ? `逾期${-row.days}天` : `${row.days}天` }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110">
            <template #default="{ row }"><el-button size="small" type="primary" @click="openMaint(row)">执行保养</el-button></template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>保养记录</h3><span class="sr-tag">SR-TLM-010</span></div>
        <div class="qms-card__body" style="padding: 0">
          <el-table :data="maints" border size="small">
            <el-table-column prop="id" label="编号" width="80" />
            <el-table-column label="工装" min-width="120"><template #default="{ row }">{{ toolName(row.toolId) }}</template></el-table-column>
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="date" label="日期" width="100" />
            <el-table-column label="结果" width="80">
              <template #default="{ row }"><span class="qms-pill" :class="row.result === '完成' ? 'g' : 'r'">{{ row.result }}</span></template>
            </el-table-column>
            <el-table-column prop="operator" label="保养人" width="90" />
          </el-table>
        </div>
      </div>
      <div class="qms-card">
        <div class="qms-card__header"><h3>维修与精度验证</h3><span class="sr-tag">SR-TLM-015</span><span class="sr-tag">SR-TLM-016</span></div>
        <div class="qms-card__body" style="padding: 0">
          <el-table :data="repairs" border size="small">
            <el-table-column label="工装" min-width="110"><template #default="{ row }">{{ toolName(row.toolId) }}</template></el-table-column>
            <el-table-column prop="faultDesc" label="故障描述" min-width="160" />
            <el-table-column label="结果" width="100">
              <template #default="{ row }"><span class="qms-pill" :class="row.result === '修复合格' ? 'g' : 'r'">{{ row.result }}</span></template>
            </el-table-column>
            <el-table-column label="精度验证" width="120">
              <template #default="{ row }">
                <span v-if="row.precisionVerified" class="qms-pill g">已验证</span>
                <el-button v-else-if="row.result === '修复合格'" size="small" type="warning" @click="verifyPrecision(row)">验证</el-button>
                <span v-else class="meta">—</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <el-dialog v-model="maintVisible" title="执行保养" width="420px">
      <el-form label-width="80px">
        <el-form-item label="工装">{{ toolName(mForm.toolId) }}</el-form-item>
        <el-form-item label="保养类型">
          <el-radio-group v-model="mForm.type">
            <el-radio label="周保养">周保养</el-radio>
            <el-radio label="月保养">月保养</el-radio>
            <el-radio label="年保养">年保养</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="保养结果">
          <el-radio-group v-model="mForm.result">
            <el-radio label="完成">完成</el-radio>
            <el-radio label="异常">异常</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="保养人"><el-input v-model="mForm.operator" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="maintVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMaint">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.tlm-maint {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.meta { display: block; font-size: 11px; color: #8492a6; margin-top: 2px; }
</style>
