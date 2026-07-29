// 追溯节点录入表单字段配置(四种节点类型共用一套 NodeForm 组件)。
// 字段 → 落库目标(表.列) 映射; 新增字段只需改这里, 不动页面。
// 落库目标说明:
//   node            -> sqm_trace_node 主表
//   product_detail  -> sqm_trace_product_detail(semi/ship 产出)
//   raw_detail      -> sqm_trace_raw_detail(组成来料)
//   customer_detail -> sqm_trace_customer_detail(客户出货)
//
// 数据来源(从表选取, 禁止凭空填写):
//   lot          -> 物料表(SqmIncomingLot, 由首件检验审核通过生成)
//   semi         -> 半成品表(sqm_trace_node, node_type=semi)
//   customer     -> 客户表(sqm_trace_node, node_type=customer)
//   lot-or-semi  -> 成品来源: 半成品表 或 物料表 二选一

export type NodeType = 'semi' | 'ship' | 'customer' | 'raw' | 'incoming'

export type WidgetType =
  | 'text'
  | 'number'
  | 'date'
  | 'readonly'        // 主数据带出, 只读
  | 'source-select'   // 从指定数据表下拉选取, 选取后按 fill 自动带出关联字段

export type SourceType = 'lot' | 'semi' | 'customer' | 'lot-or-semi' | 'supplier'

export interface FieldDef {
  key: string
  label: string
  widget: WidgetType
  target: 'node' | 'product_detail' | 'raw_detail' | 'customer_detail'
  required?: boolean
  placeholder?: string
  // 下拉来源(source-select 使用)
  source?: SourceType
  // 选取后自动带出的字段映射: 目标字段 -> 选项 meta 属性名
  fill?: Record<string, string>
  // 用量防超卖: 该下拉所选批次的剩余库存, 需 ≤ 此字段填写值(仅 lot 来源有意义)
  stockField?: string
  // 单位联动字段(数量类控件旁展示单位)
  unitField?: string
  // 来源为 lot 时, 是否按剩余库存为 0 禁用该选项(来料防超卖用; 入库建批次时应为 false)
  disableEmptyStock?: boolean
  // 提示
  tip?: string
}

