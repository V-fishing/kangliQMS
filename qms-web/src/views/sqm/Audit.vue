<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import echarts from '@/utils/echarts'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { auditPlans as planData, auditRecords as recordData, ncItems as ncData } from '@/mock/sqm'
import type { AuditPlan, NcItem } from '@/types/sqm'
import SchemaForm from '@/components/form/SchemaForm.vue'

const authStore = useAuthStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 供应商审核',
  desc: '审核计划、审核记录与不符合项管理',
}

// 角色门控：SQE/质量经理/体系/系统管理员可新增审核计划
const canAdd = ['sqe', 'qmanager', 'qualitysys', 'sysadmin'].includes(authStore.role)

// ---- 视图切换（列表 / 日历，对齐 HTML switchAuditView） ----
const view = ref<'list' | 'calendar'>('list')

// ---- 审核计划（可新增、可筛选） ----
const plans = ref<AuditPlan[]>([...planData])
const fType = ref('')
const fStatus = ref('')
const fSearch = ref('')
const filteredPlans = computed(() =>
  plans.value.filter((p) =>
    (!fType.value || p.type === fType.value) &&
    (!fStatus.value || p.status === fStatus.value) &&
    (!fSearch.value || p.supName.toLowerCase().includes(fSearch.value.toLowerCase())),
  ),
)

// ---- 审核记录（对齐 HTML MOCK.sqm.auditRecords） ----
const records = ref([...recordData])

// ---- 不符合项跟踪（可筛选） ----
const ncs = ref<NcItem[]>([...ncData])
const fNcLevel = ref('')
const fNcStatus = ref('')
const filteredNc = computed(() =>
  ncs.value.filter((n) =>
    (!fNcLevel.value || n.level === fNcLevel.value) &&
    (!fNcStatus.value || n.status === fNcStatus.value),
  ),
)

// ---- 药丸配色（对齐 HTML stPill / lvlPill） ----
const STATUS_MAP: Record<string, string> = {
  待检: 'y', 进行中: 'b', 已完成: 'g', 超时: 'r', 合格: 'g', 不合格: 'r', 正常: 'g', 锁定: 'r',
  待首检: 'y', 充足: 'g', 尚可: 'y', 不足: 'r', 严重: 'r', 一般: 'y', 观察项: 'gray',
  待确认: 'y', 已关闭: 'g', 待提交: 'y', 整改中: 'b', 待启动: 'gray', 超期: 'r', 即将到期: 'y',
  报警: 'r', 预警: 'y', 待处理: 'y', 待验证: 'p', '8D进行中': 'b', 'CAPA执行中': 'p',
  计划中: 'gray', 待执行: 'gray', 已验证: 'p', '已整改待验证': 'p',
}
function statusClass(st: string) { return STATUS_MAP[st] || 'gray' }
function resultClass(r: string) { return r === '通过' ? 'g' : r === '不通过' ? 'r' : 'y' }
function levelClass(l: string) { return l === '严重' ? 'r' : l === '一般' ? 'y' : 'g' }

// ---- 交互（对齐 HTML actAudit*） ----
function startAudit(p: AuditPlan) {
  p.status = '进行中'
  ElMessage.success(`审核已开始：${p.id}（${p.supName}）`)
}
function detailPlan(p: AuditPlan) {
  ElMessage.info(`审核计划详情：${p.id} / ${p.supName} / ${p.type} / ${p.scope}`)
}
function viewRecord(r: any) {
  ElMessage.info(`审核报告：${r.id} / ${r.supName} / 结果 ${r.result} / 得分 ${r.score}`)
}
function trackNc(n: NcItem) {
  ElMessage.info(`不符合项跟踪：${n.id} / ${n.supName} / ${n.level} / ${n.status}`)
}

