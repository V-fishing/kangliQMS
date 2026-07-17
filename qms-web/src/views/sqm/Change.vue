<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import type { RoleId } from '@/mock/roles'
import { BANNERS } from '@/mock/roles'
import {
  changeOrders, changeDocs, changeApprovals, changeDetails, strictInspect,
  sopUpdates, suppliers,
} from '@/mock/sqm'
import type { ChangeOrder, ChangeApproval, ChangeDoc, ChangeDetail } from '@/types/sqm'

const authStore = useAuthStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 物料变更',
  desc: '供应商物料/工艺变更管理与审批',
}

// 角色门控（对齐 HTML renderSqmChange）
const canApply = (['sqe', 'qmanager', 'supplier', 'sysadmin'] as RoleId[]).includes(authStore.role)
function canApproveRow(o: ChangeOrder) {
  return o.status === '审批中' && (['qmanager', 'shiftleader', 'sysadmin'] as RoleId[]).includes(authStore.role)
}

// 筛选
const fStatus = ref('')
const fType = ref('')
const fSearch = ref('')
const filteredOrders = computed(() => {
  const k = fStatus.value
  const t = fType.value
  const s = fSearch.value.trim().toLowerCase()
  return changeOrders.filter((o) => {
    if (k && o.status !== k) return false
    if (t && o.type !== t) return false
    if (s && !(`${o.title} ${o.partNo} ${o.id}`.toLowerCase().includes(s))) return false
    return true
  })
})

// 药丸配色
function statusPill(s: ChangeOrder['status']): string {
  return { 待申请: 'y', 审批中: 'b', 已批准: 'g', 已执行: 'g', 已关闭: 'gray' }[s] || 'gray'
}
function urgencyPill(u: ChangeOrder['urgency']): string {
  return u === '高' ? 'r' : u === '中' ? 'y' : 'g'
}

// 并行审批状态（对齐 HTML apprStatus 逻辑）
function apprStatus(o: ChangeOrder): { cls: string; text: string } {
  const appr = changeApprovals[o.id]
  if (appr) {
    const done = (appr.quality.status === 'done' ? 1 : 0) + (appr.purchase.status === 'done' ? 1 : 0) + (appr.rd.status === 'done' ? 1 : 0)
    if (done === 3) return { cls: 'g', text: '三方通过' }
    if (done > 0) return { cls: 'y', text: `并行中 ${done}/3` }
    return { cls: 'gray', text: '待启动' }
  }
  if (o.status === '已关闭' || o.status === '已执行') return { cls: 'g', text: '已完成' }
  return { cls: 'gray', text: '—' }
}

// 第一个审批中/已批准的变更 → 并行审批卡
const processing = computed(() => {
  const o = changeOrders.find((c) => (c.status === '审批中' || c.status === '已批准') && changeApprovals[c.id])
  if (!o) return null
  return { order: o, appr: changeApprovals[o.id], detail: changeDetails[o.id] || { impact: '', strictPlan: '' } }
})

function changeDoc(id: string): ChangeDoc {
  return changeDocs[id] || { changeNote: false, verifyReport: false, fmea: false }
}

// 自动触发规则（对齐 HTML 自动触发规则卡片 SR-SCM-001,002）
const triggerRules = [
  { icon: '📤', title: '供应商门户提报变更', desc: '供应商通过门户主动提交PCN/ECN变更申请，系统自动生成变更单号' },
  { icon: '🔍', title: '物料主数据字段变更自动检测', desc: '系统自动监控物料规格、材质、供应商等关键字段变更，触发评估流程' },
  { icon: '🚫', title: '变更未关闭前冻结收货', desc: '关联物料在变更流程未关闭前，系统自动拦截来料收货并提醒IQC' },
]

// 弹窗：发起变更
const applyVisible = ref(false)
const applyForm = reactive({ title: '', supId: '', partNo: '', type: '材料升级', reason: '', urgency: '中', strict: true })
function openApply() {
  applyForm.title = ''; applyForm.supId = ''; applyForm.partNo = ''; applyForm.type = '材料升级'
  applyForm.reason = ''; applyForm.urgency = '中'; applyForm.strict = true
  applyVisible.value = true
}
function submitApply() {
  if (!applyForm.title || !applyForm.supId || !applyForm.partNo) {
    ElMessage.warning('请填写变更标题、供应商与物料料号')
    return
  }
  applyVisible.value = false
  ElMessage.success('变更申请已提交，等待审批')
}

