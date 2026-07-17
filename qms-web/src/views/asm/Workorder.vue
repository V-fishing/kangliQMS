<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { asmWorkorders } from '@/mock/asm'
import type { AsmWorkorder } from '@/types/asm'

const authStore = useAuthStore()
const banner = BANNERS.asm?.[authStore.role] || {
  title: 'ASM · 售后工单',
  desc: '手动新建 / CRM 同步双通道，现场处理闭环与超时自动关闭',
}

const list = ref<AsmWorkorder[]>(JSON.parse(JSON.stringify(asmWorkorders)))

const filterStatus = ref('全部')
const statusOptions = ['全部', '新建', '处理中', '待确认', '已关闭']
const filtered = computed(() =>
  filterStatus.value === '全部' ? list.value : list.value.filter((w) => w.status === filterStatus.value),
)

const stMap: Record<string, string> = { 新建: 'gray', 处理中: 'b', 待确认: 'y', 已关闭: 'g' }
function pillCls(s: string) { return stMap[s] || 'y' }

// 新建工单
const createVisible = ref(false)
const form = reactive({
  type: '维修' as AsmWorkorder['type'],
  customer: '', product: '', engineer: '', faultDesc: '',
})
function openCreate() {
  Object.assign(form, { type: '维修', customer: '', product: '', engineer: '', faultDesc: '' })
  createVisible.value = true
}
function submitCreate() {
  if (!form.customer || !form.product) { ElMessage.warning('请填写客户与产品'); return }
  const id = `WO-2025-${String(list.value.length + 1).padStart(3, '0')}`
  list.value.unshift({
    id, source: '手动', type: form.type, status: '处理中',
    customer: form.customer, product: form.product, engineer: form.engineer || '待分配',
    faultDesc: form.faultDesc, measure: '', parts: '',
    createdDate: new Date().toISOString().slice(0, 10), processDate: '', confirmDate: '',
    score: null, autoClose: false, lowScoreNotified: false,
  })
  createVisible.value = false
  ElMessage.success(`已新建工单 ${id}`)
}

// CRM 同步
function syncCrm() {
  ElMessage.success('已从 CRM 同步 1 条新工单（演示）')
}

// 现场处理
const processVisible = ref(false)
const current = ref<AsmWorkorder | null>(null)
const pForm = reactive({ measure: '', parts: '', engineer: '' })
function openProcess(row: AsmWorkorder) {
  current.value = row
  Object.assign(pForm, { measure: row.measure, parts: row.parts, engineer: row.engineer })
  processVisible.value = true
}
function submitProcess() {
  if (!current.value) return
  current.value.measure = pForm.measure
  current.value.parts = pForm.parts
  current.value.engineer = pForm.engineer
  current.value.processDate = new Date().toISOString().slice(0, 10)
  current.value.status = '待确认'
  processVisible.value = false
  ElMessage.success('处理措施已提交，等待客户确认')
}

// 客户确认 + 评分
const closeVisible = ref(false)
const scoreVal = ref(5)
function openClose(row: AsmWorkorder) {
  current.value = row
  scoreVal.value = 5
  closeVisible.value = true
}
function submitClose() {
  if (!current.value) return
  current.value.score = scoreVal.value
  current.value.status = '已关闭'
  current.value.confirmDate = new Date().toISOString().slice(0, 10)
  if (scoreVal.value <= 2) {
    current.value.lowScoreNotified = true
    ElMessage.warning(`评分 ${scoreVal.value} 分偏低，已自动通知售后负责人并联动质量改进（SR-ASM-012）`)
  } else {
    ElMessage.success(`工单已关闭，客户评分 ${scoreVal.value} 分`)
  }
  closeVisible.value = false
}

// 超时未确认自动关闭（SR-ASM-011）
function autoCloseOverdue() {
  const targets = list.value.filter((w) => w.status === '待确认')
  if (!targets.length) { ElMessage.info('当前无待确认工单'); return }
  ElMessageBox.confirm(
    `检测到 ${targets.length} 条工单超时未确认，是否按规则自动关闭并默认满意？`,
    '超时自动关闭（SR-ASM-011）',
    { type: 'warning' },
  ).then(() => {
    targets.forEach((w) => {
      w.status = '已关闭'
      w.autoClose = true
      w.confirmDate = new Date().toISOString().slice(0, 10)
      if (w.score == null) w.score = 4
    })
    ElMessage.success(`已自动关闭 ${targets.length} 条超时工单`)
  }).catch(() => {})
}
</script>

