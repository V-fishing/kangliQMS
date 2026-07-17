<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { capaList } from '@/mock/sqm'
import type { Capa, CapaStage } from '@/types/sqm'

const authStore = useAuthStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · CAPA 纠正与预防措施',
  desc: '纠正措施(CA)与预防措施(PA)双线跟踪，效果验证后关闭归档',
}

// 演示当前时钟（用于超期计算）
const TODAY = '2025-02-05'

const list = ref<Capa[]>([...capaList])

// 默认手动触发（SR-PTL-019）：用户点击触发，不自动创建重复 CAPA
const capaAuto = ref(false)

// 筛选
const fStatus = ref('')
const fType = ref('')
const fSearch = ref('')
const filtered = computed(() => {
  const st = fStatus.value
  const tp = fType.value
  const kw = fSearch.value.trim().toLowerCase()
  return list.value.filter((c) => {
    if (st && c.status !== st) return false
    if (tp && c.type !== tp) return false
    if (kw && !`${c.id} ${c.title} ${c.problem}`.toLowerCase().includes(kw)) return false
    return true
  })
})

// 统计
const total = computed(() => list.value.length)
const doing = computed(() => list.value.filter((c) => ['原因分析', '措施制定', '实施验证', '效果确认'].includes(c.status)).length)
const closed = computed(() => list.value.filter((c) => c.status === '已关闭').length)
const overdue = computed(() => list.value.filter((c) => c.status !== '已关闭' && c.dueDate < TODAY).length)

function typePill(t: Capa['type']) {
  return t === '系统改进' ? 'r' : t === '纠正措施' ? 'b' : 'y'
}
function statusPill(s: Capa['status']) {
  return { 待启动: 'y', 原因分析: 'b', 措施制定: 'b', 实施验证: 'p', 效果确认: 'p', 已关闭: 'g' }[s] || 'gray'
}
function stageColor(st: CapaStage['status']) {
  return st === 'done' ? '#10b981' : st === 'doing' ? '#f59e0b' : '#e5e7eb'
}

// 人工手动触发 CAPA（默认方式，SR-PTL-019）
const createVisible = ref(false)
const newCapa = reactive({
  type: '纠正措施' as Capa['type'], title: '', problem: '', rootcause: '', owner: '', dueDate: '', source: '8D手动触发', sourceId: '',
})
function openCreate() {
  newCapa.type = '纠正措施'; newCapa.title = ''; newCapa.problem = ''; newCapa.rootcause = ''
  newCapa.owner = ''; newCapa.dueDate = ''; newCapa.source = '8D手动触发'; newCapa.sourceId = ''
  createVisible.value = true
}
function submitCreate() {
  if (!newCapa.title.trim() || !newCapa.problem.trim() || !newCapa.owner.trim()) {
    ElMessage.warning('请填写标题、问题与责任人')
    return
  }
  const id = `CAPA-2025-${String(list.value.length + 1).padStart(3, '0')}`
  list.value.unshift({
    id, type: newCapa.type, source: newCapa.source, sourceId: newCapa.sourceId || undefined,
    title: newCapa.title.trim(), problem: newCapa.problem.trim(), rootcause: newCapa.rootcause.trim(),
    corrective: { action: '—', owner: newCapa.owner, due: newCapa.dueDate || '—', status: '待执行' },
    preventive: { action: '—', owner: newCapa.owner, due: newCapa.dueDate || '—', status: '待执行' },
    owner: newCapa.owner, dueDate: newCapa.dueDate || '—', status: '原因分析', effResult: null,
    stages: [
      { key: 'c1', name: '识别与立项', status: 'done', date: TODAY, operator: authStore.currentRole?.name || '质量' },
      { key: 'c2', name: '根本原因分析', status: 'doing', operator: newCapa.owner, approval: false },
      { key: 'c3', name: '纠正措施(CA)', status: 'pending', approval: false },
      { key: 'c4', name: '预防措施(PA)', status: 'pending', approval: false },
      { key: 'c5', name: '实施效果验证', status: 'pending', approval: true },
      { key: 'c6', name: '关闭归档', status: 'pending', approval: true },
    ],
  })
  createVisible.value = false
  ElMessage.success(`CAPA ${id} 已手动创建（双盲线 CA/PA 跟踪）`)
}

