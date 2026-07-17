<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { tools } from '@/mock/tlm'
import type { Tool } from '@/types/tlm'

const authStore = useAuthStore()
const banner = BANNERS.tlm?.[authStore.role] || {
  title: 'TLM · 工装全生命周期',
  desc: '一物一码建档、首件验证锁定、寿命强制下线与状态流转',
}

const list = ref<Tool[]>(JSON.parse(JSON.stringify(tools)))

const stMap: Record<string, string> = { 使用中: 'g', 维修中: 'b', 停用: 'gray', 报废: 'r' }
function pillCls(s: string) { return stMap[s] || 'y' }
function lifeRate(t: Tool) { return Number(((t.lifeUsed / t.lifeLimit) * 100).toFixed(1)) }
function lifeColor(r: number) { return r >= 90 ? '#c0392b' : r >= 70 ? '#d4a017' : '#2f7d32' }

// 采购入库建档（一物一码）
const createVisible = ref(false)
const form = reactive({ name: '', category: '机加工夹具', bom: '', lifeLimit: 5000, location: '' })
function openCreate() {
  Object.assign(form, { name: '', category: '机加工夹具', bom: '', lifeLimit: 5000, location: '' })
  createVisible.value = true
}
function submitCreate() {
  if (!form.name) { ElMessage.warning('请填写工装名称'); return }
  const seq = String(list.value.length + 1).padStart(4, '0')
  list.value.unshift({
    id: `TL-${seq}`, code: `GZ-2025-${seq}`, name: form.name, category: form.category,
    bom: form.bom || '未绑定', status: '停用', lock: '锁定', location: form.location || '待入库',
    purchaseDate: new Date().toISOString().slice(0, 10), lifeUsed: 0, lifeLimit: form.lifeLimit,
    nextMaint: '—', firstArticleVerified: false,
  })
  createVisible.value = false
  ElMessage.success('已建档并生成一物一码，首件验证前处于锁定状态')
}

// 首件验证
function verifyFirstArticle(row: Tool) {
  ElMessageBox.confirm(`工装 ${row.code}【${row.name}】首件验证是否合格？`, '首件验证（SR-TLM-006）', {
    confirmButtonText: '合格·解锁投用', cancelButtonText: '不合格·保持锁定', type: 'warning',
  }).then(() => {
    row.firstArticleVerified = true
    row.lock = '正常'
    row.status = '使用中'
    ElMessage.success('首件验证合格，工装解锁并投入使用')
  }).catch(() => {
    row.firstArticleVerified = false
    row.lock = '锁定'
    row.status = '停用'
    ElMessage.warning('首件验证不合格，工装保持锁定禁止使用')
  })
}

// 强制下线（寿命到期）
function checkForceRetire() {
  const targets = list.value.filter((t) => t.status !== '报废' && t.lifeUsed >= t.lifeLimit)
  if (!targets.length) { ElMessage.info('暂无达到寿命上限的工装'); return }
  ElMessageBox.confirm(
    `检测到 ${targets.length} 套工装达到寿命上限，是否强制下线并转报废？`,
    '寿命强制下线（SR-TLM-013）',
    { type: 'warning' },
  ).then(() => {
    targets.forEach((t) => { t.status = '报废'; t.lock = '正常' })
    ElMessage.success(`已强制下线 ${targets.length} 套工装`)
  }).catch(() => {})
}

// 状态流转
function transfer(row: Tool, to: Tool['status']) {
  if (to === '维修中' && row.lifeUsed >= row.lifeLimit) {
    ElMessage.warning('该工装已达寿命上限，应报废而非维修')
    return
  }
  row.status = to
  ElMessage.success(`${row.name} 状态已流转为「${to}」`)
}

const detailVisible = ref(false)
const current = ref<Tool | null>(null)
function openDetail(row: Tool) { current.value = row; detailVisible.value = true }
</script>

<template>
  <div class="tlm-life">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔄</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>工装台账（一物一码）</h3>
        <span class="sr-tag">SR-TLM-001</span><span class="sr-tag">SR-TLM-006</span>
        <span class="sr-tag">SR-TLM-013</span>
        <div style="margin-left:auto; display:flex; gap:8px">
          <el-button size="small" @click="checkForceRetire">寿命强制下线检查</el-button>
          <el-button size="small" type="primary" @click="openCreate">采购建档</el-button>
        </div>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="list" border size="small">
          <el-table-column prop="code" label="一物一码" width="130" />
          <el-table-column prop="name" label="工装名称" min-width="140" />
          <el-table-column prop="bom" label="绑定BOM工序" width="130" />
          <el-table-column label="寿命使用率" width="160">
            <template #default="{ row }">
              <el-progress :percentage="lifeRate(row)" :color="lifeColor(lifeRate(row))" :stroke-width="12" />
              <span class="meta">{{ row.lifeUsed }} / {{ row.lifeLimit }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }"><span class="qms-pill" :class="pillCls(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="首件锁定" width="90">
            <template #default="{ row }">
              <span class="qms-pill" :class="row.lock === '锁定' ? 'r' : 'g'">{{ row.lock }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="240">
            <template #default="{ row }">
              <el-button size="small" @click="openDetail(row)">详情</el-button>
              <el-button v-if="row.lock === '锁定' && row.status !== '报废'" size="small" type="warning" @click="verifyFirstArticle(row)">首件验证</el-button>
              <el-button v-if="row.status === '使用中'" size="small" @click="transfer(row, '维修中')">送修</el-button>
              <el-button v-if="row.status === '维修中'" size="small" type="primary" @click="transfer(row, '使用中')">复用</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="createVisible" title="采购入库建档" width="460px">
      <el-form label-width="90px">
        <el-form-item label="工装名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类别">
          <el-select v-model="form.category" style="width:100%">
            <el-option label="机加工夹具" value="机加工夹具" />
            <el-option label="装配工装" value="装配工装" />
            <el-option label="焊接工装" value="焊接工装" />
            <el-option label="成型模具" value="成型模具" />
            <el-option label="量检具" value="量检具" />
          </el-select>
        </el-form-item>
        <el-form-item label="绑定BOM"><el-input v-model="form.bom" placeholder="如 工序 OP10 粗铣" /></el-form-item>
        <el-form-item label="寿命上限"><el-input-number v-model="form.lifeLimit" :min="100" :step="500" /></el-form-item>
        <el-form-item label="存放位置"><el-input v-model="form.location" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">建档</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="工装档案" width="480px">
      <el-descriptions v-if="current" :column="2" border size="small">
        <el-descriptions-item label="一物一码">{{ current.code }}</el-descriptions-item>
        <el-descriptions-item label="名称">{{ current.name }}</el-descriptions-item>
        <el-descriptions-item label="类别">{{ current.category }}</el-descriptions-item>
        <el-descriptions-item label="绑定BOM">{{ current.bom }}</el-descriptions-item>
        <el-descriptions-item label="存放位置">{{ current.location }}</el-descriptions-item>
        <el-descriptions-item label="采购日期">{{ current.purchaseDate }}</el-descriptions-item>
        <el-descriptions-item label="已用寿命">{{ current.lifeUsed }}</el-descriptions-item>
        <el-descriptions-item label="寿命上限">{{ current.lifeLimit }}</el-descriptions-item>
        <el-descriptions-item label="下次保养">{{ current.nextMaint }}</el-descriptions-item>
        <el-descriptions-item label="首件验证">{{ current.firstArticleVerified ? '已通过' : '未通过' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.tlm-life {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.meta { display: block; font-size: 11px; color: #8492a6; margin-top: 2px; }
</style>