<template>
  <div class="asm-wo">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🛠</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>售后工单列表</h3>
        <span class="sr-tag">SR-ASM-001</span><span class="sr-tag">SR-ASM-005</span>
        <span class="sr-tag">SR-ASM-008</span><span class="sr-tag">SR-ASM-011</span>
        <div style="margin-left:auto; display:flex; gap:8px; align-items:center">
          <el-select v-model="filterStatus" size="small" style="width:110px">
            <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
          <el-button size="small" @click="syncCrm">CRM 同步</el-button>
          <el-button size="small" @click="autoCloseOverdue">超时自动关闭</el-button>
          <el-button size="small" type="primary" @click="openCreate">新建工单</el-button>
        </div>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="filtered" border size="small">
          <el-table-column prop="id" label="工单号" width="120" />
          <el-table-column label="来源" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="row.source === '手动' ? 'b' : 'p'">{{ row.source }}</span></template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="70" />
          <el-table-column prop="customer" label="客户" min-width="150" />
          <el-table-column prop="product" label="产品" min-width="130" />
          <el-table-column prop="engineer" label="工程师" width="90" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span>
              <span v-if="row.autoClose" class="qms-pill gray" style="margin-left:4px">自动</span>
            </template>
          </el-table-column>
          <el-table-column label="评分" width="70">
            <template #default="{ row }">
              <b v-if="row.score != null" :style="{ color: row.score <= 2 ? '#c0392b' : '#2f7d32' }">{{ row.score }}</b>
              <span v-else class="meta">—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button v-if="row.status === '处理中' || row.status === '新建'" size="small" @click="openProcess(row)">处理</el-button>
              <el-button v-if="row.status === '待确认'" size="small" type="primary" @click="openClose(row)">确认关闭</el-button>
              <span v-if="row.status === '已关闭'" class="meta">已闭环</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 新建工单 -->
    <el-dialog v-model="createVisible" title="新建售后工单" width="480px">
      <el-form label-width="80px">
        <el-form-item label="工单类型">
          <el-radio-group v-model="form.type">
            <el-radio label="安装">安装</el-radio>
            <el-radio label="维修">维修</el-radio>
            <el-radio label="投诉">投诉</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="客户"><el-input v-model="form.customer" /></el-form-item>
        <el-form-item label="产品"><el-input v-model="form.product" /></el-form-item>
        <el-form-item label="工程师"><el-input v-model="form.engineer" placeholder="留空则待分配" /></el-form-item>
        <el-form-item label="故障描述"><el-input v-model="form.faultDesc" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 现场处理 -->
    <el-dialog v-model="processVisible" title="现场处理" width="480px">
      <el-form label-width="80px" v-if="current">
        <el-form-item label="工单号"><b>{{ current.id }}</b></el-form-item>
        <el-form-item label="故障描述"><span class="meta">{{ current.faultDesc }}</span></el-form-item>
        <el-form-item label="工程师"><el-input v-model="pForm.engineer" /></el-form-item>
        <el-form-item label="处理措施"><el-input v-model="pForm.measure" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="更换配件"><el-input v-model="pForm.parts" placeholder="无则填 —" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProcess">提交并转待确认</el-button>
      </template>
    </el-dialog>

    <!-- 客户确认评分 -->
    <el-dialog v-model="closeVisible" title="客户确认与满意度评分" width="420px">
      <div v-if="current" style="text-align:center">
        <p>工单 <b>{{ current.id }}</b> · {{ current.customer }}</p>
        <el-rate v-model="scoreVal" :max="5" show-score />
        <p class="meta" style="margin-top:8px">评分 ≤ 2 分将自动通知负责人并联动质量改进</p>
      </div>
      <template #footer>
        <el-button @click="closeVisible = false">取消</el-button>
        <el-button type="primary" @click="submitClose">确认关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.asm-wo {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
