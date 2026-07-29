// 追溯模块共享逻辑（状态 + 接口调用 + 业务流程）。
// 把原先散落在 TraceWorkbench.vue 中的全部逻辑集中到这里，
// 页面/组件只负责"展示"与"派发事件"，业务判定都在本 composable 内完成。
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { sqmApi } from '@/api/modules/sqm'
import { useCompanyStore } from '@/stores/company'
import type {
  SqmTraceNode,
  TraceNodeTreeVO,
  TraceNodeSaveRequest,
  TraceComponentItem,
  TraceNodeSearchVO,
  TraceDirectionNode,
} from '@/types/sqm'

// ---------- 常量 ----------
export const NODE_TYPE_LABEL: Record<string, string> = {
  incoming: '来料批次',
  raw: '原材料',
  semi: '半成品',
  ship: '成品',
  customer: '客户出货',
}

// Tab 定义：总表 / 物料表(incoming+raw) / 半成品 / 成品 / 客户
export const TABS = [
  { key: 'total', label: '总表', nodeTypes: '' },
  { key: 'incoming', label: '物料表', nodeTypes: 'incoming,raw' },
  { key: 'semi', label: '半成品表', nodeTypes: 'semi' },
  { key: 'ship', label: '成品表', nodeTypes: 'ship' },
  { key: 'customer', label: '客户表', nodeTypes: 'customer' },
] as const

export function nodeTypeLabel(t?: string | null) {
  return (t ? NODE_TYPE_LABEL[t] : null) || t || '-'
}

// 节点类型标签配色（列表列 / 追溯方向标签共用）
export function typeTagType(t?: string | null): 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  if (t === 'raw' || t === 'incoming') return 'warning'
  if (t === 'customer') return 'danger'
  if (t === 'ship') return 'success'
  return 'info'
}

// 合法上游类型：与 seed 链路方向一致（parent=上游, child=下游）
// 合法链路: incoming → raw/semi → ship → customer
export function upstreamTypesOf(nodeType?: string | null): string[] {
  if (nodeType === 'raw') return ['incoming']
  if (nodeType === 'semi') return ['incoming', 'raw', 'semi']
  if (nodeType === 'ship') return ['incoming', 'raw', 'semi']
  if (nodeType === 'customer') return ['ship']
  return []
}

// 在当前选中节点下可向下追加的子节点类型
export function downstreamAddableOf(nodeType?: string | null): {
  raw: boolean
  semi: boolean
  ship: boolean
  customer: boolean
} {
  const t = nodeType || ''
  return {
    raw: ['incoming', 'raw'].includes(t),
    semi: ['incoming', 'raw', 'semi'].includes(t),
    ship: ['semi', 'ship'].includes(t),
    customer: t === 'ship',
  }
}

