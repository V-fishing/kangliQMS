<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { qsmApi } from '@/api'
import type { InternalAudit, NcFinding } from '@/types/qsm'

const authStore = useAuthStore()
const banner = BANNERS.qsm?.[authStore.role] || {
  title: 'QSM · 内审管理',
  desc: '内审计划、不符合项整改闭环与报表生成',
}

const audits = ref<InternalAudit[]>([])
const findings = ref<NcFinding[]>([])

const auditStMap: Record<string, string> = { 计划中: 'y', 进行中: 'b', 已完成: 'g' }
const ncStMap: Record<string, string> = { 待整改: 'r', 整改中: 'b', 已验证: 'p', 已关闭: 'g' }
const lvlMap: Record<string, string> = { 严重: 'r', 一般: 'y', 观察项: 'gray' }
function auditPill(s: string) { return auditStMap[s] || 'y' }
function ncPill(s: string) { return ncStMap[s] || 'y' }
function lvlPill(s: string) { return lvlMap[s] || 'y' }

// 选中内审 → 展开其不符合项
const selectedAudit = ref<string>('')
const auditFindings = computed(() => findings.value.filter((f) => f.auditId === selectedAudit.value))
function selectAudit(a: InternalAudit) { selectedAudit.value = a.id }

onMounted(async () => {
  const [a, f] = await Promise.all([qsmApi.getAudits(), qsmApi.getNcFindings()])
  audits.value = a
  findings.value = f
  selectedAudit.value = a[0]?.id || ''
})

// 新建内审计划
const planVisible = ref(false)
const form = reactive({ planName: '', scope: '', auditors: '', date: '' })
function openPlan() {
  Object.assign(form, { planName: '', scope: '', auditors: '', date: '' })
  planVisible.value = true
}
function submitPlan() {
  if (!form.planName) { ElMessage.warning('请填写计划名称'); return }
  const id = `IA-2025-${String(audits.value.length + 1).padStart(3, '0')}`
  audits.value.unshift({
    id, planName: form.planName, scope: form.scope || '待定', auditors: form.auditors || '待分配',
    date: form.date || new Date().toISOString().slice(0, 10), status: '计划中',
    ncCount: 0, score: 0, reportStatus: '未生成',
  })
  planVisible.value = false
  ElMessage.success(`已创建内审计划 ${id}`)
}

function startAudit(a: InternalAudit) { a.status = '进行中'; ElMessage.success('内审已启动') }
function finishAudit(a: InternalAudit) {
  a.status = '已完成'
  a.ncCount = findings.value.filter((f) => f.auditId === a.id).length
  ElMessage.success('内审已完成，可生成报表')
}
function genReport(a: InternalAudit) {
  a.reportStatus = '已生成'
  ElMessage.success(`已生成 ${a.id} 内审报表（PDF + Excel，SR-QSM-011）`)
}

// 不符合项整改闭环
const rectifyVisible = ref(false)
const current = ref<NcFinding | null>(null)
const rForm = reactive({ action: '', owner: '', dueDate: '' })
function openRectify(f: NcFinding) {
  current.value = f
  Object.assign(rForm, { action: f.action, owner: f.owner, dueDate: f.dueDate })
  rectifyVisible.value = true
}
function submitRectify() {
  if (!current.value) return
  current.value.action = rForm.action
  current.value.owner = rForm.owner
  current.value.dueDate = rForm.dueDate
  current.value.status = '整改中'
  rectifyVisible.value = false
  ElMessage.success('整改措施已下达（责任人 + 截止时间）')
}
function verifyNc(f: NcFinding) { f.status = '已验证'; ElMessage.success('整改效果已验证') }
function closeNc(f: NcFinding) { f.status = '已关闭'; ElMessage.success('不符合项已闭环关闭') }
</script>

<template>
  <div class="qsm-audit">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📋</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>内审计划</h3>
        <div style="margin-left:auto"><el-button size="small" type="primary" @click="openPlan">新建内审计划</el-button></div>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="audits" border size="small" highlight-current-row @row-click="selectAudit">
          <el-table-column prop="id" label="计划号" width="120" />
          <el-table-column prop="planName" label="计划名称" min-width="190" />
          <el-table-column prop="scope" label="审核范围" min-width="150" />
          <el-table-column prop="auditors" label="审核员" width="150" />
          <el-table-column prop="date" label="日期" width="110" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="auditPill(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="报表" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="row.reportStatus === '已生成' ? 'g' : 'gray'">{{ row.reportStatus }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button v-if="row.status === '计划中'" size="small" @click.stop="startAudit(row)">启动</el-button>
              <el-button v-if="row.status === '进行中'" size="small" type="primary" @click.stop="finishAudit(row)">完成</el-button>
              <el-button v-if="row.status === '已完成' && row.reportStatus === '未生成'" size="small" type="warning" @click.stop="genReport(row)">生成报表</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>不符合项整改闭环 · {{ selectedAudit }}</h3>
        </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="auditFindings" border size="small">
          <el-table-column prop="id" label="编号" width="120" />
          <el-table-column prop="clause" label="条款" width="120" />
          <el-table-column label="等级" width="80">
            <template #default="{ row }"><span class="qms-pill" :class="lvlPill(row.level)">{{ row.level }}</span></template>
          </el-table-column>
          <el-table-column prop="desc" label="问题描述" min-width="220" />
          <el-table-column prop="dept" label="责任部门" width="90" />
          <el-table-column prop="owner" label="责任人" width="110" />
          <el-table-column prop="dueDate" label="截止" width="110" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="ncPill(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="170">
            <template #default="{ row }">
              <el-button v-if="row.status === '待整改'" size="small" @click="openRectify(row)">下达整改</el-button>
              <el-button v-if="row.status === '整改中'" size="small" type="primary" @click="verifyNc(row)">验证</el-button>
              <el-button v-if="row.status === '已验证'" size="small" type="success" @click="closeNc(row)">关闭</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!auditFindings.length" description="该内审暂无不符合项" :image-size="60" />
      </div>
    </div>

    <el-dialog v-model="planVisible" title="新建内审计划" width="460px">
      <el-form label-width="90px">
        <el-form-item label="计划名称"><el-input v-model="form.planName" /></el-form-item>
        <el-form-item label="审核范围"><el-input v-model="form.scope" placeholder="如 生产部 / 质量部" /></el-form-item>
        <el-form-item label="审核员"><el-input v-model="form.auditors" /></el-form-item>
        <el-form-item label="计划日期"><el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPlan">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rectifyVisible" title="下达整改措施" width="480px">
      <el-form label-width="90px" v-if="current">
        <el-form-item label="不符合项"><b>{{ current.id }}</b> · {{ current.clause }}</el-form-item>
        <el-form-item label="问题描述"><span class="meta">{{ current.desc }}</span></el-form-item>
        <el-form-item label="整改措施"><el-input v-model="rForm.action" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="责任人"><el-input v-model="rForm.owner" /></el-form-item>
        <el-form-item label="截止时间"><el-date-picker v-model="rForm.dueDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rectifyVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRectify">下达</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.qsm-audit {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.meta { font-size: 11px; color: #8492a6; }
</style>
