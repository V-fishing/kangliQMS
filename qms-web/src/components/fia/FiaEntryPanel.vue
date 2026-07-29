<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fiaApi } from '@/api'
import type { FiaInspEntry, FiaTask } from '@/types/fia'

const props = defineProps<{ taskId?: string }>()
const emit = defineEmits<{ (e: 'submitted', taskId: string): void }>()

// 任务来源：由父组件（检验任务模块）通过 taskId 传入，面板随任务切换自动加载
const taskId = computed(() => props.taskId || '')
const task = ref<FiaTask | null>(null)
const entries = ref<FiaInspEntry[]>([])
const loading = ref(false)
const submitting = ref(false)

const inspectorPwd = ref('')
const reviewerPwd = ref('')
const approverPwd = ref('')
const inspectorCa = ref('')
const reviewerCa = ref('')
const approverCa = ref('')
const signing = reactive({ inspector: false, reviewer: false, approver: false })
const signatures = ref<{ inspector?: string; reviewer?: string; approver?: string }>({})

// 处置/放行路径:退货 / 返工 / 让步接收(需审批) / 紧急放行(需审批) / 豁免开工(需审批)
const disposition = ref('')
const dispositionRemark = ref('')
const APPROVAL_DISPOSITIONS = ['让步接收', '紧急放行', '豁免开工']
const needsApproval = computed(() => APPROVAL_DISPOSITIONS.includes(disposition.value))

// 签名配置(两级/三级、方式),决定批准人是否参与及可用签名方式
const signConfig = ref<any>(null)
const isThreeLevel = computed(() => (signConfig.value?.signNodes || '') === '三级')
const signMethods = computed<string[]>(() => signConfig.value?.signMethods || ['password'])
async function loadSignConfig() {
  try {
    signConfig.value = await fiaApi.getSignConfig()
  } catch {
    // 取不到则视为两级
  }
}

// 按「触发与签名配置」中启用的签名方式,显式对该角色进行电子签名。
async function signBy(role: 'inspector' | 'reviewer' | 'approver', method: string) {
  signing[role] = true
  try {
    const val = method === 'password'
      ? (role === 'inspector' ? inspectorPwd.value : role === 'reviewer' ? reviewerPwd.value : approverPwd.value)
      : ''
    if (role === 'inspector') await fiaApi.signInspector(taskId.value, val, undefined as any)
    else if (role === 'reviewer') await fiaApi.signReviewer(taskId.value, val, undefined as any)
    else await fiaApi.signApprover(taskId.value, val)
    signatures.value[role] = method === 'password' ? '已签名(密码)'
      : method === 'handwriting' ? '已签名(手写)' : '已签名(CA)'
    ElMessage.success(signatures.value[role])
  } catch (e: any) {
    ElMessage.error(e?.msg || '签名失败')
  } finally {
    signing[role] = false
  }
}

async function loadTask() {
  if (!taskId.value) {
    task.value = null
    entries.value = []
    return
  }
  loading.value = true
  try {
    const vo = await fiaApi.getTaskDetail(taskId.value)
    task.value = vo.task
    entries.value = vo.items
    // 已录入实测值的定量项，按标准值+公差回填自动判定（不覆盖人工已判定的结果）
    entries.value.forEach((e) => {
      if (!e.select && !e.result && e.val !== undefined && e.val !== '') e.result = autoJudge(e)
    })
    disposition.value = vo.task.disposition || ''
    dispositionRemark.value = vo.task.remark || ''
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载首件任务失败')
    entries.value = []
  } finally {
    loading.value = false
  }
}

// taskId 变化（抽屉打开/切换任务）时自动加载；为空则清空
watch(() => props.taskId, (id) => {
  if (id) { loadTask(); loadSignConfig() }
  else { task.value = null; entries.value = [] }
}, { immediate: true })

function rJudge(r?: string) {
  if (r === '合格') return 'g'
  if (r === '不合格') return 'r'
  return ''
}

