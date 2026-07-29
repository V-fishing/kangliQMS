<template>
  <el-form label-width="92px" label-position="right" class="node-form">
    <el-form-item v-if="showUpstreamPicker" label="上游节点">
      <el-select
        v-model="upstreamNodeId"
        filterable
        clearable
        :loading="upstreamLoading"
        placeholder="选择上游物料/半成品作为父节点（可选，留空则成为根节点）"
        class="nf-select"
        @change="emitChange"
      >
        <el-option
          v-for="o in upstreamOptions"
          :key="o.value"
          :value="o.value"
          :label="o.label"
        >
          <div class="nf-opt">
            <span class="nf-opt-label">{{ o.label }}</span>
            <span v-if="o.desc" class="nf-opt-desc">{{ o.desc }}</span>
          </div>
        </el-option>
      </el-select>
      <div class="nf-tip">选填：指定后将建立组成关系（避免成为孤节点）；不选则作为根节点。</div>
    </el-form-item>
    <el-form-item v-if="showRefToggle" label="引用方式">
      <el-radio-group v-model="refMode">
        <el-radio :value="false">新建节点</el-radio>
        <el-radio :value="true">引用已有节点</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item v-if="refMode" label="已有节点" required>
      <el-select
        v-model="refNodeId"
        filterable
        clearable
        :loading="refLoading"
        placeholder="选择已存在的节点(自动带上其子树)"
        class="nf-select"
        @change="emitChange"
      >
        <el-option
          v-for="o in refOptions"
          :key="o.value"
          :value="o.value"
          :label="o.label"
        >
          <div class="nf-opt">
            <span class="nf-opt-label">{{ o.label }}</span>
            <span v-if="o.desc" class="nf-opt-desc">{{ o.desc }}</span>
          </div>
        </el-option>
      </el-select>
      <div class="nf-tip">引用已有节点：直接建立组成关系，其原有子树(如物料/半成品)会一并挂到当前节点之下。</div>
    </el-form-item>
    <template v-if="!refMode">
      <el-form-item
        v-for="f in fields"
        :key="f.key"
        :label="f.label"
        :required="!!f.required"
      >
        <!-- 文本 -->
        <el-input
          v-if="f.widget === 'text'"
          v-model="form[f.key]"
          :placeholder="f.placeholder || ('请输入' + f.label)"
          :disabled="disabled"
          @input="emitChange"
        />
        <!-- 数字 -->
        <el-input-number
          v-else-if="f.widget === 'number'"
          v-model="form[f.key]"
          :min="0"
          :controls="false"
          class="nf-number"
          :disabled="disabled"
          @change="emitChange"
        />
        <!-- 日期 -->
        <el-date-picker
          v-else-if="f.widget === 'date'"
          v-model="form[f.key]"
          type="date"
          value-format="YYYY-MM-DD"
          :placeholder="f.placeholder || '选择日期'"
          :disabled="disabled"
          @change="emitChange"
        />
        <!-- 只读(主数据带出) -->
        <el-input
          v-else-if="f.widget === 'readonly'"
          :model-value="form[f.key] ?? ''"
          placeholder="主数据自动带出"
          disabled
        />
        <!-- 从数据表下拉选取(来料/半成品/成品/客户) -->
        <div v-else-if="f.widget === 'source-select'" class="nf-source">
          <el-select
            v-model="sel[f.key]"
            filterable
            clearable
            :loading="loading[f.key]"
            :disabled="disabled"
            :placeholder="'请选择' + f.label"
            class="nf-select"
            @change="(val: string) => onSourceChange(f, val)"
          >
            <el-option
              v-for="o in (optionsMap[f.key] || [])"
              :key="o.value"
              :value="o.value"
              :label="o.label"
              :disabled="!!o.disabled"
            >
              <div class="nf-opt">
                <span class="nf-opt-label">{{ o.label }}</span>
                <span v-if="o.desc" class="nf-opt-desc">{{ o.desc }}</span>
              </div>
            </el-option>
          </el-select>
          <div
            v-if="f.stockField && selectedMeta[f.key] && selectedMeta[f.key].kind === 'lot' && selectedMeta[f.key].remain !== undefined"
            class="nf-stock"
            :class="{ 'nf-stock-warn': Number(form[f.stockField] || 0) > Number(selectedMeta[f.key].remain) }"
          >
            批次剩余库存：{{ selectedMeta[f.key].remain }}（已用 {{ selectedMeta[f.key].used }} / 共 {{ selectedMeta[f.key].qty }}）
          </div>
        </div>
        <span v-if="f.unitField && form[f.unitField]" class="nf-unit">{{ form[f.unitField] }}</span>
        <div v-if="f.tip" class="nf-tip">{{ f.tip }}</div>
      </el-form-item>
    </template>
  </el-form>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { NODE_FORM, type NodeType, type FieldDef } from '../config/nodeFormConfig'