export function useTrace() {
  const companyStore = useCompanyStore()
  const orgId = computed(() => companyStore.currentOrgId)

  // ============ 列表 ============
  const activeTab = ref<string>('incoming')
  const currentTab = computed(() => TABS.find((t) => t.key === activeTab.value)!)
  const keyword = ref('')
  const tablePage = ref(1)
  const tableSize = ref(20)
  const tableTotal = ref(0)
  const tableData = ref<TraceNodeSearchVO[]>([])
  const tableLoading = ref(false)

  async function loadTable() {
    if (!orgId.value) return
    tableLoading.value = true
    try {
      const r = await sqmApi.searchTraceNodes({
        nodeType: currentTab.value.nodeTypes || undefined,
        keyword: keyword.value || undefined,
        orgId: orgId.value || undefined,
        page: tablePage.value,
        size: tableSize.value,
      })
      tableData.value = r.records || []
      tableTotal.value = r.total || 0
    } catch (e: any) {
      ElMessage.error('查询失败：' + (e?.message || e))
      tableData.value = []
      tableTotal.value = 0
    } finally {
      tableLoading.value = false
    }
  }

  function onTabChange() {
    treeMode.value = false
    tablePage.value = 1
    keyword.value = ''
    loadTable()
  }

  function onSearch() {
    tablePage.value = 1
    loadTable()
  }

  function onReset() {
    keyword.value = ''
    tablePage.value = 1
    loadTable()
  }

  // 物料表默认建 incoming，其余与 Tab key 一致
  function onAddRoot() {
    const key = activeTab.value
    const type = key === 'incoming' ? 'incoming' : key
    openForm('create', type, null, {})
  }

  // ============ 批次根树（批次选择器驱动） ============
  const treeMode = ref(false)
  const rootBatchId = ref('')
  const rootBatchOptions = ref<{ value: string; label: string }[]>([])
  const rootBatchLoading = ref(false)
  const upTree = ref<TraceNodeTreeVO | null>(null)
  const rootDisplayName = computed(() => {
    const n = tree.value || upTree.value
    return n ? n.nodeName || n.batchNo || '未命名' : ''
  })

  function onRootBatchChange() {
    loadRootTree()
  }

  async function remoteSearchBatch(kw: string) {
    if (!orgId.value) return
    rootBatchLoading.value = true
    try {
      const res = await sqmApi.searchTraceNodes({
        orgId: orgId.value,
        keyword: kw || undefined,
        page: 1,
        size: 50,
      })
      rootBatchOptions.value = (res.records || []).map((n: any) => ({
        value: n.id,
        label: `${n.nodeName || '未命名'}（${n.batchNo || '-'}）· ${NODE_TYPE_LABEL[n.nodeType] || n.nodeType || '节点'}`,
      }))
    } catch (e) {
      rootBatchOptions.value = []
    } finally {
      rootBatchLoading.value = false
    }
  }

  async function loadRootTree() {
    const id = rootBatchId.value
    if (!id) {
      treeMode.value = false
      return
    }
    try {
      const res = await sqmApi.getTraceTreeFromNode(id)
      tree.value = res.tree || null
      upTree.value = res.upTree || null
      treeFocusId.value = id
      treePathSet.value = []
      selectedNode.value = null
      treeTitle.value =
        rootBatchOptions.value.find((o) => o.value === id)?.label || '追溯根'
      treeMode.value = true
    } catch (e: any) {
      treeMode.value = false
      ElMessage.error('加载追溯树失败：' + (e?.message || e))
    }
  }

  function exitTreeMode() {
    treeMode.value = false
    upTree.value = null
  }

  // ============ 树下钻抽屉 ============
  const treeVisible = ref(false)
  const treeRootId = ref<string | null>(null)
  const treeTitle = ref('')
  const tree = ref<TraceNodeTreeVO | null>(null)
  const treeFocusId = ref<string | null>(null)
  const treePathSet = ref<string[]>([])
  const treeLoadError = ref<string | null>(null)
  const selectedNode = ref<TraceNodeTreeVO | null>(null)

  function openTree(row: TraceNodeSearchVO) {
    treeTitle.value = row.nodeName || row.batchNo || '未命名'
    treeRootId.value = row.id || null
    // 立即把行数据作为焦点节点，让头部「添加/绑定」按钮无需等待树加载即可用
    selectedNode.value = { ...(row as any) } as TraceNodeTreeVO | null
    treeVisible.value = true
    setTimeout(() => loadTree(), 100)
  }

  async function loadTree() {
    if (!treeRootId.value) return
    try {
      treeLoadError.value = null
      const res = await sqmApi.getTraceTreeFromNode(treeRootId.value)
      tree.value = res.tree || null
      upTree.value = res.upTree || null
      treeFocusId.value = treeRootId.value
      treePathSet.value = []
      // 用接口返回的焦点节点刷新 selectedNode，使头部按钮始终基于焦点可用
      selectedNode.value = (res.tree || selectedNode.value) as TraceNodeTreeVO | null
      applyDirection()
    } catch (e: any) {
      treeLoadError.value = e?.message || '加载追溯树失败'
      console.warn('[trace] 加载追溯树失败:', treeLoadError.value)
      tree.value = null
      upTree.value = null
    }
  }

  function onTreeClose() {
    treeVisible.value = false
    tree.value = null
    upTree.value = null
    selectedNode.value = null
    treeLoadError.value = null
    traceDir.value = 'all'
    directionNodes.value = []
    loadTable()
  }

  function onTreeSelect(node: TraceNodeTreeVO) {
    selectedNode.value = node
    treeFocusId.value = node.id
    traceDir.value = 'all'
    applyDirection()
  }

  // ============ 绑定上游节点（支持多个上游；多选 + 远程搜索应对大数据量） ============
  const bindUpstreamVisible = ref(false)
  const canBindUpstream = computed(
    () => !!selectedNode.value && selectedNode.value.nodeType !== 'incoming',
  )

  function openBindUpstream() {
    bindUpstreamVisible.value = true
  }

  // ids: 选中的多个上游节点 id；当前节点作为它们的下游
  async function confirmBindUpstream(ids: string[]) {
    if (!ids.length || !selectedNode.value) {
      ElMessage.warning('请选择至少一个上游节点')
      return
    }
    try {
      let ok = 0
      for (const pid of ids) {
        await sqmApi.attachComponent(pid, {
          componentType: selectedNode.value!.nodeType as any,
          refNodeId: selectedNode.value!.id,
        })
        ok++
      }
      ElMessage.success(`已绑定 ${ok} 个上游节点`)
      bindUpstreamVisible.value = false
      await loadTree()
    } catch (e: any) {
      ElMessage.error(e?.message || '绑定失败')
    }
  }

  // ============ 正/反向追溯 ============
  const traceDir = ref<'all' | 'forward' | 'backward'>('all')
  const directionNodes = ref<TraceDirectionNode[]>([])

  const dirLabel = computed(
    () =>
      (({ all: '全部（整树）', forward: '正向 · 流向', backward: '反向 · 来源' } as Record<string, string>)[
        traceDir.value
      ] || ''),
  )

  async function applyDirection() {
    if (!selectedNode.value) return
    const dir = traceDir.value === 'all' ? 'both' : traceDir.value
    try {
      const list = await sqmApi.traceDirection(selectedNode.value.id, dir)
      directionNodes.value = list || []
      treePathSet.value = (list || []).map((n) => n.id!).filter(Boolean)
    } catch (e: any) {
      directionNodes.value = []
      ElMessage.error('追溯失败：' + (e?.message || e))
    }
  }

  const displayDirectionNodes = computed(() => {
    if (traceDir.value === 'all') {
      return [...directionNodes.value].sort((a, b) => (a.treeLevel ?? 0) - (b.treeLevel ?? 0))
    }
    return directionNodes.value
  })

  function focusDirectionNode(id?: string) {
    if (!id) return
    treeFocusId.value = id
  }

  // ============ 节点详情抽屉 ============
  const detailVisible = ref(false)
  const detailNodeId = ref<string>('')

  function openDetail(id?: string) {
    if (!id) return
    detailNodeId.value = id
    detailVisible.value = true
  }

  function onOpenRelatedNode(id: string) {
    detailNodeId.value = id
    detailVisible.value = true
  }

  // ============ 节点表单（新增 / 在树下加子节点） ============
  const formVisible = ref(false)
  const formMode = ref<'create' | 'add-child'>('create')
  const formNodeType = ref<string>('incoming')
  const formParentId = ref<string | null>(null)
  const formInitial = ref<Record<string, any>>({})
  const formKey = ref(0)
  const submitting = ref(false)

  function addComponent(kind: 'raw' | 'semi' | 'ship') {
    openForm('add-child', kind, selectedNode.value!.id, {})
  }
  function addCustomer() {
    openForm('add-child', 'customer', selectedNode.value!.id, {})
  }

  function openForm(
    mode: 'create' | 'add-child',
    nodeType: string,
    parentId: string | null,
    initial: Record<string, any>,
  ) {
    formMode.value = mode
    formNodeType.value = nodeType
    formParentId.value = parentId
    formInitial.value = { ...initial }
    formKey.value++
    formVisible.value = true
  }

  // 由 TraceNodeFormDialog 在点击「保存」时派发：{ form, qualificationType }
  async function onFormSave(payload: { form: Record<string, any>; qualificationType: string }) {
    if (!orgId.value) {
      ElMessage.warning('请先选择具体公司')
      return
    }
    const form = payload.form
    const qualificationType = payload.qualificationType
    submitting.value = true
    try {
      // 供应商来料入库（物料表 Tab ＋新增）：建批次 + 自动生成 incoming 追溯节点（闭环入口）
      if (formNodeType.value === 'incoming') {
        await sqmApi.createLot({ ...form, orgId: orgId.value })
        ElMessage.success('来料批次已入库')
        formVisible.value = false
        loadTable()
        return
      }
      if (formMode.value === 'add-child' && formParentId.value && treeVisible.value) {
        // 引用已有节点：直接建立组成关系，其原有子树一并挂接（多对多）
        if (form.refNodeId) {
          const item: TraceComponentItem = {
            componentType: (form.componentType || formNodeType.value) as TraceComponentItem['componentType'],
            refNodeId: form.refNodeId,
          }
          const saved = await sqmApi.attachComponent(formParentId.value, item)
          ElMessage.success('已引用已有节点，组成关系建立成功')
          await afterTreeCreate(saved.id)
          return
        }
        // 在树中加组成（raw / semi / ship / customer）
        if (formNodeType.value === 'raw') {
          const item: TraceComponentItem = { componentType: 'raw', ...form }
          const saved = await sqmApi.attachComponent(formParentId.value, item)
          ElMessage.success('来料组成已挂接')
          await afterTreeCreate(saved.id)
        } else {
          const saveReq: TraceNodeSaveRequest = {
            ...(form as Record<string, any>),
            orgId: orgId.value,
            nodeType: formNodeType.value as 'semi' | 'ship' | 'customer',
            qualificationType,
            parentNodeId: formParentId.value,
          }
          if (formNodeType.value === 'customer') saveReq.nodeName = form.customerName
          else saveReq.nodeName = form.productName
          const saved = await sqmApi.saveTraceNode(saveReq)
          ElMessage.success('节点已保存')
          await afterTreeCreate(saved.id)
        }
      } else {
        // 直接从表格新增根节点（可选绑定上游节点，避免成为孤节点）
        const saveReq: TraceNodeSaveRequest = {
          ...(form as Record<string, any>),
          orgId: orgId.value,
          nodeType: formNodeType.value as 'semi' | 'ship' | 'customer' | 'incoming',
          qualificationType,
        }
        if ((form as any).parentNodeId) (saveReq as any).parentNodeId = (form as any).parentNodeId
        if (formNodeType.value === 'customer') saveReq.nodeName = form.customerName
        else saveReq.nodeName = form.productName
        const saved = await sqmApi.saveTraceNode(saveReq)
        ElMessage.success('节点已保存')
        formVisible.value = false
        loadTable()
      }
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败')
    } finally {
      submitting.value = false
    }
  }

  async function afterTreeCreate(newId: string) {
    formVisible.value = false
    await loadTree()
    treeFocusId.value = newId
  }

  // ============ 生命周期 ============
  watch(orgId, async (id) => {
    rootBatchId.value = ''
    rootBatchOptions.value = []
    treeMode.value = false
    if (!id) {
      tableData.value = []
      tableTotal.value = 0
      return
    }
    tablePage.value = 1
    await loadTable()
    remoteSearchBatch('')
  })

  // 供页面 onMounted 调用
  async function init() {
    if (orgId.value) remoteSearchBatch('')
    await loadTable()
  }

  return {
    // 常量辅助
    orgId,
    NODE_TYPE_LABEL,
    TABS,
    nodeTypeLabel,
    typeTagType,
    upstreamTypesOf,
    downstreamAddableOf,
    // 列表
    activeTab,
    currentTab,
    keyword,
    tablePage,
    tableSize,
    tableTotal,
    tableData,
    tableLoading,
    loadTable,
    onTabChange,
    onSearch,
    onReset,
    onAddRoot,
    // 批次根树
    treeMode,
    rootBatchId,
    rootBatchOptions,
    rootBatchLoading,
    upTree,
    rootDisplayName,
    onRootBatchChange,
    remoteSearchBatch,
    loadRootTree,
    exitTreeMode,
    // 树下钻
    treeVisible,
    treeRootId,
    treeTitle,
    tree,
    treeFocusId,
    treePathSet,
    treeLoadError,
    selectedNode,
    openTree,
    loadTree,
    onTreeClose,
    onTreeSelect,
    // 绑定上游
    bindUpstreamVisible,
    canBindUpstream,
    openBindUpstream,
    confirmBindUpstream,
    // 正/反向追溯
    traceDir,
    directionNodes,
    dirLabel,
    applyDirection,
    displayDirectionNodes,
    focusDirectionNode,
    // 详情
    detailVisible,
    detailNodeId,
    openDetail,
    onOpenRelatedNode,
    // 表单
    formVisible,
    formMode,
    formNodeType,
    formParentId,
    formInitial,
    formKey,
    submitting,
    addComponent,
    addCustomer,
    openForm,
    onFormSave,
    // 初始化
    init,
  }
}
