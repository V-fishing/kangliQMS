/**
 * MSM 计量器具管理 MOCK 数据
 * 对应 SRS §16 计量器具全生命周期流程
 */
import type { Gauge, CalibPlan } from '@/types/msm'

export const gauges: Gauge[] = [
  {
    id: 'MG-001', code: 'JL-2023-0001', name: '数显千分尺 0-25mm', category: '长度量具', precision: '±0.001mm',
    status: '合格', calibDate: '2024-12-10', calibCycle: 12, nextCalib: '2025-12-10',
    useStatus: '允许使用', repairRecord: '',
  },
  {
    id: 'MG-002', code: 'JL-2024-0002', name: '电子台秤 30kg', category: '衡器', precision: '±2g',
    status: '超期', calibDate: '2024-01-08', calibCycle: 12, nextCalib: '2025-01-08',
    useStatus: '拒绝绑定', repairRecord: '',
  },
  {
    id: 'MG-003', code: 'JL-2023-0033', name: '三坐标测量机', category: '精密仪器', precision: '±0.005mm',
    status: '合格', calibDate: '2025-01-05', calibCycle: 6, nextCalib: '2025-07-05',
    useStatus: '允许使用', repairRecord: '',
  },
  {
    id: 'MG-004', code: 'JL-2022-0078', name: '指针式压力表 0-1MPa', category: '压力仪表', precision: '1.6级',
    status: '失准', calibDate: '2024-11-20', calibCycle: 12, nextCalib: '2025-11-20',
    useStatus: '拒绝绑定', repairRecord: '校准不合格，示值误差超差',
  },
  {
    id: 'MG-005', code: 'JL-2024-0102', name: '扭矩扳手 5-25N·m', category: '力学量具', precision: '±1%',
    status: '降级', calibDate: '2024-12-28', calibCycle: 12, nextCalib: '2025-12-28',
    useStatus: '允许使用', repairRecord: '精度降级，限用于非关键工序',
  },
  {
    id: 'MG-006', code: 'JL-2024-0056', name: '数显温度计 -50~300℃', category: '温度仪表', precision: '±0.5℃',
    status: '锁定', calibDate: '2024-12-15', calibCycle: 12, nextCalib: '2025-12-15',
    useStatus: '拒绝绑定', repairRecord: '系统自动锁定，待维修',
  },
  {
    id: 'MG-007', code: 'JL-2021-0022', name: '老式卡尺 0-150mm', category: '长度量具', precision: '±0.02mm',
    status: '报废', calibDate: '2024-06-10', calibCycle: 12, nextCalib: '2025-06-10',
    useStatus: '拒绝绑定', repairRecord: '无法修复，已审批报废处置',
  },
  {
    id: 'MG-008', code: 'JL-2024-0134', name: '平面度检定平板', category: '精密仪器', precision: '00级',
    status: '合格', calibDate: '2025-01-12', calibCycle: 24, nextCalib: '2027-01-12',
    useStatus: '允许使用', repairRecord: '',
  },
]

export const calibPlans: CalibPlan[] = [
  { id: 'CP-001', gaugeId: 'MG-002', gaugeName: '电子台秤 30kg', dueDate: '2025-01-08', status: '待校准', notified: true },
  { id: 'CP-002', gaugeId: 'MG-004', gaugeName: '指针式压力表 0-1MPa', dueDate: '2025-11-20', status: '已生成', notified: true },
  { id: 'CP-003', gaugeId: 'MG-006', gaugeName: '数显温度计 -50~300℃', dueDate: '2025-12-15', status: '已生成', notified: true },
  { id: 'CP-004', gaugeId: 'MG-001', gaugeName: '数显千分尺 0-25mm', dueDate: '2025-12-10', status: '待校准', notified: false },
]