// 详情
const detailVisible = ref(false)
const cur = ref<Capa | null>(null)
function showDetail(c: Capa) {
  cur.value = c
  detailVisible.value = true
}

function mapStageStatus(name: string): Capa['status'] {
  if (name.includes('识别')) return '原因分析'
  if (name.includes('根因')) return '原因分析'
  if (name.includes('纠正措施')) return '措施制定'
  if (name.includes('预防')) return '措施制定'
  if (name.includes('效果')) return '效果确认'
  return '实施验证'
}
function advance(c: Capa) {
  const idx = c.stages.findIndex((s) => s.status !== 'done')
  if (idx >= 0) {
    c.stages[idx].status = 'done'
    c.stages[idx].date = TODAY
    c.stages[idx].operator = authStore.currentRole?.name || '质量'
    if (idx + 1 < c.stages.length) c.stages[idx + 1].status = 'doing'
  }
  if (c.stages.every((s) => s.status === 'done')) {
    c.status = '已关闭'
    c.closeDate = TODAY
    c.closeAuditor = authStore.currentRole?.name || '质量'
    c.archived = true
    ElMessage.success(`${c.id} 已关闭归档（只读，保留≥15年）`)
  } else {
    const next = c.stages.find((s) => s.status === 'doing')
    if (next) { c.status = mapStageStatus(next.name) }
    ElMessage.success(`${c.id} 推进至：${next?.name}`)
  }
}
</script>

