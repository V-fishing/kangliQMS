<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import {
  TYPE_COLUMNS,
  TYPE_LABEL,
  TYPE_ICON,
  TYPE_COLOR,
  buildTraceByType,
  findNode,
  getNodePath,
  buildDetailRows,
  exportCsv,
  exportExcel,
  handleExportTree,
  type TraceRow,
} from '@/mock/sqmTrace'

const authStore = useAuthStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 来料追溯',
  desc: '批次/物料正向与逆向追溯',
}

type TraceType = 'raw' | 'semi' | 'ship'
const TYPES: TraceType[] = ['raw', 'semi', 'ship']

const allRows = buildTraceByType()
const keyword = ref('')

// 每类表的高级检索条件
const filters = reactive<Record<TraceType, { field: string; value: string }[]>>({
  raw: [{ field: '', value: '' }],
  semi: [{ field: '', value: '' }],
  ship: [{ field: '', value: '' }],
})

function matchRow(row: TraceRow, conds: { field: string; value: string }[], kw: string): boolean {
  for (const c of conds) {
    if (c.field && c.value && (row[c.field] || '') !== c.value) return false
  }
  if (kw) {
    const hit = Object.keys(row).some((k) => String(row[k] ?? '').includes(kw))
    if (!hit) return false
  }
  return true
}

function visibleRows(type: TraceType): TraceRow[] {
  return allRows[type].filter((r) => matchRow(r, filters[type], keyword.value.trim()))
}

function addCond(type: TraceType) {
  filters[type].push({ field: '', value: '' })
}
function removeCond(type: TraceType, idx: number) {
  if (filters[type].length > 1) filters[type].splice(idx, 1)
}
function clearCond(type: TraceType) {
  filters[type] = [{ field: '', value: '' }]
  keyword.value = ''
}

const detailCols = (type: TraceType) => {
  const seen = new Set<string>()
  const cols = TYPE_COLUMNS[type].list.filter((c) => c.key !== 'action')
  TYPE_COLUMNS[type].detail.forEach((c) => {
    if (!seen.has(c.key)) {
      seen.add(c.key)
      cols.push(c)
    }
  })
  return cols
}

function doExport(type: TraceType, format: 'csv' | 'excel') {
  const cols = [
    { key: 'lotId', label: '追溯批次号' },
    { key: 'batch', label: '批次/名称' },
    ...detailCols(type),
  ]
  const name = `来料追溯_${TYPE_LABEL[type]}_${new Date().toISOString().slice(0, 10)}`
  if (format === 'csv') exportCsv(visibleRows(type), cols, name + '.csv')
  else exportExcel(visibleRows(type), cols, name + '.xls')
}

function doExportTree(format: 'json' | 'csv' | 'excel' | 'pdf') {
  const tree = traceNode.value
  if (!tree) return
  handleExportTree(traceCtx.lotId, tree, format)
}

// ===== 视图状态：列表 / 追溯 =====
type TraceMode = 'ship' | 'forward' | 'backward'
const view = ref<'list' | 'trace'>('list')
const traceCtx = reactive<{ lotId: string; batch: string; mode: TraceMode }>({
  lotId: '',
  batch: '',
  mode: 'ship',
})

const traceNode = computed(() => (traceCtx.lotId ? findNode(traceCtx.lotId, traceCtx.batch) : null))
const tracePath = computed(() =>
  traceCtx.lotId ? getNodePath(traceCtx.lotId, traceCtx.batch) : null,
)
const treeData = computed(() => (traceNode.value ? [traceNode.value] : []))

const detailVisible = ref(false)
const detailNode = ref<any>(null)
const detailTitle = ref('')

function openDetail(lotId: string, batch: string) {
  const n = findNode(lotId, batch)
  if (!n) return
  detailNode.value = n
  detailTitle.value = `${TYPE_LABEL[n.type] || '节点'}详情`
  detailVisible.value = true
}
function openShipTrace(lotId: string, batch: string) {
  traceCtx.lotId = lotId
  traceCtx.batch = batch
  traceCtx.mode = 'ship'
  view.value = 'trace'
}
function openForward(lotId: string, batch: string) {
  traceCtx.lotId = lotId
  traceCtx.batch = batch
  traceCtx.mode = 'forward'
  view.value = 'trace'
  detailVisible.value = false
}
function openBackward(lotId: string, batch: string) {
  traceCtx.lotId = lotId
  traceCtx.batch = batch
  traceCtx.mode = 'backward'
  view.value = 'trace'
  detailVisible.value = false
}
function backToList() {
  view.value = 'list'
}

const detailRows = computed<[string, string][]>(() =>
  detailNode.value ? buildDetailRows(detailNode.value) : [],
)
</script>

