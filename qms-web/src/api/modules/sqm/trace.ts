/**
 * SQM — Trace API (追溯)
 * Controllers: SqmTraceController  (/api/v1/sqm)
 *
 * Permissions:
 *   sqm.trace.list   — GET trace/..., GET lots, GET key-part-sns
 *   sqm.trace.create — POST trace/..., POST lots, POST key-part-sns, PUT nodes/.../detail
 */
import { request } from '@/api/client'
import type {
  SqmTraceNode, SqmIncomingLot, TraceNodeSearchVO, TraceFullTreeVO,
  TraceNodeFullVO, TraceDirectionNode, SqmKeyPartSn,
  SqmTraceRawDetail, SqmTraceProductDetail,
} from '@/api/types/sqm'
import type { PageResult, PageQuery } from '@/api/types/common'

export const sqmTraceApi = {
  // ── Lots ──
  listLots: () => request.get<SqmIncomingLot[]>('/v1/sqm/lots'),
  createLot: (data: Partial<SqmIncomingLot>) =>
    request.post<SqmIncomingLot>('/v1/sqm/lots', data),

  // ── Nodes ──
  createNode: (data: Partial<SqmTraceNode>) =>
    request.post<SqmTraceNode>('/v1/sqm/trace/nodes', data),
  saveNode: (data: Record<string, unknown>) =>
    request.post<SqmTraceNode>('/v1/sqm/trace/nodes/save', data),
  attachComponent: (parentId: string, data: { refNodeId?: string; [k: string]: unknown }) =>
    request.post<SqmTraceNode>(`/v1/sqm/trace/nodes/${parentId}/components`, data),
  searchNodes: (params: PageQuery & { nodeType?: string; keyword?: string }) =>
    request.get<PageResult<TraceNodeSearchVO>>('/v1/sqm/trace/nodes/search', { params }),
  getNodeDetail: (nodeId: string) =>
    request.get<TraceNodeFullVO>(`/v1/sqm/trace/nodes/${nodeId}/detail`),
  getNodeDirection: (nodeId: string, direction?: 'forward' | 'backward' | 'both') =>
    request.get<TraceDirectionNode[]>(`/v1/sqm/trace/nodes/${nodeId}/direction`, {
      params: { direction },
    }),

  // ── Raw / Product Detail ──
  getRawDetail: (nodeId: string) =>
    request.get<SqmTraceRawDetail>(`/v1/sqm/trace/nodes/${nodeId}/raw-detail`),
  saveRawDetail: (nodeId: string, data: Partial<SqmTraceRawDetail>) =>
    request.put<void>(`/v1/sqm/trace/nodes/${nodeId}/raw-detail`, data),
  getProductDetail: (nodeId: string) =>
    request.get<SqmTraceProductDetail>(`/v1/sqm/trace/nodes/${nodeId}/product-detail`),
  saveProductDetail: (nodeId: string, data: Partial<SqmTraceProductDetail>) =>
    request.put<void>(`/v1/sqm/trace/nodes/${nodeId}/product-detail`, data),

  // ── Tree ──
  /** GET /api/v1/sqm/trace/tree — 平铺树 */
  tree: () => request.get<SqmTraceNode[]>('/v1/sqm/trace/tree'),
  /** GET /api/v1/sqm/trace/tree-recursive — 递归树 */
  treeRecursive: () => request.get<SqmTraceNode[]>('/v1/sqm/trace/tree-recursive'),
  /** GET /api/v1/sqm/trace/full-tree — 全树(嵌套结构) */
  fullTree: () => request.get<TraceFullTreeVO>('/v1/sqm/trace/full-tree'),
  /** GET /api/v1/sqm/trace/full-tree-by-root — 按根节点查全树 */
  fullTreeByRoot: (rootLotId: string) =>
    request.get<TraceFullTreeVO>('/v1/sqm/trace/full-tree-by-root', { params: { rootLotId } }),
  /** GET /api/v1/sqm/trace/tree-from-node — 从指定节点查树 */
  treeFromNode: (nodeId: string) =>
    request.get<TraceFullTreeVO>('/v1/sqm/trace/tree-from-node', { params: { nodeId } }),
  /** GET /api/v1/sqm/trace/tree-by-root */
  treeByRoot: (rootNodeId: string) =>
    request.get<SqmTraceNode[]>('/v1/sqm/trace/tree-by-root', { params: { rootNodeId } }),
  /** GET /api/v1/sqm/trace/roots — 所有根节点 */
  listRoots: () => request.get<SqmTraceNode[]>('/v1/sqm/trace/roots'),

  // ── Key Part SNs ──
  listKeyPartSns: () => request.get<SqmKeyPartSn[]>('/v1/sqm/key-part-sns'),
  createKeyPartSn: (data: Partial<SqmKeyPartSn>) =>
    request.post<void>('/v1/sqm/key-part-sns', data),
}
