<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import FishboneDiagram from '@/components/workflow/FishboneDiagram.vue'
import FiveWhyEditor from '@/components/workflow/FiveWhyEditor.vue'
import D4Wizard from '@/components/workflow/D4Wizard.vue'
import ApprovalPanel from '@/components/workflow/ApprovalPanel.vue'
import EightDBoard from '@/components/workflow/EightDBoard.vue'
import { ncmApi } from '@/api'
import type { Ncm8DListItem, NcmCapa, Ncm8D } from '@/types/ncm'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 8D 整改',
  desc: '8D 整改看板、根因分析、SLA 时效与人工手动触发 CAPA',
}

/* ============ 8D 报告列表 ============ */
const list = ref<Ncm8DListItem[]>([])
const capaList = ref<NcmCapa[]>([])

const loading = ref(false)
async function loadList() {
  loading.value = true
  try {
    const [l, capas] = await Promise.all([
      ncmApi.get8DList(),
      ncmApi.getCapas().catch(() => [] as NcmCapa[]),
    ])
    list.value = l
    capaList.value = capas
    if (l.length && !list.value.find((r) => r.id === selectedId.value)) {
      selectedId.value = l[0].id
    }
  } catch (e) {
    list.value = []
    capaList.value = []
  } finally {
    loading.value = false
  }
  // 支持从其他模块（如供应商异常）带 focus=报告Id 跳转并定位
  const focus = route.query.focus as string | undefined
  if (focus && list.value.find((r) => r.id === focus)) {
    selectedId.value = focus
  }
  // 列表加载完成后确保默认选中项详情被加载
  if (selected.value?.id) await loadDetail(selected.value.id)
}
onMounted(loadList)

const D8_STAGES = [
  { d: 'D0', name: '前评估', approval: false },
  { d: 'D1', name: '团队组建', approval: false },
  { d: 'D2', name: '问题描述', approval: false },
  { d: 'D3', name: '临时措施', approval: true },
  { d: 'D4', name: '根因分析', approval: false },
  { d: 'D5', name: '纠正措施', approval: true },
  { d: 'D6', name: '实施验证', approval: false },
  { d: 'D7', name: '预防措施', approval: true },
  { d: 'D8', name: '总结关闭', approval: false },
]

const selectedId = ref<string>('')
const selected = computed(() => list.value.find((r) => r.id === selectedId.value) || list.value[0])

/** 来源展示文本（供应商异常发起的8D） */
const sourceLabel = computed(() => {
  const { source, sourceRefId } = detail.value
  if (!source) return ''
  if (source === 'SQM异常' || source === '供应商异常') {
    return `供应商异常上报 (#${sourceRefId || '—'})`
  }
  return source
})

/** 适配 EightDBoard 组件所需的 Ncm8D 结构，真正可视化 D1-D8 流程 */
const boardStageIdx = ref(0)
const boardData = computed<Ncm8D | null>(() => {
  const sel = selected.value
  if (!sel) return null
  const stageMeta: Record<string, string> = {
    D1: '团队组建', D2: '问题描述', D3: '临时措施', D4: '根因分析',
    D5: '纠正措施', D6: '实施验证', D7: '预防措施', D8: '总结关闭',
  }
  const stages = (detail.value.stages || []).map((s) => {
    const code = String(s.stageCode || '').toUpperCase()
    const name = stageMeta[code] ? `${code}-${stageMeta[code]}` : String(s.stageCode || '未知阶段')
    return {
      name,
      owner: s.owner || '未指派',
      due: s.planDate || '—',
      content: s.content || '（暂无内容）',
    }
  })
  const curCode = String(sel.stage || '').toUpperCase()
  const curIdx = Object.keys(stageMeta).indexOf(curCode)
  if (curIdx >= 0) boardStageIdx.value = curIdx
  const d4 = detail.value.stages.find((s) => s.stageCode === 'D4')?.content || ''
  const d5 = (detail.value.stages.find((s) => s.stageCode === 'D5')?.content || '')
    .split('\n').filter(Boolean)
  return {
    id: sel.reportId || sel.id,
    title: detail.value.d8No || sel.ncmNo || sel.id,
    sev: sel.severity || '—',
    source: detail.value.source,
    sourceRefId: detail.value.sourceRefId,
    team: detail.value.team || sel.team || '—',
    currentStage: boardStageIdx.value,
    stages,
    rootCause: d4,
    actions: d5.map((desc) => ({ desc, owner: '—', due: '—', done: false })),
  }
})
/** 看板阶段被点击：仅切换可视化查看，不改变后端阶段 */
function onBoardStage(i: number) {
  boardStageIdx.value = i
}

/** 8D 详情（含阶段明细、鱼骨图、5Why） */
interface StageDetail {
  stageCode?: string
  content?: string
  teamMembers?: string
  owner?: string
  planDate?: string
  approvalStatus?: string
  approvedBy?: string
  approvedAt?: string
  approvalComment?: string
  evidenceFiles?: string
}
const detail = ref<{ stages: StageDetail[]; team: string; source?: string; sourceRefId?: string; d8No?: string }>({
  stages: [],
  team: '',
  source: '',
  sourceRefId: '',
  d8No: '',
})

