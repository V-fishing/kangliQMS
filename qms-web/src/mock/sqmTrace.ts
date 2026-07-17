/**
 * 来料追溯逻辑层（对齐 HTML 原型 renderSqmTrace / buildTraceByType / showNodeDetail 等）
 * 数据来自 sqmTraceData.ts（从 HTML MOCKX.sqm.treeTrace 提取）
 */
import { TRACE_TREE } from './sqmTraceData'

export type TraceNodeType = 'incoming' | 'raw' | 'semi' | 'ship' | 'customer'

export const TYPE_LABEL: Record<string, string> = {
  raw: '原料采购',
  semi: '半成品',
  ship: '成品出货',
  incoming: '来料批次',
  customer: '终端客户',
}
export const TYPE_ICON: Record<string, string> = {
  raw: '🌿',
  semi: '⚙️',
  ship: '🚚',
  incoming: '📦',
  customer: '🏥',
}
export const TYPE_COLOR: Record<string, string> = {
  raw: '#2f7d32',
  semi: '#8e44ad',
  ship: '#c0392b',
  incoming: '#1e4d8b',
  customer: '#16a085',
}

export interface Col {
  key: string
  label: string
}
export interface TraceRow {
  lotId: string
  batch: string
  [k: string]: string
}

/** 三类表格的列定义（列表列 + 详情全字段列），来自 HTML renderTypeTable 调用 */
export const TYPE_COLUMNS: Record<string, { list: Col[]; detail: Col[] }> = {
  raw: {
    list: [
      { key: 'materialCode', label: '物料代码' },
      { key: 'materialName', label: '物料名称' },
      { key: 'materialBarcode', label: '物料条码' },
      { key: 'woNo', label: '工单号' },
      { key: 'scanner', label: '扫描人' },
      { key: 'action', label: '操作' },
    ],
    detail: [
      { key: 'category', label: '分类' },
      { key: 'woNo', label: '工单号' },
      { key: 'productBarcode', label: '产品条码' },
      { key: 'productPartNo', label: '产品料号' },
      { key: 'productName', label: '产品名称' },
      { key: 'woQty', label: '工单数量' },
      { key: 'materialBarcode', label: '物料条码' },
      { key: 'materialCode', label: '物料代码' },
      { key: 'materialName', label: '物料名称' },
      { key: 'specModel', label: '规格型号' },
      { key: 'scanner', label: '扫描人' },
      { key: 'scanTime', label: '扫描时间' },
      { key: 'processCode', label: '工序编码' },
      { key: 'processName', label: '工序名称' },
      { key: 'isValid', label: '是否生效' },
      { key: 'invalidBy', label: '失效操作人' },
      { key: 'invalidTime', label: '失效时间' },
      { key: 'sup', label: '供应商' },
      { key: 'remark', label: '备注' },
    ],
  },
  semi: {
    list: [
      { key: 'batchNo', label: '生产批号' },
      { key: 'productName', label: '产品名称' },
      { key: 'materialCode', label: '物料编码' },
      { key: 'inspectResult', label: '检验结果' },
      { key: 'productionDate', label: '生产日期' },
      { key: 'action', label: '操作' },
    ],
    detail: [
      { key: 'isUrgent', label: '是否加急' },
      { key: 'qcReview', label: '品管审核' },
      { key: 'mgApprove', label: '管代批准' },
      { key: 'isValid', label: '是否有效' },
      { key: 'inspectResult', label: '检验结果' },
      { key: 'reportNo', label: '报告编号' },
      { key: 'inspectOrderNo', label: '送检单号' },
      { key: 'productionOrderNo', label: '生产订单号' },
      { key: 'materialCode', label: '物料编码' },
      { key: 'productName', label: '产品名称' },
      { key: 'modelSpec', label: '型号规格' },
      { key: 'batchNo', label: '生产批号或产品编号' },
      { key: 'productionDate', label: '生产日期' },
      { key: 'expiryDate', label: '过期日期' },
      { key: 'inspectQty', label: '送检数量' },
      { key: 'inspectCount', label: '检验数量' },
      { key: 'passQty', label: '合格数量' },
      { key: 'failQty', label: '不合格数' },
      { key: 'unit', label: '单位' },
      { key: 'inspector', label: '检验名字' },
      { key: 'category', label: '分类' },
      { key: 'qcReviewer', label: '品管审核人' },
      { key: 'qcReviewTime', label: '品管审核时间' },
      { key: 'mgApprover', label: '管代批准人' },
      { key: 'mgApproveTime', label: '管代批准时间' },
      { key: 'isEntrusted', label: '是否委托' },
      { key: 'drugRegNo', label: '药监批号' },
      { key: 'perfInspectMethod', label: '性能检验方式' },
      { key: 'perfBatchNo', label: '性能抽检批次编号' },
    ],
  },
  ship: {
    list: [
      { key: 'batchNo', label: '生产批号' },
      { key: 'productName', label: '产品名称' },
      { key: 'customer', label: '客户名称' },
      { key: 'inspectResult', label: '检验结果' },
      { key: 'shipDate', label: '出货日期' },
      { key: 'action', label: '操作' },
    ],
    detail: [
      { key: 'isUrgent', label: '是否加急' },
      { key: 'qcReview', label: '品管审核' },
      { key: 'mgApprove', label: '管代批准' },
      { key: 'isValid', label: '是否有效' },
      { key: 'inspectResult', label: '检验结果' },
      { key: 'reportNo', label: '报告编号' },
      { key: 'inspectOrderNo', label: '送检单号' },
      { key: 'productionOrderNo', label: '生产订单号' },
      { key: 'materialCode', label: '物料编码' },
      { key: 'productName', label: '产品名称' },
      { key: 'modelSpec', label: '型号规格' },
      { key: 'batchNo', label: '生产批号或产品编号' },
      { key: 'productionDate', label: '生产日期' },
      { key: 'expiryDate', label: '过期日期' },
      { key: 'inspectQty', label: '送检数量' },
      { key: 'inspectCount', label: '检验数量' },
      { key: 'passQty', label: '合格数量' },
      { key: 'failQty', label: '不合格数' },
      { key: 'unit', label: '单位' },
      { key: 'inspector', label: '检验名字' },
      { key: 'category', label: '分类' },
      { key: 'qcReviewer', label: '品管审核人' },
      { key: 'qcReviewTime', label: '品管审核时间' },
      { key: 'mgApprover', label: '管代批准人' },
      { key: 'mgApproveTime', label: '管代批准时间' },
      { key: 'isEntrusted', label: '是否委托' },
      { key: 'drugRegNo', label: '药监批号' },
      { key: 'perfInspectMethod', label: '性能检验方式' },
      { key: 'perfBatchNo', label: '性能抽检批次编号' },
      { key: 'customer', label: '客户名称' },
      { key: 'customerCode', label: '客户编码' },
      { key: 'customerOrderNo', label: '客户订单号' },
      { key: 'shipDate', label: '出货日期' },
      { key: 'trackingNo', label: '物流单号' },
      { key: 'shipAddress', label: '送货地址' },
    ],
  },
}

