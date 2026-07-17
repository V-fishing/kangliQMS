/**
 * SQM 供应商质量 Mock 数据
 * 从 HTML 原型 MOCK.sqm 提取
 */
import type {
  Supplier, AuditPlan, AuditRecord, NcItem, ChangeOrder, ChangeDoc,
  ChangeApproval, ChangeDetail, StrictInspect,
  Abnormal, AbnormalMeasure, D8Link, FmeaItem, SqmKpi, TraceNode, FmeaRisk,
  Capa, SupLifecycle,
} from '@/types/sqm'

export const sqmKpi: SqmKpi = {
  supplierCount: 48,
  qualifiedRate: 92.5,
  pendingAudit: 5,
  openNc: 3,
}

export const suppliers: Supplier[] = [
  { id: 'SUP001', name: '江苏精密电子有限公司', code: 'JSPM', category: '电子元器件', level: 'A', status: '合格', score: 96, contact: '张经理', tel: '13800138001', address: '苏州市工业园区', cert: 'ISO9001, IATF16949', lastAudit: '2024-11-15', nextAudit: '2025-05-15' },
  { id: 'SUP002', name: '广东华塑新材料', code: 'GDHS', category: '塑胶原料', level: 'A', status: '合格', score: 94, contact: '李总监', tel: '13900139002', address: '东莞市松山湖', cert: 'ISO9001, ISO14001', lastAudit: '2024-10-20', nextAudit: '2025-04-20' },
  { id: 'SUP003', name: '浙江精工金属制品', code: 'ZJJG', category: '金属加工件', level: 'B', status: '观察', score: 82, contact: '王厂长', tel: '13700137003', address: '宁波市北仑区', cert: 'ISO9001', lastAudit: '2024-09-10', nextAudit: '2025-03-10' },
  { id: 'SUP004', name: '上海电子连接器厂', code: 'SHDL', category: '连接器', level: 'A', status: '合格', score: 91, contact: '赵主管', tel: '13600136004', address: '上海市浦东新区', cert: 'ISO9001, IATF16949, UL', lastAudit: '2024-12-01', nextAudit: '2025-06-01' },
  { id: 'SUP005', name: '山东鲁南包装材料', code: 'SDLN', category: '包装材料', level: 'C', status: '整改中', score: 71, contact: '刘经理', tel: '13500135005', address: '临沂市高新区', cert: 'ISO9001', lastAudit: '2024-08-05', nextAudit: '2025-02-05' },
  { id: 'SUP006', name: '深圳鑫源半导体', code: 'SZXY', category: '半导体', level: 'A', status: '合格', score: 93, contact: '陈总监', tel: '13400134006', address: '深圳市南山区', cert: 'ISO9001, IATF16949', lastAudit: '2024-11-28', nextAudit: '2025-05-28' },
]

export const auditPlans: AuditPlan[] = [
  { id: 'AP-2025-001', supId: 'SUP003', supName: '浙江精工金属制品', type: '年度复审', planDate: '2025-01-20', auditor: '赵审核员, 钱工程师', status: '待执行', scope: 'QMS全覆盖' },
  { id: 'AP-2025-002', supId: 'SUP005', supName: '山东鲁南包装材料', type: '专项审核', planDate: '2025-01-25', auditor: '孙主管, 李工程师', status: '待执行', scope: '来料异常整改验证' },
  { id: 'AP-2025-003', supId: 'SUP001', supName: '江苏精密电子有限公司', type: '年度复审', planDate: '2025-02-10', auditor: '周审核员, 吴工程师', status: '计划中', scope: 'QMS全覆盖 + 过程审核' },
  { id: 'AP-2025-004', supId: 'SUP007', supName: '河北钢铁精密加工', type: '飞行检查', planDate: '2025-02-15', auditor: '郑审核员', status: '计划中', scope: '来料检验流程' },
  { id: 'AP-2024-089', supId: 'SUP002', supName: '广东华塑新材料', type: '年度复审', planDate: '2024-12-20', auditor: '王审核员, 冯工程师', status: '已完成', scope: 'QMS全覆盖' },
]

export const auditRecords: AuditRecord[] = [
  { id: 'AR-2024-156', supId: 'SUP002', supName: '广东华塑新材料', type: '年度复审', date: '2024-12-20', auditor: '王审核员, 冯工程师', result: '通过', score: 92, ncCount: 1, status: '已关闭' },
  { id: 'AR-2024-155', supId: 'SUP001', supName: '江苏精密电子有限公司', type: '过程审核', date: '2024-11-15', auditor: '赵审核员, 钱工程师', result: '通过', score: 96, ncCount: 0, status: '已关闭' },
  { id: 'AR-2024-150', supId: 'SUP005', supName: '山东鲁南包装材料', type: '专项审核', date: '2024-08-05', auditor: '孙主管, 李工程师', result: '有条件通过', score: 71, ncCount: 5, status: '整改中' },
  { id: 'AR-2024-148', supId: 'SUP003', supName: '浙江精工金属制品', type: '年度复审', date: '2024-09-10', auditor: '周审核员', result: '通过', score: 82, ncCount: 2, status: '已关闭' },
  { id: 'AR-2024-140', supId: 'SUP007', supName: '河北钢铁精密加工', type: '飞行检查', date: '2024-07-15', auditor: '郑审核员', result: '有条件通过', score: 79, ncCount: 3, status: '整改中' },
]

