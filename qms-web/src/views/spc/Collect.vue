<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import ScanInput from '@/components/common/ScanInput.vue'
import { spcParams, spcCollectTasks, spcImportHistory } from '@/mock/spc'
import type { SpcCollectTask, SpcImportRecord } from '@/types/spc'

const authStore = useAuthStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC · 数据采集',
  desc: '现场数据采集、扫码录入与批量导入',
}

// 参数下拉： "注塑压力(MPa)" 形式
const paramOptions = computed(() => spcParams.map((p) => `${p.p}(${p.unit})`))
function paramName(v: string) { return v.replace(/\(.*\)/, '') }
function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)) }

// 顶部方式切换
const mode = ref<'manual' | 'import'>('manual')

// 文件导入：隐藏 file input
const fileInput = ref<HTMLInputElement>()

// 模板下载子模式默认类型
const tplType = ref<'csv' | 'excel' | 'json'>('csv')

// 采集任务
const collectTasks = ref<SpcCollectTask[]>([...spcCollectTasks])

// 我的采集记录（对齐 HTML 硬编码表）
const myRecords = ref([
  { time: '10:20', par: '注塑压力', xbar: 128.9, r: 2.4, judge: '合格' },
  { time: '10:05', par: '注塑压力', xbar: 132.5, r: 3.8, judge: '不合格' },
  { time: '09:50', par: '注塑压力', xbar: 129.1, r: 2.1, judge: '合格' },
])

// ====== 数据完整性校验（SR-SPC-003）：预定采集点未录入 → 标记"缺失"并告警班组长；停产不告警 ======
const nowRef = ref('10:55') // 演示用当前时钟（模拟已越过多个采集时点）
function toMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const stopped = reactive<Record<string, boolean>>({})
const missingTasks = computed(() =>
  collectTasks.value.filter((t) => t.st === '待采集' && t.due !== '-' && !stopped[t.par] && toMin(t.due) < toMin(nowRef.value)),
)
const missingCount = computed(() => missingTasks.value.length)
function toggleStop(par: string) {
  stopped[par] = !stopped[par]
  ElMessage.info(stopped[par] ? `${par} 已标记停产，采集缺失不再告警` : `${par} 已取消停产标记`)
}
function fillMissing(par: string) {
  entry.param = `${par}(${spcParams.find((p) => p.p === par)?.unit})`
  ElMessage.info(`请补录 ${par} 的测量值后提交`)
}

// ====== 子组基线充分性（SR-SPC-007 / SR-PTL-001）：子组数 < 25 → 标注"数据不足，结果仅供参考" ======
const subgroupCounts: Record<string, number> = reactive({ 注塑压力: 25, 焊接温度: 8, 组装扭矩: 5, 密封性: 12 })
function curParamName() { return paramName(entry.param) }
function curSubgroups() { return subgroupCounts[curParamName()] ?? 0 }
const baseline = computed(() => {
  const n = curSubgroups()
  return { n, enough: n >= 25, pct: Math.min(100, Math.round((n / 25) * 100)) }
})


// 手动录入表单
const entry = reactive({ proc: '注塑', param: paramOptions.value[0], vals: ['128.5', '129.1', '127.8', '130.2', '128.9'] })
function submitEntry() {
  const nums = entry.vals.map(Number).filter((v) => !isNaN(v))
  if (!nums.length) { ElMessage.warning('请录入参数值'); return }
  const xbar = nums.reduce((a, b) => a + b, 0) / nums.length
  const r = Math.max(...nums) - Math.min(...nums)
  const name = paramName(entry.param)
  myRecords.value.unshift({ time: new Date().toTimeString().slice(0, 5), par: name, xbar: +xbar.toFixed(1), r: +r.toFixed(1), judge: '合格' })
  const tk = collectTasks.value.find((t) => t.par === name)
  if (tk) tk.st = '已完成'
  if (subgroupCounts[name] != null) subgroupCounts[name] += 1
  else subgroupCounts[name] = 1
  ElMessage.success('采集已提交，控制图已刷新')
  entry.vals = ['', '', '', '', '']
}