/** 遍历树，按类型收集扁平表格行 */
function collectByType(node: any, lotId: string, groups: Record<string, TraceRow[]>) {
  const type = node.type || 'raw'
  if (groups[type]) {
    const row: TraceRow = { lotId, batch: node.batch || node.name || lotId }
    const set = (k: string, v: any) => {
      row[k] = v == null || v === '' ? '-' : String(v)
    }
    if (type === 'raw') {
      ;['category', 'woNo', 'productBarcode', 'productPartNo', 'productName', 'woQty', 'materialBarcode', 'materialCode', 'materialName', 'specModel', 'scanner', 'scanTime', 'processCode', 'processName', 'isValid', 'invalidBy', 'invalidTime', 'sup', 'remark'].forEach((k) => set(k, node[k]))
    }
    if (type === 'semi' || type === 'ship') {
      ;['isUrgent', 'qcReview', 'mgApprove', 'isValid', 'inspectResult', 'reportNo', 'inspectOrderNo', 'productionOrderNo', 'materialCode', 'productName', 'modelSpec', 'batchNo', 'productionDate', 'expiryDate', 'inspectQty', 'inspectCount', 'passQty', 'failQty', 'unit', 'inspector', 'category', 'qcReviewer', 'qcReviewTime', 'mgApprover', 'mgApproveTime', 'isEntrusted', 'drugRegNo', 'perfInspectMethod', 'perfBatchNo'].forEach((k) => set(k, node[k]))
    }
    if (type === 'ship' || type === 'customer') {
      ;['customer', 'customerCode', 'customerOrderNo', 'shipDate', 'trackingNo', 'shipAddress'].forEach((k) => set(k, node[k]))
    }
    groups[type].push(row)
  }
  if (node.children && node.children.length) {
    node.children.forEach((c: any) => collectByType(c, lotId, groups))
  }
}

