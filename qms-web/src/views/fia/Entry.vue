<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import ScanInput from '@/components/common/ScanInput.vue'
import { fiaInspMeta, fiaInspEntries } from '@/mock/fia'
import type { FiaInspEntry } from '@/types/fia'

const authStore = useAuthStore()
const banner = BANNERS.fia?.[authStore.role] || {
  title: '首件检验 · 检验录入',
  desc: '逐项录入实测值，实时公差判定并两级电子签名',
}

const meta = reactive({ ...fiaInspMeta })
const entries = ref<FiaInspEntry[]>(
  fiaInspEntries.map((e) => ({ ...e })),
)


function parseRange(tol: string) {
  if (tol.startsWith('±')) return { type: 'pm', tol: parseFloat(tol.slice(1)) }
  if (tol.startsWith('≥')) return { type: 'ge', lsl: parseFloat(tol.slice(1)) }
  if (tol.startsWith('≤')) return { type: 'le', usl: parseFloat(tol.slice(1)) }
  if (tol.includes('-')) {
    const [a, b] = tol.split('-').map((x) => parseFloat(x.trim()))
    if (!isNaN(a) && !isNaN(b)) return { type: 'range', lsl: a, usl: b }
  }
  return { type: 'na' }
}

function judgeEntry(it: FiaInspEntry): 'g' | 'y' | 'r' | '' {
  if (it.select) {
    if (it.val === '不合格') return 'r'
    if (it.val === '合格') return 'g'
    return ''
  }
  if (!it.val) return ''
  const v = parseFloat(it.val)
  if (isNaN(v)) return ''
  const r = parseRange(it.tol)
  let pass = true
  if (r.type === 'pm') pass = Math.abs(v - parseFloat(it.std)) <= r.tol
  else if (r.type === 'ge') pass = v >= r.lsl
  else if (r.type === 'le') pass = v <= r.usl
  else if (r.type === 'range') pass = v >= r.lsl && v <= r.usl
  if (pass) return 'g'
  return it.ctq ? 'r' : 'y'
}
const judgeText: Record<string, string> = { g: '合格', y: '警告', r: '不合格', '': '待录' }

/* 整单判定：CTQ 超差→不合格；非关键超差→警告；否则合格 */
const overall = computed(() => {
  let ctqBad = false
  let warn = false
  for (const it of entries.value) {
    const j = judgeEntry(it)
    if (j === 'r') ctqBad = it.ctq || ctqBad
    if (j === 'r' || j === 'y') warn = true
  }
  if (ctqBad) return { cls: 'r', text: '整单判定：不合格', meta: '任一关键 CTQ 参数超差即整单不合格，已标注超差项' }
  if (warn) return { cls: 'y', text: '整单判定：警告', meta: '非关键参数超差，需检验员人工确认' }
  return { cls: 'g', text: '整单判定：合格', meta: '所有项目均满足公差要求' }
})

/* 不合格处置路径 */
const disp = ref<'退货' | '返工' | '让步接收'>('退货')
function setDisp(name: '退货' | '返工' | '让步接收') {
  disp.value = name
  if (name === '让步接收') ElMessage.warning('让步接收需质量主管审批')
}
const dispNote = ref('')

/* 两级电子签名 */
const inspector = reactive({ user: 'zhangjian', pwd: '123456' })
const reviewer = reactive({ user: 'lifuh', pwd: '123456' })
const failCount = ref(0)
const locked = ref(false)
const signedHash = ref('')

function genHash() {
  const base =
    JSON.stringify(entries.value.map((e) => ({ no: e.no, val: e.val }))) +
    inspector.user + reviewer.user + Date.now()
  let h = 0
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0
  return '0x' + h.toString(16).toUpperCase().padStart(8, '0') + Math.random().toString(16).slice(2, 10).toUpperCase()
}

function submit() {
  if (locked.value) { ElMessage.error('签名已锁定，请 5 分钟后再试'); return }
  const empty = entries.value.find((e) => !e.select && e.val === '')
  if (empty) { ElMessage.error(`请先录入「${empty.name}」实测值`); return }
  if (!inspector.user || !inspector.pwd) { ElMessage.warning('请填写检验人用户名与密码'); return }
  if (!reviewer.user || !reviewer.pwd) { ElMessage.warning('请填写复核人用户名与密码'); return }
  if (inspector.pwd !== '123456' || reviewer.pwd !== '123456') {
    failCount.value++
    if (failCount.value >= 3) { locked.value = true; setTimeout(() => { locked.value = false; failCount.value = 0 }, 5 * 60 * 1000) }
    ElMessage.error(failCount.value >= 3 ? '连续 3 次密码错误，签名锁定 5 分钟' : '用户名或密码错误')
    return
  }
  signedHash.value = genHash()
  ElMessage.success('整单哈希已写入审计日志，提交并签名成功')
}
function saveDraft() { ElMessage.info('已暂存草稿') }

function viewArchive() { ElMessage.info(`调阅归档报告 ${meta.code}（演示）`) }
function onScan(v: string) { ElMessage.success(`已识别工单：${v || meta.wo}`) }
</script>

