<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { fiaApi } from '@/api'
import type { FiaTask, FiaArchived, TimelineNode } from '@/types/fia'
import FiaReportDialog from '@/components/fia/FiaReportDialog.vue'

const authStore = useAuthStore()
const banner = BANNERS.fia?.[authStore.role] || {
  title: '首件检验 · 追溯归档',
  desc: '对首件检验全流程做正向/反向追溯，沉淀可留存 15 年的归档报告',
}

/* ===================== 工具 ===================== */
function esc(s?: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
function supplierOf(remark?: string): string {
  if (!remark) return ''
  const part = remark.split('|')[0] || ''
  return part.trim()
}

/* ===================== 1. 全链路追溯（正/反向） ===================== */
const keyword = ref('')
const traceLoading = ref(false)
const traceResult = ref<{ task: FiaTask; nodes: TraceNode[]; archived: boolean; reportNo?: string }[]>([])

/* 追溯弹窗（按需展开整条链路，避免列表区冗余） */
const chainDir = ref<'forward' | 'reverse'>('forward')
const chainDlg = reactive({ visible: false, task: null as FiaTask | null })
function openChain(t: FiaTask) {
  chainDlg.visible = true
  chainDlg.task = t
}
const chainNodes = computed<TraceNode[]>(() => {
  if (!chainDlg.task) return []
  const nodes = buildChain(chainDlg.task)
  return chainDir.value === 'reverse' ? [...nodes].reverse() : nodes
})

interface TraceNode {
  key: 'incoming' | 'task' | 'entry' | 'sign' | 'approve' | 'archive'
  title: string
  icon: string
  summary: string
  task: FiaTask
}
function buildChain(t: FiaTask): TraceNode[] {
  return [
    { key: 'incoming', title: '供应商来料', icon: '📦', summary: supplierOf(t.remark) || '来料/供应商', task: t },
    { key: 'task', title: '首件检验任务', icon: '📝', summary: `${t.code || ''} · ${t.wo || ''}`, task: t },
    { key: 'entry', title: '检验录入', icon: '🔍', summary: `${t.productName || ''} · ${t.procName || ''}`, task: t },
    { key: 'sign', title: '签名流转', icon: '✍️', summary: `${t.result || ''} · ${t.st || ''}`, task: t },
    { key: 'approve', title: '审批/放行', icon: '✅', summary: t.disposition || (t.st || ''), task: t },
    { key: 'archive', title: '归档报告', icon: '🗄️', summary: '留存 15 年', task: t },
  ]
}

async function runTrace() {
  traceLoading.value = true
  try {
    const [tasks, archives] = await Promise.all([fiaApi.getTasks(), fiaApi.getArchives()])
    const kw = keyword.value.trim().toLowerCase()
    const matched = kw
      ? tasks.filter((t) => {
          const hay = [t.code, t.wo, t.line, t.productName, t.procName, t.batchNo, t.remark, t.result, t.st, t.trig, t.disposition]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return hay.includes(kw)
        })
      : tasks
    traceResult.value = matched.map((t) => {
      const arc = archives.find((a) => a.taskId === t.id)
      return { task: t, nodes: buildChain(t), archived: !!arc, reportNo: arc?.rpt }
    })
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '追溯查询失败')
  } finally {
    traceLoading.value = false
  }
}

const hasKeyword = computed(() => keyword.value.trim().length > 0)
const traceEmptyHint = computed(() =>
  hasKeyword.value ? '未匹配到相关首件检验记录，请调整关键字（工单 / 产品 / 供应商 / 批次 / 校验单号）' : '暂无可追溯的首件检验记录',
)

/* ===================== 节点详情（追溯链 / 时间线共用） ===================== */
const nodeDlg = reactive({ visible: false, title: '', loading: false, html: '' })

