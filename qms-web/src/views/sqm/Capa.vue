<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { sqmApi } from '@/api'
import type { Capa, CapaStage } from '@/types/sqm'

const authStore = useAuthStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · CAPA 纠正与预防措施',
  desc: '纠正措施(CA)与预防措施(PA)双线跟踪，效果验证后关闭归档',
}

// 当前时钟（用于超期计算）
const TODAY = new Date().toISOString().slice(0, 10)

// CAPA 阶段定义（与后端 progress 0~100 对应，6 个里程碑）
const CAPA_STAGE_NAMES = ['识别与立项', '根本原因分析', '纠正措施(CA)', '预防措施(PA)', '实施效果验证', '关闭归档']
/** 依据后端 progress/status 派生前端阶段条（后端未单独存阶段，故前端合成） */
function deriveStages(progress: number, status: string): CapaStage[] {
  const done = status === '已关闭' ? 6 : Math.min(6, Math.round((progress || 0) / 100 * 6))
  return CAPA_STAGE_NAMES.map((name, i) => ({
    key: `c${i + 1}`,
    name,
    status: i < done ? 'done' : i === done ? 'doing' : 'pending',
    approval: i >= 4,
  } as CapaStage))
}

// 调用真实接口加载 CAPA 列表
const list = ref<Capa[]>([])
async function loadData() {
  try {
    const raw = await sqmApi.getCapaList()
    list.value = raw.map((c) => ({ ...c, stages: deriveStages(c.progress || 0, c.status) }))
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}
onMounted(loadData)

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
async function submitCreate() {
  if (!newCapa.title.trim() || !newCapa.problem.trim() || !newCapa.owner.trim()) {
    ElMessage.warning('请填写标题、问题与责任人')
    return
  }
  try {
    await sqmApi.createCapa({
      capaNo: newCapa.title.trim(),
      capaType: newCapa.type,
      issue: newCapa.problem.trim(),
      rootcause: newCapa.rootcause.trim(),
      owner: newCapa.owner,
      dueDate: newCapa.dueDate || undefined,
      triggerType: newCapa.source,
      abnormalId: newCapa.sourceId || undefined,
    })
    createVisible.value = false
    ElMessage.success(`CAPA ${newCapa.title.trim()} 已创建（双盲线 CA/PA 跟踪）`)
    await loadData()
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  }
}

// 详情
const detailVisible = ref(false)
const cur = ref<Capa | null>(null)
function showDetail(c: Capa) {
  cur.value = c
  detailVisible.value = true
}

async function advance(c: Capa) {
  const done = Math.min(6, Math.round((c.progress || 0) / 100 * 6))
  if (done >= 6) return
  const nextDone = done + 1
  const nextProgress = Math.round(nextDone / 6 * 100)
  try {
    if (nextDone >= 6) {
      await sqmApi.closeCapa(c.id)
      ElMessage.success(`${c.id} 已关闭归档（只读，保留≥15年）`)
    } else {
      await sqmApi.updateCapaProgress(c.id, nextProgress)
      ElMessage.success(`${c.id} 推进至：${CAPA_STAGE_NAMES[nextDone - 1]}`)
    }
    // 直接突变 cur 对象的 progress / stages,弹窗立即反映（不依赖 loadData 的异步引用找匹配）
    c.progress = nextProgress
    c.stages = deriveStages(nextProgress, c.status)
    loadData()  // 后台异步刷新列表（不影响 UI 即时反馈）
  } catch (e) {
    // 错误已由 request 拦截器统一提示
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

    <!-- 工具栏已整合到表卡片 header -->


    <!-- CAPA 列表（表卡片 header 整合筛选 + 类型 seg，统 FMEA 设计） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>CAPA 纠正与预防措施清单</h3>
        <div class="seg">
          <button :class="['seg-btn', { on: fType === '' }]" @click="fType = ''">全部类型</button>
          <button :class="['seg-btn', { on: fType === '纠正措施' }]" @click="fType = '纠正措施'">纠正措施</button>
          <button :class="['seg-btn', { on: fType === '预防措施' }]" @click="fType = '预防措施'">预防措施</button>
        </div>
        <div class="grow"></div>
        <input v-model="fSearch" type="text" class="qms-input" placeholder="搜索 CAPA 编号..." style="width:160px" />
        <select v-model="fStatus" class="qms-select" style="width:110px">
          <option value="">全部状态</option><option>待启动</option><option>实施中</option><option>待审批</option><option>已验证</option><option>已关闭</option>
        </select>
        <button class="btn pri sm" @click="openCreate">+ 手动触发 CAPA</button>
      </div>
      <div class="qms-card__body sticky-wrap">
        <table class="tbl" style="min-width: 1040px">
          <thead>
            <tr>
              <th>CAPA编号</th><th>类型</th><th>触发来源</th><th>标题</th><th>责任人</th>
              <th>截止日期</th><th>效果验证</th><th>状态</th>
              <th class="col-fixed">操作</th>
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
              <td class="col-fixed"><button class="btn sm" @click="showDetail(c)">详情</button></td>
            </tr>
            <tr v-if="filtered.length === 0"><td colspan="9" class="muted" style="text-align:center;padding:20px">无匹配数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`CAPA 详情 · ${cur?.id || ''}`" width="720px">
      <div v-if="cur" class="capa-detail">
        <!-- TODO：功能流程未定，具体待实现 -->
        <div class="capa-placeholder">
          <div class="capa-placeholder__icon">🚧</div>
          <div class="capa-placeholder__body">
            <div class="capa-placeholder__title">CAPA 阶段流程未定，具体待实现</div>
            <div class="capa-placeholder__desc">
              当前仅支持纯数字进度推进；真正的 6 阶段门控
              （识别与立项→根因分析→CA→PA→效果验证→关闭归档）尚在规划中，
              后续将参照 8D 的 <code>qms_capa_stage</code> 表实现阶段内容存储与强制审核。
            </div>
          </div>
        </div>
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

/* 原生表格"操作"列右固定（与 el-table fixed="right" 等效） */
.sticky-wrap { overflow-x: auto; padding: 0; }
.sticky-wrap .tbl th.col-fixed,
.sticky-wrap .tbl td.col-fixed {
  position: sticky; right: 0; z-index: 1;
  background: #fff; box-shadow: -2px 0 4px rgba(0,0,0,.06);
  min-width: 80px;
}
.sticky-wrap .tbl thead th.col-fixed { background: #f4f8ff; }

/* 头部 seg / grow（统一 FMEA 设计） */
.seg { display: inline-flex; gap: 4px; }
.seg-btn {
  border: 1px solid #dbe7f7; background: #fff; border-radius: 4px;
  padding: 3px 10px; font-size: 12px; cursor: pointer; transition: 0.15s; color: #5a6b7e;
  &:hover { border-color: #1e4d8b; color: #1e4d8b; }
  &.on { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
}
.grow { flex: 1; }
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
// CAPA 未定功能标注
.capa-placeholder {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff8e1;
  border: 1px solid #f0c14b;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
  &__icon { font-size: 24px; line-height: 1; }
  &__title { font-size: 13.5px; font-weight: 600; color: #b58a00; }
  &__desc { font-size: 12px; color: #7a6500; margin-top: 4px; line-height: 1.6;
    code { background: rgba(0,0,0,0.06); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
  }
}

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