async function loadDetail(id: string) {
  if (!id) return
  try {
    const vo = await ncmApi.get8DDetail(id)
    const report = (vo.report ?? {}) as { team?: string; source?: string; sourceRefId?: string; d8No?: string }
    detail.value = {
      stages: (vo.stages ?? []).map((s) => ({
        stageCode: String(s?.stageCode ?? ''),
        content: String(s?.content ?? ''),
        teamMembers: String(s?.teamMembers ?? ''),
        owner: String(s?.owner ?? ''),
        planDate: s?.planDate != null ? String(s.planDate) : '',
        approvalStatus: String(s?.approvalStatus ?? ''),
        approvedBy: String(s?.approvedBy ?? ''),
        approvedAt: s?.approvedAt != null ? String(s.approvedAt).replace('T', ' ') : '',
        approvalComment: String(s?.approvalComment ?? ''),
        evidenceFiles: String(s?.evidenceFiles ?? ''),
      })),
      team: String(report.team ?? ''),
      source: String(report.source ?? ''),
      sourceRefId: String(report.sourceRefId ?? ''),
      d8No: String(report.d8No ?? ''),
    }
  } catch (e) {
    detail.value = { stages: [], team: '', source: '', sourceRefId: '', d8No: '' }
  }
}

watch(() => selected.value?.id, (id) => { if (id) loadDetail(id) }, { immediate: true })

/** 团队成员列表（从 8D 报告 team 字段或阶段明细聚合） */
const ncm8DTeam = computed<string[]>(() => {
  if (detail.value.team) return detail.value.team.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
  const set = new Set<string>()
  for (const s of detail.value.stages) {
    if (s.teamMembers) s.teamMembers.split(/[,，、]/).forEach((m) => { const t = m.trim(); if (t) set.add(t) })
  }
  return Array.from(set)
})

/** 鱼骨图交互式数据（5M1E 分类），与 FishboneDiagram @update 双向绑定 */
interface FishboneItem { category: string; causes: string[] }
const fishboneData = ref<FishboneItem[]>([])
/** 5Why 追问链，与 FiveWhyEditor @update 双向绑定 */
interface WhyItem { why: string; answer: string }
const fiveWhyItems = ref<WhyItem[]>([])

/** 将 D4 阶段 JSON 内容还原为 fishboneData / fiveWhyItems（兼容旧文本格式） */
function restoreD4Tools(raw: string) {
  try {
    const j = JSON.parse(raw)
    if (j && Array.isArray(j.fishbone)) fishboneData.value = j.fishbone
    if (j && Array.isArray(j.fiveWhy)) fiveWhyItems.value = j.fiveWhy
  } catch {
    fishboneData.value = []
    fiveWhyItems.value = []
  }
}
/** 将 fishboneData + fiveWhyItems 序列化为 D4 阶段 JSON */
function serializeD4Tools(): string {
  return JSON.stringify({ fishbone: fishboneData.value, fiveWhy: fiveWhyItems.value })
}
function onFishUpdate(v: FishboneItem[]) { fishboneData.value = v }
function onWhyUpdate(v: WhyItem[]) { fiveWhyItems.value = v }

/** 从 S=7 解析出数值 */
function sevNum(sev: string) {
  const m = (sev || '').match(/\d+/)
  return m ? Number(m[0]) : 0
}
function sevType(sev: string) {
  const n = sevNum(sev)
  return n >= 7 ? 'danger' : n >= 5 ? 'warning' : 'info'
}
function stType(st: string) {
  if (st === '已闭环') return 'success'
  if (st === '审批中') return 'warning'
  if (st === '效果验证') return ''
  return 'primary'
}

/** 当前阶段索引 */
const curIndex = computed(() => {
  const i = D8_STAGES.findIndex((s) => s.d === selected.value?.stage)
  return i < 0 ? 0 : i
})
const isClosed = computed(() => selected.value?.st === '已闭环')
function stepClass(i: number) {
  if (i < curIndex.value) return 'done'
  if (i === curIndex.value) return 'cur'
  return ''
}

function selectRow(row: Ncm8DListItem) {
  selectedId.value = row.id
}

/** 溯源到供应商来料异常单 */
function goSource(refId: string) {
  router.push({ name: 'SqmAbnormal', query: { focus: refId } })
}

/* ============ 手动发起 8D ============ */
const create8DVisible = ref(false)
const new8D = reactive({
  src: '不良记录', issue: '', sev: 7, owner: '',
  d0: { scope: '局部', custLevel: '一般', safety: '否', repeat: '否' },
})

/** D0 前评估（快速整改分流，SR-PTL-013） */
function d0Suggestion() {
  if (new8D.d0.safety === '是')
    return { text: '完整 8D（涉及安全问题，强制完整流程，不允许快速整改）', quick: false }
  if (new8D.d0.scope === '小范围' && new8D.d0.repeat === '否' && new8D.d0.custLevel !== '严重')
    return { text: '可走快速整改（仅需 D2 问题描述 → D4 根因 → D6 措施实施）', quick: true }
  return { text: '完整 8D（D0-D8 全阶段）', quick: false }
}