// 弹窗：变更详情
const detailVisible = ref(false)
const detailData = ref<{ order: ChangeOrder; doc: ChangeDoc; appr?: ChangeApproval; detail: ChangeDetail } | null>(null)
function openDetail(id: string) {
  const o = changeOrders.find((c) => c.id === id)
  if (!o) return
  detailData.value = { order: o, doc: changeDoc(id), appr: changeApprovals[id], detail: changeDetails[id] || { impact: '', strictPlan: '' } }
  detailVisible.value = true
}

// 弹窗：审批
const approveVisible = ref(false)
const approveData = ref<ChangeOrder | null>(null)
const approveComment = ref('')
function openApprove(id: string) {
  const o = changeOrders.find((c) => c.id === id)
  if (!o) return
  approveData.value = o
  approveComment.value = ''
  approveVisible.value = true
}
function submitApprove(decision: 'approve' | 'reject') {
  approveVisible.value = false
  ElMessage.success(decision === 'approve' ? '变更已批准' : '变更已驳回')
}

// SOP 更新通知详情（SR-SCM-013 标准生效 / SR-SCM-016 多部门推送 / SR-SCM-004 冻结收货）
const sopDetailVisible = ref(false)
const sopCur = ref<typeof sopUpdates[number] | null>(null)
function openSopDetail(s: typeof sopUpdates[number]) {
  sopCur.value = s
  sopDetailVisible.value = true
}
</script>