// 依据「标准值 + 公差」自动判定实测值是否合格（定量项）。
function firstNum(s: string | undefined): number | null {
  const m = String(s ?? '').match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}
function parseAcceptance(std?: string | number, tol?: string | number): [number, number] | null {
  const stdNum = firstNum(String(std ?? ''))
  const tolStr = String(tol ?? '').trim()
  if (stdNum === null || !tolStr) return null
  let m: RegExpMatchArray | null
  if ((m = tolStr.match(/±\s*([\d.]+)/))) {
    const x = Number(m[1]); return [stdNum - x, stdNum + x]
  }
  if ((m = tolStr.match(/\+\s*([\d.]+)\s*\/\s*-\s*([\d.]+)/))) {
    const up = Number(m[1]); const dn = Number(m[2]); return [stdNum - dn, stdNum + up]
  }
  if ((m = tolStr.match(/^([\d.]+)\s*(?:[-~—]|至|到)\s*([\d.]+)$/))) {
    return [Number(m[1]), Number(m[2])]
  }
  if ((m = tolStr.match(/[≥>=]\s*([\d.]+)/))) return [Number(m[1]), Infinity]
  if ((m = tolStr.match(/[≤<=]\s*([\d.]+)/))) return [-Infinity, Number(m[1])]
  return null
}
function autoJudge(e: FiaInspEntry): '合格' | '不合格' | '' {
  if (e.select) return '' // 定性项无实测值，仍人工
  const v = firstNum(String(e.val ?? ''))
  if (v === null) return ''
  const range = parseAcceptance(e.std, e.tol)
  if (!range) return '' // 标准值/公差无法解析，保留人工判定
  const [lo, hi] = range
  return v >= lo && v <= hi ? '合格' : '不合格'
}
// 是否具备标准库判定规则（标准值 + 可解析公差/上下限）→ 可自动判定
function hasRule(e: FiaInspEntry): boolean {
  if (e.select) return false
  return parseAcceptance(e.std, e.tol) !== null
}
// 录入实测值时即时自动判定（仅在具备标准规则时；无规则的项交由人工下拉判定）
function onVal(e: FiaInspEntry) {
  if (hasRule(e)) e.result = autoJudge(e)
}

async function submit() {
  if (!taskId.value) {
    ElMessage.warning('请先指定首件任务')
    return
  }
  if (!entries.value.length) {
    ElMessage.warning('该任务暂无检验项，无法提交')
    return
  }
  submitting.value = true
  try {
    const items = entries.value.map((e) => ({
      id: e.id as string,
      measuredValue: e.val,
      judge: e.result || '',
    }))
    await fiaApi.enterResults(taskId.value, items)
    ElMessage.success('检验数据已提交')
    // 一并保存不合格处置路径和备注
    if (disposition.value) {
      await fiaApi.setDisposition(taskId.value, disposition.value, dispositionRemark.value)
    }

    if (inspectorPwd.value) {
      await fiaApi.signInspector(taskId.value, inspectorPwd.value, undefined as any)
      signatures.value.inspector = '已签名'
    }
    if (reviewerPwd.value) {
      await fiaApi.signReviewer(taskId.value, reviewerPwd.value, undefined as any)
      signatures.value.reviewer = '已签名'
    }
    if (isThreeLevel.value && approverPwd.value) {
      await fiaApi.signApprover(taskId.value, approverPwd.value)
      signatures.value.approver = '已签名'
    }
    if (inspectorPwd.value || reviewerPwd.value || approverPwd.value) {
      ElMessage.success('电子签名完成')
    }
    emit('submitted', taskId.value)
    await loadTask()
  } catch (e: any) {
    ElMessage.error(e?.msg || '提交失败')
  } finally {
    submitting.value = false
  }
}

function reset() {
  inspectorPwd.value = ''
  reviewerPwd.value = ''
  approverPwd.value = ''
  signatures.value = {}
  loadTask()
}