// ---- 执行审核（SR-SQA-007 检查表 / SR-SQA-009 不符合项分级 / SR-SQA-021 结论建议） ----
const execVisible = ref(false)
const execTarget = ref<AuditPlan | null>(null)
const checklist = reactive([
  { clause: 'ISO13485-7.5.1 生产与服务控制', judge: '' as '' | '符合' | '不符合' | '不适用', note: '' },
  { clause: 'GMP-8.3 不合格品控制', judge: '' as '' | '符合' | '不符合' | '不适用', note: '' },
  { clause: 'ISO13485-8.2.4 监视与测量', judge: '' as '' | '符合' | '不符合' | '不适用', note: '' },
  { clause: 'ISO13485-7.4 采购控制', judge: '' as '' | '符合' | '不符合' | '不适用', note: '' },
])
const execNcs = ref<{ clause: string; desc: string; level: '严重' | '一般' | '观察项'; contain?: string }[]>([])
const newNc = reactive({ clause: '', desc: '', level: '一般' as '严重' | '一般' | '观察项', contain: '' })
function openExec(p: AuditPlan) {
  execTarget.value = p
  checklist.forEach((c) => { c.judge = ''; c.note = '' })
  execNcs.value = []
  newNc.clause = ''; newNc.desc = ''; newNc.level = '一般'; newNc.contain = ''
  execVisible.value = true
}
function addNc() {
  if (!newNc.desc.trim()) { ElMessage.warning('请填写不符合描述'); return }
  if (newNc.level === '严重' && !newNc.contain.trim()) { ElMessage.warning('严重不符合项需填写即时遏制措施（SR-SQA-009）'); return }
  execNcs.value.push({ clause: newNc.clause, desc: newNc.desc.trim(), level: newNc.level, contain: newNc.contain.trim() || undefined })
  newNc.clause = ''; newNc.desc = ''; newNc.level = '一般'; newNc.contain = ''
  ElMessage.success('不符合项已录入（' + newNc.level + '）')
}
// 结论自动建议（SR-SQA-021）：无不符合/仅观察项=推荐通过；存在一般项无严重=有条件通过；严重或一般>5=不通过
function conclusionSuggestion() {
  const hasSerious = execNcs.value.some((n) => n.level === '严重')
  const generalCount = execNcs.value.filter((n) => n.level === '一般').length
  if (hasSerious) return { txt: '不通过', cls: 'r' }
  if (generalCount > 5) return { txt: '不通过', cls: 'r' }
  if (generalCount > 0) return { txt: '有条件通过', cls: 'y' }
  return { txt: '推荐通过', cls: 'g' }
}
function submitExec() {
  if (checklist.some((c) => !c.judge)) { ElMessage.warning('请完成检查表逐项判定（符合/不符合/不适用）'); return }
  // 整改期限按分级：严重=15天/一般=30天/观察项无期限（SR-SQA-013）
  const serious = execNcs.value.filter((n) => n.level === '严重').length
  const general = execNcs.value.filter((n) => n.level === '一般').length
  ElMessage.success(`审核已提交，结论建议「${conclusionSuggestion().txt}」；${serious} 项严重(15天)/${general} 项一般(30天)不符合项已双通道推送整改`)
  execVisible.value = false
}

// ---- 不符合项整改闭环（SR-SQA-018：SQE确认 + 连续3批合格） ----
const ncClosure = reactive<Record<string, number>>({})
function passNcBatch(n: NcItem) {
  const k = n.id
  ncClosure[k] = (ncClosure[k] || 0) + 1
  if (ncClosure[k] >= 3) {
    n.status = '已关闭'
    ElMessage.success(`${n.id} 连续 3 批合格 + SQE 确认，已闭环（SR-SQA-018）`)
  } else {
    ElMessage.success(`${n.id} 第 ${ncClosure[k]} 批合格（${ncClosure[k]}/3），需 SQE 确认签字`)
  }
}