// 文件导入：子模式
const importSubs = [
  { key: 'file', label: '📁 文件导入' },
  { key: 'paste', label: '📋 粘贴导入' },
  { key: 'batch', label: '✏️ 批量手动' },
  { key: 'template', label: '📄 模板下载' },
  { key: 'scan', label: '📱 扫码导入' },
] as const
type ImportSub = (typeof importSubs)[number]['key']
const importSub = ref<ImportSub>('file')
const currentSubLabel = computed(() => importSubs.find((s) => s.key === importSub.value)?.label || '')
const importParam = ref(paramOptions.value[0])

// 导入历史
const importHistory = ref<SpcImportRecord[]>([...spcImportHistory])
function pillClass(s: SpcImportRecord['status']) { return s === '成功' ? 'g' : s === '部分成功' ? 'y' : 'r' }
function addImportRecord(fileName: string, paramName: string, records: number, status: SpcImportRecord['status'], size: string) {
  importHistory.value.unshift({
    id: 'IMP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(importHistory.value.length + 1).padStart(3, '0'),
    fileName, paramName, records, status,
    time: new Date().toLocaleString('zh-CN'),
    operator: authStore.currentRole?.name || authStore.role,
    errors: 0, size,
  })
}

// 预览表格样式（内联，确保 ElMessageBox 弹窗内生效）
const TH = 'style="border:1px solid #e1e8f0;padding:4px 6px;text-align:center;background:#f5f8fc;font-size:12px"'
const TD = 'style="border:1px solid #e1e8f0;padding:4px 6px;text-align:center;font-size:12px"'
const TD_M = 'style="border:1px solid #e1e8f0;padding:4px 6px;text-align:center;font-size:12px;color:#8a9bb0"'

// 文件导入模拟预览
const FILE_PREVIEW: [string, number[]][] = [
  ['10:00', [128.5, 129.1, 127.8, 128.9, 128.7]],
  ['10:30', [128.2, 129.5, 128.0, 129.2, 128.6]],
  ['11:00', [128.8, 128.4, 129.0, 128.5, 129.1]],
  ['11:30', [129.2, 128.6, 128.9, 129.3, 128.4]],
  ['12:00', [128.7, 129.0, 128.5, 128.8, 129.2]],
]
function filePreviewRows() {
  return FILE_PREVIEW.map((r, i) => {
    const xbar = (r[1].reduce((a, b) => a + b, 0) / r[1].length).toFixed(2)
    const rg = (Math.max(...r[1]) - Math.min(...r[1])).toFixed(1)
    return `<tr><td ${TD}>${i + 1}</td><td ${TD_M}>${r[0]}</td>${r[1].map((x) => `<td ${TD}>${x}</td>`).join('')}<td ${TD}>${xbar}</td><td ${TD}>${rg}</td></tr>`
  }).join('')
}
function simulateFileImport() {
  const param = paramName(importParam.value)
  const html =
    `<table style="width:100%;border-collapse:collapse;margin:4px 0"><thead><tr>` +
    ['子组', '时间', 'X1', 'X2', 'X3', 'X4', 'X5', 'Xbar', 'R'].map((h) => `<th ${TH}>${h}</th>`).join('') +
    `</tr></thead><tbody>${filePreviewRows()}</tbody></table>` +
    `<div style="font-size:12px;color:#2f7d32;margin-top:6px">✓ 格式校验通过 · 共 25 条记录 · 预计导入时间 &lt; 2秒</div>`
  ElMessageBox.confirm(html, `文件导入确认 · ${param}`, {
    confirmButtonText: '确认导入', cancelButtonText: '取消', dangerouslyUseHTMLString: true,
  }).then(() => {
    addImportRecord(`SPC_${param}_批量数据.csv`, param, 25, '成功', '12.5 KB')
    ElMessage.success('文件导入成功！25条记录已写入SPC数据库，控制图已刷新')
  }).catch(() => {})
}