function taskRow(label: string, v?: unknown): string {
  return `<div class="kv"><span class="kv-k">${esc(label)}</span><span class="kv-v">${esc(v) || '—'}</span></div>`
}
function itemsTable(items: any[]): string {
  if (!items?.length) return '<div class="muted">（无检验项数据）</div>'
  const rows = items
    .map(
      (i) =>
        `<tr><td>${esc(i.no)}</td><td>${esc(i.name)}</td><td>${esc(i.ctq ? '是' : '')}</td><td>${esc(i.std)}</td><td>${esc(i.unit)}</td><td>${esc(i.val)}</td><td>${esc(i.result)}</td></tr>`,
    )
    .join('')
  return `<table class="kv-tbl"><thead><tr><th>#</th><th>检验项</th><th>CTQ</th><th>标准值</th><th>单位</th><th>实测值</th><th>判定</th></tr></thead><tbody>${rows}</tbody></table>`
}
function logTable(log: any[]): string {
  if (!log?.length) return '<div class="muted">（无流程节点）</div>'
  const rows = log
    .map(
      (l) =>
        `<tr><td>${esc(l.node)}</td><td>${esc(l.t)}</td><td>${esc(l.o)}</td><td>${esc(l.done ? '完成' : '待处理')}</td></tr>`,
    )
    .join('')
  return `<table class="kv-tbl"><thead><tr><th>节点</th><th>时间</th><th>操作人</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table>`
}

async function openNode(n: TraceNode) {
  nodeDlg.visible = true
  nodeDlg.title = n.title
  nodeDlg.loading = true
  nodeDlg.html = '<div class="muted">加载中…</div>'
  try {
    const t = n.task
    if (n.key === 'incoming') {
      nodeDlg.html = `<div class="kv-title">来料 / 供应商信息</div><pre class="kv-pre">${esc(t.remark) || '（无来料信息）'}</pre>`
    } else if (n.key === 'task') {
      nodeDlg.html =
        `<div class="kv-title">首件检验任务</div>` +
        taskRow('校验单号', t.code) +
        taskRow('工单号', t.wo) +
        taskRow('产线', t.line) +
        taskRow('产品', t.productName) +
        taskRow('工序', t.procName) +
        taskRow('触发类型', t.trig) +
        taskRow('批次', t.batchNo) +
        taskRow('紧急', t.u ? '是' : '否') +
        taskRow('任务状态', t.st) +
        taskRow('综合判定', t.result)
    } else {
      const [vo, log, arc] = await Promise.all([
        fiaApi.getTaskDetail(t.id),
        fiaApi.getTaskLog(t.id),
        fiaApi.getArchive(t.id),
      ])
      if (n.key === 'entry') {
        nodeDlg.html = `<div class="kv-title">检验录入（共 ${vo?.items?.length || 0} 项）</div>` + itemsTable(vo?.items || [])
      } else if (n.key === 'sign') {
        const tk = vo?.task || t
        const signs = (log || []).filter((l: any) => (l.node || '').includes('签名'))
        const signRows = signs.length
          ? signs.map((l: any) => taskRow(l.node, `${l.o} · ${l.t}`)).join('')
          : '<div class="muted">（无签名记录）</div>'
        nodeDlg.html =
          `<div class="kv-title">签名流转</div>` +
          taskRow('任务状态', tk.st) +
          taskRow('处置 / 放行', tk.disposition || '（未处置）') +
          `<div class="kv-sub">签名记录</div>` +
          signRows
      } else if (n.key === 'approve') {
        nodeDlg.html =
          `<div class="kv-title">审批 / 放行</div>` +
          taskRow('任务状态', t.st) +
          taskRow('处置 / 放行', t.disposition || '（未处置）') +
          taskRow('综合判定', t.result) +
          `<div class="kv-sub">流程节点</div>` +
          logTable(log)
      } else if (n.key === 'archive') {
        nodeDlg.html =
          `<div class="kv-title">归档报告</div>` +
          taskRow('报告编号', arc?.reportNo) +
          taskRow('归档日期', arc?.archiveDate) +
          taskRow('留存至', arc?.retentionUntil) +
          taskRow('状态', arc?.status) +
          taskRow('哈希', arc?.reportHash) +
          taskRow('权限', '质量 / 审计可阅') +
          `<div class="kv-note">在下方「归档报告（保留 15 年）」卡片点击「调阅」可查看完整流程报告。</div>`
      }
    }
  } catch (e: any) {
    nodeDlg.html = `<div class="muted">详情加载失败：${esc(e?.msg || e?.message || e)}</div>`
  } finally {
    nodeDlg.loading = false
  }
}

