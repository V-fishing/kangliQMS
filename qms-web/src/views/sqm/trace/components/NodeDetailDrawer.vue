<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { TraceNodeFullVO, TraceLinkRef, SqmTraceNodeType } from '@/types/sqm'
import { sqmApi } from '@/api/modules/sqm'

const props = defineProps<{
  nodeId: string
  modelValue: boolean
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'open-node', id: string): void
}>()

const NODE_TYPE_LABEL: Record<string, string> = {
  raw: '原材料',
  semi: '半成品',
  ship: '成品',
  customer: '客户',
  incoming: '来料',
}

const loading = ref(false)
const detail = ref<TraceNodeFullVO | null>(null)

const NODE_FIELD_LABELS: Record<string, string> = {
  id: '节点ID',
  orgId: '组织ID',
  rootLotId: '根批次ID',
  rootNodeId: '根节点ID',
  parentNodeId: '父节点ID',
  nodeType: '对象类型',
  nodeName: '名称',
  batchNo: '批次号',
  qty: '数量',
  unit: '单位',
  nodeDate: '日期',
  supplierId: '供应商ID',
  remark: '备注',
  qualificationType: '资质类型',
  treeLevel: '层级',
  isValid: '是否有效',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  isDeleted: '删除标记',
}

const DETAIL_FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  orgId: '组织ID',
  nodeId: '节点ID',
  category: '类别',
  woNo: '工单号',
  productBarcode: '产品条码',
  productPartNo: '产品物料编码',
  productName: '产品名称',
  woQty: '工单数量',
  materialBarcode: '物料条码',
  materialCode: '物料编码',
  materialName: '物料名称',
  specModel: '规格型号',
  scanner: '扫描人',
  scanTime: '扫描时间',
  processCode: '工序编码',
  processName: '工序名称',
  isUrgent: '是否急单',
  qcReview: '质量复核',
  mgApprove: '经理审批',
  inspectResult: '检验结果',
  reportNo: '报告编号',
  inspectOrderNo: '检验单号',
  productionOrderNo: '生产订单号',
  modelSpec: '型号规格',
  batchNo: '批次号',
  productionDate: '生产日期',
  expiryDate: '有效期至',
  inspectQty: '检验数量',
  inspectCount: '检验次数',
  passQty: '合格数',
  failQty: '不合格数',
  inspector: '检验员',
  qcReviewer: '质量复核人',
  qcReviewTime: '质量复核时间',
  mgApprover: '经理审批人',
  mgApproveTime: '经理审批时间',
  drugRegNo: '药品注册证号',
  perfInspectMethod: '性能检验方法',
  perfBatchNo: '性能批号',
  customer: '客户',
  customerName: '客户名称',
  customerCode: '客户编码',
  customerOrderNo: '客户订单号',
  shipDate: '发货日期',
  trackingNo: '物流单号',
  shipAddress: '收货地址',
  contactPerson: '联系人',
  contactPhone: '联系电话',
  qty: '数量',
  unit: '单位',
}

function fmt(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? '是' : '否'
  return String(v)
}

function nodeRowLabel(key: string): string {
  return NODE_FIELD_LABELS[key] ?? key
}
function detailRowLabel(key: string): string {
  return DETAIL_FIELD_LABELS[key] ?? key
}

const nodeInfoRows = computed(() => {
  const n = detail.value?.node
  if (!n) return []
  return Object.keys(NODE_FIELD_LABELS)
    .filter((k) => (n as any)[k] !== undefined && (n as any)[k] !== null)
    .map((k) => ({
      label: nodeRowLabel(k),
      value:
        k === 'nodeType'
          ? NODE_TYPE_LABEL[(n as any)[k]] ?? (n as any)[k]
          : k === 'isValid'
          ? fmt((n as any)[k])
          : fmt((n as any)[k]),
    }))
})

const detailRows = computed(() => {
  const d = detail.value?.detail
  if (!d) return []
  return Object.keys(d)
    .filter((k) => d[k] !== undefined && d[k] !== null && d[k] !== '')
    .map((k) => ({ label: detailRowLabel(k), value: fmt(d[k]) }))
})

async function load() {
  if (!props.nodeId) return
  loading.value = true
  try {
    detail.value = await sqmApi.getTraceNodeDetail(props.nodeId)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.nodeId],
  ([v]) => {
    if (v) load()
  },
  { immediate: true },
)

function onOpen(id?: string) {
  if (id) emit('open-node', id)
}
function close() {
  emit('update:modelValue', false)
}

function refLabel(r?: TraceLinkRef): string {
  if (!r) return ''
  return `${NODE_TYPE_LABEL[r.nodeType as SqmTraceNodeType] ?? r.nodeType ?? ''} · ${r.nodeName ?? ''}${r.batchNo ? ' / ' + r.batchNo : ''}`
}
</script>

<template>
  <el-drawer :model-value="modelValue" title="节点详情" size="46%" @update:model-value="close" :destroy-on-close="true">
    <div v-loading="loading">
      <el-empty v-if="!detail" description="未找到节点" />
      <template v-else>
        <!-- 节点信息：主表全部字段 -->
        <el-card shadow="never" class="block">
          <template #header>
            <div class="block-head">
              <span>节点信息</span>
              <el-tag v-if="detail.node?.nodeType" size="small" type="info">
                {{ NODE_TYPE_LABEL[detail.node.nodeType] ?? detail.node.nodeType }}
              </el-tag>
            </div>
          </template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item v-for="row in nodeInfoRows" :key="row.label" :label="row.label" label-class-name="lbl">
              {{ row.value }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 明细信息 -->
        <el-card shadow="never" class="block">
          <template #header>明细信息</template>
          <el-empty v-if="detailRows.length === 0" description="无明细记录" :image-size="48" />
          <el-descriptions v-else :column="2" border size="small">
            <el-descriptions-item v-for="row in detailRows" :key="row.label" :label="row.label" label-class-name="lbl">
              {{ row.value }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 组成关系 -->
        <el-card shadow="never" class="block">
          <template #header>组成关系</template>
          <div class="rel-title">正向（用于）：包含本节点的上层节点</div>
          <el-empty v-if="!(detail.parents && detail.parents.length)" description="无（根节点）" :image-size="48" />
          <div v-else class="rel-list">
            <el-button
              v-for="p in detail.parents"
              :key="p.id"
              text
              type="primary"
              class="rel-item"
              @click="onOpen(p.id)"
            >
              <el-tag size="small" type="success" effect="plain">{{ NODE_TYPE_LABEL[p.nodeType as SqmTraceNodeType] ?? p.nodeType }}</el-tag>
              {{ refLabel(p) }}
            </el-button>
          </div>

          <el-divider />

          <div class="rel-title">反向（组成）：本节点包含的下层节点</div>
          <el-empty v-if="!(detail.children && detail.children.length)" description="无（叶子节点）" :image-size="48" />
          <div v-else class="rel-list">
            <el-button
              v-for="c in detail.children"
              :key="c.id"
              text
              type="primary"
              class="rel-item"
              @click="onOpen(c.id)"
            >
              <el-tag size="small" type="warning" effect="plain">{{ NODE_TYPE_LABEL[c.nodeType as SqmTraceNodeType] ?? c.nodeType }}</el-tag>
              {{ refLabel(c) }}
            </el-button>
          </div>
        </el-card>
      </template>
    </div>
  </el-drawer>
</template>

<style scoped>
.block {
  margin-bottom: 14px;
}
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
:deep(.lbl) {
  width: 110px;
  color: #606266;
}
.rel-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.rel-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.rel-item {
  padding-left: 0;
  justify-content: flex-start;
}
</style>
