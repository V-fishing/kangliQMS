<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import SchemaForm from '@/components/form/SchemaForm.vue'
import ExcelJS from 'exceljs'
import { fiaStdlib } from '@/mock/fia'
import type { FiaStdlib } from '@/types/fia'

const authStore = useAuthStore()
const banner = BANNERS.fia?.[authStore.role] || {
  title: '首件检验 · 检验标准库',
  desc: '维护首件检验标准与检验项目模板',
}

const list = ref<FiaStdlib[]>(fiaStdlib.map((s) => ({ ...s })))
const mats = computed(() => [...new Set(list.value.map((s) => s.mat))])
const procs = ['注塑', '焊接', '组装', '检测', '包装']

const fMat = ref('')
const fProc = ref('')
const fKw = ref('')
const filtered = computed(() =>
  list.value.filter(
    (s) =>
      (!fMat.value || s.mat === fMat.value) &&
      (!fProc.value || s.proc === fProc.value) &&
      (!fKw.value || (s.code + s.mat + s.ctq).toLowerCase().includes(fKw.value.toLowerCase())),
  ),
)



// 新增 / 编辑
const dialog = ref(false)
const model = ref<Record<string, unknown>>({})
const schema = [
  { prop: 'code', label: '标准编号', type: 'input', required: true, placeholder: 'STD-xxx' },
  { prop: 'mat', label: '物料', type: 'input', required: true },
  { prop: 'proc', label: '工序', type: 'select', required: true, options: procs.map((p) => ({ label: p, value: p })) },
  { prop: 'aql', label: 'AQL', type: 'input' },
  { prop: 'lvl', label: '检验水平', type: 'select', options: [{ label: 'I', value: 'I' }, { label: 'II', value: 'II' }, { label: 'III', value: 'III' }] },
  { prop: 'ctq', label: '关键尺寸/CTQ', type: 'input' },
  { prop: 'ver', label: '版本', type: 'input', value: 'v1' },
  { prop: 'st', label: '状态', type: 'select', options: [{ label: '生效', value: '生效' }, { label: '停用', value: '停用' }] },
]
function openAdd() { model.value = {}; dialog.value = true }
function openEdit(r: FiaStdlib) { model.value = { ...r }; dialog.value = true }
function onSubmit(v: Record<string, unknown>) {
  const code = v.code as string
  const idx = list.value.findIndex((x) => x.code === code)
  if (idx >= 0) list.value[idx] = { ...list.value[idx], ...(v as unknown as FiaStdlib) }
  else list.value.unshift(v as unknown as FiaStdlib)
  dialog.value = false
  ElMessage.success('标准已保存')
}
function viewVersion(r: FiaStdlib) { ElMessage.info(`版本历史：${r.ver}（${r.code}）`) }

// 导出（Excel / CSV 两种格式）
const HEADERS = ['标准编号', '物料', '工序', 'AQL', '检验水平', '关键尺寸/CTQ', '版本', '状态']
function download(filename: string, content: string, mime: string) {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '')
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
        })
        .join(','),
    )
    .join('\r\n')
}
function rowsData() {
  return filtered.value.map((s) => [s.code, s.mat, s.proc, s.aql, s.lvl, s.ctq, s.ver, s.st])
}
function exportCsv() {
  download(`检验标准库_${Date.now()}.csv`, toCsv([HEADERS, ...rowsData()]), 'text/csv;charset=utf-8')
  ElMessage.success('已导出 CSV')
}
function exportExcel() {
  const html =
    '<table border="1">' +
    [HEADERS, ...rowsData()]
      .map((r) => '<tr>' + r.map((c) => `<td>${String(c ?? '')}</td>`).join('') + '</tr>')
      .join('') +
    '</table>'
  download(`检验标准库_${Date.now()}.xls`, html, 'application/vnd.ms-excel')
  ElMessage.success('已导出 Excel')
}
function downloadTemplate() {
  download('检验标准库_模板.csv', toCsv([HEADERS]), 'text/csv;charset=utf-8')
  ElMessage.success('模板已下载（CSV）')
}
function onExportCmd(c: string) {
  if (c === 'csv') exportCsv()
  else if (c === 'excel') exportExcel()
}

// 导入（多种模式，支持 CSV / Excel）
const importVisible = ref(false)
const importMode = ref<'cover' | 'append' | 'validate'>('cover')
const importFile = ref<File | null>(null)

function onImportCmd() { importVisible.value = true }
function onFileChange(file: { raw: File }) { importFile.value = file.raw }

function parseCsvLine(line: string) {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else q = false
      } else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