/* ===================== 2. 首件检验全流程时间线 ===================== */
const taskOptions = ref<FiaTask[]>([])
const selTaskId = ref('')
const taskLog = ref<TimelineNode[]>([])
const logLoading = ref(false)
const logNodeDlg = reactive({ visible: false, node: {} as TimelineNode, desc: '' })

const NODE_DESC: Record<string, string> = {
  创建任务: '供应商送检后系统自动创建首件检验任务，并生成校验单号。',
  标准调取: '根据检验标准调取该标准下的全部检验项，作为本次首件检验的录入依据。',
  检验录入: '质检人员逐项录入实测值与判定（合格 / 不合格 / 警告）。',
  检验人签名: '检验人对本次首件检验数据签名确认，任务进入待复核。',
  复核人签名: '复核人对检验数据复核并签名，按签名配置流转至待批准或审批。',
  批准人签名: '批准人最终批准，首件检验通过并进入放行 / 归档。',
  归档报告: '检验完成后系统生成不可篡改的归档报告，留存 15 年。',
}

async function loadTaskOptions() {
  const tasks = await fiaApi.getTasks()
  taskOptions.value = tasks
  if (!selTaskId.value && tasks.length) selTaskId.value = tasks[0].id as string
  await loadLog()
}
async function loadLog() {
  if (!selTaskId.value) {
    taskLog.value = []
    return
  }
  logLoading.value = true
  try {
    taskLog.value = await fiaApi.getTaskLog(selTaskId.value)
  } finally {
    logLoading.value = false
  }
}
function openLogNode(n: TimelineNode) {
  logNodeDlg.visible = true
  logNodeDlg.node = n
  let d = NODE_DESC[n.node] || ''
  if (!d) {
    for (const k of Object.keys(NODE_DESC)) {
      if (n.node && n.node.includes(k)) {
        d = NODE_DESC[k]
        break
      }
    }
  }
  if (!d) d = '该流程节点为首件检验流转中的一环。'
  logNodeDlg.desc = d
}

/* ===================== 3. 归档报告（保留 15 年） ===================== */
const archives = ref<FiaArchived[]>([])
const arcLoading = ref(false)
const reportVisible = ref(false)
const reportTaskId = ref('')

async function loadArchives() {
  arcLoading.value = true
  try {
    archives.value = await fiaApi.getArchives()
  } finally {
    arcLoading.value = false
  }
}

function openReport(row: FiaArchived) {
  reportTaskId.value = row.taskId
  reportVisible.value = true
}

onMounted(async () => {
  await Promise.all([runTrace(), loadTaskOptions(), loadArchives()])
})
</script>

