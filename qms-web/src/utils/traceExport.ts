/**
 * 来料追溯导出工具
 * - exportTraceTreeExcel: 导出完整追溯树 + 每个节点的完整字段数据（Excel）
 * - exportLotsExcel:      导出「来料批次查询」列表（Excel）
 */
import ExcelJS from 'exceljs'
import type { SqmIncomingLot, TraceFullTreeVO, TraceNodeTreeVO } from '@/types/sqm'

function fmtVal(v: unknown): string | number {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'boolean') return v ? '是' : '否'
  if (typeof v === 'object') return JSON.stringify(v)
  return v as string | number
}

function ts(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1)
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  }
  ws.columns?.forEach((c: Partial<ExcelJS.Column>) => {
    if (c) c.width = Math.max(c.width || 12, 14)
  })
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

const NODE_FIELDS: { key: keyof TraceNodeTreeVO; label: string }[] = [
  { key: 'id', label: '节点ID' },
  { key: 'nodeType', label: '节点类型' },
  { key: 'nodeName', label: '节点名称' },
  { key: 'batchNo', label: '批次号' },
  { key: 'qty', label: '数量' },
  { key: 'unit', label: '单位' },
  { key: 'nodeDate', label: '日期' },
  { key: 'supplierId', label: '供应商ID' },
  { key: 'supplierName', label: '供应商名称' },
  { key: 'remark', label: '备注' },
  { key: 'isValid', label: '是否有效' },
]

function flatten(
  node: TraceNodeTreeVO | undefined,
  level: number,
  parentPath: string,
): { level: number; path: string; node: TraceNodeTreeVO }[] {
  const out: { level: number; path: string; node: TraceNodeTreeVO }[] = []
  const walk = (n: TraceNodeTreeVO | undefined, lv: number, pp: string) => {
    if (!n) return
    const label = (n.nodeName || n.batchNo || n.id) as string
    const path = pp ? `${pp} / ${label}` : label
    out.push({ level: lv, path, node: n })
    ;(n.children || []).forEach((c) => walk(c, lv + 1, path))
  }
  walk(node, level, parentPath)
  return out
}

/**
 * 导出完整追溯树
 * Sheet1 追溯树节点明细：层级 + 追溯路径 + 节点全部基础字段 + 全部明细字段（每个节点的完整字段数据）
 * Sheet2 追溯树结构：父子关系邻接表（完整追溯树）
 */
export async function exportTraceTreeExcel(treeVO: TraceFullTreeVO) {
  const flat = flatten(treeVO.tree, 0, '')

  // 收集所有明细字段键（不同节点类型字段不同，取并集）
  const detailKeys: string[] = []
  const seen = new Set<string>()
  flat.forEach((f) => {
    const d = f.node.detail as Record<string, unknown> | undefined
    if (d) {
      Object.keys(d).forEach((k) => {
        if (!seen.has(k)) {
          seen.add(k)
          detailKeys.push(k)
        }
      })
    }
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'QMS 康立质量过程管理系统'
  wb.created = new Date()
  wb.title = '来料追溯树导出'

  // ---- Sheet1: 节点明细 ----
  const ws1 = wb.addWorksheet('追溯树节点明细')
  ws1.addRow([
    '层级',
    '追溯路径',
    ...NODE_FIELDS.map((f) => f.label),
    ...detailKeys.map((k) => `明细.${k}`),
  ])
  flat.forEach((f) => {
    const row: (string | number)[] = [f.level, f.path]
    NODE_FIELDS.forEach((nf) => row.push(fmtVal(f.node[nf.key])))
    const d = (f.node.detail as Record<string, unknown>) || {}
    detailKeys.forEach((k) => row.push(fmtVal(d[k])))
    ws1.addRow(row)
  })
  await styleHeader(ws1)

  // ---- Sheet2: 树结构（父子邻接） ----
  const ws2 = wb.addWorksheet('追溯树结构')
  ws2.addRow(['父节点ID', '父节点名称', '子节点ID', '子节点名称', '子节点类型', '层级'])
  flat.forEach((f) => {
    const children = f.node.children || []
    if (!children.length) {
      ws2.addRow([
        f.node.parentNodeId || '',
        f.node.parentNodeId ? '<根节点>' : '',
        f.node.id,
        f.node.nodeName || f.node.batchNo || '',
        f.node.nodeType || '',
        f.level,
      ])
    } else {
      children.forEach((c) => {
        ws2.addRow([
          f.node.id,
          f.node.nodeName || f.node.batchNo || '',
          c.id,
          c.nodeName || c.batchNo || '',
          c.nodeType || '',
          f.level + 1,
        ])
      })
    }
  })
  await styleHeader(ws2)

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const rootLabel = treeVO.rootLotNo || treeVO.rootLotId || 'trace'
  download(blob, `来料追溯树_${rootLabel}_${ts()}.xlsx`)
}

/** 导出「来料批次查询」列表 */
export async function exportLotsExcel(lots: SqmIncomingLot[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'QMS 康立质量过程管理系统'
  wb.created = new Date()
  wb.title = '来料批次列表导出'

  const ws = wb.addWorksheet('来料批次')
  ws.addRow([
    '批次号',
    '物料代码',
    '物料名称',
    '数量',
    '单位',
    '到货日期',
    '检验状态',
    '是否关键件',
    '供应商ID',
    '采购单号',
  ])
  lots.forEach((r) => {
    ws.addRow([
      r.lotNo || '',
      r.partNo || '',
      r.partName || '',
      fmtVal(r.qty),
      r.unit || '',
      r.incomingDate || '',
      r.inspectResult || '',
      r.isKeyPart ? '是' : '否',
      r.supplierId || '',
      r.poNo || '',
    ])
  })
  await styleHeader(ws)

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  download(blob, `来料批次列表_${ts()}.xlsx`)
}