// 粘贴导入
const pasteData = ref('')
function parsePasteImport() {
  const raw = pasteData.value.trim()
  if (!raw) { ElMessage.warning('请先粘贴数据'); return }
  const lines = raw.split(/\n/).filter((l) => l.trim())
  const param = paramName(importParam.value)
  let valid = 0
  const rows = lines.slice(0, 5).map((line) => {
    const cols = line.trim().split(/[\s,，]+/).filter((c) => c !== '')
    const time = cols[0] && isNaN(Number(cols[0])) ? cols.shift()! : '-'
    const vals = cols.slice(0, 5).map(Number).filter((v) => !isNaN(v))
    if (vals.length >= 3) valid++
    const xbar = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '-'
    return `<tr><td ${TD_M}>${esc(time)}</td>${vals.slice(0, 5).map((v) => `<td ${TD}>${v}</td>`).join('')}<td ${TD}>${xbar}</td></tr>`
  }).join('')
  const html =
    `<table style="width:100%;border-collapse:collapse;margin:4px 0"><thead><tr>` +
    ['时间', 'X1', 'X2', 'X3', 'X4', 'X5', 'Xbar'].map((h) => `<th ${TH}>${h}</th>`).join('') +
    `</tr></thead><tbody>${rows}</tbody></table>` +
    `<div style="font-size:12px;color:#5a6b7e;margin-top:6px">共解析 ${lines.length} 行，有效 ${valid} 行；无效行将跳过。</div>`
  ElMessageBox.confirm(html, `粘贴导入预览 · ${param}`, {
    confirmButtonText: '确认导入', cancelButtonText: '取消', dangerouslyUseHTMLString: true,
  }).then(() => {
    addImportRecord('SPC_粘贴导入.txt', param, valid, '成功', '1.2 KB')
    ElMessage.success('粘贴导入成功！数据已写入 SPC 数据库')
  }).catch(() => {})
}

// 批量手动
const batchGroups = reactive(Array.from({ length: 5 }, () => ({ t: '', vals: ['', '', '', '', ''] })))
function parseBatchManual() {
  const param = paramName(importParam.value)
  const rows: string[] = []
  batchGroups.forEach((g, i) => {
    const nums = g.vals.map(Number).filter((v) => !isNaN(v))
    if (nums.length) {
      const xbar = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
      rows.push(`<tr><td ${TD}>#${i + 1}</td><td ${TD_M}>${esc(g.t)}</td>${g.vals.map((v) => `<td ${TD}>${v !== '' ? v : '-'}</td>`).join('')}<td ${TD}>${xbar}</td></tr>`)
    }
  })
  if (!rows.length) { ElMessage.warning('请至少输入一组测量值'); return }
  const html =
    `<table style="width:100%;border-collapse:collapse;margin:4px 0"><thead><tr>` +
    ['子组', '时间', 'X1', 'X2', 'X3', 'X4', 'X5', 'Xbar'].map((h) => `<th ${TH}>${h}</th>`).join('') +
    `</tr></thead><tbody>${rows.join('')}</tbody></table>`
  ElMessageBox.confirm(html, `批量手动录入预览 · ${param}`, {
    confirmButtonText: '确认导入', cancelButtonText: '取消', dangerouslyUseHTMLString: true,
  }).then(() => {
    addImportRecord('SPC_批量手动录入.json', param, rows.length, '成功', '0.8 KB')
    ElMessage.success('批量手动录入成功！数据已写入 SPC 数据库')
  }).catch(() => {})
}