<template>
  <div class="sqm-trace">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🌿</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 列表视图 -->
    <template v-if="view === 'list'">
      <div class="trace-topbar">
        <el-input v-model="keyword" placeholder="关键字检索（批次/物料/供应商…）" clearable style="width: 260px" />
        <span class="trace-topbar__hint">共 {{ TYPES.reduce((s, t) => s + visibleRows(t).length, 0) }} 条记录</span>
      </div>

      <div v-for="t in TYPES" :key="t" class="qms-card trace-card">
        <div class="qms-card__header">
          <h3>
            {{ TYPE_LABEL[t] }}
            <span class="pill" :style="{ background: TYPE_COLOR[t] }">{{ visibleRows(t).length }} 条</span>
          </h3>
          <span class="sp" />
          <el-dropdown trigger="click" @command="(c: 'csv' | 'excel') => doExport(t, c)">
            <el-button size="small">导出 ▾</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="csv">CSV（全字段）</el-dropdown-item>
                <el-dropdown-item command="excel">Excel（全字段）</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div class="qms-card__body" style="padding: 0">
          <!-- 高级检索 -->
          <div class="adv-filter">
            <div class="adv-filter__toggle" @click="filters[t][0].value = filters[t][0].value">
              🔍 高级检索
              <span v-if="filters[t].some((c) => c.field && c.value)">
                （{{ filters[t].filter((c) => c.field && c.value).length }} 个条件）
              </span>
            </div>
            <div class="adv-filter__body">
              <div v-for="(c, i) in filters[t]" :key="i" class="adv-cond">
                <el-select v-model="c.field" placeholder="选择字段" size="small" style="width: 160px">
                  <el-option v-for="col in detailCols(t)" :key="col.key" :label="col.label" :value="col.key" />
                </el-select>
                <el-input v-model="c.value" placeholder="输入检索值" size="small" style="width: 180px" />
                <el-button size="small" type="primary" @click="addCond(t)">+ 添加</el-button>
                <el-button v-if="filters[t].length > 1" size="small" @click="removeCond(t, i)">删除</el-button>
              </div>
              <div class="adv-actions">
                <el-button size="small" plain @click="clearCond(t)">清除全部</el-button>
              </div>
            </div>
          </div>

          <el-table :data="visibleRows(t)" border size="small" max-height="360">
            <el-table-column
              v-for="col in TYPE_COLUMNS[t].list.filter((c) => c.key !== 'action')"
              :key="col.key"
              :prop="col.key"
              :label="col.label"
              show-overflow-tooltip
            />
            <el-table-column label="检验结果" width="90" v-if="t !== 'raw'">
              <template #default="{ row }">
                <span class="qms-pill" :class="row.inspectResult === '合格' ? 'g' : row.inspectResult === '不合格' ? 'r' : 'y'">{{ row.inspectResult }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button v-if="t === 'ship'" size="small" type="primary" @click="openShipTrace(row.lotId, row.batch)">追溯</el-button>
                <el-button size="small" @click="openDetail(row.lotId, row.batch)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </template>

    <!-- 追溯视图 -->
    <template v-else>
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>
            {{ traceCtx.mode === 'forward' ? '正向追溯（子集）' : traceCtx.mode === 'backward' ? '反向追溯（父级路径）' : '出货追溯链' }}
            — 批次：{{ traceCtx.batch }}
          </h3>
          <span class="sp" />
          <el-dropdown trigger="click" @command="(c: 'json' | 'csv' | 'excel' | 'pdf') => doExportTree(c)">
            <el-button size="small" plain>导出树状图 ▾</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="json">JSON（全字段原样）</el-dropdown-item>
                <el-dropdown-item command="csv">CSV（含字段批注）</el-dropdown-item>
                <el-dropdown-item command="excel">Excel（含字段批注）</el-dropdown-item>
                <el-dropdown-item command="pdf">PDF / 图片（含字段批注）</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button size="small" plain @click="backToList">↩ 返回列表</el-button>
        </div>
        <div class="qms-card__body">
          <div class="trace-note">📌 黄色高亮为当前节点；点击树节点可查看详情。</div>

          <!-- 追溯路径（ship / backward） -->
          <div v-if="traceCtx.mode !== 'forward' && tracePath" class="trace-path-wrap">
            <div class="block-title">追溯路径</div>
            <div class="trace-path">
              <template v-for="(n, i) in tracePath" :key="i">
                <div class="trace-path-item" :class="{ current: i === tracePath.length - 1 }">
                  <span class="tpi-icon">{{ TYPE_ICON[n.type] || '📋' }}</span>
                  <span class="tpi-main">
                    <strong>{{ n.name }}</strong>
                    <span class="node-badge" :style="{ background: TYPE_COLOR[n.type] }">{{ TYPE_LABEL[n.type] || '其他' }}</span>
                  </span>
                  <span class="tpi-meta">批次：{{ n.batch }} · {{ n.qty }}{{ n.unit || 'pcs' }}</span>
                </div>
                <div v-if="i !== tracePath.length - 1" class="trace-path-bar" />
              </template>
            </div>
          </div>

          <!-- 完整/子树 追溯树 -->
          <div v-if="traceCtx.mode !== 'backward'" class="trace-tree-wrap">
            <div class="block-title">
              {{ traceCtx.mode === 'ship' ? '完整追溯树' : '子集追溯树（从当前节点开始）' }}
            </div>
            <div class="trace-legend">
              <span v-for="(c, k) in TYPE_COLOR" :key="k"><i :style="{ background: c }" />{{ TYPE_LABEL[k] }}</span>
            </div>
            <el-tree
              :data="treeData"
              :props="{ label: 'name', children: 'children' }"
              node-key="batch"
              default-expand-all
              :expand-on-click-node="false"
              @node-click="(d: any) => openDetail(traceCtx.lotId, d.batch)"
            >
              <template #default="{ data }">
                <div class="tn" :class="{ highlight: data.batch === traceCtx.batch }" :style="{ borderLeftColor: TYPE_COLOR[data.type] }">
                  <span class="tn-icon">{{ TYPE_ICON[data.type] || '📋' }}</span>
                  <span class="tn-label">
                    {{ data.name }}
                    <span class="node-badge" :style="{ background: TYPE_COLOR[data.type] }">{{ TYPE_LABEL[data.type] || '其他' }}</span>
                    <span v-if="data.inspectResult" class="qms-pill" :class="data.inspectResult === '合格' ? 'g' : 'r'">{{ data.inspectResult }}</span>
                  </span>
                  <span class="tn-meta">批次：{{ data.batch }} · {{ data.qty }}{{ data.unit || 'pcs' }} · {{ data.date }} <template v-if="data.sup">· {{ data.sup }}</template></span>
                </div>
              </template>
            </el-tree>
          </div>
        </div>
      </div>
    </template>

    <!-- 节点详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="detailTitle" width="640px">
      <div v-if="detailNode">
        <div class="detail-head">
          <span class="node-badge" :style="{ background: TYPE_COLOR[detailNode.type] }">{{ TYPE_LABEL[detailNode.type] || '其他' }}</span>
          <strong class="detail-name">{{ detailNode.name }}</strong>
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item v-for="(d, i) in detailRows" :key="i" :label="d[0]">{{ d[1] }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="openForward(traceCtx.lotId || detailNode?.lotId, detailNode?.batch)">→ 正向追溯（子集）</el-button>
        <el-button @click="openBackward(traceCtx.lotId || detailNode?.lotId, detailNode?.batch)">← 反向追溯（父级）</el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-trace { display: flex; flex-direction: column; gap: 14px; }
.trace-topbar { display: flex; align-items: center; gap: 12px; }
.trace-topbar__hint { color: #5a6b7e; font-size: 13px; }

.pill {
  display: inline-block;
  color: #fff;
  border-radius: 10px;
  padding: 1px 10px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 6px;
}

/* 高级检索 */
.adv-filter { border-bottom: 1px dashed #e3e9f0; }
.adv-filter__toggle { padding: 8px 14px; font-size: 13px; cursor: pointer; color: #1e4d8b; user-select: none; }
.adv-filter__body { padding: 4px 14px 12px; display: none; }
.adv-filter:hover .adv-filter__body { display: block; }
.adv-cond { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.adv-actions { margin-top: 4px; }

.node-badge {
  display: inline-block;
  color: #fff;
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 12px;
  margin-left: 6px;
}

/* 追溯路径 */
.trace-note { background: #fff8e1; border: 1px solid #ffe082; color: #8a6d00; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
.block-title { font-weight: 600; margin: 10px 0 8px; }
.trace-path-wrap { margin-bottom: 8px; }
.trace-path { display: flex; flex-direction: column; gap: 0; }
.trace-path-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 6px; background: #f5f8fc;
  &.current { background: #fff8e1; box-shadow: inset 0 0 0 1px #ffe082; font-weight: 600; }
  .tpi-icon { font-size: 18px; }
  .tpi-main { display: flex; align-items: center; gap: 4px; }
  .tpi-meta { margin-left: auto; color: #5a6b7e; font-size: 12px; }
}
.trace-path-bar { width: 2px; height: 14px; background: #c4d2e3; margin-left: 28px; }

/* 追溯树 */
.trace-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 8px; font-size: 12px; color: #5a6b7e; }
.trace-legend span { display: inline-flex; align-items: center; gap: 5px; }
.trace-legend i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
:deep(.el-tree-node__content) { height: auto; }
.tn {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 7px 10px; border-left: 3px solid #ccc; border-radius: 4px;
  &.highlight { background: #fff8e1; box-shadow: inset 0 0 0 1px #ffe082; }
  .tn-icon { font-size: 15px; }
  .tn-label { display: flex; align-items: center; }
  .tn-meta { margin-left: auto; color: #5a6b7e; font-size: 12px; }
}
.detail-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.detail-name { font-size: 15px; }
</style>
