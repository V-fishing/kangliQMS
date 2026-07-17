<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { fiaTasks, fiaLines } from '@/mock/fia'
import type { FiaTask } from '@/types/fia'

const router = useRouter()
const authStore = useAuthStore()
const banner = BANNERS.fia?.[authStore.role] || {
  title: '首件检验 · 检验任务',
  desc: '首件检验任务筛选、分配与跟踪',
}

// 使用 mock 数据（与 HTML MOCK.fia.tasks 对齐）
const allTasks = ref<FiaTask[]>(fiaTasks.map((t) => ({ ...t })))

// 筛选条件
const fLine = ref('')
const fStatus = ref('')
const fTrig = ref('')
const fKeyword = ref('')

const lineOptions = fiaLines.map((l) => l.line)
const trigOptions = ['换模具', '换批次', '材料变更', '换设备', '系统升级']

// 排序：超时优先 → 紧急(u=1) → 其它
const statusWeight: Record<string, number> = { 超时: 0, 待检: 1, 进行中: 2, 已完成: 3, 已作废: 4 }
const filtered = computed(() => {
  let list = allTasks.value.filter((t) => {
    if (fLine.value && t.line !== fLine.value) return false
    if (fStatus.value && t.st !== fStatus.value) return false
    if (fTrig.value && t.trig !== fTrig.value) return false
    if (fKeyword.value) {
      const q = fKeyword.value.toLowerCase()
      if (!(`${t.wo} ${t.id} ${t.who}`.toLowerCase().includes(q))) return false
    }
    return true
  })
  list = [...list].sort((a, b) => {
    const w = (statusWeight[a.st] ?? 9) - (statusWeight[b.st] ?? 9)
    if (w !== 0) return w
    return (b.u ?? 0) - (a.u ?? 0)
  })
  return list
})

const statusClass = (s: string) => (s === '待检' ? 'y' : s === '进行中' ? 'b' : s === '超时' ? 'r' : s === '已作废' ? 'gray' : 'g')

function reset() {
  fLine.value = ''
  fStatus.value = ''
  fTrig.value = ''
  fKeyword.value = ''
}

function refresh() {
  reset()
  ElMessage.success('已刷新')
}

// 校验单号详情（对应 HTML actView）
const detail = ref<FiaTask | null>(null)
const detailShow = ref(false)
function view(row: FiaTask) {
  detail.value = row
  detailShow.value = true
}

// 录入/继续/查看 → 进入检验录入页（对应 HTML switchTab('fia','entry')）
function goEntry() {
  router.push({ name: 'FiaEntry' })
}

// 作废（对应 HTML actVoid）
function voidTask(row: FiaTask) {
  if (row.st === '已作废') { ElMessage.info('该任务已作废'); return }
  ElMessageBox.confirm(`确认作废校验单 ${row.id}（工单 ${row.wo}）？`, '作废确认', {
    type: 'warning',
    confirmButtonText: '作废',
    cancelButtonText: '取消',
  }).then(() => {
    row.st = '已作废'
    ElMessage.warning(`校验单 ${row.id} 已作废`)
  }).catch(() => {})
}
</script>

<template>
  <div class="fia-tasks">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📋</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>检验任务列表</h3>
        <span class="tag">超时(2h SLA)高亮 · 按紧急/超时排序</span>
        <span class="sp"></span>
        <span class="meta">共 {{ filtered.length }} 条</span>
      </div>
      <div class="qms-card__body">
        <div class="filter-bar">
          <el-select v-model="fLine" placeholder="全部产线" clearable style="width: 150px">
            <el-option v-for="l in lineOptions" :key="l" :label="l" :value="l" />
          </el-select>
          <el-select v-model="fStatus" placeholder="全部状态" clearable style="width: 130px">
            <el-option label="待检" value="待检" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="超时" value="超时" />
            <el-option label="已作废" value="已作废" />
          </el-select>
          <el-select v-model="fTrig" placeholder="全部触发" clearable style="width: 130px">
            <el-option v-for="tg in trigOptions" :key="tg" :label="tg" :value="tg" />
          </el-select>
          <el-input v-model="fKeyword" placeholder="搜索工单/校验单号" clearable style="width: 200px" />
          <el-button type="primary" size="small" @click="refresh">刷新</el-button>
        </div>

        <el-table :data="filtered" border size="small" style="width: 100%; margin-top: 10px">
          <el-table-column label="校验单号" width="140">
            <template #default="{ row }">
              <a class="link" @click="view(row)">{{ row.id }}</a>
            </template>
          </el-table-column>
          <el-table-column prop="wo" label="工单" width="120" />
          <el-table-column prop="line" label="产线" width="130" />
          <el-table-column prop="trig" label="触发" width="100" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <span class="qms-pill" :class="statusClass(row.st)">{{ row.st }}</span>
              <span v-if="row.u" class="qms-pill r" style="margin-left: 4px">急</span>
            </template>
          </el-table-column>
          <el-table-column prop="who" label="检验员" width="90" />
          <el-table-column prop="t" label="时间" width="90" />
          <el-table-column label="操作" min-width="210" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.st === '待检'" link type="primary" size="small" @click="goEntry">录入</el-button>
              <el-button v-else-if="row.st === '进行中'" link type="success" size="small" @click="goEntry">继续</el-button>
              <el-button v-else link type="info" size="small" @click="view(row)">查看</el-button>
              <el-button link type="danger" size="small" @click="voidTask(row)">作废</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <span class="muted">无匹配任务</span>
          </template>
        </el-table>
      </div>
    </div>

    <div class="note">
      📌 任务看板按紧急程度与超时状态排序；超时(2h SLA)任务高亮。点击校验单号查看详情，"录入/继续"进入检验录入页。
    </div>

    <!-- 校验单号详情 -->
    <el-dialog v-model="detailShow" title="校验单详情" width="420px" @closed="detail = null">
      <div v-if="detail" class="form-grid">
        <div class="form-row full"><label>校验单号</label><b>{{ detail.id }}</b></div>
        <div class="form-row full"><label>工单</label><b>{{ detail.wo }}</b></div>
        <div class="form-row full"><label>产线</label><b>{{ detail.line }}</b></div>
        <div class="form-row full"><label>触发类型</label><b>{{ detail.trig }}</b></div>
        <div class="form-row full"><label>状态</label><span class="qms-pill" :class="statusClass(detail.st)">{{ detail.st }}</span></div>
        <div class="form-row full"><label>检验员</label><b>{{ detail.who }}</b></div>
        <div class="form-row full"><label>时间</label><b>{{ detail.t }}</b></div>
      </div>
      <template #footer>
        <el-button @click="detailShow = false">关闭</el-button>
        <el-button v-if="detail?.st === '待检' || detail?.st === '进行中'" type="primary" @click="(detailShow = false, goEntry())">录入 / 继续</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.fia-tasks { display: flex; flex-direction: column; gap: 12px; }
.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.link { color: var(--el-color-primary, #1e4d8b); cursor: pointer; font-weight: 600; }
.link:hover { text-decoration: underline; }
.note { font-size: 12px; color: #909399; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 8px 12px; border-radius: 6px; }
</style>