export const ncItems: NcItem[] = [
  { id: 'NC-2024-301', arId: 'AR-2024-150', supId: 'SUP005', supName: '山东鲁南包装材料', desc: '来料检验记录不完整，缺少关键尺寸数据', clause: '8.5.1', level: '严重', status: '整改中', deadline: '2025-01-30', responsible: '刘经理' },
  { id: 'NC-2024-302', arId: 'AR-2024-150', supId: 'SUP005', supName: '山东鲁南包装材料', desc: '校准证书过期，计量器具未按期校准', clause: '7.1.5', level: '一般', status: '已整改待验证', deadline: '2025-01-15', responsible: '刘经理' },
  { id: 'NC-2024-303', arId: 'AR-2024-150', supId: 'SUP005', supName: '山东鲁南包装材料', desc: '不合格品区域标识不清，存在混料风险', clause: '8.7.1', level: '一般', status: '整改中', deadline: '2025-01-20', responsible: '刘经理' },
  { id: 'NC-2024-290', arId: 'AR-2024-140', supId: 'SUP007', supName: '河北钢铁精密加工', desc: '热处理工艺参数记录缺失', clause: '8.5.1', level: '严重', status: '已整改待验证', deadline: '2025-01-10', responsible: '马主任' },
  { id: 'NC-2024-291', arId: 'AR-2024-140', supId: 'SUP007', supName: '河北钢铁精密加工', desc: '供应商二次外包未纳入管理', clause: '8.4.1', level: '一般', status: '整改中', deadline: '2025-01-25', responsible: '马主任' },
  { id: 'NC-2024-292', arId: 'AR-2024-155', supId: 'SUP001', supName: '江苏精密电子有限公司', desc: '建议改善：检验室温湿度监控频率可优化', clause: '7.1.4', level: '观察项', status: '已关闭', deadline: '2024-12-15', responsible: '张经理' },
]

export const changeOrders: ChangeOrder[] = [
  { id: 'ECN-2025-001', title: 'PCB板基材从FR4升级为高Tg板材', supId: 'SUP001', supName: '江苏精密电子有限公司', partNo: 'PCB-MAIN-V2', type: '材料升级', reason: '提升产品耐热性能', applicant: '王工程师', applyDate: '2025-01-05', status: '审批中', urgency: '高', strictFlag: true },
  { id: 'ECN-2024-089', title: '塑胶原料增加阻燃剂比例', supId: 'SUP002', supName: '广东华塑新材料', partNo: 'PLS-HOUSING-01', type: '配方变更', reason: '满足UL94 V0阻燃要求', applicant: '李工程师', applyDate: '2024-12-10', status: '已批准', urgency: '中', strictFlag: true },
  { id: 'ECN-2024-078', title: '连接器端子镀金厚度调整', supId: 'SUP004', supName: '上海电子连接器厂', partNo: 'CONN-USB-C-01', type: '工艺变更', reason: '降低成本同时满足性能要求', applicant: '赵主管', applyDate: '2024-11-20', status: '已执行', urgency: '低', strictFlag: false },
  { id: 'ECN-2025-002', title: '包装材料更换环保可降解材料', supId: 'SUP005', supName: '山东鲁南包装材料', partNo: 'PKG-BOX-A4', type: '材料变更', reason: '客户环保要求', applicant: '刘经理', applyDate: '2025-01-08', status: '待申请', urgency: '中', strictFlag: false },
  { id: 'ECN-2024-065', title: '半导体芯片封装形式变更', supId: 'SUP006', supName: '深圳鑫源半导体', partNo: 'IC-PWR-001', type: '封装变更', reason: '原厂EOL，替代料导入', applicant: '陈总监', applyDate: '2024-10-15', status: '已关闭', urgency: '高', strictFlag: true },
]

/** 变更评估资料（对应 HTML MOCKX.sqm.changeDocs） */
export const changeDocs: Record<string, ChangeDoc> = {
  'ECN-2025-001': { changeNote: true, verifyReport: false, fmea: true },
  'ECN-2024-089': { changeNote: true, verifyReport: true, fmea: true },
  'ECN-2024-078': { changeNote: true, verifyReport: true, fmea: false },
  'ECN-2025-002': { changeNote: false, verifyReport: false, fmea: false },
  'ECN-2024-065': { changeNote: true, verifyReport: true, fmea: true },
}