<template>
  <div class="fia-entry">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">✍️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="filter-bar">
      <ScanInput placeholder="扫码识别工单号" @scan="onScan" />
    </div>


    <div class="qms-card">
      <div class="qms-card__header">
        <h3>检验录入 · {{ meta.code }}</h3>
        <span class="tag">PC端 · 实时公差判定</span>
        <div class="sp" />
        <el-button size="small" @click="viewArchive">查看归档</el-button>
      </div>
      <div class="meta-row">
        <span>工单：<b>{{ meta.wo }}</b></span>
        <span>产品：<b>{{ meta.prod }}</b></span>
        <span>工序：<b>{{ meta.proc }}</b></span>
        <span>触发：<b>{{ meta.trig }}</b></span>
        <span>批次：<b>{{ meta.batch }}</b></span>
        <span>检验标准：<b>{{ meta.std }}</b></span>
        <span>AQL：<b>{{ meta.aql }}</b></span>
        <span>抽样：<b>{{ meta.sample }}</b></span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <table class="insp-table">
          <thead>
            <tr>
              <th>序号</th><th>检测项</th><th>关键CTQ</th><th>标准值</th><th>公差</th><th>实测值</th><th>判定</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in entries" :key="it.no">
              <td>{{ it.no }}</td>
              <td>{{ it.name }}</td>
              <td class="ctq-cell"><span v-if="it.ctq" class="pill p">CTQ</span><span v-else>-</span></td>
              <td>{{ it.std }}</td>
              <td>{{ it.tol }} {{ it.unit }}</td>
              <td class="val-cell">
                <el-select v-if="it.select" v-model="it.val" size="small" style="width: 110px">
                  <el-option label="合格" value="合格" />
                  <el-option label="不合格" value="不合格" />
                </el-select>
                <el-input v-else v-model="it.val" size="small" placeholder="录入" style="width: 130px" />
              </td>
              <td><span class="pill" :class="judgeEntry(it) || 'gray'">{{ judgeText[judgeEntry(it)] }}</span></td>
            </tr>
          </tbody>
        </table>
        <div class="qms-card__body">
          <div class="overall-judge">
            <span class="pill" :class="overall.cls">{{ overall.text }}</span>
            <span class="meta">{{ overall.meta }}</span>
          </div>
          <div class="ex-box">
            未填完必填项将阻止提交并高亮遗漏项；非关键参数超差为警告，由检验员人工确认。
          </div>
          <div class="form-grid" style="margin-top: 14px">
            <div class="form-row">
              <label>不合格处置路径 </label>
              <div class="seg">
                <el-button :type="disp === '退货' ? 'primary' : 'default'" size="small" @click="setDisp('退货')">退货</el-button>
                <el-button :type="disp === '返工' ? 'primary' : 'default'" size="small" @click="setDisp('返工')">返工</el-button>
                <el-button :type="disp === '让步接收' ? 'primary' : 'default'" size="small" @click="setDisp('让步接收')">让步接收(需审批)</el-button>
              </div>
            </div>
            <div class="form-row full">
              <label>备注</label>
              <el-input v-model="dispNote" size="small" placeholder="可选填写" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 电子签名（检验人 + 复核人 两级） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>电子签名（检验人 + 复核人 两级）</h3>
        <span class="tag">用户名+密码 · 整单签名</span>
      </div>
      <div class="qms-card__body">
        <div class="form-grid">
          <div class="form-row">
            <label>检验人签名 <span class="req">*</span>（先签）</label>
            <el-input v-model="inspector.user" size="small" placeholder="用户名" />
            <el-input v-model="inspector.pwd" type="password" size="small" placeholder="密码" show-password />
          </div>
          <div class="form-row">
            <label>复核人签名 <span class="req">*</span>（后签）</label>
            <el-input v-model="reviewer.user" size="small" placeholder="用户名" />
            <el-input v-model="reviewer.pwd" type="password" size="small" placeholder="密码" show-password />
          </div>
        </div>
        <div class="ex-box">
          连续 3 次密码错误锁定签名 5 分钟；复核驳回退回检验员，检验员签名保留并标注「已退回」。
        </div>
        <div class="ac-box">
          <ul>
            <li>签名记录含签名人、时间戳、IP</li>
            <li>整单签名生成内容哈希写入不可篡改审计日志</li>
            <li>签名后任何字段修改标记签名失效并记录修改详情</li>
          </ul>
        </div>
        <div v-if="signedHash" class="overall-judge">
          <span class="pill g">已签名</span>
          <span class="meta">整单内容哈希：{{ signedHash }}（已写入审计日志）</span>
        </div>
        <div class="toolbar" style="border-top: 1px dashed var(--el-border-color); padding-top: 12px; margin-top: 12px">
          <el-button type="primary" @click="submit">提交并签名</el-button>
          <el-button @click="saveDraft">暂存</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fia-entry { display: flex; flex-direction: column; gap: 14px; }
.filter-bar { display: flex; gap: 10px; align-items: center; }
</style>
