/**
 * TLM 工装管理 MOCK 数据
 * 对应 SRS §15 工装全生命周期流程
 */
import type { Tool, ToolMaint, ToolRepair } from '@/types/tlm'

export const tools: Tool[] = [
  {
    id: 'TL-001', code: 'GZ-2024-0001', name: '主轴定位夹具 A', category: '机加工夹具', bom: '工序 OP10 粗铣',
    status: '使用中', lock: '正常', location: '数控一班 3# 工位', purchaseDate: '2024-03-12',
    lifeUsed: 1280, lifeLimit: 5000, nextMaint: '2025-02-10', firstArticleVerified: true,
  },
  {
    id: 'TL-002', code: 'GZ-2024-0002', name: '气动压装工装 B', category: '装配工装', bom: '工序 OP30 压装',
    status: '使用中', lock: '锁定', location: '装配二线 1# 工位', purchaseDate: '2024-05-20',
    lifeUsed: 3410, lifeLimit: 6000, nextMaint: '2025-02-01', firstArticleVerified: false,
  },
  {
    id: 'TL-003', code: 'GZ-2023-0087', name: '焊接定位胎具 C', category: '焊接工装', bom: '工序 OP20 焊接',
    status: '维修中', lock: '正常', location: '维修间', purchaseDate: '2023-11-02',
    lifeUsed: 4890, lifeLimit: 5000, nextMaint: '2025-01-28', firstArticleVerified: true,
  },
  {
    id: 'TL-004', code: 'GZ-2024-0123', name: '注塑成型模 D', category: '成型模具', bom: '工序 OP05 注塑',
    status: '使用中', lock: '正常', location: '注塑车间 2# 机', purchaseDate: '2024-08-15',
    lifeUsed: 980, lifeLimit: 8000, nextMaint: '2025-03-05', firstArticleVerified: true,
  },
  {
    id: 'TL-005', code: 'GZ-2022-0045', name: '检测检具 E', category: '量检具', bom: '工序 IPQC 全检',
    status: '停用', lock: '正常', location: '量具室暂存', purchaseDate: '2022-06-18',
    lifeUsed: 7600, lifeLimit: 10000, nextMaint: '—', firstArticleVerified: true,
  },
  {
    id: 'TL-006', code: 'GZ-2021-0011', name: '老式钻模 F', category: '机加工夹具', bom: '工序 OP40 钻孔',
    status: '报废', lock: '正常', location: '待处置区', purchaseDate: '2021-02-09',
    lifeUsed: 10200, lifeLimit: 10000, nextMaint: '—', firstArticleVerified: true,
  },
  {
    id: 'TL-007', code: 'GZ-2024-0156', name: '拧紧枪工装 G', category: '装配工装', bom: '工序 OP35 拧紧',
    status: '使用中', lock: '正常', location: '装配一线 4# 工位', purchaseDate: '2024-09-30',
    lifeUsed: 2560, lifeLimit: 7000, nextMaint: '2025-01-30', firstArticleVerified: true,
  },
  {
    id: 'TL-008', code: 'GZ-2024-0178', name: '点胶治具 H', category: '点胶工装', bom: '工序 OP25 点胶',
    status: '使用中', lock: '正常', location: '电子车间 1# 工位', purchaseDate: '2024-10-22',
    lifeUsed: 1820, lifeLimit: 6000, nextMaint: '2025-02-20', firstArticleVerified: true,
  },
]

export const toolMaints: ToolMaint[] = [
  { id: 'TM-001', toolId: 'TL-001', type: '周保养', date: '2025-01-20', result: '完成', operator: '一班组长' },
  { id: 'TM-002', toolId: 'TL-002', type: '周保养', date: '2025-01-18', result: '异常', operator: '二班组长' },
  { id: 'TM-003', toolId: 'TL-004', type: '月保养', date: '2025-01-10', result: '完成', operator: '注塑组长' },
  { id: 'TM-004', toolId: 'TL-007', type: '周保养', date: '2025-01-21', result: '完成', operator: '一班组长' },
  { id: 'TM-005', toolId: 'TL-003', type: '年保养', date: '2025-01-15', result: '异常', operator: '维修组' },
]

export const toolRepairs: ToolRepair[] = [
  {
    id: 'TR-001', toolId: 'TL-003', faultDesc: '定位销磨损导致重复定位精度超差 0.05mm',
    date: '2025-01-15', result: '修复合格', precisionVerified: true, operator: '维修组 张工',
  },
  {
    id: 'TR-002', toolId: 'TL-002', faultDesc: '气压不稳导致压装力波动',
    date: '2025-01-19', result: '无法修复', precisionVerified: false, operator: '维修组 李工',
  },
]