function openCreate8D() {
  new8D.src = '不良记录'
  new8D.issue = ''
  new8D.sev = 7
  new8D.owner = ''
  new8D.d0 = { scope: '局部', custLevel: '一般', safety: '否', repeat: '否' }
  create8DVisible.value = true
}
async function confirmCreate8D() {
  if (!new8D.issue.trim()) { ElMessage.warning('请填写问题简述'); return }
  try {
    const created = (await ncmApi.create8d({
      issue: new8D.issue.trim(),
      source: new8D.src,
      severity: `S=${new8D.sev}`,
      team: new8D.owner,
      flowType: 'complete',
    })) as any
    await loadList()
    selectedId.value = created.id
    create8DVisible.value = false
    const sug = d0Suggestion()
    ElMessage.success(`8D 已发起（${created.d8No}），D0 前评估完成：${sug.text}`)
  } catch (e: any) {
    ElMessage.error('发起失败：' + (e?.response?.data?.message || ''))
  }
}

/* ============ CAPA 触发方式（默认手动，SR-PTL-019） ============ */
// 默认手动触发：由用户点击「人工手动触发 CAPA」创建；切换为自动时满足条件即生成
const capaAuto = ref(false)

/* ============ 人工手动触发 CAPA（SR-PTL-019） ============ */
const capaVisible = ref(false)
const newCapa = reactive({ reason: '', owner: '', due: '', trigger: 'S≥7' })

const linkedCapa = computed(() => capaList.value.filter((c) => c.from8D === selected.value?.id))

function openCapa() {
  const cur = selected.value
  if (!cur) return
  const n = sevNum(cur.sev)
  // 触发条件：S≥7 或 同产品/问题 30 天内重复（SR-PTL-019）
  const ok = newCapa.trigger === '30天重复' ? true : n >= 7
  if (!ok) {
    ElMessage.warning('触发条件不满足：严重度需 S≥7，或同产品/问题 30 天内重复发起（SR-PTL-019）')
    return
  }
  if (linkedCapa.value.length) {
    ElMessage.warning(`${cur.id} 已存在关联 CAPA（${linkedCapa.value[0].id}），不可重复创建`)
    return
  }
  newCapa.reason = `${cur.issue}（${cur.sev}）需系统性纠正预防措施`
  newCapa.owner = ''
  newCapa.due = ''
  newCapa.trigger = 'S≥7'
  capaVisible.value = true
}
async function confirmCapa() {
  if (!newCapa.owner.trim()) { ElMessage.warning('请指定 CAPA 责任人'); return }
  if (!newCapa.due) { ElMessage.warning('请设置目标完成日期'); return }
  try {
    await ncmApi.createCapa({
      d8Id: selected.value?.id,
      issue: newCapa.reason,
      triggerType: newCapa.trigger,
      owner: newCapa.owner.trim(),
      dueDate: newCapa.due,
      capaType: '纠正',
      progress: 0,
      status: '待启动',
    })
    await loadList()
    capaVisible.value = false
    ElMessage.success('CAPA 已创建并关联')
  } catch (e) {
    ElMessage.error('CAPA 创建失败')
  }
}

function capaStType(st: string) {
  return st === '已关闭' ? 'success' : st === '待启动' ? 'info' : 'warning'
}

/* ============ 详情表单（按阶段动态：当前阶段可编辑，已完成只读，未开始隐藏） ============ */
const ALL_STAGES = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']
const STAGE_TITLES: Record<string, string> = {
  D1: 'D1 组建团队（Team / 职责）',
  D2: 'D2 问题描述（5W2H，可预填自不良）',
  D3: 'D3 临时措施（SLA 24h · 需审批）',
  D4: 'D4 根因分析（鱼骨图 / 5Why）',
  D5: 'D5 永久纠正措施（SLA 7天 · 需审批）',
  D6: 'D6 实施与验证（SLA 30天）',
  D7: 'D7 预防措施（标准化 / 防再发）',
  D8: 'D8 表彰与结案',
}
function stageContent(code: string): string {
  const s = detail.value.stages.find((x) => x.stageCode?.toUpperCase() === code.toUpperCase())
  return s?.content ?? ''
}
/** 各阶段编辑内容（同一时刻仅"当前阶段"可写，其余只读或隐藏） */
const stageForms = reactive<Record<string, string>>({
  D1: '', D2: '', D3: '', D4: '', D5: '', D6: '', D7: '', D8: '',
})

