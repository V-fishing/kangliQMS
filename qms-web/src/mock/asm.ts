/**
 * ASM 售后管理 MOCK 数据
 * 对应 SRS §13 售后工单流程、§14 客户满意度管理流程
 */
import type { AsmWorkorder, AsmSatisfaction } from '@/types/asm'

export const asmWorkorders: AsmWorkorder[] = [
  {
    id: 'WO-2025-001', source: '手动', type: '维修', status: '处理中',
    customer: '北京中车装备制造', product: 'CNC-800 数控系统', engineer: '李售后',
    faultDesc: '主轴定位精度超差', measure: '更换伺服驱动模块并重新标定', parts: '伺服驱动模块 ×1',
    createdDate: '2025-01-12', processDate: '2025-01-13', confirmDate: '',
    score: null, autoClose: false, lowScoreNotified: false,
  },
  {
    id: 'WO-2025-002', source: 'CRM同步', type: '投诉', status: '待确认',
    customer: '上海汽车零部件', product: 'HMI 操作面板', engineer: '王售后',
    faultDesc: '触摸屏偶发失灵', measure: '已升级固件并现场复测通过', parts: '—',
    createdDate: '2025-01-15', processDate: '2025-01-16', confirmDate: '',
    score: null, autoClose: false, lowScoreNotified: false,
  },
  {
    id: 'WO-2024-188', source: '手动', type: '安装', status: '已关闭',
    customer: '广州智能物流', product: 'AGV 调度控制器', engineer: '张售后',
    faultDesc: '现场布线指导', measure: '完成安装调试并培训操作员', parts: '—',
    createdDate: '2024-12-20', processDate: '2024-12-21', confirmDate: '2024-12-22',
    score: 5, autoClose: false, lowScoreNotified: false,
  },
  {
    id: 'WO-2024-175', source: 'CRM同步', type: '维修', status: '已关闭',
    customer: '成都轨道交通', product: '信号采集模块', engineer: '赵售后',
    faultDesc: '模拟量漂移', measure: '更换采样芯片', parts: '采样芯片 ×4',
    createdDate: '2024-12-10', processDate: '2024-12-11', confirmDate: '2024-12-15',
    score: 2, autoClose: false, lowScoreNotified: true,
  },
  {
    id: 'WO-2024-160', source: '手动', type: '投诉', status: '已关闭',
    customer: '武汉医疗器械', product: '温控仪', engineer: '李售后',
    faultDesc: '温度超调', measure: 'PID 参数优化', parts: '—',
    createdDate: '2024-11-28', processDate: '2024-11-29', confirmDate: '2024-12-05',
    score: 4, autoClose: false, lowScoreNotified: false,
  },
  {
    id: 'WO-2024-150', source: 'CRM同步', type: '安装', status: '已关闭',
    customer: '西安航空电子', product: '电源模块', engineer: '王售后',
    faultDesc: '柜体安装', measure: '完成固定与通电测试', parts: '—',
    createdDate: '2024-11-10', processDate: '2024-11-11', confirmDate: '2024-11-20',
    score: 3, autoClose: true, lowScoreNotified: false,
  },
]

export const asmSatisfactions: AsmSatisfaction[] = [
  {
    id: 'SAT-2025-001', workorderId: 'WO-2024-188', customer: '广州智能物流', score: 5,
    reason: '', date: '2024-12-22', status: '已归档', followUp: '', linkedTo: '',
  },
  {
    id: 'SAT-2025-002', workorderId: 'WO-2024-175', customer: '成都轨道交通', score: 2,
    reason: '维修不彻底', date: '2024-12-15', status: '跟进中',
    followUp: '已安排高级工程师二次上门，更换整批采样芯片并加严老化测试', linkedTo: 'CAPA-2024-031',
  },
  {
    id: 'SAT-2025-003', workorderId: 'WO-2024-160', customer: '武汉医疗器械', score: 4,
    reason: '', date: '2024-12-05', status: '已归档', followUp: '', linkedTo: '',
  },
  {
    id: 'SAT-2025-004', workorderId: 'WO-2024-150', customer: '西安航空电子', score: 3,
    reason: '响应慢', date: '2024-11-20', status: '跟进中',
    followUp: '优化派单响应时效 SLA，承诺省会城市 24h 到场', linkedTo: '',
  },
]