/** 变更并行审批状态（对应 HTML MOCKX.sqm.changeApprovals） */
export const changeApprovals: Record<string, ChangeApproval> = {
  'ECN-2025-001': {
    quality: { status: 'doing', operator: '赵SQE', date: '2025-01-05 14:20', veto: true, note: '评审中，需补充可靠性数据' },
    purchase: { status: 'pending', operator: '', date: '', veto: false, note: '待质量评审通过后启动' },
    rd: { status: 'pending', operator: '', date: '', veto: false, note: '待质量评审通过后启动' },
    trial: { status: 'pending', operator: '', date: '', note: '待三方审批通过后执行' },
  },
  'ECN-2024-089': {
    quality: { status: 'done', operator: '赵SQE', date: '2024-12-12 10:30', veto: true, note: '同意，加严3批' },
    purchase: { status: 'done', operator: '钱采购', date: '2024-12-12 16:00', veto: false, note: '同意，已更新采购规范' },
    rd: { status: 'done', operator: '孙研发', date: '2024-12-13 09:15', veto: false, note: '同意，验证方案已确认' },
    trial: { status: 'done', operator: '李试产', date: '2024-12-20', note: '3批加严检验全部合格，已关闭' },
  },
  'ECN-2024-078': {
    quality: { status: 'done', operator: '赵SQE', date: '2024-11-22 11:00', veto: true, note: '同意变更' },
    purchase: { status: 'done', operator: '钱采购', date: '2024-11-22 14:30', veto: false, note: '同意' },
    rd: { status: 'done', operator: '孙研发', date: '2024-11-23 10:00', veto: false, note: '同意，可靠性无影响' },
    trial: { status: 'done', operator: '李试产', date: '2024-11-28', note: '试产验证通过' },
  },
}

/** 变更详情（对应 HTML MOCKX.sqm.changeDetails） */
export const changeDetails: Record<string, ChangeDetail> = {
  'ECN-2025-001': {
    workflow: [
      { step: '申请', operator: '王工程师', date: '2025-01-05 09:30', action: '提交变更申请', status: 'done' },
      { step: 'SQE评审', operator: '赵SQE', date: '2025-01-05 14:20', action: '评审中', status: 'doing' },
      { step: '质量经理审批', operator: '', date: '', action: '待审批', status: 'pending' },
      { step: '试产验证', operator: '', date: '', action: '待执行', status: 'pending' },
      { step: '正式切换', operator: '', date: '', action: '待执行', status: 'pending' },
    ],
    impact: '影响产品型号：KL-100A, KL-100B；预计切换日期：2025-02-01；首批试产数量：200pcs',
    strictPlan: '变更后前3批次执行加严检验（AQL 0.65），连续3批合格恢复正常检验',
  },
}

/** 加严检验跟踪（对应 HTML MOCKX.sqm.strictInspect） */
export const strictInspect: StrictInspect[] = [
  { id: 'SI-2025-001', changeId: 'ECN-2024-089', batchNo: 'LOT-2025-01002', inspectType: '加严', aql: '0.40', result: '合格', date: '2025-01-03', seq: 1, totalSeq: 3 },
  { id: 'SI-2025-002', changeId: 'ECN-2024-089', batchNo: 'LOT-2025-01102', inspectType: '加严', aql: '0.40', result: '合格', date: '2025-01-15', seq: 2, totalSeq: 3 },
  { id: 'SI-2025-003', changeId: 'ECN-2024-089', batchNo: 'LOT-2025-01115', inspectType: '加严', aql: '0.40', result: '合格', date: '2025-01-28', seq: 3, totalSeq: 3, restored: true },
  { id: 'SI-2025-004', changeId: 'ECN-2025-001', batchNo: 'LOT-2025-01201', inspectType: '加严', aql: '0.65', result: '待检', date: '', seq: 1, totalSeq: 3 },
  { id: 'SI-2025-005', changeId: 'ECN-2024-078', batchNo: 'LOT-2025-01006', inspectType: '加严', aql: '1.0', result: '合格', date: '2025-01-06', seq: 1, totalSeq: 3 },
  { id: 'SI-2025-006', changeId: 'ECN-2024-078', batchNo: 'LOT-2025-01106', inspectType: '加严', aql: '1.0', result: '待检', date: '', seq: 2, totalSeq: 3 },
]