<template>
  <div class="fia-trace">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🧭</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 1. 全链路追溯（正/反向） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>全链路追溯（正向 / 反向）</h3>
        <div class="qms-card__header-actions">
          <el-input v-model="keyword" placeholder="工单 / 产品 / 供应商 / 批次 / 校验单号" clearable style="width: 240px" @keyup.enter="runTrace" @clear="runTrace" />
          <el-button type="primary" :loading="traceLoading" @click="runTrace">查询</el-button>
        </div>
      </div>
      <div class="qms-card__body">
        <div v-if="traceLoading" class="muted">追溯查询中…</div>
        <div v-else-if="!traceResult.length" class="muted">{{ traceEmptyHint }}</div>

        <el-table v-else :data="traceResult" border stripe>
          <el-table-column label="校验单号" min-width="150"><template #default="{ row }">{{ row.task.code }}</template></el-table-column>
          <el-table-column label="工单" min-width="120"><template #default="{ row }">{{ row.task.wo }}</template></el-table-column>
          <el-table-column label="产品 / 工序" min-width="170"><template #default="{ row }">{{ row.task.productName }} / {{ row.task.procName }}</template></el-table-column>
          <el-table-column prop="task.line" label="产线" width="100" />
          <el-table-column prop="task.batchNo" label="批次" width="110" />
          <el-table-column prop="task.trig" label="触发" width="90" />
          <el-table-column prop="task.st" label="状态" width="90" />
          <el-table-column prop="task.result" label="结论" width="90" />
          <el-table-column label="归档" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="row.archived ? 'g' : 'n'">{{ row.archived ? '已归档' : '未归档' }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }"><el-button type="primary" link @click="openChain(row.task)">追溯</el-button></template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 2. 首件检验全流程时间线 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>首件检验全流程时间线</h3>
        <div class="qms-card__header-actions">
          <el-select v-model="selTaskId" filterable placeholder="选择检验任务" style="width: 280px" @change="loadLog">
            <el-option v-for="t in taskOptions" :key="t.id" :label="`${t.code} · ${t.wo} · ${t.productName}`" :value="t.id" />
          </el-select>
        </div>
      </div>
      <div class="qms-card__body">
        <div v-if="logLoading" class="muted">加载时间线…</div>
        <el-timeline v-else-if="taskLog.length">
          <el-timeline-item
            v-for="(n, i) in taskLog"
            :key="i"
            :type="n.done ? 'primary' : 'info'"
            :hollow="!n.done"
            :timestamp="n.t"
            placement="top"
            @click="openLogNode(n)"
          >
            <div class="tl-node" @click="openLogNode(n)">
              <span class="tl-node__title">{{ n.node }}</span>
              <span class="tl-node__op">操作人：{{ n.o }}</span>
              <span class="tl-node__status" :class="n.done ? 'done' : 'todo'">{{ n.done ? '已完成' : '待处理' }}</span>
              <span class="tl-node__hint">点击查看节点详情 ›</span>
            </div>
          </el-timeline-item>
        </el-timeline>
        <div v-else class="muted">该任务暂无流程节点</div>
      </div>
    </div>

    <!-- 3. 归档报告（保留 15 年） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>归档报告（保留 15 年）</h3>
        <span class="tag">质量 / 审计可阅 · 不可篡改</span>
      </div>
      <div class="qms-card__body">
        <el-table v-loading="arcLoading" :data="archives" border stripe>
          <el-table-column prop="rpt" label="报告编号" min-width="150" />
          <el-table-column prop="wo" label="工单号" min-width="120" />
          <el-table-column prop="prod" label="产品" min-width="110" />
          <el-table-column prop="proc" label="工序" min-width="90" />
          <el-table-column prop="d" label="归档日期" width="110" />
          <el-table-column prop="retainUntil" label="留存至" width="110" />
          <el-table-column prop="std" label="标准" min-width="120" />
          <el-table-column prop="conclusion" label="结论" width="80" />
          <el-table-column prop="st" label="状态" width="90" />
          <el-table-column prop="hash" label="报告哈希" min-width="120" show-overflow-tooltip />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openReport(row)">调阅</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 全链路追溯弹窗（点击表格「追溯」展开） -->
    <el-dialog v-model="chainDlg.visible" title="全链路追溯" width="900px">
      <div v-if="chainDlg.task" class="qms-card__header-actions" style="margin-bottom: 12px">
        <el-radio-group v-model="chainDir">
          <el-radio-button value="forward">正向（来料 → 归档）</el-radio-button>
          <el-radio-button value="reverse">反向（归档 → 来料）</el-radio-button>
        </el-radio-group>
        <span class="muted">点击任意节点查看该环节详情</span>
      </div>
      <div v-if="chainDlg.task" class="trace-chain" :class="chainDir === 'reverse' ? 'is-reverse' : ''">
        <template v-for="(n, i) in chainNodes" :key="n.key">
          <div class="trace-node" @click="openNode(n)">
            <div class="trace-node__icon">{{ n.icon }}</div>
            <div class="trace-node__title">{{ n.title }}</div>
            <div class="trace-node__summary">{{ n.summary }}</div>
            <div class="trace-node__more">点击查看详情 ›</div>
          </div>
          <div v-if="i < chainNodes.length - 1" class="trace-arrow" :class="chainDir === 'reverse' ? 'left' : ''">
            {{ chainDir === 'reverse' ? '◂' : '▸' }}
          </div>
        </template>
      </div>
    </el-dialog>

    <!-- 节点详情弹窗（追溯链 / 时间线共用） -->
    <el-dialog v-model="nodeDlg.visible" :title="nodeDlg.title" width="640px">
      <div v-loading="nodeDlg.loading" v-html="nodeDlg.html"></div>
    </el-dialog>

    <!-- 时间线节点详情弹窗 -->
    <el-dialog v-model="logNodeDlg.visible" title="流程节点详情" width="520px">
      <div v-if="logNodeDlg.node">
        <div class="kv"><span class="kv-k">节点</span><span class="kv-v">{{ logNodeDlg.node.node }}</span></div>
        <div class="kv"><span class="kv-k">时间</span><span class="kv-v">{{ logNodeDlg.node.t || '—' }}</span></div>
        <div class="kv"><span class="kv-k">操作人</span><span class="kv-v">{{ logNodeDlg.node.o }}</span></div>
        <div class="kv"><span class="kv-k">状态</span><span class="kv-v">{{ logNodeDlg.node.done ? '已完成' : '待处理' }}</span></div>
        <div class="kv-note">{{ logNodeDlg.desc }}</div>
      </div>
    </el-dialog>

    <!-- 归档完整流程报告弹窗（复用 FiaReportDialog） -->
    <FiaReportDialog v-model="reportVisible" :task-id="reportTaskId" />
  </div>