/** 按类型构建三张表数据 */
export function buildTraceByType(): Record<string, TraceRow[]> {
  const groups: Record<string, TraceRow[]> = { raw: [], semi: [], ship: [] }
  Object.keys(TRACE_TREE).forEach((lotId) => {
    const tree = TRACE_TREE[lotId].tree
    collectByType(tree, lotId, groups)
  })
  return groups
}

/** 根据批次号在指定批次树中查找节点 */
export function findNode(lotId: string, batch: string): any {
  const tree = TRACE_TREE[lotId]
  if (!tree) return null
  return _find(tree.tree, batch)
}
function _find(node: any, batch: string): any {
  if (node.batch === batch) return node
  if (node.children && node.children.length) {
    for (const c of node.children) {
      const f = _find(c, batch)
      if (f) return f
    }
  }
  return null
}

/** 获取从根到目标节点的路径 */
export function getNodePath(lotId: string, batch: string): any[] | null {
  const tree = TRACE_TREE[lotId]
  if (!tree) return null
  return _path(tree.tree, batch, [])
}
function _path(node: any, batch: string, acc: any[]): any[] | null {
  const path = [...acc, node]
  if (node.batch === batch) return path
  if (node.children && node.children.length) {
    for (const c of node.children) {
      const r = _path(c, batch, path)
      if (r) return r
    }
  }
  return null
}

/** 构建节点详情键值对（对齐 HTML buildDetailRows） */
export function buildDetailRows(node: any): [string, string][] {
  const row = (k: string, v: any) => [k, v == null || v === '' ? '-' : String(v)] as [string, string]
  if (node.type === 'incoming') {
    return [
      row('批次号', node.batch),
      row('批次名称', node.name),
      row('分类', node.category),
      row('数量', `${node.qty ?? '-'} ${node.unit ?? 'pcs'}`),
      row('日期', node.date),
      row('供应商', node.sup),
      row('备注', node.remark),
    ]
  }
  if (node.type === 'raw') {
    return [
      row('分类', node.category),
      row('工单号', node.woNo),
      row('产品条码', node.productBarcode),
      row('产品料号', node.productPartNo),
      row('产品名称', node.productName),
      row('工单数量', node.woQty),
      row('物料条码', node.materialBarcode),
      row('物料代码', node.materialCode),
      row('物料名称', node.materialName),
      row('规格型号', node.specModel),
      row('扫描人', node.scanner),
      row('扫描时间', node.scanTime),
      row('工序编码', node.processCode),
      row('工序名称', node.processName),
      row('是否生效', node.isValid),
      row('失效操作人', node.invalidBy),
      row('失效时间', node.invalidTime),
      row('供应商', node.sup),
      row('备注', node.remark),
    ]
  }
  if (node.type === 'semi' || node.type === 'ship') {
    const rows: [string, string][] = [
      row('是否加急', node.isUrgent),
      row('品管审核', node.qcReview),
      row('管代批准', node.mgApprove),
      row('是否有效', node.isValid),
      row('检验结果', node.inspectResult),
      row('报告编号', node.reportNo),
      row('送检单号', node.inspectOrderNo),
      row('生产订单号', node.productionOrderNo),
      row('物料编码', node.materialCode),
      row('产品名称', node.productName),
      row('型号规格', node.modelSpec),
      row('生产批号', node.batchNo ?? node.batch),
      row('生产日期', node.productionDate),
      row('过期日期', node.expiryDate),
      row('送检数量', node.inspectQty),
      row('检验数量', node.inspectCount),
      row('合格数量', node.passQty),
      row('不合格数', node.failQty),
      row('单位', node.unit),
      row('检验名字', node.inspector),
      row('分类', node.category),
      row('品管审核人', node.qcReviewer),
      row('品管审核时间', node.qcReviewTime),
      row('管代批准人', node.mgApprover),
      row('管代批准时间', node.mgApproveTime),
      row('是否委托', node.isEntrusted),
      row('药监批号', node.drugRegNo),
      row('性能检验方式', node.perfInspectMethod),
      row('性能抽检批次编号', node.perfBatchNo),
    ]
    if (node.type === 'ship') {
      rows.push(row('客户名称', node.customer))
      rows.push(row('客户编码', node.customerCode))
      rows.push(row('客户订单号', node.customerOrderNo))
      rows.push(row('出货日期', node.shipDate))
      rows.push(row('物流单号', node.trackingNo))
      rows.push(row('送货地址', node.shipAddress))
    }
    return rows
  }
  if (node.type === 'customer') {
    return [
      row('客户名称', node.customer),
      row('客户编码', node.customerCode),
      row('客户订单号', node.customerOrderNo),
      row('出货日期', node.shipDate),
      row('物流单号', node.trackingNo),
      row('送货地址', node.shipAddress),
      row('联系人', node.contact),
      row('联系电话', node.phone),
      row('数量', `${node.qty ?? '-'} ${node.unit ?? 'pcs'}`),
      row('日期', node.date),
    ]
  }
  return []
}