<template>
  <div class="sqm-capa">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🛡️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 触发方式（默认手动，SR-PTL-019） -->
    <el-alert
      :type="capaAuto ? 'warning' : 'success'" :closable="false" show-icon
      :title="capaAuto ? 'CAPA 触发方式：自动（满足条件自动创建并关联来源单据）' : 'CAPA 触发方式：手动（默认）——由用户在 8D/客诉/异常中点击触发，同一来源不重复创建'"
    />

    <!-- KPI -->
    <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr)">
      <div class="kpi"><div class="val">{{ total }}</div><div class="lbl">CAPA 总数</div></div>
      <div class="kpi"><div class="val" style="color: #1e4d8b">{{ doing }}</div><div class="lbl">进行中</div></div>
      <div class="kpi"><div class="val" style="color: #2f7d32">{{ closed }}</div><div class="lbl">已关闭</div></div>
      <div class="kpi"><div class="val" style="color: #c0392b">{{ overdue }}</div><div class="lbl">超期</div></div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <select v-model="fType" class="qms-select">
        <option value="">全部类型</option><option>纠正措施</option><option>预防措施</option><option>系统改进</option>
      </select>
      <select v-model="fStatus" class="qms-select">
        <option value="">全部状态</option><option>待启动</option><option>原因分析</option><option>措施制定</option><option>实施验证</option><option>效果确认</option><option>已关闭</option>
      </select>
      <input v-model="fSearch" type="text" class="qms-input" placeholder="搜索 CAPA 编号或问题..." />
      <span class="sp" />
      <button class="btn pri" @click="openCreate">+ 手动触发 CAPA</button>
    </div>

    <!-- CAPA 列表 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>CAPA 纠正与预防措施清单</h3>
        </div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <table class="tbl" style="min-width: 1040px">
          <thead>
            <tr>
              <th>CAPA编号</th><th>类型</th><th>触发来源</th><th>标题</th><th>责任人</th>
              <th>截止日期</th><th>效果验证</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filtered" :key="c.id">
              <td>{{ c.id }}</td>
              <td><span class="qms-pill" :class="typePill(c.type)">{{ c.type }}</span></td>
              <td>{{ c.source }}<span v-if="c.sourceId" class="meta"> · {{ c.sourceId }}</span></td>
              <td><strong>{{ c.title }}</strong></td>
              <td>{{ c.owner }}</td>
              <td :class="c.dueDate < TODAY && c.status !== '已关闭' ? 'od' : 'muted'">{{ c.dueDate }}</td>
              <td>
                <span v-if="c.status === '已关闭'" class="qms-pill g">已闭环</span>
                <span v-else-if="c.effResult === '通过'" class="qms-pill g">验证通过</span>
                <span v-else-if="c.effResult === '不通过'" class="qms-pill r">验证不通过</span>
                <span v-else class="qms-pill y">待验证</span>
              </td>
              <td><span class="qms-pill" :class="statusPill(c.status)">{{ c.status }}</span></td>
              <td><button class="btn sm" @click="showDetail(c)">详情</button></td>
            </tr>
            <tr v-if="filtered.length === 0"><td colspan="9" class="muted" style="text-align:center;padding:20px">无匹配数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`CAPA 详情 · ${cur?.id || ''}`" width="720px">
      <div v-if="cur" class="capa-detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="类型"><span class="qms-pill" :class="typePill(cur.type)">{{ cur.type }}</span></el-descriptions-item>
          <el-descriptions-item label="状态"><span class="qms-pill" :class="statusPill(cur.status)">{{ cur.status }}</span></el-descriptions-item>
          <el-descriptions-item label="触发来源">{{ cur.source }}<span v-if="cur.sourceId"> · {{ cur.sourceId }}</span></el-descriptions-item>
          <el-descriptions-item label="责任人">{{ cur.owner }}</el-descriptions-item>
          <el-descriptions-item label="截止日期">{{ cur.dueDate }}</el-descriptions-item>
          <el-descriptions-item label="效果验证期">{{ cur.effVerifyDate || '—' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin:16px 0 8px">问题描述</h4>
        <div class="box">{{ cur.problem }}</div>

        <h4 style="margin:14px 0 8px">根本原因分析（5Why / 鱼骨图）</h4>
        <div class="box">{{ cur.rootcause }}</div>

        <!-- CA / PA 双线 -->
        <h4 style="margin:14px 0 8px">纠正措施(CA) 与 预防措施(PA) 双线跟踪</h4>
        <div class="ca-pa">
          <div class="capa-line">
            <div class="capa-line__h">纠正措施 CA <span class="qms-pill" :class="cur.corrective.status === '已完成' ? 'g' : cur.corrective.status === '执行中' ? 'b' : 'y'">{{ cur.corrective.status }}</span></div>
            <div class="kv"><div class="k">措施</div><div>{{ cur.corrective.action }}</div></div>
            <div class="kv"><div class="k">责任人</div><div>{{ cur.corrective.owner }}</div></div>
            <div class="kv"><div class="k">期限</div><div>{{ cur.corrective.due }}</div></div>
            <div class="kv"><div class="k">证据</div><div>{{ cur.corrective.evidence || '—' }}</div></div>
          </div>
          <div class="capa-line">
            <div class="capa-line__h">预防措施 PA <span class="qms-pill" :class="cur.preventive.status === '已完成' ? 'g' : cur.preventive.status === '执行中' ? 'b' : 'y'">{{ cur.preventive.status }}</span></div>
            <div class="kv"><div class="k">措施</div><div>{{ cur.preventive.action }}</div></div>
            <div class="kv"><div class="k">责任人</div><div>{{ cur.preventive.owner }}</div></div>
            <div class="kv"><div class="k">期限</div><div>{{ cur.preventive.due }}</div></div>
            <div class="kv"><div class="k">证据</div><div>{{ cur.preventive.evidence || '—' }}</div></div>
          </div>
        </div>

        <!-- 阶段 stepper -->
        <h4 style="margin:14px 0 8px">CAPA 阶段流程</h4>
        <div class="stepper">
          <template v-for="(st, i) in cur.stages" :key="st.key">
            <div class="step">
              <div class="scirc" :style="{ background: stageColor(st.status), color: '#fff' }">{{ st.status === 'done' ? '✓' : i + 1 }}</div>
              <div class="sname">{{ st.name }}<span v-if="st.approval" class="need">需审批</span></div>
              <div class="smeta" v-if="st.date">{{ st.date }}</div>
              <div class="smeta" v-if="st.operator">{{ st.operator }}</div>
            </div>
            <div v-if="i < cur.stages.length - 1" class="sline" />
          </template>
        </div>

        <div v-if="cur.status !== '已关闭'" style="margin-top:14px">
          <button class="btn pri" @click="advance(cur)">推进至下一阶段</button>
          <span class="meta" style="margin-left:10px">关闭前需完成：CA/PA 实施 + 30天效果验证通过 + 审批签字</span>
        </div>
        <div v-else class="archived-flag">已归档（只读） · 闭环人：{{ cur.closeAuditor }} · 闭环时间：{{ cur.closeDate }}</div>
      </div>
      <template #footer>
        <button class="btn ghost" @click="detailVisible = false">关闭</button>
      </template>
    </el-dialog>

    <!-- 手动触发弹窗 -->
    <el-dialog v-model="createVisible" title="手动触发 CAPA" width="560px">
      <div class="form-row">
        <label>CAPA 类型</label>
        <select v-model="newCapa.type" class="qms-select">
          <option>纠正措施</option><option>预防措施</option><option>系统改进</option>
        </select>
        <label>触发来源</label>
        <select v-model="newCapa.source" class="qms-select">
          <option>8D手动触发</option><option>CAR升级（SR-CAR-025）</option><option>客诉</option><option>手动</option>
        </select>
        <label>来源单据编号（选填）</label>
        <input v-model="newCapa.sourceId" type="text" class="qms-input" placeholder="如 8D-2026-008 / ABN-2024-156" />
        <label>标题</label>
        <input v-model="newCapa.title" type="text" class="qms-input" placeholder="简述 CAPA 主题" />
        <label>问题描述</label>
        <textarea v-model="newCapa.problem" rows="3" class="qms-input" placeholder="描述核心问题..." />
        <label>根本原因分析（5Why / 鱼骨图）</label>
        <textarea v-model="newCapa.rootcause" rows="3" class="qms-input" placeholder="填写根因分析..." />
        <label>责任人</label>
        <input v-model="newCapa.owner" type="text" class="qms-input" placeholder="责任人" />
        <label>目标完成日期</label>
        <input v-model="newCapa.dueDate" type="date" class="qms-input" />
      </div>
      <template #footer>
        <button class="btn pri" @click="submitCreate">确认触发</button>
        <button class="btn ghost" @click="createVisible = false">取消</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-capa { display: flex; flex-direction: column; gap: 14px; }
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; .sp { flex: 1 1 auto; } }
.qms-select, .qms-input {
  height: 32px; border: 1px solid var(--line, #d8dee6); border-radius: 6px; padding: 0 10px;
  font-size: 13px; background: #fff; color: #1f2d3d;
}
.qms-input { min-width: 200px; }
textarea.qms-input { height: auto; padding: 8px 10px; resize: vertical; }
.kpi-row { display: grid; gap: 14px; }
.kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center;
  .val { font-size: 24px; font-weight: 700; color: #1e4d8b; }
  .lbl { font-size: 12px; color: #6b7785; margin-top: 4px; }
}
.box { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.6; color: #2c3a47; }
.ca-pa { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.capa-line { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafbfc;
  .capa-line__h { font-weight: 600; font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
}
.kv { display: grid; grid-template-columns: 64px 1fr; gap: 4px 10px; font-size: 13px; }
.kv .k { color: #6b7785; }
.stepper { display: flex; align-items: flex-start; flex-wrap: wrap; }
.step { display: flex; flex-direction: column; align-items: center; width: 96px; flex-shrink: 0; }
.scirc { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.sname { font-size: 11px; color: #44515f; margin-top: 6px; text-align: center; }
.need { display: inline-block; font-size: 9px; color: #c0392b; background: #fdecea; border-radius: 8px; padding: 0 4px; margin-left: 4px; }
.smeta { font-size: 10px; color: #8a94a6; }
.sline { flex: 1; border-top: 2px dashed #d1d5db; margin-top: 17px; min-width: 12px; }
.archived-flag { margin-top: 12px; background: #eef2f7; border: 1px solid #dfe6ee; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #44515f; }
.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 13px; color: #44515f; margin-top: 6px; }
.btn {
  border: 1px solid #e1e8f0; background: #fff; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: 0.15s;
  &.sm { padding: 3px 8px; }
  &.pri { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
  &.ghost { background: #fff; color: #5a6b7e; }
  &:hover { filter: brightness(0.96); }
}
.muted { color: #8a94a6; }
.od { color: #c0392b; font-weight: 600; }
.meta { color: #8a94a6; font-size: 12px; }
</style>