import { sqmApi } from '@/api/modules/sqm'

interface SelectOption {
  value: string
  label: string
  desc?: string
  disabled?: boolean
  meta: Record<string, any>
}

const props = defineProps<{
  nodeType: NodeType
  initial?: Record<string, any>
  disabled?: boolean
  orgId?: string
  mode?: 'create' | 'add-child'
  componentType?: string
  allowRef?: boolean
}>()

const emit = defineEmits<{ (e: 'change', form: Record<string, any>): void }>()

// 引用已有节点(仅 add-child 且允许引用时可用)
const refMode = ref(false)
const refNodeId = ref('')
const refOptions = ref<SelectOption[]>([])
const refLoading = ref(false)
const showRefToggle = computed(() => props.mode === 'add-child' && props.allowRef === true)

async function loadRefOptions() {
  if (!showRefToggle.value || !props.componentType) {
    refOptions.value = []
    return
  }
  refLoading.value = true
  try {
    const res = await sqmApi.searchTraceNodes({
      nodeType: props.componentType,
      orgId: props.orgId,
      page: 1,
      size: 1000,
    })
    refOptions.value = (res?.records || []).map((n: any) => ({
      value: n.id,
      label: (n.nodeName || '(未命名)') + (n.batchNo ? ` (${n.batchNo})` : ''),
      desc: `类型 ${n.nodeType} · ${n.unit || ''}`,
    }))
  } catch {
    refOptions.value = []
  } finally {
    refLoading.value = false
  }
}

watch(showRefToggle, (v) => { if (v) loadRefOptions() }, { immediate: true })
watch(() => props.componentType, () => { if (showRefToggle.value) loadRefOptions() })
watch(refMode, (v) => { if (!v) refNodeId.value = '' })

// ---- 上游节点（仅 create 模式可选，用于避免孤节点） ----
const upstreamNodeId = ref('')
const upstreamOptions = ref<SelectOption[]>([])
const upstreamLoading = ref(false)
// 合法上游类型：与 seed 链路方向一致（parent=上游, child=下游）
const upstreamAllowTypes = computed<string[]>(() => {
  const t = props.nodeType
  if (t === 'semi') return ['incoming', 'raw', 'semi']
  if (t === 'ship') return ['incoming', 'raw', 'semi']
  if (t === 'customer') return ['ship']
  return []
})
const showUpstreamPicker = computed(
  () => props.mode === 'create' && upstreamAllowTypes.value.length > 0,
)

function upstreamTypeLabel(t: string): string {
  return { incoming: '物料', raw: '投料', semi: '半成品', ship: '成品', customer: '客户' }[t] || t
}

async function loadUpstreamOptions() {
  if (!showUpstreamPicker.value) {
    upstreamOptions.value = []
    return
  }
  upstreamLoading.value = true
  try {
    const lists = await Promise.all(
      upstreamAllowTypes.value.map((nt) =>
        sqmApi
          .searchTraceNodes({ nodeType: nt, orgId: props.orgId, page: 1, size: 1000 })
          .then((r) =>
            (r?.records || []).map((n: any) => ({
              value: n.id,
              label: n.nodeName || '(未命名)',
              desc: `${upstreamTypeLabel(n.nodeType)} · 批次 ${n.batchNo || '-'}${n.unit ? ' · ' + n.unit : ''}`,
              meta: { nodeType: n.nodeType },
            })),
          )
          .catch(() => [] as SelectOption[]),
      ),
    )
    upstreamOptions.value = lists.flat()
  } finally {
    upstreamLoading.value = false
  }
}