// ---- 新增审核计划 ----
const dialog = ref(false)
const schema = [
  { prop: 'supName', label: '供应商', type: 'input', required: true },
  { prop: 'type', label: '审核类型', type: 'select', options: [
    { label: '年度复审', value: '年度复审' }, { label: '过程审核', value: '过程审核' },
    { label: '专项审核', value: '专项审核' }, { label: '飞行检查', value: '飞行检查' },
    { label: '初次审核', value: '初次审核' }, { label: '年度审核', value: '年度审核' },
    { label: '附加审核', value: '附加审核' }, { label: '重新审核', value: '重新审核' },
  ] },
  { prop: 'planDate', label: '计划日期', type: 'date', required: true },
  { prop: 'auditor', label: '审核员', type: 'input', required: true },
  { prop: 'scope', label: '审核范围', type: 'textarea' },
]
const model = ref<Record<string, unknown>>({})
function openAdd() { model.value = {}; dialog.value = true }
function onSubmit(v: Record<string, unknown>) {
  plans.value.unshift({
    id: 'AP-' + Date.now().toString().slice(-6),
    supId: '', supName: v.supName as string, type: v.type as AuditPlan['type'],
    planDate: v.planDate as string, auditor: v.auditor as string,
    status: '计划中', scope: (v.scope as string) || '—',
  })
  dialog.value = false
  ElMessage.success('审核计划已创建')
}

// ---- 日历视图（对齐 HTML switchAuditView 的 calendar + scatter） ----
const calRef = ref<HTMLDivElement>()
let calInst: echarts.ECharts | null = null
function renderCalendar() {
  if (!calRef.value) return
  if (!calInst) calInst = echarts.init(calRef.value)
  const data = plans.value.map((p, i) => [p.planDate, i + 1])
  calInst.setOption({
    tooltip: { trigger: 'item' },
    calendar: { top: 40, left: 40, right: 20, cellSize: ['auto', 20], range: '2025-01', itemStyle: { borderWidth: 0.5 }, yearLabel: { show: false } },
    series: [{
      type: 'scatter', coordinateSystem: 'calendar',
      data, symbolSize: (val: number[]) => val[1] * 8, itemStyle: { color: '#f59e0b' },
    }],
  })
  calInst.resize()
}
watch(view, (v) => { if (v === 'calendar') nextTick(renderCalendar) })
onMounted(() => { if (view.value === 'calendar') nextTick(renderCalendar) })
onBeforeUnmount(() => { calInst?.dispose(); calInst = null })
</script>