// 模板下载
function downloadTemplate(type: 'csv' | 'excel' | 'json' = 'csv') {
  const param = paramName(importParam.value)
  let content = '', filename = '', mime = ''
  if (type === 'csv') {
    content = '子组号,时间,测量值1,测量值2,测量值3,测量值4,测量值5\n1,08:00,128.5,129.1,127.8,128.9,128.7\n2,08:30,128.2,129.5,128.0,129.2,128.6\n'
    filename = `SPC_Import_Template_${param}.csv`; mime = 'text/csv;charset=utf-8;'
  } else if (type === 'excel') {
    content = 'Excel模板为演示下载，实际项目中请使用后端生成的 .xlsx 文件。'
    filename = `SPC_Import_Template_${param}.xlsx`; mime = 'application/octet-stream'
  } else {
    content = JSON.stringify([
      { subgroup: 1, time: '08:00', values: [128.5, 129.1, 127.8, 128.9, 128.7] },
      { subgroup: 2, time: '08:30', values: [128.2, 129.5, 128.0, 129.2, 128.6] },
    ], null, 2)
    filename = `SPC_Import_Template_${param}.json`; mime = 'application/json'
  }
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('模板已下载：' + filename)
}

// 扫码导入
const scanCode = ref('')
function onScan(v: string) { scanCode.value = v; scanImportFromScan() }
function scanImportFromScan() {
  const code = scanCode.value.trim()
  if (!code) { ElMessage.warning('请输入或扫描条码'); return }
  const param = paramName(importParam.value)
  const rows = FILE_PREVIEW.map((r) => {
    const xbar = (r[1].reduce((a, b) => a + b, 0) / r[1].length).toFixed(2)
    return `<tr><td ${TD_M}>${r[0]}</td>${r[1].map((x) => `<td ${TD}>${x}</td>`).join('')}<td ${TD}>${xbar}</td></tr>`
  }).join('')
  const html =
    `<div style="font-size:12px;margin:4px 0">已根据条码 <b>${esc(code)}</b> 关联到最近 5 条子组数据。</div>` +
    `<table style="width:100%;border-collapse:collapse;margin:4px 0"><thead><tr>` +
    ['时间', 'X1', 'X2', 'X3', 'X4', 'X5', 'Xbar'].map((h) => `<th ${TH}>${h}</th>`).join('') +
    `</tr></thead><tbody>${rows}</tbody></table>`
  ElMessageBox.confirm(html, `扫码导入预览 · ${code}`, {
    confirmButtonText: '确认导入', cancelButtonText: '取消', dangerouslyUseHTMLString: true,
  }).then(() => {
    addImportRecord(`扫码_${code}.json`, param, FILE_PREVIEW.length, '成功', '0.9 KB')
    ElMessage.success(`扫码导入成功！条码 ${code} 的数据已写入 SPC 数据库`)
    scanCode.value = ''
  }).catch(() => {})
}
</script>

