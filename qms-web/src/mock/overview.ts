/**
 * 概览总览 Mock 数据
 */
import type { KpiData } from '@/types/common'

export const overviewKpi: KpiData[] = [
  { label: '首件合格率', value: 98.2, unit: '%', sub: '↑ 0.3%', status: 'ok' },
  { label: 'SPC 监控参数', value: 28, unit: '项', sub: '3 项告警', status: 'warn' },
  { label: '不良率', value: 0.82, unit: '%', sub: '↓ 0.05%', status: 'ok' },
  { label: '待办任务', value: 8, unit: '项', sub: '2 项超期', status: 'bad' },
]

export const overviewTrend = {
  days: ['07-08', '07-09', '07-10', '07-11', '07-12', '07-13', '07-14'],
  passRate: [97.2, 98.0, 96.5, 99.1, 98.3, 97.8, 98.2],
  defectRate: [0.85, 0.78, 0.92, 0.80, 0.88, 0.75, 0.82],
}

export const overviewTodos = [
  { id: 'T1', title: '首件检验: WO-071401', module: 'fia', priority: 'high', time: '08:20' },
  { id: 'T2', title: 'SPC 告警处理: 针管外径', module: 'spc', priority: 'high', time: '09:20' },
  { id: 'T3', title: '8D 审批: PCBA虚焊', module: 'ncm', priority: 'medium', time: '10:00' },
  { id: 'T4', title: '供应商变更评审: PCB材料', module: 'sqm', priority: 'medium', time: '10:30' },
  { id: 'T5', title: '首件复核: WO-071402', module: 'fia', priority: 'low', time: '11:00' },
]

export const overviewAlerts = [
  { id: 'A1', type: 'spc', msg: 'SPC报警: 针管外径超3σ', time: '09:20', level: 'alarm' },
  { id: 'A2', type: 'fia', msg: '首件超时: FAI-0714-05', time: '08:00', level: 'warn' },
  { id: 'A3', type: 'ncm', msg: '8D待审批: PCBA虚焊', time: '10:00', level: 'info' },
]