/** 导出工具：CSV */
export function exportCsv(rows: TraceRow[], cols: Col[], filename: string) {
  const head = cols.map((c) => c.label).join(',')
  const body = rows
    .map((r) => cols.map((c) => `"${(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + head + '\n' + body], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename)
}
/** 导出工具：Excel（HTML 表格，可被 Excel 打开） */
export function exportExcel(rows: TraceRow[], cols: Col[], filename: string) {
  const th = cols.map((c) => `<th>${c.label}</th>`).join('')
  const tr = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${r[c.key] ?? ''}</td>`).join('')}</tr>`)
    .join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></body></html>`
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const LOT_IDS = Object.keys(TRACE_TREE)

/* ============ 字段批注字典（导出用） ============ */
export const TRACE_FIELD_GLOSSARY: { key: string; label: string; desc: string }[] = [
  { key: 'level', label: '层级', desc: '节点在树中的层级，根节点为 0，每深入一层 +1' },
  { key: 'type', label: '类型', desc: '节点类型：incoming 来料批次 / raw 原料采购 / semi 半成品 / ship 出货交付 / customer 终端客户' },
  { key: 'name', label: '名称', desc: '节点显示名称（物料/产品/批次名称）' },
  { key: 'batch', label: '批次', desc: '节点批次号或唯一标识' },
  { key: 'qty', label: '数量', desc: '节点对应数量' },
  { key: 'unit', label: '单位', desc: '数量单位（pcs/kg 等）' },
  { key: 'date', label: '日期', desc: '节点对应日期（来料/生产/出货日期）' },
  { key: 'sup', label: '供应商', desc: '来料供应商名称' },
  { key: 'result', label: '检验结果', desc: '检验结果：合格 / 不合格 / -（无检验）' },
  { key: 'detail', label: '详情摘要', desc: '节点详情摘要文本' },
  { key: 'lotId', label: '追溯批次号', desc: '顶层追溯批次 ID，贯穿整条追溯链' },
  { key: 'category', label: '分类', desc: '物料/产品分类' },
  { key: 'woNo', label: '工单号', desc: '关联的生产工单编号' },
  { key: 'productBarcode', label: '产品条码', desc: '成品的唯一产品条码' },
  { key: 'productPartNo', label: '产品料号', desc: '成品物料料号' },
  { key: 'productName', label: '产品名称', desc: '成品/产品名称' },
  { key: 'materialBarcode', label: '物料条码', desc: '物料唯一条码' },
  { key: 'materialCode', label: '物料代码', desc: '物料编码' },
  { key: 'materialName', label: '物料名称', desc: '物料名称' },
  { key: 'specModel', label: '规格型号', desc: '规格型号' },
  { key: 'scanner', label: '扫描人', desc: '扫描操作人' },
  { key: 'scanTime', label: '扫描时间', desc: '扫描时间' },
  { key: 'processCode', label: '工序编码', desc: '工序编码' },
  { key: 'processName', label: '工序名称', desc: '工序名称' },
  { key: 'isValid', label: '是否生效', desc: '是否生效' },
  { key: 'invalidBy', label: '失效操作人', desc: '失效操作人' },
  { key: 'invalidTime', label: '失效时间', desc: '失效时间' },
  { key: 'remark', label: '备注', desc: '备注' },
  { key: 'isUrgent', label: '是否加急', desc: '是否加急' },
  { key: 'qcReview', label: '品管审核', desc: '品管审核' },
  { key: 'mgApprove', label: '管代批准', desc: '管代批准' },
  { key: 'inspectResult', label: '检验结果', desc: '检验结果' },
  { key: 'reportNo', label: '报告编号', desc: '报告编号' },
  { key: 'inspectOrderNo', label: '送检单号', desc: '送检单号' },
  { key: 'productionOrderNo', label: '生产订单号', desc: '生产订单号' },
  { key: 'modelSpec', label: '型号规格', desc: '型号规格' },
  { key: 'batchNo', label: '生产批号', desc: '生产批号或产品编号' },
  { key: 'productionDate', label: '生产日期', desc: '生产日期' },
  { key: 'expiryDate', label: '过期日期', desc: '过期日期' },
  { key: 'inspectQty', label: '送检数量', desc: '送检数量' },
  { key: 'inspectCount', label: '检验数量', desc: '检验数量' },
  { key: 'passQty', label: '合格数量', desc: '合格数量' },
  { key: 'failQty', label: '不合格数', desc: '不合格数' },
  { key: 'inspector', label: '检验名字', desc: '检验人' },
  { key: 'qcReviewer', label: '品管审核人', desc: '品管审核人' },
  { key: 'qcReviewTime', label: '品管审核时间', desc: '品管审核时间' },
  { key: 'mgApprover', label: '管代批准人', desc: '管代批准人' },
  { key: 'mgApproveTime', label: '管代批准时间', desc: '管代批准时间' },
  { key: 'isEntrusted', label: '是否委托', desc: '是否委托' },
  { key: 'drugRegNo', label: '药监批号', desc: '药监批号' },
  { key: 'perfInspectMethod', label: '性能检验方式', desc: '性能检验方式' },
  { key: 'perfBatchNo', label: '性能抽检批次编号', desc: '性能抽检批次编号' },
  { key: 'customer', label: '客户名称', desc: '客户名称' },
  { key: 'customerCode', label: '客户编码', desc: '客户编码' },
  { key: 'customerOrderNo', label: '客户订单号', desc: '客户订单号' },
  { key: 'shipDate', label: '出货日期', desc: '出货日期' },
  { key: 'trackingNo', label: '物流单号', desc: '物流单号' },
  { key: 'shipAddress', label: '送货地址', desc: '送货地址' },
  { key: 'contact', label: '联系人', desc: '终端客户联系人' },
  { key: 'phone', label: '联系电话', desc: '终端客户联系电话' },
]

/** 收集树全部节点（保留原始 node 引用，便于取全字段） */
export function collectTreeNodes(node: any, level = 0, result: { level: number; node: any }[] = []) {
  result.push({ level, node })
  if (node.children && node.children.length > 0) {
    node.children.forEach((child: any) => collectTreeNodes(child, level + 1, result))
  }
  return result
}

/** 取节点全字段键值对（数据版，与 buildDetailRows 字段映射一致，供导出批注使用） */
export function getNodeDetailPairs(node: any): { label: string; value: string }[] {
  const pairs: { label: string; value: string }[] = []
  if (!node) return pairs
  const add = (label: string, val: any) => {
    pairs.push({ label, value: val == null || val === '' ? '-' : String(val) })
  }
  if (node.type === 'incoming') {
    add('批次号', node.batch)
    add('批次名称', node.name)
    add('分类', node.category)
    add('数量', node.qty ? `${node.qty} ${node.unit || 'pcs'}` : '-')
    add('日期', node.date)
    add('供应商', node.sup)
    add('备注', node.remark)
  } else if (node.type === 'raw') {
    add('分类', node.category)
    add('工单号', node.woNo)
    add('产品条码', node.productBarcode)
    add('产品料号', node.productPartNo)
    add('产品名称', node.productName)
    add('工单数量', node.woQty)
    add('物料条码', node.materialBarcode)
    add('物料代码', node.materialCode)
    add('物料名称', node.materialName)
    add('规格型号', node.specModel)
    add('扫描人', node.scanner)
    add('扫描时间', node.scanTime)
    add('工序编码', node.processCode)
    add('工序名称', node.processName)
    add('是否生效', node.isValid)
    add('失效操作人', node.invalidBy)
    add('失效时间', node.invalidTime)
    add('供应商', node.sup)
    add('备注', node.remark)
  } else if (node.type === 'semi' || node.type === 'ship') {
    add('是否加急', node.isUrgent)
    add('品管审核', node.qcReview)
    add('管代批准', node.mgApprove)
    add('是否有效', node.isValid)
    add('检验结果', node.inspectResult)
    add('报告编号', node.reportNo)
    add('送检单号', node.inspectOrderNo)
    add('生产订单号', node.productionOrderNo)
    add('物料编码', node.materialCode)
    add('产品名称', node.productName)
    add('型号规格', node.modelSpec)
    add('生产批号', node.batchNo ?? node.batch)
    add('生产日期', node.productionDate)
    add('过期日期', node.expiryDate)
    add('送检数量', node.inspectQty)
    add('检验数量', node.inspectCount)
    add('合格数量', node.passQty)
    add('不合格数', node.failQty)
    add('单位', node.unit)
    add('检验名字', node.inspector)
    add('分类', node.category)
    add('品管审核人', node.qcReviewer)
    add('品管审核时间', node.qcReviewTime)
    add('管代批准人', node.mgApprover)
    add('管代批准时间', node.mgApproveTime)
    add('是否委托', node.isEntrusted)
    add('药监批号', node.drugRegNo)
    add('性能检验方式', node.perfInspectMethod)
    add('性能抽检批次编号', node.perfBatchNo)
    if (node.type === 'ship') {
      add('客户名称', node.customer)
      add('客户编码', node.customerCode)
      add('客户订单号', node.customerOrderNo)
      add('出货日期', node.shipDate)
      add('物流单号', node.trackingNo)
      add('送货地址', node.shipAddress)
    }
  } else if (node.type === 'customer') {
    add('客户名称', node.customer)
    add('客户编码', node.customerCode)
    add('客户订单号', node.customerOrderNo)
    add('出货日期', node.shipDate)
    add('物流单号', node.trackingNo)
    add('送货地址', node.shipAddress)
    add('联系人', node.contact)
    add('联系电话', node.phone)
    add('数量', node.qty ? `${node.qty} ${node.unit || 'pcs'}` : '-')
    add('日期', node.date)
  } else {
    Object.keys(node).forEach((k) => {
      if (k !== 'children') add(k, node[k])
    })
  }
  return pairs
}

function escapeCsvValue(val: string) {
  let s = String(val == null ? '' : val).replace(/"/g, '""')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    s = '"' + s + '"'
  }
  return s
}

/** 树状 JSON 导出 */
export function exportTreeAsJSON(tree: any, filename: string) {
  const json = JSON.stringify(tree, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  downloadBlob(blob, filename)
}

/** 树状 CSV 导出：扁平汇总 + 尾部字段说明 + 各节点全字段批注 */
export function exportTreeAsCSV(tree: any, lotId: string, filename: string) {
  const nodes = collectTreeNodes(tree, 0, [])
  const sumCols = [
    { key: 'level', label: '层级' },
    { key: 'type', label: '类型' },
    { key: 'name', label: '名称' },
    { key: 'batch', label: '批次' },
    { key: 'qty', label: '数量' },
    { key: 'unit', label: '单位' },
    { key: 'date', label: '日期' },
    { key: 'sup', label: '供应商' },
    { key: 'result', label: '检验结果' },
    { key: 'detail', label: '详情摘要' },
  ]
  const lines: string[] = []
  lines.push('===== 树状追溯（扁平视图）=====')
  lines.push(sumCols.map((c) => escapeCsvValue(c.label)).join(','))
  nodes.forEach((it) => {
    const n = it.node
    const vals = [
      it.level,
      n.type || '',
      n.name || '',
      n.batch || '',
      n.qty || '',
      n.unit || '',
      n.date || '',
      n.sup || '',
      n.result || '',
      n.detail || '',
    ]
    lines.push(vals.map((v) => escapeCsvValue(String(v))).join(','))
  })
  // 尾部一：字段说明
  lines.push('')
  lines.push('===== 字段说明（字段解释与批注）=====')
  lines.push(['字段代码', '字段名称', '字段说明与批注'].map(escapeCsvValue).join(','))
  TRACE_FIELD_GLOSSARY.forEach((f) => {
    lines.push([f.key, f.label, f.desc].map(escapeCsvValue).join(','))
  })
  // 尾部二：各节点详细信息
  lines.push('')
  lines.push('===== 各节点详细信息（全字段）=====')
  nodes.forEach((it, i) => {
    const n = it.node
    lines.push('')
    lines.push(
      ['【节点' + (i + 1) + '】', '层级=' + it.level, '类型=' + (n.type || ''), '名称=' + (n.name || ''), '批次=' + (n.batch || '')]
        .map(escapeCsvValue)
        .join(','),
    )
    const pairs = getNodeDetailPairs(n)
    pairs.forEach((p) => {
      lines.push([p.label, p.value].map(escapeCsvValue).join(','))
    })
  })
  const csv = '\ufeff' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename)
}

/** 树状 Excel 导出：扁平汇总表 + 字段说明表 + 各节点全字段明细表 */
export function exportTreeAsExcel(tree: any, lotId: string, filename: string) {
  const nodes = collectTreeNodes(tree, 0, [])
  const sumCols = [
    { key: 'level', label: '层级' },
    { key: 'type', label: '类型' },
    { key: 'name', label: '名称' },
    { key: 'batch', label: '批次' },
    { key: 'qty', label: '数量' },
    { key: 'unit', label: '单位' },
    { key: 'date', label: '日期' },
    { key: 'sup', label: '供应商' },
    { key: 'result', label: '检验结果' },
    { key: 'detail', label: '详情摘要' },
  ]
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>th{background:#eef2f8}h3{background:#1e4d8b;color:#fff;padding:6px 10px;font-size:13px}table{border-collapse:collapse}th,td{border:1px solid #999;padding:4px 6px;font-size:11px}</style></head><body>'
  html += '<h3>一、树状追溯（扁平视图）</h3>'
  html += '<table border="1"><thead><tr>' + sumCols.map((c) => '<th>' + esc(c.label) + '</th>').join('') + '</tr></thead><tbody>'
  nodes.forEach((it) => {
    const n = it.node
    html += '<tr>'
    sumCols.forEach((c) => {
      const v = c.key === 'level' ? String(it.level) : esc(n[c.key] || '')
      html += '<td>' + v + '</td>'
    })
    html += '</tr>'
  })
  html += '</tbody></table>'
  html += '<h3>二、字段说明（字段解释与批注）</h3>'
  html += '<table border="1"><thead><tr><th>字段代码</th><th>字段名称</th><th>字段说明与批注</th></tr></thead><tbody>'
  TRACE_FIELD_GLOSSARY.forEach((f) => {
    html += '<tr><td>' + esc(f.key) + '</td><td>' + esc(f.label) + '</td><td>' + esc(f.desc) + '</td></tr>'
  })
  html += '</tbody></table>'
  html += '<h3>三、各节点详细信息（全字段）</h3>'
  nodes.forEach((it, i) => {
    const n = it.node
    const pairs = getNodeDetailPairs(n)
    html += '<table border="1"><thead><tr><th colspan="2" style="background:#f4f7fc">【节点' + (i + 1) + '】层级 ' + it.level + ' · ' + esc(n.type || '') + ' · ' + esc(n.name || '') + '（批次：' + esc(n.batch || '') + '）</th></tr></thead><tbody>'
    pairs.forEach((p) => {
      html += '<tr><th style="width:30%">' + esc(p.label) + '</th><td>' + esc(p.value) + '</td></tr>'
    })
    html += '</tbody></table>'
  })
  html += '</body></html>'
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  downloadBlob(blob, filename)
}

/** 渲染树状视觉图（层级缩进、颜色标签、图标，对齐页面 el-tree 效果） */
export function renderTreeVisual(node: any, level = 0): string {
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const color = TYPE_COLOR[node.type] || '#999'
  const icon = TYPE_ICON[node.type] || '📋'
  const label = TYPE_LABEL[node.type] || '其他'
  const badge = `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:#fff;background:${esc(color)};margin:0 4px">${esc(label)}</span>`
  const result = node.inspectResult
    ? `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:#fff;background:${node.inspectResult === '合格' ? '#2f7d32' : '#c0392b'};margin:0 4px">${esc(node.inspectResult)}</span>`
    : ''
  const meta = `批次：${esc(node.batch || '-')} · ${esc(node.qty || '-')}${esc(node.unit || 'pcs')} · ${esc(node.date || '-')}`
  const indent = level * 22
  let html = `<div style="margin-left:${indent}px;padding:6px 8px;border-left:3px solid ${esc(color)};margin-bottom:4px;background:#fafbfc;border-radius:0 4px 4px 0">`
  html += `<div style="font-size:13px">${esc(icon)} <strong>${esc(node.name)}</strong>${badge}${result}</div>`
  html += `<div style="font-size:11px;color:#5a6b7e;margin-top:2px">${meta}</div>`
  html += `</div>`
  if (node.children && node.children.length) {
    node.children.forEach((child: any) => {
      html += renderTreeVisual(child, level + 1)
    })
  }
  return html
}

/** 树状 PDF 导出：通过 iframe 打印 */
export function printTreeToPDF(lotId: string, tree: any, title: string) {
  const nodes = collectTreeNodes(tree, 0, [])
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let html = '<html><head><meta charset="UTF-8"><title>' + esc(title) + '</title>'
  html += '<style>body{font-family:Arial,"Microsoft YaHei",sans-serif;padding:20px;color:#1f2d3d}h2{margin:0 0 6px}h3{margin:16px 0 8px;border-bottom:2px solid #1e4d8b;padding-bottom:4px}.tree-root{font-size:12px;line-height:1.6}.node-type-badge{display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;color:#fff;background:#666;margin:0 2px}table{border-collapse:collapse;width:100%;font-size:11px;margin-bottom:8px}th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef2f8}.node-block{border:1px solid #ddd;border-radius:6px;padding:8px 12px;margin:8px 0;background:#fafbfc}.node-title{font-weight:700;color:#1e4d8b;margin-bottom:4px}</style>'
  html += '</head><body>'
  html += '<h2>' + esc(title) + '</h2>'
  html += '<div style="color:#666;margin-bottom:12px">共 ' + nodes.length + ' 个节点 · 含字段解释与各节点全字段批注</div>'
  html += '<h3>一、树状追溯图</h3>'
  html += '<div class="tree-root">' + renderTreeVisual(tree) + '</div>'
  html += '<h3>二、各节点详细信息（全字段）</h3>'
  nodes.forEach((it, i) => {
    const n = it.node
    html += '<div class="node-block">'
    html += '<div class="node-title">【节点' + (i + 1) + '】层级 ' + it.level + ' · ' + esc(n.type || '') + ' · ' + esc(n.name || '') + '（批次：' + esc(n.batch || '') + '）</div>'
    const pairs = getNodeDetailPairs(n)
    html += '<table><tbody>'
    for (let j = 0; j < pairs.length; j += 2) {
      html += '<tr>'
      html += '<th style="width:20%">' + esc(pairs[j].label) + '</th><td style="width:30%">' + esc(pairs[j].value) + '</td>'
      if (pairs[j + 1]) {
        html += '<th style="width:20%">' + esc(pairs[j + 1].label) + '</th><td style="width:30%">' + esc(pairs[j + 1].value) + '</td>'
      } else {
        html += '<td colspan="2"></td>'
      }
      html += '</tr>'
    }
    html += '</tbody></table></div>'
  })
  html += '</body></html>'
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px;'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow!.document
  doc.open()
  doc.write(html)
  doc.close()
  iframe.contentWindow!.focus()
  iframe.contentWindow!.print()
  setTimeout(() => {
    document.body.removeChild(iframe)
  }, 1000)
}

/** 统一树状导出入口 */
export function handleExportTree(lotId: string, tree: any, format: 'json' | 'csv' | 'excel' | 'pdf') {
  const filename = '树状追溯_' + lotId + '_' + new Date().toISOString().slice(0, 10)
  if (format === 'json') {
    exportTreeAsJSON(tree, filename + '.json')
  } else if (format === 'csv') {
    exportTreeAsCSV(tree, lotId, filename + '.csv')
  } else if (format === 'excel') {
    exportTreeAsExcel(tree, lotId, filename + '.xls')
  } else if (format === 'pdf') {
    printTreeToPDF(lotId, tree, '树状追溯 - ' + lotId)
  }
}
