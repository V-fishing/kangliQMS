<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import SchemaForm from '@/components/form/SchemaForm.vue'
import { fiaApi } from '@/api/modules/fia'
import type { FiaStdlib, FiaStdItem } from '@/types/fia'
import { useCompanyStore } from '@/stores/company'

const companyStore = useCompanyStore()

const list = ref<FiaStdlib[]>([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editingId = ref('')
// 强制重挂载 SchemaForm，确保每次打开弹窗都按当前 model 重新初始化
const dlgKey = ref(0)
// 检验项目明细（标准值 / 公差 / 单位）
const items = ref<FiaStdItem[]>([])
const formRef = ref()

const schema = [
  { prop: 'code', label: '标准编码', type: 'input', required: true, span: 12 },
  { prop: 'mat', label: '物料编码', type: 'input', required: true, span: 12 },
  { prop: 'proc', label: '工序', type: 'input', required: true, span: 12 },
  { prop: 'aql', label: 'AQL', type: 'input', span: 12 },
  { prop: 'lvl', label: '检验水平', type: 'input', span: 12 },
  { prop: 'ctq', label: '关键特性(CTQ)', type: 'input', span: 12 },
  { prop: 'ver', label: '标准版本', type: 'input', span: 12 },
  {
    prop: 'st', label: '状态', type: 'select', span: 12, options: [
      { label: '生效', value: '生效' },
      { label: '停用', value: '停用' },
    ],
  },
]

const model = ref<Record<string, unknown>>({})

function addItem() {
  items.value.push({ name: '', ctq: false, std: '', tol: '', unit: '', valueType: '数值' })
}
function removeItem(i: number) {
  items.value.splice(i, 1)
}

function openAdd() {
  model.value = {}
  editingId.value = ''
  items.value = []
  dlgKey.value++
  dialog.value = true
}

async function openEdit(r: FiaStdlib) {
  model.value = { ...r }
  editingId.value = r.id || ''
  items.value = []
  dlgKey.value++
  dialog.value = true
  if (r.id) {
    try {
      const d = await fiaApi.getStdDetail(r.id)
      // 详情返回的字段(itemName/stdValue/tolerance)与表单字段(name/std/tol)不一致, 必须映射,
      // 否则保存时 itemName 为 undefined -> 后端 item_name 写入 null -> 非空约束异常("系统异常")
      items.value = (d.items || []).map((it: any) => ({
        // 注意: fia.ts 的 getStdDetail 已将后端 itemName/stdValue/tolerance
        // 映射为前端字段 name/std/tol, 这里必须按映射后的字段名读取,
        // 否则 name 取到 undefined -> 保存时 item_name 写入 NULL -> 非空约束异常("系统异常")
        name: it.name,
        ctq: it.isCtq,
        std: it.std,
        tol: it.tol,
        unit: it.unit,
        valueType: it.valueType,
      }))
    } catch {
      /* 详情拉取失败不阻断编辑，用户可手动补充检验项 */
    }
  }
}

// 由 SchemaForm 校验通过后触发（header 部分）
async function onSubmit(v: Record<string, unknown>) {
  const orgId = companyStore.currentOrgId
  if (!orgId) {
    ElMessage.error('请先在左上角选择公司后再保存检验标准')
    return
  }
  if (!items.value.length) {
    ElMessage.error('请至少添加一个检验项（含标准值/公差/单位）')
    return
  }
  const itemsPayload = items.value.map((it, i) => ({
    seq: i + 1,
    itemName: it.name,
    isCtq: !!it.ctq,
    stdValue: it.std ?? '',
    tolerance: it.valueType === '数值' ? (it.tol ?? '') : '',
    unit: it.valueType === '数值' ? (it.unit ?? '') : '',
    valueType: it.valueType || '数值',
    enumValues: null,
  }))
  const payload = {
    orgId,
    code: v.code,
    material: v.mat,
    procName: v.proc,
    aql: v.aql ?? '',
    inspectLevel: v.lvl ?? '',
    samplePlan: '',
    ctqText: v.ctq ?? '',
    stdVersion: v.ver ?? 'v1',
    status: v.st ?? '生效',
    items: itemsPayload,
  }
  saving.value = true
  try {
    if (editingId.value) {
      await fiaApi.updateStd(editingId.value, payload)
      ElMessage.success('检验标准已更新')
    } else {
      await fiaApi.createStd(payload)
      ElMessage.success('检验标准已创建')
    }
    dialog.value = false
    await load()
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || '请检查必填项'))
  } finally {
    saving.value = false
  }
}