</template>

<style scoped lang="scss">
.fia-trace { display: flex; flex-direction: column; gap: 12px; }
.qms-card__header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.muted { color: #909399; font-size: 13px; }

/* 追溯链 */
.trace-chain { display: flex; align-items: stretch; flex-wrap: wrap; }
.trace-node {
  flex: 1 1 130px; min-width: 130px; max-width: 180px; cursor: pointer;
  border: 1px solid #dbe5f1; border-radius: 10px; padding: 10px 12px; background: #fff;
  transition: all .15s; display: flex; flex-direction: column; gap: 4px;
}
.trace-node:hover { border-color: #1e4d8b; box-shadow: 0 4px 14px rgba(30,77,139,.12); transform: translateY(-2px); }
.trace-node__icon { font-size: 20px; }
.trace-node__title { font-weight: 600; color: #1f2d3d; font-size: 13px; }
.trace-node__summary { font-size: 12px; color: #5a6b7e; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.trace-node__more { font-size: 11px; color: #1e4d8b; margin-top: auto; }
.trace-arrow { display: flex; align-items: center; justify-content: center; color: #b6c2d4; font-size: 18px; padding: 0 4px; }

/* 时间线节点 */
.tl-node { cursor: pointer; padding: 6px 8px; border-radius: 8px; border: 1px solid transparent; transition: all .15s; }
.tl-node:hover { background: #f3f7fd; border-color: #e1ebf7; }
.tl-node__title { font-weight: 600; color: #1f2d3d; margin-right: 10px; }
.tl-node__op { font-size: 12px; color: #5a6b7e; margin-right: 10px; }
.tl-node__status { font-size: 12px; padding: 1px 8px; border-radius: 10px; margin-right: 10px; }
.tl-node__status.done { background: #e8f5e9; color: #2e7d32; }
.tl-node__status.todo { background: #fff4e5; color: #ed6c02; }
.tl-node__hint { font-size: 11px; color: #1e4d8b; }

/* 节点详情通用 */
.kv-title { font-weight: 700; color: #1e4d8b; margin-bottom: 8px; }
.kv-sub { font-weight: 600; color: #1f2d3d; margin: 10px 0 4px; }
.kv { display: flex; gap: 10px; padding: 3px 0; border-bottom: 1px dashed #eef2f7; font-size: 13px; }
.kv-k { width: 110px; color: #90a0b3; flex: none; }
.kv-v { color: #1f2d3d; word-break: break-all; }
.kv-pre { background: #f7f9fc; border: 1px solid #e6edf5; border-radius: 8px; padding: 8px 10px; white-space: pre-wrap; word-break: break-all; font-size: 12px; color: #1f2d3d; margin: 6px 0; }
.kv-note { font-size: 12px; color: #909399; margin-top: 8px; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 6px 10px; border-radius: 6px; }
.kv-tbl { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
.kv-tbl th, .kv-tbl td { border: 1px solid #e6edf5; padding: 4px 6px; text-align: left; }
.kv-tbl th { background: #f3f7fd; color: #5a6b7e; }
</style>