// ---- 逐步录入向导：弹出分步页面，用户逐项依次录入（替代一次性平铺卡片） ----
const wizardVisible = ref(false)
const wizardIdx = ref(0)
const curItem = computed(() => entries.value[wizardIdx.value] || null)
const wizardProgress = computed(() => {
  const total = entries.value.length
  const done = entries.value.filter((e) => (e.val !== undefined && e.val !== '') || e.result).length
  return { total, done, idx: wizardIdx.value + 1 }
})
function isItemFilled(e: FiaInspEntry) {
  return (e.val !== undefined && e.val !== '') || !!e.result
}
function openWizard() {
  if (!entries.value.length) {
    ElMessage.warning('暂无检验项，无法录入')
    return
  }
  wizardIdx.value = 0
  wizardVisible.value = true
}
function wizardNext() {
  if (wizardIdx.value < entries.value.length - 1) wizardIdx.value++
}
function wizardPrev() {
  if (wizardIdx.value > 0) wizardIdx.value--
}
function wizardFinish() {
  wizardVisible.value = false
  ElMessage.success('检验项已全部录入，可点「提交并签名」')
}
</script>

<template>
  <div class="fia-entry">
    <div class="qms-card">
      <div class="qms-card__header"><h3>任务信息</h3></div>
      <div class="qms-card__body">
        <div v-if="task" class="meta">
          <div><label>工单</label><b>{{ task.wo }}</b></div>
          <div><label>产线</label><b>{{ task.line }}</b></div>
          <div><label>产品</label><b>{{ task.productName }}</b></div>
          <div><label>工序</label><b>{{ task.procName }}</b></div>
          <div><label>触发</label><b>{{ task.trig }}</b></div>
          <div><label>批次</label><b>{{ task.batchNo }}</b></div>
          <div><label>状态</label><b>{{ task.st }}</b></div>
          <div><label>判定</label><b>{{ task.result }}</b></div>
        </div>
        <el-empty v-else description="请选择或输入首件任务" />
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>检验项录入</h3>
        <span class="tag">{{ entries.length }} 项</span>
        <span class="sp"></span>
        <el-button size="small" type="primary" plain :disabled="!entries.length" @click="openWizard">逐步录入</el-button>
        <span class="muted sm">逐项录入更清晰；下方为总览，也可直接在此修改。</span>
      </div>
      <div class="qms-card__body" style="padding:0">
        <div class="tbl-wrap">
          <table class="tbl" style="min-width:980px">
            <thead>
              <tr>
                <th>序号</th><th>检验项</th><th>标准值</th><th>公差</th><th>单位</th>
                <th>实测值</th><th>判定</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in entries" :key="e.id">
                <td>{{ e.no }}</td>
                <td>{{ e.name }}</td>
                <td class="muted">{{ e.std }}</td>
                <td class="muted">{{ e.tol }}</td>
                <td class="muted">{{ e.unit }}</td>
                <td><el-input v-model="e.val" size="small" style="width:120px" @input="onVal(e)" /></td>
                <td>
                  <!-- 定性项：直接人工判定 -->
                  <template v-if="e.select">
                    <el-select v-model="e.result" size="small" style="width:96px" clearable>
                      <el-option label="合格" value="合格" />
                      <el-option label="不合格" value="不合格" />
                    </el-select>
                  </template>
                  <!-- 定量项：具备标准判定规则 → 录入实测值后自动判定 -->
                  <template v-else-if="hasRule(e)">
                    <span v-if="e.result" class="pill" :class="rJudge(e.result)">{{ e.result }}</span>
                    <span v-else class="muted sm">录入后自动判定</span>
                  </template>
                  <!-- 定量项：无规则兜底 → 人工判定下拉框 -->
                  <template v-else>
                    <el-select v-model="e.result" size="small" style="width:96px" clearable placeholder="人工判定">
                      <el-option label="合格" value="合格" />
                      <el-option label="不合格" value="不合格" />
                    </el-select>
                  </template>
                </td>
              </tr>
              <tr v-if="!entries.length"><td colspan="7"><el-empty description="暂无检验项" /></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 处置/放行路径:独立卡片 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>处置 / 放行路径</h3><span class="tag">退货 / 返工 / 让步接收 / 紧急放行 / 豁免开工</span></div>
      <div class="qms-card__body">
        <div class="form-grid" style="padding:0;margin-top:0">
          <div class="form-row">
            <label>处置 / 放行路径</label>
            <div class="seg">
              <button :class="{ on: disposition === '退货' }" @click="disposition = '退货'">退货</button>
              <button :class="{ on: disposition === '返工' }" @click="disposition = '返工'">返工</button>
              <button :class="{ on: disposition === '让步接收' }" @click="disposition = '让步接收'">让步接收(需审批)</button>
              <button :class="{ on: disposition === '紧急放行' }" @click="disposition = '紧急放行'">紧急放行(需审批)</button>
              <button :class="{ on: disposition === '豁免开工' }" @click="disposition = '豁免开工'">豁免开工(需审批)</button>
            </div>
          </div>
          <div class="form-row">
            <label>备注</label>
            <input v-model="dispositionRemark" type="text" placeholder="可选填写" class="ng-input" />
          </div>
          <div class="form-row" v-if="needsApproval">
            <label></label>
            <div class="approval-hint">
              <span class="warn-dot">!</span>
              已选审批类路径，提交并签名后任务将进入「审批中心」，由质量主管审批；<b>审批通过后才放行（归档 + 首件数据写入 SPC 基准）</b>，驳回则不放行。
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header"><h3>{{ isThreeLevel ? '三级电子签名' : '两级电子签名' }}</h3><span class="tag">{{ signMethods.includes('password') ? '密码' : '' }}{{ signMethods.includes('handwriting') ? ' 手写' : '' }}{{ signMethods.includes('ca') ? ' CA' : '' }} 签名 · 提交后落库</span></div>
      <div class="qms-card__body">
        <div class="sign-grid">
          <div class="sign-row">
            <label>检验人</label>
            <el-input v-if="signMethods.includes('password')" v-model="inspectorPwd" type="password" show-password size="small" placeholder="输入密码签名" style="width:200px" />
            <el-button v-if="signMethods.includes('handwriting')" size="small" :loading="signing.inspector" @click="signBy('inspector','handwriting')">手写签名</el-button>
            <el-input v-if="signMethods.includes('ca')" v-model="inspectorCa" size="small" placeholder="CA 证书" style="width:160px" />
            <el-button v-if="signMethods.includes('ca')" size="small" :loading="signing.inspector" @click="signBy('inspector','ca')">CA 签名</el-button>
            <span v-if="signatures.inspector" class="pill g">{{ signatures.inspector }}</span>
          </div>
          <div class="sign-row">
            <label>复核人</label>
            <el-input v-if="signMethods.includes('password')" v-model="reviewerPwd" type="password" show-password size="small" placeholder="输入密码签名" style="width:200px" />
            <el-button v-if="signMethods.includes('handwriting')" size="small" :loading="signing.reviewer" @click="signBy('reviewer','handwriting')">手写签名</el-button>
            <el-input v-if="signMethods.includes('ca')" v-model="reviewerCa" size="small" placeholder="CA 证书" style="width:160px" />
            <el-button v-if="signMethods.includes('ca')" size="small" :loading="signing.reviewer" @click="signBy('reviewer','ca')">CA 签名</el-button>
            <span v-if="signatures.reviewer" class="pill g">{{ signatures.reviewer }}</span>
          </div>
          <div class="sign-row" v-if="isThreeLevel">
            <label>批准人</label>
            <el-input v-if="signMethods.includes('password')" v-model="approverPwd" type="password" show-password size="small" placeholder="输入密码签名" style="width:200px" />
            <el-button v-if="signMethods.includes('handwriting')" size="small" :loading="signing.approver" @click="signBy('approver','handwriting')">手写签名</el-button>
            <el-input v-if="signMethods.includes('ca')" v-model="approverCa" size="small" placeholder="CA 证书" style="width:160px" />
            <el-button v-if="signMethods.includes('ca')" size="small" :loading="signing.approver" @click="signBy('approver','ca')">CA 签名</el-button>
            <span v-if="signatures.approver" class="pill g">{{ signatures.approver }}</span>
          </div>
        </div>
        <div class="actions">
          <el-button type="primary" :loading="submitting" @click="submit">提交并签名</el-button>
          <el-button @click="reset">重置</el-button>
        </div>
        <div class="note">提交后检验数据写入数据库；按「触发与签名配置」中启用的签名方式签名（密码需输入口令，手写/CA 由后端按配置免密放行）。签名后不可篡改，哈希写入审计日志。当前为{{ isThreeLevel ? '三级' : '两级' }}签名；如需启用批准人，请在「触发与签名配置」中将签名节点设为「加批准人(三级)」。</div>
      </div>
    </div>

    <!-- 逐步录入向导：弹出分步页面，逐项依次录入 -->
    <el-dialog v-model="wizardVisible" title="检验项逐步录入" width="680px" :close-on-click-modal="false" class="fia-wizard" top="6vh">
      <div v-if="curItem" class="wz">
        <div class="wz-progress">
          <div class="wz-progress__bar">
            <div class="wz-progress__fill" :style="{ width: (wizardProgress.idx / wizardProgress.total * 100) + '%' }"></div>
          </div>
          <div class="wz-progress__txt">第 {{ wizardProgress.idx }} / {{ wizardProgress.total }} 项 · 已录入 {{ wizardProgress.done }} 项</div>
        </div>

        <div class="wz-item" :class="{ filled: isItemFilled(curItem) }">
          <div class="wz-item__head">
            <span class="wz-item__no">#{{ curItem.no }}</span>
            <span v-if="curItem.ctq" class="qms-pill r">CTQ</span>
            <span v-if="isItemFilled(curItem)" class="wz-done">✓ 已录入</span>
          </div>
          <div class="wz-item__name">{{ curItem.name }}</div>
          <div class="wz-item__std">
            标准值：<b>{{ curItem.std }}</b>
            <template v-if="curItem.tol"> · 公差 {{ curItem.tol }}</template>
            <template v-if="curItem.unit"> · {{ curItem.unit }}</template>
          </div>

          <div class="wz-field">
            <label>{{ curItem.select ? '判定结果' : '实测值' }}</label>
            <el-input v-if="!curItem.select" v-model="curItem.val" size="large" placeholder="请输入实测值" style="max-width: 320px" @keyup.enter="wizardNext" @input="onVal(curItem)" />
            <el-select v-else v-model="curItem.val" size="large" placeholder="请选择" style="max-width: 320px">
              <el-option label="合格" value="合格" />
              <el-option label="不合格" value="不合格" />
            </el-select>
          </div>

          <div class="wz-field" v-if="curItem.select">
            <label>判定</label>
            <el-select v-model="curItem.result" size="large" placeholder="请判定" style="max-width: 320px" clearable>
              <el-option label="合格" value="合格" />
              <el-option label="不合格" value="不合格" />
            </el-select>
          </div>
          <div class="wz-field" v-else>
            <template v-if="hasRule(curItem)">
              <label>判定（自动）</label>
              <span v-if="curItem.result" class="pill" :class="rJudge(curItem.result)">{{ curItem.result }}</span>
              <span v-else class="muted sm">录入实测值后自动判定</span>
            </template>
            <template v-else>
              <label>判定（人工）</label>
              <el-select v-model="curItem.result" size="large" placeholder="请判定" style="max-width: 320px" clearable>
                <el-option label="合格" value="合格" />
                <el-option label="不合格" value="不合格" />
              </el-select>
            </template>
          </div>
        </div>

        <div class="wz-nav">
          <el-button :disabled="wizardIdx === 0" @click="wizardPrev">← 上一项</el-button>
          <span class="wz-nav__hint">Enter 进入下一项</span>
          <el-button v-if="wizardIdx < entries.length - 1" type="primary" @click="wizardNext">下一项 →</el-button>
          <el-button v-else type="success" @click="wizardFinish">完成录入 ✓</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="wizardVisible = false">稍后继续</el-button>
        <el-button v-if="wizardIdx < entries.length - 1" type="primary" @click="wizardNext">下一项</el-button>
        <el-button v-else type="success" @click="wizardFinish">完成录入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.fia-entry { display: flex; flex-direction: column; gap: 14px; }
.meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 18px; }
.meta label { display: block; font-size: 12px; color: #909399; }
.meta b { font-size: 14px; }
.sign-grid { display: flex; flex-direction: column; gap: 12px; }
.sign-row { display: flex; align-items: center; gap: 10px; }
.sign-row label { width: 84px; font-size: 13px; color: #606266; }
.actions { margin-top: 14px; display: flex; gap: 10px; }
.note { font-size: 12px; color: #909399; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 8px 12px; border-radius: 6px; margin-top: 12px; }
.muted.sm { font-size: 12px; color: #909399; }

// === 分步录入向导 ===
.fia-wizard .el-dialog__body { padding-top: 10px; }
.wz { display: flex; flex-direction: column; gap: 16px; }
.wz-progress__bar { height: 8px; background: #eef2f7; border-radius: 6px; overflow: hidden; }
.wz-progress__fill { height: 100%; background: linear-gradient(90deg, #1e4d8b, #3a7bd5); transition: width .25s ease; }
.wz-progress__txt { font-size: 12px; color: #606266; margin-top: 6px; }
.wz-item { border: 1px solid #e1e8f0; border-radius: 10px; padding: 20px 22px; background: #fff; transition: border-color .2s, box-shadow .2s; }
.wz-item.filled { border-color: #67c23a; box-shadow: 0 0 0 2px rgba(103,194,58,.12); }
.wz-item__head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.wz-item__no { font-size: 13px; color: #1e4d8b; font-weight: 700; background: #eaf1fb; border-radius: 6px; padding: 2px 10px; }
.wz-done { margin-left: auto; font-size: 12px; color: #67c23a; font-weight: 600; }
.wz-item__name { font-size: 20px; font-weight: 700; color: #1f2d3d; margin-bottom: 6px; }
.wz-item__std { font-size: 13px; color: #5a6b7e; margin-bottom: 16px; }
.wz-field { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.wz-field label { width: 70px; font-size: 13px; color: #606266; flex: none; }
.wz-nav { display: flex; align-items: center; gap: 12px; justify-content: center; }
.wz-nav__hint { font-size: 12px; color: #b0b8c4; }

// === 与 HTML 原型 康立QMS-完整版.html 一致 ===
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: 12.5px; color: #5a6b7e; margin-bottom: 4px; }
.seg { display: inline-flex; border: 1px solid #e1e8f0; border-radius: 6px; overflow: hidden; }
.seg button { border: none; background: #fff; padding: 6px 14px; font-size: 12px; cursor: pointer; color: #5a6b7e; }
.seg button.on { background: #1e4d8b; color: #fff; }
.ng-input { border: 1px solid #e1e8f0; border-radius: 6px; padding: 0 10px; font-size: 12.5px; outline: none; width: 100%; max-width: 240px; height: 30px; line-height: 30px; box-sizing: border-box; }
.approval-hint { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.6; color: #8a6d1a; background: #fff8e6; border: 1px solid #f4e0a3; border-radius: 6px; padding: 8px 12px; }
.approval-hint .warn-dot { flex: none; width: 16px; height: 16px; line-height: 16px; text-align: center; border-radius: 50%; background: #e6a23c; color: #fff; font-weight: 700; font-size: 11px; margin-top: 1px; }
@media (max-width: 1100px) { .form-grid { grid-template-columns: 1fr; } }
</style>
