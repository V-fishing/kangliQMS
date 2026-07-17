<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import FishboneDiagram from '@/components/workflow/FishboneDiagram.vue'
import FiveWhyEditor from '@/components/workflow/FiveWhyEditor.vue'
import ApprovalPanel from '@/components/workflow/ApprovalPanel.vue'
import {
  ncm8DList as _list, ncm8D, ncm8DTeam, ncm8DForms, ncmCapaList as _capa,
} from '@/mock/ncm'
import type { Ncm8DListItem, NcmCapa } from '@/types/ncm'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 8D 整改',
  desc: '8D 整改看板、根因分析、SLA 时效与人工手动触发 CAPA',
}

/* ============ 8D 报告列表 ============ */
const list = ref<Ncm8DListItem[]>([..._list])
const capaList = ref<NcmCapa[]>([..._capa])

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

const selectedId = ref<string>('8D-2026-007')
const selected = computed(() => list.value.find((r) => r.id === selectedId.value) || list.value[0])

/** 从 S=7 解析出数值 */
function sevNum(sev: string) {
  const m = sev.match(/\d+/)
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
function stepClass(i: number) {
  if (i < curIndex.value) return 'done'
  if (i === curIndex.value) return 'cur'
  return ''
}

function selectRow(row: Ncm8DListItem) {
  selectedId.value = row.id
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
function confirmCreate8D() {
  if (!new8D.issue.trim()) { ElMessage.warning('请填写问题简述'); return }
  const seq = String(2026007 + list.value.length + 1).slice(-3)
  const id = `8D-2026-${seq}`
  const item: Ncm8DListItem = {
    id, issue: new8D.issue.trim(), src: new8D.src,
    sev: `S=${new8D.sev}`, stage: 'D0', sla: '进行中', st: '进行中',
  }
  list.value.unshift(item)
  selectedId.value = id
  create8DVisible.value = false
  const sug = d0Suggestion()
  ElMessage.success(`${id} 已创建，D0 前评估完成：${sug.text}`)
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
function confirmCapa() {
  if (!newCapa.owner.trim()) { ElMessage.warning('请指定 CAPA 责任人'); return }
  if (!newCapa.due) { ElMessage.warning('请设置目标完成日期'); return }
  const id = `CAPA-2026-${String(12 + capaList.value.length).padStart(3, '0')}`
  capaList.value.unshift({
    id, from8D: selected.value!.id, trigger: newCapa.trigger,
    reason: newCapa.reason, owner: newCapa.owner.trim(), due: newCapa.due,
    st: '执行中', createdAt: new Date().toISOString().slice(0, 10),
  })
  capaVisible.value = false
  ElMessage.success(`${id} 已创建并关联 ${selected.value!.id}`)
}

function capaStType(st: string) {
  return st === '已关闭' ? 'success' : st === '待启动' ? 'info' : 'warning'
}

/* ============ 详情表单 ============ */
const forms = reactive({ ...ncm8DForms })
const d6 = ref('')
const d7 = ref('')

function submitD5() {
  if (!forms.d5.trim()) { ElMessage.warning('D5 纠正措施不可为空'); return }
  ElMessage.success('D5 纠正措施已提交，进入质量主管审批（SLA 7 天）')
}
function startVerify() {
  ElMessage.success('效果验证期 30 天已启动，跟踪同类不良趋势（SR-PTL-020）')
}
function linkTools() {
  ElMessage.info('已关联鱼骨图 / 5Why（演示）')
}

/* ============ 审批 ============ */
const approvers = [
  { name: '质量经理', role: '8D 审核', status: 'pending' as const },
  { name: '厂长', role: '关闭批准', status: 'pending' as const },
]
function onApprove(d: { decision: 'approve' | 'reject'; comment: string }) {
  ElMessage.success(d.decision === 'approve' ? '8D 已审核通过' : '已驳回，退回责任人')
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
        <el-button type="primary" size="small" @click="openCreate8D">+ 发起 8D</el-button>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table
          :data="list" border size="small"
          highlight-current-row :current-row-key="selectedId" row-key="id"
          @row-click="selectRow"
        >
          <el-table-column prop="id" label="编号" width="130" />
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
        <h3>8D 详情 · {{ selected.id }} {{ selected.issue }}</h3>
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
          来源：{{ selected.src }} · 团队：{{ ncm8DTeam.join('、') }} · SLA：D3≤24h / D4-D5≤7天 / D6-D7≤30天
        </div>

        <!-- D2-D5 表单 -->
        <div class="form-grid">
          <div class="form-row">
            <label>D2 问题描述（5W2H，预填自不良）</label>
            <el-input v-model="forms.problem" type="textarea" :rows="2" readonly />
          </div>
          <div class="form-row">
            <label>D3 临时措施（SLA 24h · 已审批）</label>
            <el-input v-model="forms.d3" type="textarea" :rows="2" readonly />
          </div>
          <div class="form-row">
            <label>D4 根因分析（鱼骨图 / 5Why）</label>
            <el-input v-model="forms.d4" type="textarea" :rows="2" readonly />
          </div>
          <div class="form-row">
            <label>D5 纠正措施（SLA 7天 · 待质量主管审批）<span class="req">*</span></label>
            <el-input v-model="forms.d5" type="textarea" :rows="2" placeholder="填写永久措施，需含责任人与时间节点" />
          </div>
        </div>

        <!-- 根因分析工具 -->
        <div class="chart-grid chart-grid--2">
          <div class="sub-card">
            <div class="sub-card__title">鱼骨图（5M1E）</div>
            <FishboneDiagram :data="ncm8D.fishbone" :problem="selected.issue" />
          </div>
          <div class="sub-card">
            <div class="sub-card__title">5Why 根因追问</div>
            <FiveWhyEditor :items="ncm8D.fiveWhy" :editable="false" />
          </div>
        </div>

        <!-- 规则提示 -->
        <el-alert
          type="warning" :closable="false" show-icon style="margin: 14px 0 6px"
          title="严重度 S≥7 或同产品/问题 30 天内重复 → 人工手动触发 CAPA；效果验证期 30 天，同类复发标记「验证不通过」退回 D4；完整报告归档保留 ≥15 年。"
        />

        <!-- 操作按钮 -->
        <div class="btn-bar">
          <el-button type="primary" @click="submitD5">提交 D5 审批</el-button>
          <el-button @click="linkTools">关联分析工具</el-button>
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

    <!-- D6-D7 实施与预防 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>D6-D7 实施与预防</h3>
        <el-tag size="small" type="info" effect="plain">待 D5 审批后进行</el-tag>
      </div>
      <div class="qms-card__body">
        <div class="form-grid">
          <div class="form-row">
            <label>D6 措施实施记录 + 证据附件（强制）<span class="req">*</span></label>
            <el-input v-model="d6" type="textarea" :rows="2" placeholder="实施情况、更换零部件、验收结果..." />
            <el-upload action="#" :auto-upload="false" :limit="3" style="margin-top: 6px">
              <el-button size="small">上传证据附件</el-button>
            </el-upload>
          </div>
          <div class="form-row">
            <label>D7 预防措施 + 系统性改进评估（需审批）</label>
            <el-input v-model="d7" type="textarea" :rows="2" placeholder="修订 SOP / 保养计划 / 防错装置..." />
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
}

.chart-grid {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  &--2 { grid-template-columns: 1fr 1fr; }
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