<template>
  <div class="sqm-change">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔄</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <select v-model="fStatus" class="qms-select">
        <option value="">全部状态</option>
        <option>待申请</option><option>审批中</option><option>已批准</option><option>已执行</option><option>已关闭</option>
      </select>
      <select v-model="fType" class="qms-select">
        <option value="">全部类型</option>
        <option>材料升级</option><option>配方变更</option><option>工艺变更</option><option>材料变更</option><option>封装变更</option>
      </select>
      <input v-model="fSearch" type="text" class="qms-input" placeholder="搜索变更单号或物料..." />
      <span class="sp" />
      <button v-if="canApply" class="btn pri" @click="openApply">+ 发起变更</button>
    </div>

    <!-- 1. 自动触发规则 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>自动触发规则 <span class="sr-tag" title="SR-SCM-001,SR-SCM-002">SR-SCM-001,002</span></h3></div>
      <div class="qms-card__body">
        <div class="trigger-rules">
          <div v-for="r in triggerRules" :key="r.title" class="trigger-rule-item">
            <div class="tr-icon">{{ r.icon }}</div>
            <div>
              <div class="tr-title">{{ r.title }}</div>
              <div class="tr-desc">{{ r.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 物料变更单列表 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>物料变更单列表 <span class="sr-tag" title="SR-SCM-003,004,005">SR-SCM-003,004,005</span></h3></div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <table class="tbl" style="min-width: 1080px">
          <thead>
            <tr>
              <th>变更单号</th><th>变更标题</th><th>供应商</th><th>物料料号</th><th>变更类型</th>
              <th>紧急度</th><th>申请人</th><th>申请日期</th><th>评估资料</th><th>审批状态</th>
              <th>加严标记</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in filteredOrders" :key="o.id">
              <td>{{ o.id }}</td>
              <td><strong>{{ o.title }}</strong></td>
              <td>{{ o.supName }}</td>
              <td>{{ o.partNo }}</td>
              <td>{{ o.type }}</td>
              <td><span class="qms-pill" :class="urgencyPill(o.urgency)">{{ o.urgency }}</span></td>
              <td>{{ o.applicant }}</td>
              <td>{{ o.applyDate }}</td>
              <td>
                <div class="doc-icons">
                  <span class="doc-icon" :class="changeDoc(o.id).changeNote ? 'ok' : 'miss'" title="变更说明">📄{{ changeDoc(o.id).changeNote ? '✓' : '—' }}</span>
                  <span class="doc-icon" :class="changeDoc(o.id).verifyReport ? 'ok' : 'miss'" title="验证报告">📊{{ changeDoc(o.id).verifyReport ? '✓' : '—' }}</span>
                  <span class="doc-icon" :class="changeDoc(o.id).fmea ? 'ok' : 'miss'" title="FMEA风险评估">🛡️{{ changeDoc(o.id).fmea ? '✓' : '—' }}</span>
                </div>
              </td>
              <td>
                <span class="qms-pill" :class="apprStatus(o).cls">{{ apprStatus(o).text }}</span>
              </td>
              <td>
                <span class="qms-pill" :class="o.strictFlag ? 'r' : 'gray'">{{ o.strictFlag ? '加严' : '正常' }}</span>
              </td>
              <td><span class="qms-pill" :class="statusPill(o.status)">{{ o.status }}</span></td>
              <td>
                <button class="btn sm ghost" @click="openDetail(o.id)">详情</button>
                <button v-if="canApproveRow(o)" class="btn sm" @click="openApprove(o.id)">审批</button>
              </td>
            </tr>
            <tr v-if="filteredOrders.length === 0">
              <td colspan="13" class="muted" style="text-align:center;padding:20px">无匹配数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. 变更并行审批流程 -->
    <div v-if="processing" class="qms-card">
      <div class="qms-card__header"><h3>变更并行审批流程：{{ processing.order.id }} <span class="sr-tag" title="SR-SCM-007,008,009">SR-SCM-007,008,009</span></h3></div>
      <div class="qms-card__body">
        <div class="parallel-approval">
          <template v-for="(node, i) in [
            { name: '质量审批', data: processing.appr.quality },
            { name: '采购审批', data: processing.appr.purchase },
            { name: '研发审批', data: processing.appr.rd },
          ]" :key="node.name">
            <div class="approval-node" :class="[node.data.status, { veto: node.data.veto }]">
              <div class="ap-icon">{{ node.data.status === 'done' ? '✓' : node.data.status === 'doing' ? '⏳' : '○' }}</div>
              <div class="ap-name">{{ node.name }}</div>
              <div class="ap-status">{{ node.data.status === 'done' ? '已通过' : node.data.status === 'doing' ? '审批中' : '待审批' }}</div>
              <div class="ap-status">{{ node.data.operator || '—' }}</div>
              <div v-if="node.data.veto" class="ap-veto">一票否决权</div>
            </div>
            <div v-if="i < 2" class="approval-join">&</div>
          </template>
        </div>
        <div class="approval-join" style="justify-content:center;margin:10px 0;font-size:13px">↓ 三方都通过后进入试产验证 ↓</div>
        <div class="parallel-approval" style="justify-content:center">
          <div class="approval-node" :class="processing.appr.trial.status" style="max-width:260px">
            <div class="ap-icon">{{ processing.appr.trial.status === 'done' ? '✓' : processing.appr.trial.status === 'doing' ? '⏳' : '○' }}</div>
            <div class="ap-name">试产验证</div>
            <div class="ap-status">{{ processing.appr.trial.status === 'done' ? '已完成' : processing.appr.trial.status === 'doing' ? '验证中' : '待启动' }}</div>
            <div class="ap-status">{{ processing.appr.trial.operator || '—' }}</div>
          </div>
        </div>
        <div class="grid g-2" style="margin-top:16px">
          <div class="note"><strong>影响范围：</strong>{{ processing.detail.impact || '暂无' }}</div>
          <div class="ex-box"><strong>加严检验计划：</strong>{{ processing.detail.strictPlan || '暂无' }}</div>
        </div>
      </div>
    </div>

    <!-- 4. 加严检验跟踪 -->
    <div v-if="strictInspect.length" class="qms-card">
      <div class="qms-card__header"><h3>加严检验跟踪 <span class="sr-tag" title="SR-SCM-010,011">SR-SCM-010,011</span></h3></div>
      <div class="qms-card__body">
        <div class="strict-track">
          <div v-for="si in strictInspect" :key="si.id" class="strict-track-item" :class="si.result === '合格' ? 'passed' : si.result === '不合格' ? 'failed' : 'pending'">
            <div class="st-batch">{{ si.batchNo }} <span v-if="si.restored" class="qms-pill g" style="margin-left:4px">已恢复</span></div>
            <div class="st-row"><span>关联变更</span><strong>{{ si.changeId }}</strong></div>
            <div class="st-row"><span>检验类型</span><strong>{{ si.inspectType }}</strong></div>
            <div class="st-row"><span>AQL等级</span><strong>{{ si.aql }}</strong></div>
            <div class="st-row"><span>检验结果</span><strong :class="{ ok: si.result === '合格', bad: si.result === '不合格' }">{{ si.result }}</strong></div>
            <div class="st-row"><span>进度</span><strong>{{ si.seq }}/{{ si.totalSeq }}</strong></div>
            <div class="st-row"><span>检验日期</span><strong>{{ si.date || '—' }}</strong></div>
          </div>
        </div>
        <div class="ac-box" style="margin-top:12px">
          <strong>连续3批合格后可恢复正常检验</strong>。当前已跟踪批次：<strong>{{ strictInspect.length }}</strong> 批，其中已恢复正常的有 <strong>{{ strictInspect.filter((x) => x.restored).length }}</strong> 批。
        </div>
      </div>
    </div>

    <!-- 5. SOP更新通知 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>SOP更新通知 <span class="sr-tag" title="SR-SCM-013,016">SR-SCM-013,016</span></h3></div>
      <div class="qms-card__body" style="padding: 0; overflow-x: auto">
        <table class="tbl">
          <thead><tr><th>关联变更单</th><th>SOP文件</th><th>版本</th><th>更新内容</th><th>发布日期</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="s in sopUpdates" :key="s.changeId">
              <td>{{ s.changeId }}</td>
              <td>{{ s.file }}</td>
              <td>{{ s.version }}</td>
              <td>{{ s.content }}</td>
              <td>{{ s.publishDate }}</td>
              <td><span class="qms-pill" :class="s.status === '已发布' ? 'g' : 'y'">{{ s.status }}</span></td>
              <td><button class="btn sm ghost" @click="openSopDetail(s)">详情</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 发起变更弹窗 -->
    <el-dialog v-model="applyVisible" title="发起物料变更" width="520px">
      <div class="form-row">
        <label>变更标题</label>
        <input v-model="applyForm.title" type="text" class="qms-input" placeholder="简要描述变更内容" />
        <label>供应商</label>
        <select v-model="applyForm.supId" class="qms-select">
          <option value="">选择供应商</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <label>物料料号</label>
        <input v-model="applyForm.partNo" type="text" class="qms-input" placeholder="输入物料料号" />
        <label>变更类型</label>
        <select v-model="applyForm.type" class="qms-select">
          <option>材料升级</option><option>配方变更</option><option>工艺变更</option><option>材料变更</option><option>封装变更</option>
        </select>
        <label>变更原因</label>
        <textarea v-model="applyForm.reason" rows="2" class="qms-input" placeholder="说明变更原因..."></textarea>
        <label>紧急度</label>
        <select v-model="applyForm.urgency" class="qms-select"><option>高</option><option>中</option><option>低</option></select>
        <label><input v-model="applyForm.strict" type="checkbox" /> 变更后需加严检验</label>
      </div>
      <template #footer>
        <button class="btn pri" @click="submitApply">提交申请</button>
        <button class="btn ghost" @click="applyVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- 变更详情弹窗 -->
    <el-dialog v-model="detailVisible" title="变更详情" width="640px">
      <template v-if="detailData">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="变更单号">{{ detailData.order.id }}</el-descriptions-item>
          <el-descriptions-item label="状态"><span class="qms-pill" :class="statusPill(detailData.order.status)">{{ detailData.order.status }}</span></el-descriptions-item>
          <el-descriptions-item label="标题" :span="2">{{ detailData.order.title }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detailData.order.supName }}</el-descriptions-item>
          <el-descriptions-item label="物料料号">{{ detailData.order.partNo }}</el-descriptions-item>
          <el-descriptions-item label="变更类型">{{ detailData.order.type }}</el-descriptions-item>
          <el-descriptions-item label="变更原因">{{ detailData.order.reason }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ detailData.order.applicant }}</el-descriptions-item>
          <el-descriptions-item label="申请日期">{{ detailData.order.applyDate }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin:16px 0 8px">评估资料</h4>
        <div class="doc-icons" style="gap:8px">
          <span class="doc-icon" :class="detailData.doc.changeNote ? 'ok' : 'miss'">📄 变更说明 {{ detailData.doc.changeNote ? '✓ 已提交' : '— 未提交' }}</span>
          <span class="doc-icon" :class="detailData.doc.verifyReport ? 'ok' : 'miss'">📊 验证报告 {{ detailData.doc.verifyReport ? '✓ 已提交' : '— 未提交' }}</span>
          <span class="doc-icon" :class="detailData.doc.fmea ? 'ok' : 'miss'">🛡️ FMEA风险评估 {{ detailData.doc.fmea ? '✓ 已提交' : '— 未提交' }}</span>
        </div>

        <template v-if="detailData.appr">
          <h4 style="margin:16px 0 8px">并行审批状态</h4>
          <div class="parallel-approval" style="margin:10px 0">
            <template v-for="(node, i) in [
              { name: '质量审批', data: detailData.appr.quality },
              { name: '采购审批', data: detailData.appr.purchase },
              { name: '研发审批', data: detailData.appr.rd },
            ]" :key="node.name">
              <div class="approval-node" :class="[node.data.status, { veto: node.data.veto }]">
                <div class="ap-icon">{{ node.data.status === 'done' ? '✓' : node.data.status === 'doing' ? '⏳' : '○' }}</div>
                <div class="ap-name">{{ node.name }}</div>
                <div class="ap-status">{{ node.data.status === 'done' ? '已通过' : node.data.status === 'doing' ? '审批中' : '待审批' }}</div>
                <div class="ap-status">{{ node.data.operator || '—' }}</div>
                <div v-if="node.data.veto" class="ap-veto">一票否决权</div>
              </div>
              <div v-if="i < 2" class="approval-join">&</div>
            </template>
          </div>
        </template>

        <template v-if="detailData.detail.workflow && detailData.detail.workflow.length">
          <h4 style="margin:16px 0 8px">历史流程记录</h4>
          <div class="timeline">
            <div v-for="(w, i) in detailData.detail.workflow" :key="i" class="tl-item">
              <div class="tl-t">{{ w.date || '待定' }}</div>
              <div class="tl-op"><strong>{{ w.step }}</strong> — {{ w.operator || '—' }}</div>
              <div class="meta">{{ w.action }} — {{ w.status === 'done' ? '已完成' : w.status === 'doing' ? '进行中' : '待处理' }}</div>
            </div>
          </div>
        </template>
      </template>
      <template #footer>
        <button class="btn" @click="detailVisible = false">关闭</button>
      </template>
    </el-dialog>

    <!-- 审批弹窗 -->
    <el-dialog v-model="approveVisible" title="变更审批" width="520px">
      <template v-if="approveData">
        <p><strong>变更单号：</strong>{{ approveData.id }}</p>
        <p><strong>变更标题：</strong>{{ approveData.title }}</p>
        <p><strong>供应商：</strong>{{ approveData.supName }}</p>
        <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb" />
        <label>审批意见</label>
        <textarea v-model="approveComment" rows="3" class="qms-input" placeholder="输入审批意见..."></textarea>
        <label style="margin-top:8px"><input type="checkbox" checked /> 同意变更后加严检验</label>
      </template>
      <template #footer>
        <button class="btn pri" @click="submitApprove('approve')">批准</button>
        <button class="btn" @click="submitApprove('reject')">驳回</button>
        <button class="btn ghost" @click="approveVisible = false">取消</button>
      </template>
    </el-dialog>

    <!-- SOP 更新通知详情弹窗（SR-SCM-013 / SR-SCM-016 / SR-SCM-004） -->
    <el-dialog v-model="sopDetailVisible" :title="`SOP 更新通知详情 · ${sopCur?.changeId || ''}`" width="560px">
      <template v-if="sopCur">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="SOP 文件">{{ sopCur.file }}（{{ sopCur.version }}）</el-descriptions-item>
          <el-descriptions-item label="更新内容">{{ sopCur.content }}</el-descriptions-item>
          <el-descriptions-item label="发布日期">{{ sopCur.publishDate }}</el-descriptions-item>
          <el-descriptions-item label="状态"><span class="qms-pill" :class="sopCur.status === '已发布' ? 'g' : 'y'">{{ sopCur.status }}</span></el-descriptions-item>
        </el-descriptions>
        <h4 style="margin:16px 0 8px">① 通知情况（SR-SCM-016 多部门推送）</h4>
        <div v-if="sopCur.notified.length" class="note">
          已向以下部门推送变更通知：<br />
          <span v-for="d in sopCur.notified" :key="d" class="qms-pill g" style="margin:2px 4px 2px 0">{{ d }}</span><br />
          <span class="meta">通知内容含变更摘要、生效时间与新标准版本号。</span>
        </div>
        <div v-else class="note warn">变更尚未批准生效，待推送（质量/采购/生产/仓储）。</div>
        <h4 style="margin:14px 0 8px">② 解冻收货（SR-SCM-004）</h4>
        <div class="note">{{ sopCur.unfreeze }}</div>
        <h4 style="margin:14px 0 8px">③ AQL 提级（加严检验）</h4>
        <div class="note">{{ sopCur.aqlUpgrade }}</div>
      </template>
      <template #footer>
        <button class="btn ghost" @click="sopDetailVisible = false">关闭</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-change { display: flex; flex-direction: column; gap: 14px; }