/** SOP更新通知（对应 HTML renderSqmChange 内联静态数据） */
export interface SopUpdate {
  changeId: string
  file: string
  version: string
  content: string
  publishDate: string
  status: '已发布' | '待更新'
  /** SR-SCM-016 推送部门（质量/采购/生产/仓储） */
  notified: string[]
  /** 解冻收货：变更关闭后解除冻结的条件 */
  unfreeze: string
  /** AQL 提级：加严检验等级信息 */
  aqlUpgrade: string
}
export const sopUpdates: SopUpdate[] = [
  { changeId: 'ECN-2024-089', file: 'IQC-来料检验规范-塑胶件', version: 'V3.2', content: '增加阻燃剂比例检测项目', publishDate: '2024-12-15', status: '已发布', notified: ['质量部', '采购部', '生产部', '仓储部'], unfreeze: '变更单 ECN-2024-089 已批准生效，关联物料恢复收货', aqlUpgrade: '抽样方案由 II级/0.65 提级为 I级/0.40（加严检验3批）' },
  { changeId: 'ECN-2024-078', file: 'IQC-来料检验规范-连接器', version: 'V2.5', content: '更新镀金厚度检验标准', publishDate: '2024-12-01', status: '已发布', notified: ['质量部', '采购部', '生产部', '仓储部'], unfreeze: '变更单 ECN-2024-078 已批准生效，关联物料恢复收货', aqlUpgrade: '镀金厚度项目加严，Ac=0 全检首三批' },
  { changeId: 'ECN-2025-001', file: 'IQC-来料检验规范-PCB', version: 'V4.0', content: '增加高Tg板材可靠性测试', publishDate: '待定', status: '待更新', notified: [], unfreeze: '待变更批准后解除关联物料收货冻结', aqlUpgrade: '拟提级为 I级/0.40，待生效' },
]