/** 8D 根因分析报告区 tab */
const reportTab = ref<1 | 2 | 3>(1)  // 1=鱼骨图 2=5Why 链 3=原始数据
const reportRef = ref<HTMLElement | null>(null)
function scrollToReport() {
  reportTab.value = 1
  reportRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 报告摘要：根因结论 / 原因总数 / 涉及类别 / 追问层数 */
const reportSummary = computed(() => {
  const totalCauses = fishboneData.value.reduce(
    (s, c) => s + c.causes.filter((x) => x.trim()).length, 0,
  )
  const filledCats = fishboneData.value.filter((c) => c.causes.some((x) => x.trim())).length
  const root = fiveWhyItems.value[fiveWhyItems.value.length - 1]?.answer?.trim() || '（未识别根因）'
  const layers = fiveWhyItems.value.length
  return { totalCauses, filledCats, root, layers }
})
watch(detail, () => {
  ALL_STAGES.forEach((c) => {
    const saved = stageContent(c)
    stageForms[c] = c === 'D1' && !saved ? detail.value.team : saved
    if (c === 'D4') restoreD4Tools(saved)
  })
}, { deep: true, immediate: true })

/** 阶段状态：done=已完成(只读) / current=进行中(可编辑) / future=未开始(隐藏) */
function stageState(code: string): 'done' | 'current' | 'future' {
  const d = selected.value
  if (d?.st === '已闭环') return 'done'
  const cur = String(d?.stage || 'D1').toUpperCase()
  const ci = ALL_STAGES.indexOf(cur)
  const i = ALL_STAGES.indexOf(code)
  if (ci < 0) return 'future'
  if (i < ci) return 'done'
  if (i === ci) return 'current'
  return 'future'
}

/** 推进时保存的"当前阶段"内容（D4 返回 JSON，其余返回文本） */
function advanceContent(): string {
  const cur = String(selected.value?.stage || 'D1').toUpperCase()
  if (cur === 'D4') return serializeD4Tools()
  return stageForms[cur] ?? ''
}
function nextStageName(): string {
  const d = selected.value
  if (!d || !d.stage) return '推进阶段'
  if (d.st === '已闭环') return '已完成闭环'
  const idx = D8_STAGES.findIndex((s) => s.d === d.stage)
  if (idx < 0) return '推进阶段'
  const nxt = D8_STAGES[idx + 1]
  return nxt ? `保存并推进到 ${nxt.name}` : '保存并关闭 8D'
}
async function advanceCurrent() {
  const d = selected.value
  if (!d) return
  if (d.st === '已闭环') { ElMessage.info('已完成闭环'); return }
  try {
    await ncmApi.advanceStage(d.id, d.stage, advanceContent(), d.owner || '系统')
    ElMessage.success(`已推进 ${d.stage}`)
    await loadList()
    await loadDetail(d.id)
  } catch (e) {
    ElMessage.error('推进失败')
  }
}
function startVerify() {
  advanceCurrent()
}
/* ============ 审批 ============ */
const approvers = [
  { name: '质量经理', role: '8D 审核', status: 'pending' as const },
  { name: '厂长', role: '关闭批准', status: 'pending' as const },
]
async function onApprove(d: { decision: 'approve' | 'reject'; comment: string; sign?: string }) {
  const cur = selected.value
  if (!cur) return
  try {
    await ncmApi.approveStage(cur.id, {
      stageCode: cur.stage,
      approved: d.decision === 'approve',
      comment: d.comment,
      approver: (d.sign ? d.sign.split(' · ')[0] : '') || cur.owner || '审批人',
    })
    ElMessage.success(d.decision === 'approve' ? '8D 已审核通过' : '已驳回，退回责任人')
    await loadDetail(cur.id)
  } catch (e) {
    ElMessage.error('审批提交失败')
  }
}
</script>

<template>
  <div class="ncm-8d">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🛠️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 8D 报告列表 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>8D 整改报告列表</h3>
        <el-tag size="small" effect="plain" type="info">一键发起（不良 / SPC 报警 / 客诉）</el-tag>
        <div class="grow"></div>
        <el-button size="small" @click="loadList">刷新</el-button>
        <el-button type="primary" size="small" @click="openCreate8D">+ 发起 8D</el-button>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table
          :data="list" border size="small"
          highlight-current-row :current-row-key="selectedId" row-key="id"
          @row-click="selectRow"
        >
          <el-table-column prop="d8No" label="编号" width="130" />
          <el-table-column prop="issue" label="问题" min-width="130" />
          <el-table-column prop="src" label="来源" width="100" />
          <el-table-column label="严重度" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="sevType(row.sev)" size="small" effect="dark">{{ row.sev }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="stage" label="当前阶段" width="90" align="center" />
          <el-table-column prop="sla" label="SLA" width="90" />
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="stType(row.st)" size="small" effect="light">{{ row.st }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click.stop="selectRow(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 8D 详情 -->
    <div v-if="selected" class="qms-card">
      <div class="qms-card__header">
        <h3>8D 详情 · {{ selected.d8No }} {{ selected.issue }}</h3>
        <el-tag size="small" type="warning" effect="light">{{ selected.stage }} · {{ selected.st }}</el-tag>
        <div class="grow"></div>
        <el-tag v-if="sevNum(selected.sev) >= 7" size="small" type="danger" effect="dark">
          {{ selected.sev }} 可人工触发 CAPA
        </el-tag>
      </div>
      <div class="qms-card__body">
        <!-- D1-D8 步骤条 -->
        <div class="stepper">
          <div v-for="(s, i) in D8_STAGES" :key="s.d" class="step" :class="stepClass(i)">
            <div class="scirc">
              <span v-if="i < curIndex">✓</span>
              <span v-else>{{ s.d }}</span>
            </div>
            <span class="sname">{{ s.name }}</span>
            <span v-if="s.approval" class="approval-dot" title="需审批">审</span>
          </div>
        </div>

        <div class="meta-row">
          来源：{{ sourceLabel || selected.src || '—' }}
          <el-link
            v-if="detail.sourceRefId && (detail.source === 'SQM异常' || detail.source === '供应商异常')"
            type="primary" :underline="false" class="src-link"
            @click="goSource(detail.sourceRefId)"
          >溯源异常单</el-link>
          · 团队：{{ ncm8DTeam.join('、') }} · SLA：D3≤24h / D4-D5≤7天 / D6-D7≤30天
        </div>

        <!-- D1-D8 可视化流程面板（含各阶段负责人/计划/审批/证据） -->
        <EightDBoard v-if="boardData" :data="boardData" @select-stage="onBoardStage" />

        <!-- 按阶段推进的 8D 表单（当前阶段可编辑，已完成只读，未开始隐藏） -->
        <div class="form-grid">
          <div
            v-for="code in ALL_STAGES"
            v-show="stageState(code) !== 'future'"
            :key="code"
            class="form-row"
            :class="[stageState(code), { 'is-d4': code === 'D4' }]"
          >
            <label>
              {{ STAGE_TITLES[code] }}
              <span class="stage-tag" :class="stageState(code)">
                {{ stageState(code) === 'done' ? '已完成' : stageState(code) === 'current' ? '进行中' : '' }}
              </span>
            </label>

            <!-- D4 根因分析：current 用流程式向导；done 简化为入口提示（在底部报告区查看） -->
            <template v-if="code === 'D4'">
              <D4Wizard
                v-if="stageState(code) === 'current'"
                v-model:fishbone="fishboneData"
                v-model:fiveWhy="fiveWhyItems"
                :problem="selected?.issue"
              />
              <div v-else class="d4-summary">
                <el-icon class="d4-summary__icon"><i-ep-document /></el-icon>
                <div class="d4-summary__txt">
                  <div class="d4-summary__title">根因分析已完成</div>
                  <div class="d4-summary__desc">
                    共录入 {{ fishboneData.reduce((s, c) => s + c.causes.filter((x) => x.trim()).length, 0) }} 个可能原因
                    /
                    5Why 共 {{ fiveWhyItems.length }} 层
                    ／
                    <a class="d4-summary__link" @click="scrollToReport">↓ 查看根因分析报告</a>
                  </div>
                </div>
              </div>
            </template>

            <!-- 非 D4 阶段：纯文本 textarea -->
            <el-input
              v-else
              v-model="stageForms[code]"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 8 }"
              :readonly="stageState(code) !== 'current'"
              :placeholder="stageState(code) === 'current' ? '填写本阶段内容（含责任人与时间节点）' : '已完成，仅可查看'"
            />
          </div>
        </div>
        <div class="form-hint">
          提示：8D 按 D1→D8 顺序推进。当前仅「进行中」的阶段可编辑，填写后点击「推进阶段」保存并进入下一阶段；已完成的阶段只读展示。
        </div>

        <!-- 根因分析报告（分块 tab） -->
        <div ref="reportRef" class="report-block">
          <div class="report-head">
            <div class="report-title">根因分析报告</div>
            <div class="report-summary">
              <div class="kpi">
                <div class="kpi-label">根本原因</div>
                <div class="kpi-val root">{{ reportSummary.root }}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">可能原因数</div>
                <div class="kpi-val">{{ reportSummary.totalCauses }}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">涉及类别</div>
                <div class="kpi-val">{{ reportSummary.filledCats }} / 6</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">5Why 层数</div>
                <div class="kpi-val">{{ reportSummary.layers }}</div>
              </div>
            </div>
          </div>

          <div class="report-tabs">
            <button :class="['tab', { on: reportTab === 1 }]" @click="reportTab = 1">
              ① 鱼骨图
            </button>
            <button :class="['tab', { on: reportTab === 2 }]" @click="reportTab = 2">
              ② 5Why 链
            </button>
            <button :class="['tab', { on: reportTab === 3 }]" @click="reportTab = 3">
              ③ 原始数据
            </button>
          </div>

          <div class="report-body">
            <div v-if="reportTab === 1" class="tab-pane">
              <FishboneDiagram :data="fishboneData" :problem="selected?.issue" mode="view" />
            </div>
            <div v-else-if="reportTab === 2" class="tab-pane">
              <FiveWhyEditor :items="fiveWhyItems" :problem="selected?.issue" mode="view" />
            </div>
            <div v-else class="tab-pane raw-pane">
              <table class="raw-table">
                <thead>
                  <tr><th style="width: 100px">类别</th><th>可能原因（5M1E）</th></tr>
                </thead>
                <tbody>
                  <tr v-for="c in fishboneData" :key="c.category">
                    <td><span class="cat-pill" :style="{ background: ({人:'#5b8def',机:'#1e4d8b',料:'#16a085',法:'#d4a017',环:'#8e44ad',测:'#c0392b'})[c.category] }">{{ c.category }}</span></td>
                    <td>
                      <span v-if="!c.causes.length" class="muted">（未填写）</span>
                      <span v-else class="cause-list">
                        <span v-for="(cs, i) in c.causes.filter((x) => x.trim())" :key="i" class="cause-item">{{ cs }}</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="fiveWhyItems.length" class="raw-why">
                <h4>5Why 追问链</h4>
                <div v-for="(w, i) in fiveWhyItems" :key="i" class="raw-why-row">
                  <span class="raw-why-num">第 {{ i + 1 }} 层</span>
                  <span class="raw-why-q">为什么？{{ w.why || '—' }}</span>
                  <span class="raw-why-a">因为：{{ w.answer || '—' }}</span>
                </div>
                <div v-if="reportSummary.root" class="raw-root">根本原因：{{ reportSummary.root }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 规则提示 -->
        <el-alert
          type="warning" :closable="false" show-icon style="margin: 14px 0 6px"
          title="严重度 S≥7 或同产品/问题 30 天内重复 → 人工手动触发 CAPA；效果验证期 30 天，同类复发标记「验证不通过」退回 D4；完整报告归档保留 ≥15 年。"
        />

        <!-- 操作按钮 -->
        <div class="btn-bar">
          <el-button type="primary" :disabled="!selected || isClosed" @click="advanceCurrent">{{ nextStageName() }}</el-button>
          <el-button
            v-if="!linkedCapa.length" type="danger" plain
            :disabled="sevNum(selected.sev) < 7" @click="openCapa"
          >
            人工手动触发 CAPA
          </el-button>
          <el-button v-else type="success" plain disabled>
            已关联 CAPA：{{ linkedCapa[0].id }}
          </el-button>
          <el-button @click="startVerify">启动效果验证</el-button>
        </div>
      </div>
    </div>

    <!-- 关联 CAPA 列表 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>关联 CAPA（纠正预防措施）</h3>
        <el-tag size="small" type="info" effect="plain">不重复创建</el-tag>
        <div class="grow"></div>
        <span class="meta">触发方式</span>
        <el-radio-group v-model="capaAuto" size="small">
          <el-radio :value="false">手动（默认）</el-radio>
          <el-radio :value="true">自动</el-radio>
        </el-radio-group>
        <el-button type="danger" size="small" plain @click="openCapa">+ 手动触发 CAPA</el-button>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="capaList" border size="small">
          <el-table-column prop="id" label="CAPA 编号" width="140" />
          <el-table-column prop="from8D" label="关联 8D" width="130" />
          <el-table-column label="触发条件" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" type="danger" effect="plain">{{ row.trigger }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip />
          <el-table-column prop="owner" label="责任人" width="90" />
          <el-table-column prop="due" label="目标日期" width="110" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="capaStType(row.st)" size="small">{{ row.st }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- D6-D7 实施与预防（同样遵循阶段门控：当前阶段可编辑） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>D6-D7 实施与预防</h3>
        <el-tag size="small" type="info" effect="plain">待 D5 审批后进行</el-tag>
      </div>
      <div class="qms-card__body">
        <div class="form-grid">
          <div class="form-row" :class="stageState('D6')">
            <label>
              D6 措施实施记录 + 证据附件（强制）<span class="req">*</span>
              <span class="stage-tag" :class="stageState('D6')">
                {{ stageState('D6') === 'done' ? '已完成' : stageState('D6') === 'current' ? '进行中' : '' }}
              </span>
            </label>
            <el-input
              v-model="stageForms.D6" type="textarea" :rows="2"
              :readonly="stageState('D6') !== 'current'"
              placeholder="实施情况、更换零部件、验收结果..."
            />
            <el-upload action="#" :auto-upload="false" :limit="3" style="margin-top: 6px">
              <el-button size="small">上传证据附件</el-button>
            </el-upload>
          </div>
          <div class="form-row" :class="stageState('D7')">
            <label>
              D7 预防措施 + 系统性改进评估（需审批）
              <span class="stage-tag" :class="stageState('D7')">
                {{ stageState('D7') === 'done' ? '已完成' : stageState('D7') === 'current' ? '进行中' : '' }}
              </span>
            </label>
            <el-input
              v-model="stageForms.D7" type="textarea" :rows="2"
              :readonly="stageState('D7') !== 'current'"
              placeholder="修订 SOP / 保养计划 / 防错装置..."
            />
          </div>
        </div>
        <el-alert
          type="info" :closable="false" show-icon style="margin-top: 10px"
          title="D6 实施证据为空阻止提交；D7 需质量主管审批；系统记录各阶段实际耗时并与 SLA 对比；节假日不计入 SLA。"
        />
      </div>
    </div>

    <!-- 审批 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>整改审批</h3></div>
      <div class="qms-card__body">
        <ApprovalPanel
          :title="`${selected?.id} 审核`" :approvers="approvers"
          sla-deadline="3天" @approve="onApprove"
        />
      </div>
    </div>

    <!-- 发起 8D 弹窗 -->
    <el-dialog v-model="create8DVisible" title="发起 8D 整改" width="520px">
      <el-alert
        type="info" :closable="false" show-icon style="margin-bottom: 14px"
        title="系统自动将不良关键信息预填至 D2 阶段，指定发起人为 D1 团队负责人候选。已关联 8D 的问题将被阻止重复发起。"
      />
      <el-divider content-position="left">D0 前评估（快速整改分流 · SR-PTL-013）</el-divider>
      <div class="d0-grid">
        <el-form-item label="影响范围">
          <el-select v-model="new8D.d0.scope" style="width: 100%">
            <el-option label="小范围" value="小范围" /><el-option label="大范围" value="大范围" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户投诉等级">
          <el-select v-model="new8D.d0.custLevel" style="width: 100%">
            <el-option label="一般" value="一般" /><el-option label="严重" value="严重" />
          </el-select>
        </el-form-item>
        <el-form-item label="涉及安全">
          <el-radio-group v-model="new8D.d0.safety">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="30天内重复">
          <el-radio-group v-model="new8D.d0.repeat">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 14px" :title="`分流建议：${d0Suggestion().text}`" />
      <el-form label-width="92px">
        <el-form-item label="问题来源">
          <el-select v-model="new8D.src" style="width: 100%">
            <el-option label="不良记录" value="不良记录" />
            <el-option label="SPC 报警" value="SPC报警" />
            <el-option label="客诉" value="客诉" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题简述" required>
          <el-input v-model="new8D.issue" type="textarea" :rows="3" placeholder="描述重复发生 / 严重的不良问题..." />
        </el-form-item>
        <el-form-item label="严重度 S">
          <el-input-number v-model="new8D.sev" :min="1" :max="10" />
          <span class="tip">S≥7 可后续人工触发 CAPA</span>
        </el-form-item>
        <el-form-item label="发起人">
          <el-input v-model="new8D.owner" placeholder="D1 团队负责人候选（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="create8DVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreate8D">发起 8D</el-button>
      </template>
    </el-dialog>

    <!-- 手动触发 CAPA 弹窗 -->
    <el-dialog v-model="capaVisible" title="人工手动触发 CAPA" width="520px">
      <el-alert
        type="warning" :closable="false" show-icon style="margin-bottom: 14px"
        :title="`关联 8D：${selected?.id}（${selected?.sev}）。满足 S≥7 或 30 天重复条件方可创建，且不重复创建。`"
      />
      <el-form label-width="92px">
        <el-form-item label="触发条件">
          <el-radio-group v-model="newCapa.trigger">
            <el-radio label="S≥7">FMEA 关联 S≥7</el-radio>
            <el-radio label="30天重复">同产品/问题 30 天重复</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="CAPA 原因" required>
          <el-input v-model="newCapa.reason" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="责任人" required>
          <el-input v-model="newCapa.owner" placeholder="指定 CAPA 责任人" />
        </el-form-item>
        <el-form-item label="目标日期" required>
          <el-date-picker v-model="newCapa.due" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="capaVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmCapa">创建并关联</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.ncm-8d { display: flex; flex-direction: column; gap: 14px; }

.qms-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  .grow { flex: 1; }
}

/* D1-D8 步骤条 */
.stepper {
  display: flex;
  flex-wrap: wrap;
  margin: 4px 0 16px;
}
.step {
  flex: 1;
  min-width: 92px;
  text-align: center;
  position: relative;
  font-size: 11.5px;
  color: #5a6b7e;
  padding: 6px 4px;
  z-index: 1;

  .scirc {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #eef1f5;
    color: #5a6b7e;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    margin-bottom: 5px;
    font-size: 12px;
    border: 2px solid transparent;
    transition: 0.2s;
  }
  &.done .scirc { background: #2f7d32; color: #fff; }
  &.cur .scirc {
    background: #1e4d8b; color: #fff;
    border-color: #bcd4ee;
    box-shadow: 0 0 0 4px #eef4fb;
  }
  &.cur .sname { color: #1e4d8b; font-weight: 700; }

  &::after {
    content: '';
    position: absolute;
    top: 22px;
    left: 50%;
    width: 100%;
    height: 2px;
    background: #eef1f5;
    z-index: -1;
  }
  &:last-child::after { display: none; }
  &.done::after { background: #2f7d32; }

  .sname { display: block; }
  .approval-dot {
    display: inline-block;
    margin-top: 2px;
    font-size: 10px;
    color: #d4a017;
    background: #fff7e0;
    border-radius: 8px;
    padding: 0 5px;
  }
}

.meta-row {
  font-size: 12px;
  color: #5a6b7e;
  background: #f6f9fd;
  border: 1px solid #e8eff7;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 18px;
}
.form-row {
  label {
    display: block;
    font-size: 12.5px;
    color: #5a6b7e;
    margin-bottom: 5px;
    .req { color: #c0392b; margin-left: 2px; }
  }
  &.current {
    label { color: #1e4d8b; font-weight: 600; }
  }
  &.done {
    opacity: 0.92;
    :deep(.el-textarea__inner) {
      background: #f6f9fd;
      color: #5a6b7e;
    }
  }
  &.is-d4 {
    grid-column: 1 / -1;
    background: #f4f8ff;
    border: 1px solid #dbe7f7;
    border-radius: 8px;
    padding: 10px 14px;
  }
}
.stage-tag {
  display: inline-block;
  margin-left: 8px;
  font-size: 10px;
  padding: 0 6px;
  border-radius: 8px;
  vertical-align: middle;
  &.current { color: #1e4d8b; background: #e3efff; }
  &.done { color: #2e7d32; background: #e6f4ea; }
}
.form-hint {
  font-size: 12px;
  color: #7a8aa0;
  background: #f6f9fd;
  border: 1px dashed #d6e2f0;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 12px 0 4px;
}

.chart-grid {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  &--2 { grid-template-columns: 1fr 1fr; }
}
.d4-tools {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  &.readonly { opacity: 0.92; }
  .sub-card { margin: 0; }
  .sub-card__title { margin-bottom: 8px; }
}
.d4-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f4f8ff;
  border: 1px dashed #1e4d8b;
  border-radius: 6px;
  padding: 10px 14px;
  &__icon { color: #1e4d8b; font-size: 22px; }
  &__title { font-size: 13px; font-weight: 600; color: #1e4d8b; }
  &__desc { font-size: 12px; color: #5a6b7e; margin-top: 2px; }
  &__link { color: #1e4d8b; cursor: pointer; text-decoration: underline; margin-left: 4px; }
}

/* 8D 根因分析报告块 */
.report-block {
  margin-top: 16px;
  border: 1px solid #dbe7f7;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.report-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #1e4d8b, #2c5da9);
  color: #fff;
  flex-wrap: wrap;
}
.report-title { font-size: 14px; font-weight: 600; }
.report-summary { display: flex; gap: 12px; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
.kpi {
  background: rgba(255,255,255,0.12);
  border-radius: 6px;
  padding: 4px 10px;
  min-width: 90px;
  &-label { font-size: 10px; opacity: 0.8; }
  &-val { font-size: 13px; font-weight: 600; word-break: break-all; }
  &-val.root { color: #ffd54f; }
}
.report-tabs {
  display: flex;
  background: #f4f8ff;
  border-bottom: 1px solid #dbe7f7;
  .tab {
    flex: 0 0 auto;
    border: none;
    background: transparent;
    color: #5a6b7e;
    font-size: 12.5px;
    padding: 8px 16px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
    &:hover { color: #1e4d8b; }
    &.on {
      color: #1e4d8b;
      background: #fff;
      border-bottom-color: #1e4d8b;
      font-weight: 600;
    }
  }
}
.report-body { padding: 12px 14px; }
.tab-pane { min-height: 60px; }
.raw-pane { font-size: 12px; }
.raw-table {
  width: 100%;
  border-collapse: collapse;
  th, td { padding: 6px 8px; border-bottom: 1px solid #eef3fa; text-align: left; vertical-align: top; }
  th { background: #f4f8ff; color: #1e4d8b; font-weight: 600; }
}
.cat-pill {
  display: inline-block;
  width: 24px; height: 24px; line-height: 24px;
  text-align: center; color: #fff; border-radius: 4px;
  font-size: 12px; font-weight: 600;
}
.cause-list { display: flex; flex-wrap: wrap; gap: 4px; }
.cause-item {
  background: #f4f8ff;
  color: #1e4d8b;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11.5px;
}
.muted { color: #b0bac4; font-style: italic; }
.raw-why {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed #dbe7f7;
  h4 { font-size: 12.5px; color: #1e4d8b; margin-bottom: 6px; }
}
.raw-why-row {
  display: grid;
  grid-template-columns: 50px 1fr 1fr;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;
  &-num { color: #1e4d8b; font-weight: 600; }
  &-q { color: #1e4d8b; }
  &-a { color: #16a085; }
}
.raw-root {
  margin-top: 8px;
  background: #c0392b;
  color: #fff;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
}
.sub-card {
  border: 1px solid #e8eff7;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fafcff;
  .sub-card__title {
    font-size: 13px;
    font-weight: 600;
    color: #1e4d8b;
    margin-bottom: 10px;
  }
}

.btn-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.tip { font-size: 11.5px; color: #8a97a6; margin-left: 10px; }

.d0-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
  margin-bottom: 6px;
}

@media (max-width: 1100px) {
  .form-grid, .chart-grid--2 { grid-template-columns: 1fr; }
}
</style>