// 点击「保存」：先让 SchemaForm 校验 header，校验通过才会触发 onSubmit
function onSave() {
  formRef.value?.submit()
}

async function load() {
  loading.value = true
  try {
    list.value = await fiaApi.getStdlib()
  } catch (e: any) {
    ElMessage.error('加载失败：' + (e?.message || e))
  } finally {
    loading.value = false
  }
}

async function onImport(file: File) {
  try {
    const text = await file.text()
    const rows = JSON.parse(text) as FiaStdlib[]
    if (!Array.isArray(rows)) throw new Error('文件格式应为数组')
    rows.forEach((r) => {
      const idx = list.value.findIndex((x) => x.code === r.code)
      if (idx >= 0) list.value[idx] = { ...list.value[idx], ...r }
      else list.value.unshift(r)
    })
    ElMessage.success(`已导入 ${rows.length} 条标准（仅前端预览，未入库）`)
  } catch (e: any) {
    ElMessage.error('导入失败：' + (e?.message || e))
  }
}
function onExport() {
  const blob = new Blob([JSON.stringify(list.value, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'fia-stdlib.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <el-button type="primary" size="small" @click="openAdd">新增标准</el-button>
      <el-button size="small" @click="onExport">导出</el-button>
      <el-upload :auto-upload="false" :show-file-list="false" accept=".json"
        :on-change="(f: any) => f?.raw && onImport(f.raw)">
        <el-button size="small">导入</el-button>
      </el-upload>
    </div>

    <el-table :data="list" border stripe size="small" v-loading="loading">
      <el-table-column prop="code" label="标准编码" min-width="120" />
      <el-table-column prop="mat" label="物料编码" min-width="120" />
      <el-table-column prop="proc" label="工序" min-width="100" />
      <el-table-column prop="aql" label="AQL" width="70" />
      <el-table-column prop="lvl" label="检验水平" width="90" />
      <el-table-column prop="ctq" label="关键特性" min-width="120" />
      <el-table-column prop="ver" label="版本" width="80" />
      <el-table-column prop="st" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.st === '生效' ? 'success' : 'info'" size="small">{{ row.st }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="list.splice(list.indexOf(row), 1)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="editingId ? '编辑检验标准' : '新增检验标准'" width="900px" top="4vh">
      <SchemaForm ref="formRef" :schema="schema" :hide-actions="true" v-model="model" :key="dlgKey" @submit="onSubmit" />

      <el-divider content-position="left">检验项目明细（标准值 / 公差 / 单位）</el-divider>
      <div class="items-head">
        <span class="muted sm">
          建任务时这些检验项会自动带入检验录入页；定量项据「标准值 + 公差」自动判定合格/不合格，定性项（如外观）仅人工判定。
        </span>
        <el-button size="small" type="primary" plain @click="addItem">+ 添加检验项</el-button>
      </div>
      <el-table :data="items" border size="small" style="margin-top:8px" empty-text="暂无检验项，请点击右上角添加">
        <el-table-column type="index" label="#" width="44" />
        <el-table-column label="检验项名称" min-width="150">
          <template #default="{ row }">
            <el-input v-model="row.name" size="small" placeholder="如：长度 / 外观" />
          </template>
        </el-table-column>
        <el-table-column label="类型" width="108">
          <template #default="{ row }">
            <el-select v-model="row.valueType" size="small">
              <el-option label="数值" value="数值" />
              <el-option label="文本" value="文本" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="标准值" min-width="110">
          <template #default="{ row }">
            <el-input v-model="row.std" size="small" :disabled="row.valueType !== '数值'" placeholder="如 50" />
          </template>
        </el-table-column>
        <el-table-column label="公差" min-width="120">
          <template #default="{ row }">
            <el-input v-model="row.tol" size="small" :disabled="row.valueType !== '数值'" placeholder="如 ±0.02" />
          </template>
        </el-table-column>
        <el-table-column label="单位" width="88">
          <template #default="{ row }">
            <el-input v-model="row.unit" size="small" :disabled="row.valueType !== '数值'" placeholder="mm" />
          </template>
        </el-table-column>
        <el-table-column label="CTQ" width="60" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.ctq" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="72" align="center">
          <template #default="{ row, $index }">
            <el-button link type="danger" size="small" @click="removeItem($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.page { padding: 16px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.items-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.muted { color: #8a94a6; }
.sm { font-size: 12px; }
</style>