watch(showUpstreamPicker, (v) => { if (v) loadUpstreamOptions() }, { immediate: true })
watch(() => props.nodeType, () => { if (showUpstreamPicker.value) loadUpstreamOptions() })
watch(upstreamNodeId, () => emitChange())

const fields = computed<FieldDef[]>(() => NODE_FORM[props.nodeType] || [])

const form = reactive<Record<string, any>>({})
// 下拉当前选中的值(lotNo / 节点 id), 与 form 中的名称文本分开
const sel = reactive<Record<string, any>>({})
// 下拉选项缓存
const optionsMap = reactive<Record<string, SelectOption[]>>({})
// 加载态
const loading = reactive<Record<string, boolean>>({})
// 选中项的 meta(用于自动带出与防超卖展示)
const selectedMeta = reactive<Record<string, any>>({})

function fill(v?: Record<string, any>) {
  // 清空上一轮(可能含自动带出的 materialCode/customerCode 等), 避免脏数据遗留
  for (const k of Object.keys(form)) delete form[k]
  for (const k of Object.keys(sel)) delete sel[k]
  for (const k of Object.keys(selectedMeta)) delete selectedMeta[k]
  upstreamNodeId.value = ''
  const src = v || {}
  for (const f of fields.value) {
    form[f.key] = src[f.key] !== undefined ? src[f.key] : ''
    if (f.widget === 'source-select') sel[f.key] = ''
  }
}
fill(props.initial)

watch(() => props.initial, (v) => fill(v), { deep: true })
watch(fields, () => { loadAllOptions() }, { deep: true })

function emitChange() {
  emit('change', { ...form })
}

// 归一化 lot 选项
function buildLotOptions(lots: any[], disableEmpty = true): SelectOption[] {
  const org = props.orgId
  return (lots || [])
    .filter((l) => !org || l.orgId === org)
    .map((l) => {
      const qty = Number(l.qty || 0)
      const used = Number(l.usedQty || 0)
      const remain = qty - used
      return {
        value: l.lotNo || '',
        label: l.partName || l.partNo || l.lotNo || '(未命名物料)',
        desc: `批次 ${l.lotNo} · ${l.unit || ''} · 余 ${remain}`,
        disabled: disableEmpty && remain <= 0,
        meta: {
          kind: 'lot',
          lotNo: l.lotNo,
          partNo: l.partNo,
          name: l.partName,
          code: l.partNo,
          supplierId: l.supplierId,
          unit: l.unit,
          qty,
          used,
          remain,
        },
      }
    })
}

// 归一化 节点(semi/customer) 选项
function buildNodeOptions(nodes: any[], kind: 'semi' | 'customer'): SelectOption[] {
  return (nodes || []).map((n) => ({
    value: n.id,
    label: n.nodeName,
    desc: kind === 'semi' ? `半成品 ${n.batchNo || ''} · ${n.unit || ''}` : `客户编码 ${n.batchNo || ''}`,
    meta: {
      kind,
      id: n.id,
      name: n.nodeName,
      // 注意: 半成品/客户选项的 code 必须是真实业务编码, 绝不能填 UUID(n.id),
      // 否则上游 fill:{materialCode:'code'} 会把成品的 material_code 写成一串 UUID。
      code: kind === 'semi' ? (n.materialCode || n.batchNo || n.id) : (n.customerCode || n.batchNo || n.id),
      unit: n.unit,
      qty: Number(n.qty || 0),
      used: 0,
      remain: Number(n.qty || 0),
    },
  }))
}

// 归一化 供应商 选项
function buildSupplierOptions(suppliers: any[]): SelectOption[] {
  return (suppliers || []).map((s) => ({
    value: s.id,
    label: s.name,
    desc: s.supplierCode ? `编码 ${s.supplierCode}` : '',
    meta: { kind: 'supplier', id: s.id, name: s.name },
  }))
}