<template>
  <div class="sqm-audit">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔍</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 工具栏：列表/日历切换 + 筛选 + 搜索 + 新增 -->
    <div class="toolbar">
      <div class="seg">
        <button :class="{ on: view === 'list' }" @click="view = 'list'">列表视图</button>
        <button :class="{ on: view === 'calendar' }" @click="view = 'calendar'">日历视图</button>
      </div>
      <span class="sp"></span>
      <select v-model="fType" class="qms-select">
        <option value="">全部类型</option>
        <option>年度复审</option><option>过程审核</option><option>专项审核</option><option>飞行检查</option>
      </select>
      <select v-model="fStatus" class="qms-select">
        <option value="">全部状态</option>
        <option>计划中</option><option>待执行</option><option>已完成</option>
      </select>
      <input v-model="fSearch" type="text" class="qms-input" placeholder="搜索供应商..." />
      <button v-if="canAdd" class="btn pri" @click="openAdd">+ 新增审核计划</button>
    </div>

    <!-- 列表视图：审核计划 -->
    <div v-show="view === 'list'" class="qms-card">
      <div class="qms-card__header">
        <h3>审核计划</h3><span class="sr-tag">SR-SQA-001</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="filteredPlans" border size="small">
          <el-table-column prop="id" label="计划号" width="120" />
          <el-table-column prop="supName" label="供应商" />
          <el-table-column prop="type" label="审核类型" width="110" />
          <el-table-column prop="planDate" label="计划日期" width="110" />
          <el-table-column prop="auditor" label="审核员" width="140" />
          <el-table-column prop="scope" label="审核范围" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="statusClass(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button v-if="row.status === '待执行'" link type="primary" size="small" @click="startAudit(row)">开始</el-button>
              <el-button v-if="row.status === '进行中'" link type="success" size="small" @click="openExec(row)">执行审核</el-button>
              <el-button link type="primary" size="small" @click="detailPlan(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 日历视图 -->
    <div v-show="view === 'calendar'" class="qms-card">
      <div class="qms-card__header">
        <h3>2025年1月审核日历</h3><span class="sr-tag">SR-SQA-001</span>
      </div>
      <div class="qms-card__body">
        <div ref="calRef" class="audit-calendar"></div>
      </div>
    </div>

    <!-- 审核记录（始终可见，对齐 HTML 审核记录表） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>审核记录</h3><span class="sr-tag">SR-SQA-007</span><span class="sr-tag">SR-SQA-020</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="records" border size="small">
          <el-table-column prop="id" label="记录号" width="130" />
          <el-table-column prop="supName" label="供应商" />
          <el-table-column prop="type" label="审核类型" width="110" />
          <el-table-column prop="date" label="审核日期" width="110" />
          <el-table-column prop="auditor" label="审核员" width="140" />
          <el-table-column label="结果" width="110">
            <template #default="{ row }"><span class="qms-pill" :class="resultClass(row.result)">{{ row.result }}</span></template>
          </el-table-column>
          <el-table-column label="得分" width="70"><template #default="{ row }"><strong>{{ row.score }}</strong></template></el-table-column>
          <el-table-column prop="ncCount" label="不符合项" width="80" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="statusClass(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }"><el-button link type="primary" size="small" @click="viewRecord(row)">查看报告</el-button></template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 不符合项跟踪（始终可见，对齐 HTML 不符合项跟踪） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>不符合项跟踪</h3><span class="sr-tag">SR-SQA-009</span><span class="sr-tag">SR-SQA-013</span><span class="sr-tag">SR-SQA-017</span><span class="sr-tag">SR-SQA-018</span>
      </div>
      <div class="qms-card__body">
        <div class="filter-bar" style="margin-bottom: 10px">
          <select v-model="fNcLevel" class="qms-select">
            <option value="">全部级别</option><option>严重</option><option>一般</option><option>观察项</option>
          </select>
          <select v-model="fNcStatus" class="qms-select">
            <option value="">全部状态</option><option>整改中</option><option>已整改待验证</option><option>已关闭</option>
          </select>
        </div>
        <el-table :data="filteredNc" border size="small">
          <el-table-column prop="id" label="NC编号" width="130" />
          <el-table-column prop="arId" label="关联审核" width="120" />
          <el-table-column prop="supName" label="供应商" />
          <el-table-column prop="desc" label="不符合描述" min-width="200" />
          <el-table-column prop="clause" label="条款" width="80" />
          <el-table-column label="级别" width="80">
            <template #default="{ row }"><span class="qms-pill" :class="levelClass(row.level)">{{ row.level }}</span></template>
          </el-table-column>
          <el-table-column prop="responsible" label="责任人" width="90" />
          <el-table-column prop="deadline" label="截止日期" width="110" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><span class="qms-pill" :class="statusClass(row.status)">{{ row.status }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="trackNc(row)">跟踪</el-button>
              <el-button v-if="row.status === '已整改待验证'" link type="success" size="small" @click="passNcBatch(row)">登记合格批({{ ncClosure[row.id] || 0 }}/3)</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 执行审核弹窗（SR-SQA-007 检查表 / SR-SQA-009 不符合项分级 / SR-SQA-021 结论建议） -->
    <el-dialog v-model="execVisible" :title="`执行审核 · ${execTarget?.supName || ''}`" width="720px">
      <template v-if="execTarget">
        <div class="kv-box">
          <div><b>审核计划：</b>{{ execTarget.id }} · {{ execTarget.type }} · 范围：{{ execTarget.scope }}</div>
          <div><b>审核员：</b>{{ execTarget.auditor }} · <b>计划日期：</b>{{ execTarget.planDate }}</div>
        </div>

        <h4 style="margin:14px 0 8px">审核检查表（ISO 13485 / GMP 条款）</h4>
        <table class="tbl" style="margin-bottom: 6px">
          <thead><tr><th>条款</th><th>判定</th><th>备注</th></tr></thead>
          <tbody>
            <tr v-for="(c, i) in checklist" :key="i">
              <td>{{ c.clause }}</td>
              <td>
                <select v-model="c.judge" class="qms-select" style="height:30px">
                  <option value="">—</option><option>符合</option><option>不符合</option><option>不适用</option>
                </select>
              </td>
              <td><input v-model="c.note" type="text" class="qms-input" style="min-width:auto;height:30px" placeholder="备注..." /></td>
            </tr>
          </tbody>
        </table>

        <h4 style="margin:14px 0 8px">不符合项录入与分级（SR-SQA-009 / SR-SQA-010）</h4>
        <div class="nc-form">
          <select v-model="newNc.level" class="qms-select" style="height:30px">
            <option>严重</option><option>一般</option><option>观察项</option>
          </select>
          <input v-model="newNc.clause" type="text" class="qms-input" style="min-width:120px;height:30px" placeholder="条款编号" />
          <input v-model="newNc.desc" type="text" class="qms-input" style="flex:1;height:30px" placeholder="不符合描述" />
          <button class="btn sm" @click="addNc">添加</button>
        </div>
        <div v-if="newNc.level === '严重'" class="contain-row">
          <span class="qms-pill r">严重</span>
          <input v-model="newNc.contain" type="text" class="qms-input" style="flex:1;height:30px" placeholder="必填：即时遏制措施（SR-SQA-009）" />
        </div>
        <div v-if="execNcs.length" class="nc-list">
          <div v-for="(n, i) in execNcs" :key="i" class="nc-item">
            <span class="qms-pill" :class="levelClass(n.level)">{{ n.level }}</span>
            <span class="meta">{{ n.clause }}</span> {{ n.desc }}
            <span v-if="n.contain" class="contain">遏制：{{ n.contain }}</span>
          </div>
        </div>

        <div class="conclusion">
          <span class="lbl">系统自动建议结论（SR-SQA-021）：</span>
          <span class="qms-pill" :class="conclusionSuggestion().cls">{{ conclusionSuggestion().txt }}</span>
          <span class="meta" style="margin-left:8px">严重=不通过 / 一般>5=不通过 / 一般&无严重=有条件通过 / 无不符合=推荐通过</span>
        </div>
        <div class="note" style="margin-top:8px">提交后系统双通道（系统通知+邮件）推送整改，期限按分级：严重15天 / 一般30天 / 观察项无期限（SR-SQA-013）。</div>
      </template>
      <template #footer>
        <button class="btn pri" @click="submitExec">提交审核（生成报告）</button>
        <button class="btn ghost" @click="execVisible = false">取消</button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialog" title="新增审核计划" width="520px">
      <SchemaForm :schema="schema" :model-value="model" @submit="onSubmit" />
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-audit { display: flex; flex-direction: column; gap: 14px; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  .sp { flex: 1 1 auto; }
}

.audit-calendar { width: 100%; height: 220px; }

.kv-box { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.8; margin-bottom: 6px; }
.nc-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.contain-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.nc-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.nc-item { background: #fafbfc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 10px; font-size: 13px; }
.nc-item .contain { display: inline-block; margin-left: 8px; color: #c0392b; font-size: 12px; }
.conclusion { margin-top: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; .lbl { font-weight: 600; font-size: 13px; } }
.note { font-size: 12px; color: #6b7785; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 8px 12px; border-radius: 6px; }
.btn {
  border: 1px solid #e1e8f0; background: #fff; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: 0.15s;
  &.sm { padding: 3px 8px; }
  &.pri { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
  &.ghost { background: #fff; color: #5a6b7e; }
  &:hover { filter: brightness(0.96); }
}
</style>
