<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { gauges, calibPlans } from '@/mock/msm'
import type { Gauge, CalibPlan, GaugeStatus } from '@/types/msm'

const authStore = useAuthStore()
const banner = BANNERS.msm?.[authStore.role] || {
  title: 'MSM · 器具与校准',
  desc: '一物一档、校准计划自动生成、状态机流转与使用控制',
}

const list = ref<Gauge[]>(JSON.parse(JSON.stringify(gauges)))
const plans = ref<CalibPlan[]>(JSON.parse(JSON.stringify(calibPlans)))

const stMap: Record<string, string> = {
  合格: 'g', 降级: 'y', 超期: 'r', 失准: 'r', 锁定: 'p', 维修中: 'b', 报废: 'gray',
}
function pillCls(s: string) { return stMap[s] || 'y' }

const today = new Date('2025-01-25')
function daysTo(d: string) { return Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000) }

// 使用控制自动联动：状态变更时更新 useStatus
function syncUseStatus(g: Gauge) {
  g.useStatus = (g.status === '合格' || g.status === '降级') ? '允许使用' : '拒绝绑定'
}

// 新建建档
const createVisible = ref(false)
const form = reactive({ name: '', category: '长度量具', precision: '', calibCycle: 12 })
function openCreate() {
  Object.assign(form, { name: '', category: '长度量具', precision: '', calibCycle: 12 })
  createVisible.value = true
}
function submitCreate() {
  if (!form.name) { ElMessage.warning('请填写器具名称'); return }
  const seq = String(list.value.length + 1).padStart(4, '0')
  const calibDate = new Date().toISOString().slice(0, 10)
  const next = new Date(today.getTime() + form.calibCycle * 30 * 86400000).toISOString().slice(0, 10)
  list.value.unshift({
    id: `MG-${seq}`, code: `JL-2025-${seq}`, name: form.name, category: form.category,
    precision: form.precision || '—', status: '合格', calibDate, calibCycle: form.calibCycle,
    nextCalib: next, useStatus: '允许使用', repairRecord: '',
  })
  createVisible.value = false
  ElMessage.success('已建档，初始状态为合格·允许使用')
}

// 校准执行（状态机流转）
const calibVisible = ref(false)
const current = ref<Gauge | null>(null)
const result = ref<GaugeStatus>('合格')
function openCalib(g: Gauge) { current.value = g; result.value = '合格'; calibVisible.value = true }
function submitCalib() {
  if (!current.value) return
  const g = current.value
  g.status = result.value
  g.calibDate = new Date().toISOString().slice(0, 10)
  g.nextCalib = new Date(today.getTime() + g.calibCycle * 30 * 86400000).toISOString().slice(0, 10)
  if (result.value === '失准') g.repairRecord = '校准不合格，示值误差超差'
  if (result.value === '降级') g.repairRecord = '精度降级，限用于非关键工序'
  syncUseStatus(g)
  // 移除已处理的计划
  plans.value = plans.value.filter((p) => p.gaugeId !== g.id || p.status === '已完成')
  calibVisible.value = false
  ElMessage.success(`校准完成，器具状态更新为「${result.value}」，使用控制已联动`)
}

// 报废审批
function scrap(g: Gauge) {
  ElMessageBox.confirm(`确认将 ${g.code}【${g.name}】提交报废审批？`, '报废处置（SR-MSM-013）', { type: 'warning' })
    .then(() => { g.status = '报废'; syncUseStatus(g); ElMessage.success('已审批报废，禁止使用') })
    .catch(() => {})
}

// 到期自动生成校准计划（SR-MSM-005）
function autoGenPlans() {
  const due = list.value.filter((g) => {
    const d = daysTo(g.nextCalib)
    return g.status !== '报废' && d <= 30 && !plans.value.some((p) => p.gaugeId === g.id)
  })
  if (!due.length) { ElMessage.info('近30天内无新增到期器具'); return }
  due.forEach((g) => {
    plans.value.unshift({
      id: `CP-${String(plans.value.length + 1).padStart(3, '0')}`,
      gaugeId: g.id, gaugeName: g.name, dueDate: g.nextCalib, status: '待校准', notified: true,
    })
  })
  ElMessage.success(`已自动生成 ${due.length} 条校准计划并推送计量管理员`)
}