export const abnormals: Abnormal[] = [
  { id: 'ABN-2025-001', lotId: 'LOT-2025-01005', supId: 'SUP007', supName: '河北钢铁精密加工', partNo: 'MTL-SHAFT-01', partName: '传动轴', desc: '尺寸超差，直径偏大0.15mm', qty: 350, level: '严重', date: '2025-01-05', handler: '赵SQE', status: '待处理', d8Id: null, capaId: null, noticeSent: false, noticeDate: null, noticeContent: null, planDate: null, extensionApproved: false, extensionDate: null, measures: null, measuresDate: null, measuresContent: null, measureLogs: [], verifyResult: null, verifyDate: null, verifyComment: null, returnReason: null, batchTrack: [], closeDate: null, closeAuditor: null, archived: false, notify7: false, notify14: false, notify21: false, overdueDays: 0, triggerRule: '一键即触发' },
  { id: 'ABN-2025-002', lotId: 'LOT-2025-01003', supId: 'SUP005', supName: '山东鲁南包装材料', partNo: 'PKG-BOX-A4', partName: '包装纸箱', desc: '抗压强度不达标，实测值低于规格下限', qty: 2000, level: '一般', date: '2025-01-03', handler: '孙SQE', status: '整改中', d8Id: null, capaId: null, noticeSent: true, noticeDate: '2025-01-04', noticeContent: '请在7个工作日内提交整改措施报告。', planDate: '2025-01-11', extensionApproved: false, extensionDate: null, measures: null, measuresDate: null, measuresContent: null, measureLogs: [
    { content: '第1次更新：调整原纸克重至规定下限以上，替换供应商', completeDate: '2025-01-08', operator: '孙SQE', evidence: [{ name: '原纸规格确认单.pdf', size: 1_200_000 }] },
    { content: '第2次更新：首件抗压测试 12.5kN，接近规格下限，需继续优化', completeDate: '2025-01-09', operator: '孙SQE', evidence: [{ name: '首件测试记录.xlsx', size: 480_000 }] },
  ], verifyResult: null, verifyDate: null, verifyComment: null, returnReason: null, batchTrack: [], closeDate: null, closeAuditor: null, archived: false, notify7: false, notify14: false, notify21: false, overdueDays: 0, triggerRule: '累计≥3件' },
  { id: 'ABN-2024-156', lotId: 'LOT-2024-12560', supId: 'SUP003', supName: '浙江精工金属制品', partNo: 'MTL-BRACKET-02', partName: '金属支架', desc: '表面氧化严重，影响焊接', qty: 800, level: '严重', date: '2024-12-15', handler: '赵SQE', status: '已关闭', d8Id: 'D8-2024-089', capaId: null, noticeSent: true, noticeDate: '2024-12-16', noticeContent: '请在7个工作日内提交整改措施报告。', planDate: '2024-12-23', extensionApproved: false, extensionDate: null, measures: { content: '更换表面处理方式，增加防锈涂层', rootcause: '表面处理工艺参数偏差', prevention: '增加来料氧化检验项目', deadline: '2024-12-25', owner: '张工程师' }, measuresDate: '2024-12-18', measuresContent: '更换表面处理方式，增加防锈涂层', measureLogs: [
    { content: '第1次更新：暂停原氧化工艺，启用新防锈涂层产线', completeDate: '2024-12-18', operator: '张工程师', evidence: [{ name: '工艺切换记录.pdf', size: 2_100_000 }] },
    { content: '第2次更新：连续2批来料氧化不良率为0', completeDate: '2024-12-24', operator: '张工程师', evidence: [{ name: '检验日报.xlsx', size: 620_000 }] },
  ], verifyResult: '通过', verifyDate: '2024-12-28', verifyComment: '验证3批次来料均合格，同意闭环', returnReason: null, batchTrack: [
    { batchNo: 'LOT-2024-12561', result: '合格', date: '2024-12-26', linked: true },
    { batchNo: 'LOT-2024-12562', result: '合格', date: '2024-12-27', linked: true },
    { batchNo: 'LOT-2024-12563', result: '合格', date: '2024-12-28', linked: true },
  ], closeDate: '2024-12-28', closeAuditor: '赵SQE', archived: true, notify7: false, notify14: false, notify21: false, overdueDays: 0, triggerRule: '一键即触发' },
  { id: 'ABN-2024-148', lotId: 'LOT-2024-11890', supId: 'SUP008', supName: '福建厦门口电子', partNo: 'RES-10K-0603', partName: '贴片电阻', desc: '阻值偏差超出允许范围', qty: 5000, level: '一般', date: '2024-11-28', handler: '钱SQE', status: '待验证', d8Id: 'D8-2024-082', capaId: null, noticeSent: true, noticeDate: '2024-11-29', noticeContent: '请在7个工作日内提交整改措施报告。', planDate: '2024-12-06', extensionApproved: false, extensionDate: null, measures: { content: '调整电阻丝印工艺，增加阻值全检', rootcause: '丝印厚度不均导致阻值偏差', prevention: '增加自动检测工序，每批次抽检比例提升至10%', deadline: '2024-12-10', owner: '李工程师' }, measuresDate: '2024-12-05', measuresContent: '调整电阻丝印工艺，增加阻值全检', measureLogs: [
    { content: '第1次更新：丝印网版厚度校准，阻值CPK由0.8提升至1.33', completeDate: '2024-12-05', operator: '李工程师', evidence: [{ name: 'CPK报告.xlsx', size: 530_000 }] },
  ], verifyResult: null, verifyDate: null, verifyComment: null, returnReason: null, batchTrack: [], closeDate: null, closeAuditor: null, archived: false, notify7: false, notify14: false, notify21: false, overdueDays: 0, triggerRule: '累计≥3件' },
  { id: 'ABN-2024-135', lotId: 'LOT-2024-10750', supId: 'SUP005', supName: '山东鲁南包装材料', partNo: 'PKG-BOX-A4', partName: '包装纸箱', desc: '印刷内容错误，料号与实际不符', qty: 3000, level: '严重', date: '2024-10-20', handler: '孙SQE', status: '已关闭', d8Id: 'D8-2024-075', capaId: null, noticeSent: true, noticeDate: '2024-10-21', noticeContent: '请在7个工作日内提交整改措施报告。', planDate: '2024-10-28', extensionApproved: false, extensionDate: null, measures: { content: '更新印刷模板，增加印前核对环节', rootcause: '印刷模板版本未更新，使用旧模板', prevention: '建立模板版本管理制度，每次变更需双人确认', deadline: '2024-10-30', owner: '王主管' }, measuresDate: '2024-10-25', measuresContent: '更新印刷模板，增加印前核对环节', measureLogs: [
    { content: '第1次更新：停用旧模板，启用受控新模板', completeDate: '2024-10-25', operator: '王主管', evidence: [{ name: '模板受控清单.pdf', size: 980_000 }] },
  ], verifyResult: '通过', verifyDate: '2024-11-02', verifyComment: '验证3批次印刷内容均正确，同意闭环', returnReason: null, batchTrack: [
    { batchNo: 'LOT-2024-10751', result: '合格', date: '2024-10-30', linked: true },
    { batchNo: 'LOT-2024-10752', result: '合格', date: '2024-10-31', linked: true },
    { batchNo: 'LOT-2024-10753', result: '合格', date: '2024-11-02', linked: true },
  ], closeDate: '2024-11-02', closeAuditor: '孙SQE', archived: true, notify7: false, notify14: false, notify21: false, overdueDays: 0, triggerRule: '一键即触发' },
]

