<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { fiaApi } from '@/api'
import type { FiaApproval } from '@/types/fia'

const authStore = useAuthStore()
const banner = BANNERS.fia?.[authStore.role] || {
  title: '首件检验 · 审批中心',
  desc: '豁免/放行/让步 审批与解锁',
}

const list = ref<FiaApproval[]>([])
async function load() {
  try {
    list.value = await fiaApi.getApprovals()
  } catch {
    list.value = []
  }
}
onMounted(load)

const pendingCount = computed(() => list.value.filter((a) => a.st === '待审批').length)


const typePill = (t: string) => (t === '让步接收' ? 'p' : t === '紧急放行' ? 'r' : 'y')
const stPill = (s?: string) => (s === '已通过' ? 'g' : s === '已驳回' ? 'r' : 'y')

// 审批弹窗
const dlg = reactive({ show: false, row: null as FiaApproval | null, decision: '通过', opinion: '' })
function openApprove(row: FiaApproval) {
  dlg.row = row
  dlg.decision = '通过'
  dlg.opinion = ''
  dlg.show = true
}
const approving = ref(false)
async function confirmApprove() {
  if (!dlg.row) return
  if (dlg.decision === '驳回' && !dlg.opinion.trim()) {
    ElMessage.warning('驳回需填写意见')
    return
  }
  approving.value = true
  try {
    await fiaApi.approveApproval(dlg.row.id, dlg.opinion, dlg.decision === '通过')
    const now = new Date().toLocaleString('zh-CN')
    dlg.row.st = dlg.decision === '通过' ? '已通过' : '已驳回'
    dlg.row.hist = (dlg.decision === '通过' ? '质量主管 ' : '驳回 ') + now + (dlg.opinion ? `（${dlg.opinion}）` : '')
    dlg.show = false
    ElMessage.success(dlg.decision === '通过' ? '已通过审批' : '已驳回申请')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.msg || '审批提交失败')
  } finally {
    approving.value = false
  }
}
</script>

<template>
  <div class="fia-approve">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">✔️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 审批队列 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>审批中心 · 豁免/放行/让步</h3>
        <span class="tag r">{{ pendingCount }} 待审批</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <table class="insp-table">
          <thead>
            <tr><th>编号</th><th>类型</th><th>工单</th><th>原因</th><th>申请人</th><th>时间</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in list" :key="a.id">
              <td>{{ a.id }}</td>
              <td><span class="pill" :class="typePill(a.type)">{{ a.type }}</span></td>
              <td>{{ a.wo }}</td>
              <td class="muted">{{ a.reason }}</td>
              <td>{{ a.who }}</td>
              <td class="muted">{{ a.t }}</td>
              <td><span class="pill" :class="stPill(a.st)">{{ a.st }}</span></td>
              <td>
                <el-button v-if="a.st === '待审批'" link type="primary" size="small" @click="openApprove(a)">审批</el-button>
                <span v-else class="muted">{{ a.hist || '-' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 审批规则 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>审批规则</h3></div>
      <div class="qms-card__body" style="padding: 0">
        <div class="list-row"><span class="pill y">豁免开工</span><span class="grow">质量主管审批通过后工单临时解锁、任务放行归档，并将首件数据写入 SPC 基准；驳回则保持锁定并通知申请人。</span></div>
        <div class="list-row"><span class="pill r">紧急放行</span><span class="grow">质量主管审批通过后任务放行归档、首件数据写入 SPC 基准，放行产品标记追溯标签；驳回则不放行，后续不合格可召回。</span></div>
        <div class="list-row"><span class="pill p">让步接收</span><span class="grow">非关键参数超差时可选，必须经质量主管审批；通过后任务放行归档并将首件数据写入 SPC 基准，驳回则不放行。</span></div>
        <div class="list-row"><span class="pill g">通用规则</span><span class="grow">三类审批<b>通过即放行</b>：任务归档 + 首件 CTQ 数据写入 SPC 基准；<b>驳回即不放行</b>。审批结果全程留痕。</span></div>
      </div>
    </div>

    <el-dialog v-model="dlg.show" title="审批" width="440px">
      <div class="form-grid">
        <div class="form-row">
          <label>审批决定</label>
          <el-radio-group v-model="dlg.decision">
            <el-radio value="通过">通过</el-radio>
            <el-radio value="驳回">驳回</el-radio>
          </el-radio-group>
        </div>
        <div class="form-row full">
          <label>审批意见</label>
          <el-input v-model="dlg.opinion" type="textarea" :rows="3" placeholder="可选填写" />
        </div>
      </div>
      <template #footer>
        <el-button @click="dlg.show = false">取消</el-button>
        <el-button type="primary" @click="confirmApprove">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.fia-approve { display: flex; flex-direction: column; gap: 14px; }
</style>