async function fetchOptionsFor(field: FieldDef) {
  const src = field.source
  if (!src) return
  loading[field.key] = true
  try {
    let opts: SelectOption[] = []
    if (src === 'lot' || src === 'lot-or-semi') {
      const lots = await sqmApi.listLots()
      opts = opts.concat(buildLotOptions(lots, field.disableEmptyStock !== false))
    }
    if (src === 'semi' || src === 'lot-or-semi') {
      const res = await sqmApi.searchTraceNodes({ nodeType: 'semi', orgId: props.orgId, page: 1, size: 1000 })
      opts = opts.concat(buildNodeOptions(res?.records || [], 'semi'))
    }
    if (src === 'customer') {
      const res = await sqmApi.searchTraceNodes({ nodeType: 'customer', orgId: props.orgId, page: 1, size: 1000 })
      opts = opts.concat(buildNodeOptions(res?.records || [], 'customer'))
    }
    if (src === 'supplier') {
      const res = await sqmApi.getSuppliers()
      opts = opts.concat(buildSupplierOptions(res || []))
    }
    optionsMap[field.key] = opts
  } catch (e) {
    optionsMap[field.key] = []
  } finally {
    loading[field.key] = false
  }
}

function loadAllOptions() {
  for (const f of fields.value) {
    if (f.widget === 'source-select') fetchOptionsFor(f)
  }
}

function onSourceChange(field: FieldDef, val: string) {
  const opt = (optionsMap[field.key] || []).find((o) => o.value === val)
  if (!opt) return
  // 名称字段写入选项展示名(用于落库 nodeName / materialName / customerName)
  form[field.key] = opt.label
  // 按 fill 配置自动带出关联字段(物料编码 / 客户编码 / 单位)
  if (field.fill) {
    for (const [targetKey, metaProp] of Object.entries(field.fill)) {
      form[targetKey] = opt.meta[metaProp]
    }
  }
  selectedMeta[field.key] = opt.meta
  // 物料(lot)带出的供应商, 同步到「供应商」下拉, 保证显示一致
  if (field.source === 'lot' && opt.meta.supplierId) {
    const supField = fields.value.find((f) => f.source === 'supplier')
    if (supField) {
      const m = (optionsMap[supField.key] || []).find((o) => o.value === opt.meta.supplierId)
      if (m) {
        sel[supField.key] = m.value
        form[supField.key] = m.label
      }
    }
  }
  emitChange()
}

onMounted(() => loadAllOptions())

function validate() {
  if (refMode.value) {
    return { ok: !!refNodeId.value, missing: refNodeId.value ? [] : ['已有节点'] }
  }
  const missing: string[] = []
  for (const f of fields.value) {
    if (f.required && (form[f.key] === undefined || form[f.key] === null || form[f.key] === '')) {
      missing.push(f.label)
    }
    // 防超卖前端软校验: 用量不得超过批次剩余库存
    if (f.stockField && selectedMeta[f.key] && selectedMeta[f.key].kind === 'lot') {
      const remain = Number(selectedMeta[f.key].remain)
      const usage = Number(form[f.stockField] || 0)
      if (usage > remain) {
        missing.push(`${f.label}的用量超出批次剩余库存(${remain})`)
      }
    }
  }
  return { ok: missing.length === 0, missing }
}

function getForm(): Record<string, any> {
  if (refMode.value) {
    return { refNodeId: refNodeId.value, componentType: props.componentType }
  }
  const result: Record<string, any> = { ...form }
  if (upstreamNodeId.value) result.parentNodeId = upstreamNodeId.value
  return result
}

defineExpose({ validate, getForm, fill })
</script>

<style scoped>
.node-form { padding: 4px 0; }
.nf-number { width: 100%; }
.nf-source { width: 100%; }
.nf-select { width: 100%; }
.nf-opt { display: flex; flex-direction: column; line-height: 1.3; }
.nf-opt-label { font-size: 13px; }
.nf-opt-desc { font-size: 12px; color: #94a3b8; }
.nf-stock { margin-top: 4px; font-size: 12px; color: #2563eb; }
.nf-stock-warn { color: #dc2626; }
.nf-unit { margin-left: 8px; color: #64748b; font-size: 12px; }
.nf-tip { margin-top: 4px; color: #b45309; font-size: 12px; line-height: 1.4; }
:deep(.el-form-item) { margin-bottom: 14px; }
</style>