/** 8D整改进度关联（对应 HTML MOCKX.sqm.d8Links） */
export const d8Links: Record<string, D8Link> = {
  'D8-2025-003': {
    stage: 'D3',
    stages: [
      { d: 'D0', name: '问题确认', status: 'done', date: '2025-01-05', operator: '赵SQE' },
      { d: 'D1', name: '组建团队', status: 'done', date: '2025-01-06', operator: '赵SQE' },
      { d: 'D2', name: '问题描述', status: 'done', date: '2025-01-06', operator: '赵SQE' },
      { d: 'D3', name: '临时遏制', status: 'doing', date: '2025-01-07', operator: '马主任' },
      { d: 'D4', name: '根本原因', status: 'pending', date: '', operator: '' },
      { d: 'D5', name: '纠正措施', status: 'pending', date: '', operator: '' },
      { d: 'D6', name: '措施验证', status: 'pending', date: '', operator: '' },
      { d: 'D7', name: '预防措施', status: 'pending', date: '', operator: '' },
      { d: 'D8', name: '团队表彰', status: 'pending', date: '', operator: '' },
    ],
    capaTriggered: false,
  },
  'D8-2025-004': {
    stage: 'D5',
    stages: [
      { d: 'D0', name: '问题确认', status: 'done', date: '2025-01-03', operator: '孙SQE' },
      { d: 'D1', name: '组建团队', status: 'done', date: '2025-01-04', operator: '孙SQE' },
      { d: 'D2', name: '问题描述', status: 'done', date: '2025-01-04', operator: '孙SQE' },
      { d: 'D3', name: '临时遏制', status: 'done', date: '2025-01-05', operator: '刘经理' },
      { d: 'D4', name: '根本原因', status: 'done', date: '2025-01-08', operator: '刘经理' },
      { d: 'D5', name: '纠正措施', status: 'doing', date: '2025-01-09', operator: '刘经理' },
      { d: 'D6', name: '措施验证', status: 'pending', date: '', operator: '' },
      { d: 'D7', name: '预防措施', status: 'pending', date: '', operator: '' },
      { d: 'D8', name: '团队表彰', status: 'pending', date: '', operator: '' },
    ],
    capaTriggered: true,
    capaId: 'CAPA-2025-012',
  },
}

export const fmeaItems: FmeaItem[] = [
  { id: 'F-001', supId: 'SUP001', supName: '江苏精密电子', partNo: 'PCB-V2', partName: 'PCBA主板', failureMode: '焊盘脱落', effect: '电路不通', cause: '焊接温度过高', severity: 8, occurrence: 3, detection: 4, rpn: 96, action: '增加温度监控报警', status: '进行中', owner: '张工程师', dueDate: '2025-02-01' },
  { id: 'F-002', supId: 'SUP003', supName: '浙江精工', partNo: 'MS-01', partName: '金属支架', failureMode: '尺寸超差', effect: '装配困难', cause: '模具磨损', severity: 6, occurrence: 5, detection: 3, rpn: 90, action: '定期模具保养', status: '已完成', owner: '王厂长', dueDate: '2025-01-10' },
  { id: 'F-003', supId: 'SUP006', supName: '深圳鑫源', partNo: 'NG-A', partName: '采样针组', failureMode: '针管弯曲', effect: '无法使用', cause: '包装防护不足', severity: 7, occurrence: 4, detection: 5, rpn: 140, action: '改进包装设计', status: '未开始', owner: '陈总监', dueDate: '2025-02-15' },
]

/** FMEA 高风险项（RPN≥100，对应 HTML MOCKX.fmeaRisk.highRisks） */
export const fmeaRisks: FmeaRisk[] = [
  { id: 'R-001', product: 'PCBA主板', process: 'SMT贴片', failureMode: '虚焊', severity: 8, occurrence: 6, detection: 4, rpn: 192, status: '待闭环', owner: '王工程师', targetDate: '2025-02-15', action: '增加AOI检测工序', evidence: null },
  { id: 'R-002', product: '外壳组件', process: '注塑成型', failureMode: '缩水', severity: 7, occurrence: 5, detection: 3, rpn: 105, status: '进行中', owner: '李工程师', targetDate: '2025-01-30', action: '优化保压参数', evidence: '试产报告#2025-001' },
  { id: 'R-003', product: '电源模块', process: '波峰焊', failureMode: '桥连', severity: 9, occurrence: 4, detection: 5, rpn: 180, status: '已闭环', owner: '张工程师', targetDate: '2024-12-20', action: '调整预热温度曲线', evidence: '验证报告#2024-089' },
  { id: 'R-004', product: '连接器', process: '压接', failureMode: '接触不良', severity: 8, occurrence: 7, detection: 3, rpn: 168, status: '待闭环', owner: '赵工程师', targetDate: '2025-02-28', action: '更换压接模具', evidence: null },
  { id: 'R-005', product: '电池组件', process: '组装', failureMode: '短路', severity: 9, occurrence: 3, detection: 4, rpn: 108, status: '进行中', owner: '孙工程师', targetDate: '2025-02-10', action: '增加绝缘检测', evidence: null },
]

