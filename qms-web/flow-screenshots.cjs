// 按流程图节点顺序截取各流程步骤截图
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/18280/Desktop/报告';
const BASE = 'http://localhost:5173';

async function shot(page, name) {
  await page.waitForTimeout(800);
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log('  📸', name);
}

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[autocomplete="username"]', 'admin');
  await page.fill('input[autocomplete="current-password"]', '123456');
  await page.click('button.submit');
  try { await page.waitForURL('**/company-select', { timeout: 5000 }); await page.click('button.card:first-child'); await page.waitForTimeout(300); await page.click('button.btn.primary'); await page.waitForTimeout(1000); } catch(e) {}
  await page.waitForTimeout(1500);
  console.log('✅ 已登录,当前:', page.url());
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page);

  // ================================================================
  // 流程1: FIA 首件检验全流程(主路径)
  // 节点: 触发建单 → 调取标准 → 录入 → 合格 → 检验签名 → 复核签名 → 解锁 → 归档
  // ================================================================
  console.log('\n═══════ 流程1: FIA首件检验全流程 ═══════');

  // 1.1 看板(初始状态)
  await page.goto(BASE + '/fia/dash', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-01-看板');

  // 1.2 任务列表页 → 点新建
  await page.goto(BASE + '/fia/tasks', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-02-任务列表');

  // 1.3 点"录入"进入检验录入页
  await page.goto(BASE + '/fia/entry', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-03-检验录入-待录入');

  // 1.4 检验标准库
  await page.goto(BASE + '/fia/stdlib', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-04-标准库');

  // 1.5 审批中心(签名复核)
  await page.goto(BASE + '/fia/approve', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-05-审批中心');

  // 1.6 触发配置(拦截/签名配置)
  await page.goto(BASE + '/fia/trigcfg', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-06-触发签名配置');

  // 1.7 追溯归档
  await page.goto(BASE + '/fia/trace', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-07-追溯归档');

  // ================================================================
  // 流程2: SPC 监控与报警(主路径 + 报警闭环)
  // 节点: 参数配置 → 数据录入 → 控制图 → 告警 → 能力
  // ================================================================
  console.log('\n═══════ 流程2: SPC过程能力 ═══════');

  await page.goto(BASE + '/spc/paramcfg', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-01-参数配置');

  await page.goto(BASE + '/spc/collect', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-02-数据采集录入');

  await page.goto(BASE + '/spc/control', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-03-控制图监控');

  await page.goto(BASE + '/spc/alarm', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-04-告警列表');

  await page.goto(BASE + '/spc/capability', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-05-能力分析');

  await page.goto(BASE + '/spc/rulecfg', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-06-判异规则配置');

  // ================================================================
  // 流程3: NCM 不良信息管理 + 8D整改
  // 节点: 不良录入 → 看板 → 分析 → 8D列表 → 8D详情
  // ================================================================
  console.log('\n═══════ 流程3: NCM不良+8D ═══════');

  await page.goto(BASE + '/ncm/dash', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-01-看板');

  await page.goto(BASE + '/ncm/entry', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-02-不良录入');

  await page.goto(BASE + '/ncm/analysis', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-03-不良分析');

  await page.goto(BASE + '/ncm/trend', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-04-趋势报表');

  await page.goto(BASE + '/ncm/8d', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-05-8D报告列表');

  // ================================================================
  // 流程4: SQM 供应商四合一
  // 节点: 供应商 → 审核 → 绩效 → FMEA → 变更 → 异常 → 追溯
  // ================================================================
  console.log('\n═══════ 流程4: SQM供应商质量管理 ═══════');

  await page.goto(BASE + '/sqm/lifecycle', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-01-供应商生命周期');

  await page.goto(BASE + '/sqm/audit', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-02-供应商审核');

  await page.goto(BASE + '/sqm/change', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-03-物料变更');

  await page.goto(BASE + '/sqm/abnormal', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-04-来料异常');

  await page.goto(BASE + '/sqm/fmea', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-05-FMEA风险项');

  await page.goto(BASE + '/sqm/capa', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-06-CAPA列表');

  await page.goto(BASE + '/sqm/trace', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-07-全链路追溯');

  // ================================================================
  // 流程5: 系统管理(UOP)
  // ================================================================
  console.log('\n═══════ 流程5: 系统权限管理 ═══════');

  await page.goto(BASE + '/system/user', { waitUntil: 'networkidle' });
  await shot(page, 'SYS-01-用户管理');

  await page.goto(BASE + '/system/role', { waitUntil: 'networkidle' });
  await shot(page, 'SYS-02-角色管理');

  await page.goto(BASE + '/system/org', { waitUntil: 'networkidle' });
  await shot(page, 'SYS-03-组织管理');

  await browser.close();
  console.log('\n✅ 全部流程截图完成! → ' + OUT);
})();