const kpi = computed(() => ({
  total: list.value.length,
  reject: list.value.filter((g) => g.useStatus === '拒绝绑定').length,
  planPending: plans.value.filter((p) => p.status === '待校准').length,
}))
</script>

<template>
  <div class="msm-calib">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📐</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>校准计划（到期自动生成）</h3>
        <span class="sr-tag">SR-MSM-005</span><span class="sr-tag">SR-MSM-006</span>
        <div style="margin-left:auto"><el-button size="small" @click="autoGenPlans">自动生成到期计划</el-button></div>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="plans" border size="small">
          <el-table-column prop="id" label="计划号" width="90" />
          <el-table-column prop="gaugeName" label="器具" min-width="160" />
          <el-table-column prop="dueDate" label="到期日" width="110" />
          <el-table-column label="剩余" width="90">
            <template #default="{ row }">
              <span :style="{ color: daysTo(row.dueDate) < 0 ? '#c0392b' : daysTo(row.dueDate) <= 7 ? '#d4a017' : '#2f7d32' }">
                {{ daysTo(row.dueDate) < 0 ? `逾期${-daysTo(row.dueDate)}天` : `${daysTo(row.dueDate)}天` }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="计划状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="row.status === '待校准' ? 'y' : 'g'">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="推送" width="80">
            <template #default="{ row }"><span class="qms-pill" :class="row.notified ? 'g' : 'gray'">{{ row.notified ? '已推送' : '未推送' }}</span></template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>计量器具台账</h3>
        <span class="sr-tag">SR-MSM-001</span><span class="sr-tag">SR-MSM-008</span>
        <span class="sr-tag">SR-MSM-011</span><span class="sr-tag">SR-MSM-013</span>
        <div style="margin-left:auto"><el-button size="small" type="primary" @click="openCreate">器具建档</el-button></div>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="list" border size="small">
          <el-table-column prop="code" label="器具编号" width="130" />
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="category" label="类别" width="100" />
          <el-table-column prop="precision" label="精度" width="90" />
          <el-table-column prop="nextCalib" label="下次校准" width="110" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="使用控制" width="100">
            <template #default="{ row }"><span class="qms-pill" :class="row.useStatus === '允许使用' ? 'g' : 'r'">{{ row.useStatus }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button v-if="row.status !== '报废'" size="small" type="primary" @click="openCalib(row)">校准</el-button>
              <el-button v-if="row.status !== '报废' && (row.status === '失准' || row.status === '锁定')" size="small" type="danger" @click="scrap(row)">报废</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="createVisible" title="计量器具建档" width="440px">
      <el-form label-width="90px">
        <el-form-item label="器具名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类别">
          <el-select v-model="form.category" style="width:100%">
            <el-option label="长度量具" value="长度量具" />
            <el-option label="衡器" value="衡器" />
            <el-option label="精密仪器" value="精密仪器" />
            <el-option label="压力仪表" value="压力仪表" />
            <el-option label="温度仪表" value="温度仪表" />
            <el-option label="力学量具" value="力学量具" />
          </el-select>
        </el-form-item>
        <el-form-item label="精度"><el-input v-model="form.precision" placeholder="如 ±0.001mm" /></el-form-item>
        <el-form-item label="校验周期"><el-input-number v-model="form.calibCycle" :min="1" :max="36" /> 个月</el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">建档</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="calibVisible" title="校准执行" width="420px">
      <el-form label-width="90px" v-if="current">
        <el-form-item label="器具"><b>{{ current.code }}</b> · {{ current.name }}</el-form-item>
        <el-form-item label="校准结果">
          <el-select v-model="result" style="width:100%">
            <el-option label="合格（恢复使用）" value="合格" />
            <el-option label="降级（限非关键工序）" value="降级" />
            <el-option label="失准（拒绝绑定）" value="失准" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明"><span class="meta">校准后系统自动联动使用控制状态</span></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="calibVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCalib">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.msm-calib {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.meta { font-size: 11px; color: #8492a6; }
</style>