<template>
  <div class="spc-collect">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🛰️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 录入方式切换 -->
    <div class="toolbar">
      <span class="lbl">数据录入方式：</span>
      <div class="seg">
        <el-button :type="mode === 'manual' ? 'primary' : 'default'" size="small" @click="mode = 'manual'">✏️ 手动录入</el-button>
        <el-button :type="mode === 'import' ? 'primary' : 'default'" size="small" @click="mode = 'import'">📁 文件导入</el-button>
      </div>
      <span class="sp"></span>
      <span class="meta">{{ mode === 'manual' ? '人工逐条录入，适合实时采集' : '批量文件导入，适合历史数据迁移' }}</span>
    </div>

    <!-- 手动录入 -->
    <template v-if="mode === 'manual'">
      <!-- 采集缺失告警（SR-SPC-003） -->
      <el-alert
        v-if="missingCount" type="error" show-icon :closable="false" style="margin-bottom: 14px"
        :title="`采集缺失告警（${missingCount} 项）：${missingTasks.map(m => m.par).join('、')} 已达采集时点未录入，系统已推送班组长（企业微信）`"
        description="计划停产的采集点请勾选「停产」排除，否则到点未录入将触发告警。"
      />

      <div class="chart-grid chart-grid--2">
        <div class="qms-card">
          <div class="qms-card__header">
            <h3>采集任务列表</h3>
            <span class="tag">一期人工录入</span>
          </div>
          <div class="qms-card__body">
            <div class="list">
              <div class="list-row" v-for="t in collectTasks" :key="t.par">
                <span class="grow">
                  <b>{{ t.par }}</b> · {{ t.proc }} · 频率 {{ t.freq }}<br>
                  <span class="meta">上次值 {{ t.last }} · 下次采集 {{ t.due }}</span>
                </span>
                <template v-if="t.st === '已完成'">
                  <span class="qms-pill g">已完成</span>
                </template>
                <template v-else-if="missingTasks.some(m => m.par === t.par)">
                  <span class="qms-pill r">缺失</span>
                  <el-button size="small" type="warning" plain @click="fillMissing(t.par)">补录</el-button>
                </template>
                <template v-else>
                  <el-checkbox v-model="stopped[t.par]" @change="toggleStop(t.par)" title="标记停产后该采集点不触发缺失告警">停产</el-checkbox>
                  <el-button type="primary" size="small" @click="entry.param = `${t.par}(${spcParams.find(p => p.p === t.par)?.unit})`; mode = 'manual'">录入</el-button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="qms-card">
          <div class="qms-card__header"><h3>数据录入</h3></div>
          <div class="qms-card__body">
            <div class="form-grid">
              <div class="form-row">
                <label>工序</label>
                <el-select v-model="entry.proc" style="width: 120px">
                  <el-option label="注塑" value="注塑" />
                  <el-option label="焊接" value="焊接" />
                </el-select>
              </div>
              <div class="form-row">
                <label>参数</label>
                <el-select v-model="entry.param" style="width: 160px">
                  <el-option v-for="o in paramOptions" :key="o" :label="o" :value="o" />
                </el-select>
              </div>
              <div class="form-row">
                <label>子组测量值(5个)</label>
                <div class="val-row">
                  <el-input v-for="(v, i) in entry.vals" :key="i" v-model="entry.vals[i]" style="width: 64px" />
                </div>
              </div>
            </div>
            <div class="note">系统自动记录录入时间、操作员、子组信息；异常值(如负数尺寸)弹出确认。</div>
            <el-button type="primary" size="small" @click="submitEntry">提交</el-button>
          </div>
        </div>
      </div>

      <div class="qms-card">
        <div class="qms-card__header"><h3>我的采集记录</h3><span class="tag">今日</span></div>
        <div class="qms-card__body" style="padding: 0">
          <el-table :data="myRecords" border size="small">
            <el-table-column prop="time" label="时间" width="80" />
            <el-table-column prop="par" label="参数" width="100" />
            <el-table-column prop="xbar" label="Xbar" width="80" />
            <el-table-column prop="r" label="R" width="80" />
            <el-table-column label="判定" width="90">
              <template #default="{ row }"><span class="qms-pill" :class="row.judge === '合格' ? 'g' : 'r'">{{ row.judge }}</span></template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 基线数据充分性（SR-SPC-007 / SR-PTL-001）：子组数 < 25 标注数据不足 -->
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>基线数据充分性（子组数 &lt; 25）</h3>
          <span class="tag">当前参数 {{ curParamName() }}</span>
        </div>
        <div class="qms-card__body">
          <div class="form-grid">
            <div class="form-row"><label>当前参数</label><b>{{ curParamName() }}</b></div>
            <div class="form-row"><label>已采集子组</label><b :class="baseline.enough ? 'ok' : 'bad'">{{ baseline.n }} / 25</b></div>
            <div class="form-row">
              <label>基线建立进度</label>
              <el-progress :percentage="baseline.pct" :status="baseline.enough ? 'success' : ''" style="width: 220px" />
            </div>
          </div>
          <div class="note warn" v-if="!baseline.enough">
            ⚠ 子组数 {{ baseline.n }} &lt; 25，控制限（UCL/LCL/CL）仅供参考，过程能力指数 CPK/PPK 暂不正式计算；达到 25 子组后自动建立基线。
          </div>
          <div class="note ok-note" v-else>
            ✓ 子组数已达 25，控制基线与过程能力指数已正式生效。
          </div>
        </div>
      </div>

      <div class="note">⚠ 采集失败/缺失：预定采集点未录入则标记"缺失"并告警班组长（企业微信）；计划停产请勾选「停产」排除，否则触发告警。子组数 &lt; 25 时控制限仅供参考。二期支持 OPC UA/Modbus/MQTT/HTTP 自动采集。</div>
    </template>

    <!-- 文件导入 -->
    <template v-else>
      <div class="seg subseg">
        <el-button v-for="s in importSubs" :key="s.key" :type="importSub === s.key ? 'primary' : 'default'" size="small" @click="importSub = s.key">{{ s.label }}</el-button>
      </div>

      <div class="chart-grid chart-grid--2">
        <div class="qms-card">
          <div class="qms-card__header"><h3>{{ currentSubLabel }}</h3><span class="tag">批量录入</span></div>
          <div class="qms-card__body">
            <div class="form-grid">
              <div class="form-row">
                <label>选择参数 <span class="req">*</span></label>
                <el-select v-model="importParam" style="width: 180px">
                  <el-option v-for="o in paramOptions" :key="o" :label="o" :value="o" />
                </el-select>
              </div>

              <!-- 文件导入 -->
              <template v-if="importSub === 'file'">
                <div class="drop" @click="fileInput?.click()">
                  <div class="ico">📂</div>
                  <div class="pri">点击或拖拽上传</div>
                  <div class="meta">支持 .csv / .xlsx / .xls</div>
                </div>
                <input ref="fileInput" type="file" accept=".csv,.xlsx,.xls" hidden @change="simulateFileImport()" />
                <div class="note">CSV格式：子组号,时间,测量值1,测量值2,测量值3,测量值4,测量值5；首行可为表头，系统将自动识别；时间格式支持 2024-01-01 08:00:00</div>
                <div class="btn-row">
                  <el-button type="primary" @click="simulateFileImport">解析预览</el-button>
                  <el-button @click="downloadTemplate('csv')">下载模板</el-button>
                </div>
              </template>

              <!-- 粘贴导入 -->
              <template v-else-if="importSub === 'paste'">
                <div class="form-row">
                  <label>粘贴数据 <span class="req">*</span></label>
                  <el-input v-model="pasteData" type="textarea" :rows="8" class="full"
                    placeholder="支持从 Excel 复制粘贴，每行一个子组：&#10;10:00 128.5 129.1 127.8 128.9 128.7&#10;10:30 128.2 129.5 128.0 129.2 128.6" />
                </div>
                <div class="note">每行：时间 测量值1 测量值2 测量值3 测量值4 测量值5；时间可省略，系统将自动按当前班次补齐。</div>
                <div class="btn-row">
                  <el-button type="primary" @click="parsePasteImport">解析预览</el-button>
                  <el-button @click="downloadTemplate('csv')">下载模板</el-button>
                </div>
              </template>

              <!-- 批量手动 -->
              <template v-else-if="importSub === 'batch'">
                <div class="note">在下方表格中直接输入多组测量值，系统自动计算 Xbar 和 R。</div>
                <table class="batch-tbl">
                  <thead><tr><th>子组</th><th>时间</th><th>X1</th><th>X2</th><th>X3</th><th>X4</th><th>X5</th></tr></thead>
                  <tbody>
                    <tr v-for="(g, i) in batchGroups" :key="i">
                      <td>#{{ i + 1 }}</td>
                      <td><el-input v-model="g.t" style="width: 70px" placeholder="10:0" /></td>
                      <td v-for="j in 5" :key="j"><el-input v-model="g.vals[j - 1]" style="width: 55px" /></td>
                    </tr>
                  </tbody>
                </table>
                <div class="btn-row">
                  <el-button type="primary" @click="parseBatchManual">解析预览</el-button>
                  <el-button @click="downloadTemplate('csv')">下载模板</el-button>
                </div>
              </template>

              <!-- 模板下载 -->
              <template v-else-if="importSub === 'template'">
                <div class="form-row">
                  <label>模板类型</label>
                  <el-select v-model="tplType" style="width: 180px">
                    <el-option label="CSV 模板（推荐）" value="csv" />
                    <el-option label="Excel 模板" value="excel" />
                    <el-option label="JSON 数据模板" value="json" />
                  </el-select>
                </div>
                <div class="note" style="white-space: pre">子组号,时间,测量值1,测量值2,测量值3,测量值4,测量值5