/* 工具栏内下拉/输入 */
.qms-select, .qms-input {
  height: 32px;
  border: 1px solid var(--line, #d8dee6);
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  background: #fff;
  color: #1f2d3d;
}
.qms-input { min-width: 200px; }
.sp { flex: 1; }

/* 自动触发规则 */
.trigger-rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.trigger-rule-item {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 12px; border: 1px solid var(--line, #e5e7eb); border-radius: 8px; background: #fafbfc;
}
.tr-icon { font-size: 22px; line-height: 1; }
.tr-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.tr-desc { font-size: 12px; color: #6b7785; line-height: 1.5; }

/* 评估资料图标 */
.doc-icons { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.doc-icon {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 11px; padding: 2px 6px; border-radius: 10px; white-space: nowrap;
  border: 1px solid #e5e7eb; background: #f4f6f8; color: #98a2b0;
}
.doc-icon.ok { background: #e8f5e9; color: #2f7d32; border-color: #bfe3c4; }
.doc-icon.miss { background: #f4f6f8; color: #98a2b0; border-color: #e5e7eb; }

/* 并行审批 */
.parallel-approval { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.approval-join { color: #8a94a6; font-weight: 700; font-size: 18px; }
.approval-node {
  position: relative; min-width: 120px; text-align: center;
  padding: 14px 12px 10px; border-radius: 10px; border: 2px solid #e5e7eb; background: #f7f8fa;
}
.approval-node.done { border-color: #2f7d32; background: #eefaf0; }
.approval-node.doing { border-color: #1e4d8b; background: #eaf1fb; }
.approval-node.veto::after { content: ''; }
.ap-icon { width: 30px; height: 30px; margin: 0 auto 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: #fff; border: 1px solid #d8dee6; }
.approval-node.done .ap-icon { color: #2f7d32; border-color: #2f7d32; }
.approval-node.doing .ap-icon { color: #1e4d8b; border-color: #1e4d8b; }
.ap-name { font-weight: 600; font-size: 13px; }
.ap-status { font-size: 11px; color: #6b7785; margin-top: 2px; }
.ap-veto { margin-top: 6px; font-size: 10px; color: #c0392b; background: #fdecea; border-radius: 8px; padding: 1px 6px; display: inline-block; }

/* 加严检验跟踪 */
.strict-track { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.strict-track-item {
  border: 1px solid #e5e7eb; border-left: 3px solid #8a94a6; border-radius: 8px; padding: 10px 12px; background: #fafbfc;
}
.strict-track-item.passed { border-left-color: #2f7d32; }
.strict-track-item.failed { border-left-color: #c0392b; }
.strict-track-item.pending { border-left-color: #d4a017; }
.st-batch { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
.st-row { display: flex; justify-content: space-between; font-size: 12px; color: #6b7785; padding: 2px 0; }
.st-row strong { color: #1f2d3d; }
.st-row strong.ok { color: #2f7d32; }
.st-row strong.bad { color: #c0392b; }

/* 表单行 */
.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 13px; color: #44515f; margin-top: 6px; }
textarea.qms-input { height: auto; padding: 8px 10px; resize: vertical; }

.grid.g-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 720px) { .grid.g-2 { grid-template-columns: 1fr; } }
.note { font-size: 12px; color: #6b7785; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 8px 12px; border-radius: 6px; }
.note.warn { background: #fdecea; border-left-color: #c0392b; color: #b03021; }

</style>
