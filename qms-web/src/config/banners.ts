/** 各模块各角色的页面 Banner(原 mock/roles.ts 抽离,不再依赖 mock) */
export const BANNERS: Record<string, Record<string, { title: string; desc: string }>> = {
  overview: {
    inspector: { title: '检验员工作台', desc: '今日待检任务、首件状态、SPC 监控一览' },
    operator: { title: '操作员工作台', desc: '我的工单、自检任务、首件锁定状态' },
    sqe: { title: 'SQE 工作台', desc: '来料异常、供应商整改、审核计划' },
    qmanager: { title: '质量主管看板', desc: '全厂质量概况、超期事项、审批待办' },
    shiftleader: { title: '班组长工作台', desc: '产线不良、SPC 报警、工装状态' },
  },
  fia: {
    inspector: { title: '首件检验', desc: '检验任务、首件录入、审批跟进' },
    qmanager: { title: '首件检验管理', desc: '审批授权、豁免放行、标准维护' },
  },
  spc: {
    inspector: { title: 'SPC 过程能力', desc: '控制图监控、数据采集、告警处理' },
    shiftleader: { title: 'SPC 过程能力', desc: '产线监控、报警确认、趋势分析' },
  },
  ncm: {
    inspector: { title: '不良管理', desc: '不良录入、分析、8D 整改' },
    qmanager: { title: '不良管理', desc: '趋势分析、8D 审批、纠正措施' },
  },
  sqm: {
    sqe: { title: '供应商质量管理', desc: '审核计划、来料异常、FMEA 风险' },
    qmanager: { title: '供应商质量管理', desc: '供应商绩效、变更审批' },
  },
  asm: {
    aftersales: { title: '售后管理', desc: '售后工单处理、客户满意度跟进(后端未就绪,演示数据)' },
    qmanager: { title: '售后管理', desc: '客户投诉分析与服务改进' },
  },
  tlm: {
    shiftleader: { title: '工装管理', desc: '工装全生命周期(后端未就绪,演示数据)' },
  },
  msm: {
    metrology: { title: '计量管理', desc: '计量器具校准管理(后端未就绪,演示数据)' },
  },
  qsm: {
    qualitysys: { title: '体系管理', desc: '内审管理与体系合规(后端未就绪,演示数据)' },
    qmanager: { title: '体系管理', desc: '质量目标与体系健康度看板' },
  },
}

/** 角色进入各模块的默认 Tab */
export const DEF_TAB: Record<string, Record<string, string>> = {
  fia: { inspector: 'tasks', qmanager: 'approve' },
  spc: { inspector: 'control', shiftleader: 'control' },
  ncm: { inspector: 'entry', qmanager: '8d' },
  sqm: { sqe: 'abnormal', qmanager: 'dash' },
}