export const traceTreeData: TraceNode[] = [
  {
    id: 'P001', label: '成品:采样针组-A', type: 'product',
    children: [
      {
        id: 'B001', label: '批次:B20250112', type: 'batch',
        children: [
          { id: 'M001', label: '原料:PCBA主板', type: 'material', info: { supplier: '江苏精密电子', batchNo: 'B0712', qty: 500, date: '2025-01-12' } },
          { id: 'M002', label: '原料:采样针管', type: 'material', info: { supplier: '精工医疗', batchNo: 'B0710', qty: 1000, date: '2025-01-10' } },
        ],
      },
      {
        id: 'B002', label: '批次:B20250115', type: 'batch',
        children: [
          { id: 'M003', label: '原料:连接器', type: 'material', info: { supplier: '深圳鑫源', batchNo: 'B0711', qty: 300, date: '2025-01-11' } },
        ],
      },
    ],
  },
]

// ===== CAPA 纠正与预防措施（SR-PTL-019 触发 / SR-CAR-025 升级） =====
export const capaList: Capa[] = [
  {
    id: 'CAPA-2025-001', type: '系统改进', source: 'CAR升级（SR-CAR-025）', sourceId: 'ABN-2024-156',
    title: '同不良类型90天内第5次发生——体系级整改', problem: '浙江精工金属制品金属支架连续5次同类不良，需提交完整质量体系整改方案',
    rootcause: '5Why：来料管控缺位 → 检验标准未覆盖该缺陷 → PFMEA未识别 → 过程能力CPK不足 → 供应商过程变更未通知',
    corrective: { action: '对近3批来料全检并召回已交付批次', owner: '赵SQE', due: '2025-02-10', status: '已完成', evidence: '全检报告#2025-011' },
    preventive: { action: '更新PFMEA、增加控制计划检测点、将供应商纳入半年度审核', owner: '钱经理', due: '2025-03-20', status: '执行中' },
    owner: '钱经理', dueDate: '2025-03-20', status: '实施验证', effVerifyDate: '2025-04-20', effResult: null,
    stages: [
      { key: 'c1', name: '识别与立项', status: 'done', date: '2025-01-18', operator: '系统自动' },
      { key: 'c2', name: '根本原因分析', status: 'done', date: '2025-01-22', operator: '赵SQE' },
      { key: 'c3', name: '纠正措施(CA)', status: 'done', date: '2025-02-10', operator: '赵SQE' },
      { key: 'c4', name: '预防措施(PA)', status: 'doing', date: '2025-02-25', operator: '钱经理', approval: true },
      { key: 'c5', name: '实施效果验证', status: 'pending', approval: true },
      { key: 'c6', name: '关闭归档', status: 'pending' },
    ],
  },
  {
    id: 'CAPA-2025-002', type: '纠正措施', source: '8D手动触发', sourceId: '8D-2026-008',
    title: '注塑压力超差导致外观缩水——系统性纠正', problem: '8D-2026-008 中 D5 纠正措施升级为 CAPA：注塑压力超差根因涉及模具磨损与参数漂移',
    rootcause: '5Why：缩水 → 保压不足 → 模具磨损 → 未纳入预防性维护 → 维护周期过长',
    corrective: { action: '更换磨损模具、调整保压参数并首件确认', owner: '王班长', due: '2025-02-15', status: '已完成', evidence: '首件报告#2025-014' },
    preventive: { action: '将模具纳入预防性维护计划、增加SPC实时监控', owner: '孙工程师', due: '2025-03-01', status: '已完成' },
    owner: '王班长', dueDate: '2025-03-01', status: '效果确认', effVerifyDate: '2025-03-31', effResult: '通过',
    stages: [
      { key: 'c1', name: '识别与立项', status: 'done', date: '2025-01-20', operator: '张检验' },
      { key: 'c2', name: '根本原因分析', status: 'done', date: '2025-01-24', operator: '李工程师' },
      { key: 'c3', name: '纠正措施(CA)', status: 'done', date: '2025-02-15', operator: '王班长' },
      { key: 'c4', name: '预防措施(PA)', status: 'done', date: '2025-03-01', operator: '孙工程师' },
      { key: 'c5', name: '实施效果验证', status: 'done', date: '2025-03-31', operator: '赵SQE', approval: true },
      { key: 'c6', name: '关闭归档', status: 'doing', approval: true },
    ],
  },
  {
    id: 'CAPA-2025-003', type: '预防措施', source: '客诉', sourceId: 'CM-2025-033',
    title: '客户投诉包装破损——运输预防措施', problem: '客户反馈外箱运输破损率高，需从包装设计与运输防护层面做预防性改进',
    rootcause: '鱼骨图：人-搬运粗暴 / 机-无缓冲 / 料-纸箱材质偏软 / 法-堆叠过高 / 环-长途运输',
    corrective: { action: '对当前在途批次加缓冲护角', owner: '孙SQE', due: '2025-02-20', status: '已完成' },
    preventive: { action: '改用加厚瓦楞、优化装箱堆叠标准、更新包装SOP', owner: '周工程师', due: '2025-03-15', status: '执行中' },
    owner: '孙SQE', dueDate: '2025-03-15', status: '措施制定', effVerifyDate: undefined, effResult: null,
    stages: [
      { key: 'c1', name: '识别与立项', status: 'done', date: '2025-02-01', operator: '客服' },
      { key: 'c2', name: '根本原因分析', status: 'done', date: '2025-02-05', operator: '周工程师' },
      { key: 'c3', name: '纠正措施(CA)', status: 'done', date: '2025-02-20', operator: '孙SQE' },
      { key: 'c4', name: '预防措施(PA)', status: 'doing', date: '2025-02-25', operator: '周工程师', approval: false },
      { key: 'c5', name: '实施效果验证', status: 'pending', approval: true },
      { key: 'c6', name: '关闭归档', status: 'pending' },
    ],
  },
]