1,08:00,128.5,129.1,127.8,128.9,128.7
2,08:30,128.2,129.5,128.0,129.2,128.6</div>
                <div class="btn-row">
                  <el-button type="primary" @click="downloadTemplate('csv')">下载 CSV 模板</el-button>
                  <el-button @click="downloadTemplate('excel')">下载 Excel 模板</el-button>
                  <el-button @click="downloadTemplate('json')">下载 JSON 模板</el-button>
                </div>
              </template>

              <!-- 扫码导入 -->
              <template v-else-if="importSub === 'scan'">
                <div class="form-row">
                  <label>扫码输入 <span class="req">*</span></label>
                  <ScanInput placeholder="请使用扫码枪扫描条码，或手动输入批次号/工单号" @scan="onScan" />
                </div>
                <div class="note">支持：产品条码、批次号、工单号；扫码后自动关联最近 5 条子组数据。</div>
                <div class="btn-row">
                  <el-button type="primary" @click="scanImportFromScan">模拟扫码导入</el-button>
                  <el-button @click="downloadTemplate('csv')">下载模板</el-button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="qms-card">
          <div class="qms-card__header"><h3>导入历史</h3><span class="tag">最近记录</span></div>
          <div class="qms-card__body">
            <div class="list">
              <div class="list-row" v-for="h in importHistory" :key="h.id">
                <span class="qms-pill" :class="pillClass(h.status)">{{ h.status }}</span>
                <span class="grow"><b>{{ h.fileName }}</b><br><span class="meta">{{ h.paramName }} · {{ h.records }}条 · {{ h.time }}</span></span>
              </div>
              <div v-if="!importHistory.length" class="empty">暂无导入记录</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.spc-collect { display: flex; flex-direction: column; gap: 14px; }