export const NODE_FORM: Record<NodeType, FieldDef[]> = {
  // 半成品产出: 半成品是独立产出物, 名称/编码应直接录入(区别于投入的来料)。
  // 「由哪些来料组成」在节点抽屉里通过「+添加来料」(raw) 承载, 而非把来料身份借来当半成品身份。
  semi: [
    { key: 'productName', label: '半成品名称', widget: 'text', target: 'product_detail', required: true, placeholder: '如 储能电芯模组', tip: '填写本道工序产出的半成品名称（区别于投入的来料）' },
    { key: 'materialCode', label: '半成品编码', widget: 'text', target: 'product_detail', required: true, placeholder: '如 MAT-MODULE-001' },
    { key: 'modelSpec', label: '型号规格', widget: 'text', target: 'product_detail' },
    { key: 'batchNo', label: '批次号', widget: 'text', target: 'node', required: true },
    { key: 'qty', label: '产出数量', widget: 'number', target: 'node', required: true, unitField: 'unit' },
    { key: 'unit', label: '单位', widget: 'text', target: 'node' },
    { key: 'nodeDate', label: '生产日期', widget: 'date', target: 'node' },
    { key: 'inspector', label: '操作人', widget: 'text', target: 'product_detail' },
    { key: 'productionOrderNo', label: '生产订单号', widget: 'text', target: 'product_detail' },
  ],
  // 成品产出: 成品是独立产出物, 名称/编码直接录入。其在树中的「父(半成品/来料)」已由添加时的父子关系确定,
  // 如需复用已有半成品可走「引用已有节点」, 不必把来源身份借来当成品身份。
  ship: [
    { key: 'productName', label: '成品名称', widget: 'text', target: 'product_detail', required: true, placeholder: '如 储能系统', tip: '填写本道工序产出的成品名称（区别于投入的半成品/来料）' },
    { key: 'materialCode', label: '成品编码', widget: 'text', target: 'product_detail', required: true, placeholder: '如 MAT-SYSTEM-001' },
    { key: 'modelSpec', label: '型号规格', widget: 'text', target: 'product_detail' },
    { key: 'batchNo', label: '批次号', widget: 'text', target: 'node', required: true },
    { key: 'qty', label: '产出数量', widget: 'number', target: 'node', required: true, unitField: 'unit' },
    { key: 'unit', label: '单位', widget: 'text', target: 'node' },
    { key: 'nodeDate', label: '生产日期', widget: 'date', target: 'node' },
    { key: 'inspector', label: '操作人', widget: 'text', target: 'product_detail' },
    { key: 'productionOrderNo', label: '生产订单号', widget: 'text', target: 'product_detail' },
    { key: 'perfBatchNo', label: '性能批号', widget: 'text', target: 'product_detail', required: true },
  ],
  // 客户出货: 客户从「客户表」选取
  customer: [
    { key: 'customerName', label: '客户', widget: 'source-select', target: 'customer_detail', source: 'customer', required: true, fill: { customerCode: 'code' }, tip: '从「客户表」选取已有客户' },
    { key: 'customerOrderNo', label: '客户订单号', widget: 'text', target: 'customer_detail' },
    { key: 'shipDate', label: '发货日期', widget: 'date', target: 'customer_detail' },
    { key: 'qty', label: '发货数量', widget: 'number', target: 'customer_detail', required: true, unitField: 'unit', tip: '发货数量 ≤ 该成品可用库存' },
    { key: 'unit', label: '单位', widget: 'text', target: 'customer_detail' },
    { key: 'trackingNo', label: '物流单号', widget: 'text', target: 'customer_detail' },
    { key: 'shipAddress', label: '收货地址', widget: 'text', target: 'customer_detail' },
    { key: 'contactPerson', label: '联系人', widget: 'text', target: 'customer_detail' },
    { key: 'contactPhone', label: '联系电话', widget: 'text', target: 'customer_detail' },
  ],
  // 组成(来料): 在产出节点抽屉里点「+添加来料」时填写。
  // 来料从「物料表」（首件检验审核通过的来料批次）选取, 自动带出批次号/单位; 用量实时扣减批次库存防超卖。
  raw: [
    { key: 'materialName', label: '来料(物料)', widget: 'source-select', target: 'raw_detail', source: 'lot', required: true, fill: { materialCode: 'lotNo', unit: 'unit' }, stockField: 'usageQty', tip: '从「物料表」（首件检验审核通过的来料）选取' },
    { key: 'usageQty', label: '用量', widget: 'number', target: 'raw_detail', required: true, unitField: 'unit', tip: '不得超过所选批次剩余库存' },
    { key: 'processName', label: '工序', widget: 'text', target: 'raw_detail', placeholder: '如 焊接' },
  ],
  // 供应商来料入库(物料表 Tab ＋新增): 建批次(sqm_incoming_lot) + 自动生成 incoming 追溯节点(闭环入口)。
  // 物料(来源)从「物料表」选取(首件检验审核通过的来料), 自动带出物料编码/供应商/单位; 再进货只需填批次号与数量。
  // 注意: 入库是「复制物料信息建新批次」, 不应按库存为 0 禁用选项(disableEmptyStock=false)。
  incoming: [
    { key: 'partName', label: '物料(来源)', widget: 'source-select', target: 'node', source: 'lot', required: true, disableEmptyStock: false, fill: { partNo: 'code', supplierId: 'supplierId', unit: 'unit' }, tip: '从「物料表」（首件检验审核通过的来料）选取，自动带出编码/供应商/单位；再进货只需填批次号与数量' },
    { key: 'partNo', label: '物料编码', widget: 'readonly', target: 'node' },
    { key: 'supplierName', label: '供应商', widget: 'source-select', target: 'node', source: 'supplier', fill: { supplierId: 'id' }, tip: '新建物料时从供应商列表选取（已有物料会自动带出）' },
    { key: 'lotNo', label: '批次号', widget: 'text', target: 'node', required: true, tip: '建议用新批次号（如 LOT-20260723-001），避免与已有批次冲突' },
    { key: 'qty', label: '入库数量', widget: 'number', target: 'node', required: true, unitField: 'unit' },
    { key: 'unit', label: '单位', widget: 'text', target: 'node' },
    { key: 'incomingDate', label: '入库日期', widget: 'date', target: 'node' },
    { key: 'inspectResult', label: '检验结论', widget: 'text', target: 'node', placeholder: '合格/特采/不合格/待检' },
    { key: 'inspectType', label: '检验类型', widget: 'text', target: 'node', placeholder: '正常/加严/放宽' },
    { key: 'poNo', label: '采购单号', widget: 'text', target: 'node' },
  ],
}

// 节点类型 → 中文标签(供树/抽屉标题使用)
export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  semi: '半成品',
  ship: '成品',
  customer: '客户出货',
  raw: '来料',
  incoming: '来料批次',
}