// ===== 供应商全生命周期电子档案（SR-SBM-001~019） =====
export const supplierLifecycles: SupLifecycle[] = [
  {
    id: 'SUP001', name: '江苏精密电子有限公司', code: 'JSPM', category: '电子元器件', status: '合格', risk: '低',
    score: 96, contact: '张经理', tel: '13800138001', address: '苏州市工业园区',
    qualifications: [
      { name: '营业执照', type: '营业执照', uploader: '采购部', uploadDate: '2024-01-10', expireDate: '2034-01-09', warnLevel: '正常' },
      { name: 'ISO9001证书', type: '体系认证', uploader: 'SQE', uploadDate: '2024-03-01', expireDate: '2026-03-01', warnLevel: '正常' },
      { name: 'IATF16949证书', type: '体系认证', uploader: 'SQE', uploadDate: '2024-03-01', expireDate: '2025-02-28', warnLevel: '警告' },
    ],
    auditCount: 4, rectifyCount: 1,
    perfTrend: [ { q: '2024Q1', score: 94 }, { q: '2024Q2', score: 95 }, { q: '2024Q3', score: 95 }, { q: '2024Q4', score: 96 } ],
    timeline: [
      { date: '2023-06-01', action: '创建档案（待审核）', operator: '采购部' },
      { date: '2023-06-15', action: '准入审核通过 → 合格', operator: '质量部' },
      { date: '2024-06-15', action: '年度评审 → 维持合格（A级）', operator: 'SQE' },
    ],
  },
  {
    id: 'SUP005', name: '山东鲁南包装材料', code: 'SDLN', category: '包装材料', status: '暂停', risk: '高',
    score: 71, contact: '刘经理', tel: '13500135005', address: '临沂市高新区',
    qualifications: [
      { name: '营业执照', type: '营业执照', uploader: '采购部', uploadDate: '2023-05-10', expireDate: '2033-05-09', warnLevel: '正常' },
      { name: 'ISO9001证书', type: '体系认证', uploader: 'SQE', uploadDate: '2023-05-20', expireDate: '2025-05-19', warnLevel: '提醒' },
    ],
    auditCount: 3, rectifyCount: 5,
    perfTrend: [ { q: '2024Q1', score: 80 }, { q: '2024Q2', score: 75 }, { q: '2024Q3', score: 72 }, { q: '2024Q4', score: 71 } ],
    timeline: [
      { date: '2023-02-01', action: '创建档案（待审核）', operator: '采购部' },
      { date: '2023-02-20', action: '准入审核通过 → 合格', operator: '质量部' },
      { date: '2024-08-05', action: '重大来料异常 → 暂停供货', operator: 'SQE' },
      { date: '2025-01-10', action: '启动体系级CAPA与现场审核', operator: '质量经理' },
    ],
  },
  {
    id: 'SUP003', name: '浙江精工金属制品', code: 'ZJJG', category: '金属加工件', status: '合格', risk: '中',
    score: 82, contact: '王厂长', tel: '13700137003', address: '宁波市北仑区',
    qualifications: [
      { name: '营业执照', type: '营业执照', uploader: '采购部', uploadDate: '2023-08-10', expireDate: '2033-08-09', warnLevel: '正常' },
      { name: 'ISO9001证书', type: '体系认证', uploader: 'SQE', uploadDate: '2023-09-01', expireDate: '2025-09-01', warnLevel: '正常' },
    ],
    auditCount: 2, rectifyCount: 3,
    perfTrend: [ { q: '2024Q1', score: 80 }, { q: '2024Q2', score: 81 }, { q: '2024Q3', score: 81 }, { q: '2024Q4', score: 82 } ],
    timeline: [
      { date: '2023-04-01', action: '创建档案（待审核）', operator: '采购部' },
      { date: '2023-04-18', action: '准入审核通过 → 合格', operator: '质量部' },
      { date: '2024-09-10', action: '年度复审 → 维持合格（B级·观察期）', operator: 'SQE' },
    ],
  },
]