.toolbar { display: flex; align-items: center; gap: 8px; }
.toolbar .lbl { font-weight: 600; }
.subseg { margin-bottom: 14px; }
.form-grid { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; align-items: flex-start; gap: 10px; }
.form-row > label { width: 110px; flex-shrink: 0; padding-top: 6px; font-size: 13px; color: #1f2d3d; }
.form-row .full { flex: 1; }
.val-row { display: flex; gap: 6px; flex-wrap: wrap; }
.list { display: flex; flex-direction: column; }
.list-row { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid #eef2f7; }
.list-row:last-child { border-bottom: none; }
.list-row .grow { flex: 1; }
.drop { border: 2px dashed #d4e2f3; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; background: #fafcff; }
.drop .ico { font-size: 28px; margin-bottom: 6px; }
.drop .pri { color: #1e4d8b; font-weight: 600; }
.btn-row { display: flex; gap: 10px; margin-top: 4px; }
.empty { padding: 20px; text-align: center; color: #8a9bb0; font-size: 13px; }
.batch-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.batch-tbl th, .batch-tbl td { border: 1px solid #e1e8f0; padding: 4px 6px; text-align: center; }
.batch-tbl th { background: #f5f8fc; }
.note {
  margin-top: 4px;
  padding: 10px 14px;
  background: #eef4fb;
  border-left: 3px solid #1e4d8b;
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  color: #5a6b7e;
  line-height: 1.6;
}
.note.warn { background: #fdecea; border-left-color: #c0392b; color: #b03021; }
.note.ok-note { background: #e8f5e9; border-left-color: #2f7d32; color: #1b6b1e; }
.ok { color: #2f7d32; font-weight: 600; }
.bad { color: #c0392b; font-weight: 600; }
</style>