async function doImport() {
  if (!importFile.value) { ElMessage.warning('请先选择文件'); return }
  try {
    let rows: string[][] = []
    const name = importFile.value.name.toLowerCase()
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buf = await importFile.value.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf)
      const ws = wb.worksheets[0]
      ws.eachRow((row) => {
        rows.push((row.values as unknown[]).slice(1).map((v) => (v == null ? '' : String(v))) as string[])
      })
    } else {
      const text = await importFile.value.text()
      rows = text.split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => parseCsvLine(l))
    }
    const header = rows[0] || []
    const idx = (h: string) => header.findIndex((x) => x.trim() === h)
    const ci = idx('标准编号'), mi = idx('物料'), pi = idx('工序'), ai = idx('AQL'), li = idx('检验水平'), qi = idx('关键尺寸/CTQ'), vi = idx('版本'), si = idx('状态')
    const errors: string[] = []
    const valid: FiaStdlib[] = []
    rows.slice(1).forEach((r, i) => {
      const code = r[ci]?.trim()
      const mat = r[mi]?.trim()
      const proc = r[pi]?.trim()
      if (!code || !mat || !proc) { errors.push(`第 ${i + 2} 行：标准编号/物料/工序 不能为空`); return }
      const st = r[si]?.trim() || '生效'
      if (!['生效', '停用'].includes(st)) { errors.push(`第 ${i + 2} 行：状态「${st}」无效`); return }
      valid.push({ code, mat, proc, aql: r[ai]?.trim() || '', lvl: r[li]?.trim() || '', ctq: r[qi]?.trim() || '', ver: r[vi]?.trim() || 'v1', st })
    })

    if (importMode.value === 'validate') {
      importVisible.value = false
      if (errors.length) ElMessageBox.alert('校验发现问题：\n' + errors.slice(0, 20).join('\n'), '仅校验', { type: 'warning' })
      else ElMessage.success(`校验通过，共 ${valid.length} 行可用`)
      return
    }

    let added = 0
    let updated = 0
    valid.forEach((v) => {
      const ex = list.value.find((x) => x.code === v.code)
      if (ex) {
        if (importMode.value === 'cover') { Object.assign(ex, v); updated++ }
      } else {
        list.value.unshift(v)
        added++
      }
    })
    importVisible.value = false
    const tip = errors.length ? `；忽略 ${errors.length} 条无效` : ''
    ElMessage.success(`导入完成：新增 ${added} 条，更新 ${updated} 条${tip}`)
    if (errors.length) ElMessageBox.alert('以下行未导入：\n' + errors.slice(0, 20).join('\n'), '导入提示', { type: 'warning' })
  } catch (e) {
    ElMessage.error('导入失败：' + (e instanceof Error ? e.message : '解析错误'))
  }
}
</script>

<template>
  <div class="fia-stdlib">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📚</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>检验标准库管理</h3>
        <span class="tag">物料+工序 唯一匹配</span>
        <div class="sp" />
        <el-button type="primary" size="small" @click="openAdd">+ 新增标准</el-button>
        <el-button size="small" @click="downloadTemplate">下载模板</el-button>
        <el-button size="small" @click="onImportCmd">导入</el-button>
        <el-dropdown trigger="click" @command="onExportCmd">
          <el-button size="small">导出 ▾</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="excel">导出 Excel</el-dropdown-item>
              <el-dropdown-item command="csv">导出 CSV</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div style="padding: 10px 14px 0">
        <div class="filter-bar">
          <el-select v-model="fMat" placeholder="全部物料" clearable style="width: 160px">
            <el-option v-for="m in mats" :key="m" :label="m" :value="m" />
          </el-select>
          <el-select v-model="fProc" placeholder="全部工序" clearable style="width: 130px">
            <el-option v-for="p in procs" :key="p" :label="p" :value="p" />
          </el-select>
          <el-input v-model="fKw" placeholder="搜索标准编号/物料" clearable style="width: 220px" />
        </div>
      </div>

      <div class="qms-card__body" style="padding: 0">
        <table class="insp-table">
          <thead>
            <tr><th>标准编号</th><th>物料</th><th>工序</th><th>AQL</th><th>检验水平</th><th>关键尺寸/CTQ</th><th>版本</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in filtered" :key="s.code">
              <td>{{ s.code }}</td>
              <td>{{ s.mat }}</td>
              <td>{{ s.proc }}</td>
              <td>{{ s.aql }}</td>
              <td>{{ s.lvl }}</td>
              <td class="muted">{{ s.ctq }}</td>
              <td>{{ s.ver }}</td>
              <td><span class="pill" :class="s.st === '生效' ? 'g' : 'r'">{{ s.st }}</span></td>
              <td>
                <el-button link type="primary" size="small" @click="openEdit(s)">编辑</el-button>
                <el-button link type="success" size="small" @click="viewVersion(s)">版本</el-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="padding: 0 14px 12px">
        <div class="note">
          📌 按「物料+工序」唯一匹配；变更立即对新任务生效，进行中工单沿用旧版本，重新触发时用新标准；被引用标准不可直接删除；版本变更可回滚。
        </div>
      </div>
    </div>

    <el-dialog v-model="dialog" title="检验标准" width="520px">
      <SchemaForm :schema="schema" :model-value="model" @submit="onSubmit" />
    </el-dialog>

    <el-dialog v-model="importVisible" title="导入检验标准" width="480px">
      <div class="form-grid">
        <div class="form-row">
          <label>导入模式</label>
          <el-radio-group v-model="importMode">
            <el-radio value="cover">覆盖更新（按编号更新已有，新增不存在）</el-radio>
            <el-radio value="append">增量追加（仅新增不存在）</el-radio>
            <el-radio value="validate">仅校验（不写入）</el-radio>
          </el-radio-group>
        </div>
        <div class="form-row full">
          <label>选择文件</label>
          <el-upload :auto-upload="false" :show-file-list="true" :limit="1" accept=".csv,.xlsx,.xls" :on-change="onFileChange">
            <el-button size="small">选择文件 (.csv / .xlsx)</el-button>
          </el-upload>
        </div>
      </div>
      <div class="note">支持 CSV / Excel 两种格式；表头需包含：{{ HEADERS.join('、') }}。</div>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="doImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.fia-stdlib { display: flex; flex-direction: column; gap: 12px; }
.filter-bar { display: flex; gap: 10px; align-items: center; }
</style>
