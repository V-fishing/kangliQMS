// 深层操作流程：混合API(快速创建数据)+浏览器(真实点击填表)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const OUT = 'C:/Users/18280/Desktop/报告/操作流程截图';
const BASE = 'http://localhost:5173';
const API = 'http://localhost:8080';
let TOKEN = '';

function api(method, p, body) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Authorization': 'Bearer ' + TOKEN };
    if (data) { headers['Content-Type'] = 'application/json; charset=UTF-8'; headers['Content-Length'] = Buffer.byteLength(data); }
    const req = http.request({ host: 'localhost', port: 8080, path: p, method, headers }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { res({ raw: d }) } }); });
    req.on('error', e => res({ err: String(e) }));
    if (data) req.write(data); req.end();
  });
}

async function login(page) {
  // API login first to get token
  const resp = await api('POST', '/api/v1/auth/login', { username: 'admin', password: '123456' });
  TOKEN = resp.data.accessToken;

  // Browser login
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[autocomplete="username"]', 'admin');
  await page.fill('input[autocomplete="current-password"]', '123456');
  await page.click('button.submit');
  try { await page.waitForURL('**/company-select', { timeout: 5000 }); await page.click('button.card:first-child'); await page.waitForTimeout(300); await page.click('button.btn.primary'); await page.waitForTimeout(1000); } catch (e) { }
  await page.waitForTimeout(1500);
  console.log('✅ 已登录');
}

async function shot(page, name) {
  await page.waitForTimeout(800);
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log('  📸', name);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page);

  // ═══════════════════════════════════════════════════════════
  // 流程1: FIA 首件检验 - 完整用户操作链路
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══ FIA 完整操作链路 ═══');

  // API: 创建一个新FIA任务(模拟系统触发)
  const ORG = '019f701f-0411-71ed-9eac-ab9440335832';
  const task = await api('POST', '/api/v1/fia/tasks', {
    orgId: ORG, woNo: 'WO-SCREENSHOT-' + Date.now(), lineName: 'L1注塑线',
    productName: '物料A-成品', procName: '注塑', triggerType: '换模具-测试',
    stdId: '9ab72d82-9f54-77b8-fbf5-5fc448e1943d', batchNo: 'B-SCREENSHOT', isUrgent: false, remark: '截图演示'
  });
  const TID = task.data.id;
  console.log('  任务已创建:', task.data.code, 'ID:', TID.slice(0, 8));

  // 1.1 看板
  await page.goto(BASE + '/fia/dash', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-S1-看板-今日任务完成数合格率');

  // 1.2 任务列表(含新创建的任务)
  await page.goto(BASE + '/fia/tasks', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-S2-任务列表-待检任务高亮');

  // 1.3 进入检验录入页
  await page.goto(BASE + '/fia/entry?task=' + TID, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, 'FIA-S3-检验录入-标准自动填充-AQL');

  // 1.4 填写实测值(找所有input type=number或text,填合格值)
  try {
    const inputs = page.locator('input[type="text"], input:not([type])').first();
    // 找到数值录入框并填入合格值
    const textInputs = await page.locator('input').all();
    for (const inp of textInputs) {
      const type = await inp.getAttribute('type');
      if (type !== 'password' && type !== 'hidden' && type !== 'submit') {
        try { await inp.fill('10.0'); await page.waitForTimeout(200); } catch (e) { }
      }
    }
    await shot(page, 'FIA-S4-录入实测值-自动判定合格不合格');
  } catch (e) {
    console.log('  (录入交互: 表单可能已预填)');
    await shot(page, 'FIA-S4-录入页-当前状态');
  }

  // 1.5 检验人签名(密码签名)
  try {
    // 找签名相关的按钮
    await page.locator('button:has-text("签名"), button:has-text("检验人")').first().click({ timeout: 3000 }).catch(() => { });
    await page.waitForTimeout(500);
    // 弹密码框
    const pwdInput = page.locator('input[type="password"]').first();
    await pwdInput.fill('123456');
    await page.locator('button:has-text("确认")').first().click({ timeout: 3000 }).catch(() => { });
    await page.waitForTimeout(500);
    await shot(page, 'FIA-S5-检验人签名-密码验证通过');
  } catch (e) {
    console.log('  (签名交互需手动操作)');
  }

  // 1.6 查看任务详情/归档
  await page.goto(BASE + '/fia/tasks', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-S6-任务列表-状态变更后');

  await page.goto(BASE + '/fia/trace', { waitUntil: 'networkidle' });
  await shot(page, 'FIA-S7-追溯归档-检验报告PDF归档15年');

  // ═══════════════════════════════════════════════════════════
  // 流程2: SPC 数据采集 + 控制图
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══ SPC 数据采集+控制图 ═══');

  await page.goto(BASE + '/spc/collect', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-S1-数据采集-参数选择');

  // 尝试填值提交
  try {
    const inputs = await page.locator('input[type="text"], input:not([type])').all();
    for (const inp of inputs) {
      const type = await inp.getAttribute('type');
      if (type !== 'password' && type !== 'hidden') {
        try { await inp.fill((9.5 + Math.random()).toFixed(2)); } catch (e) { }
      }
    }
    await shot(page, 'SPC-S2-填写测量值-5个子组值');
    await page.locator('button:has-text("提交"), button:has-text("录入")').first().click({ timeout: 3000 }).catch(() => { });
    await page.waitForTimeout(1000);
    await shot(page, 'SPC-S3-提交后-控制图已刷新');
  } catch (e) {
    console.log('  (SPC交互: 页面渲染)');
  }

  await page.goto(BASE + '/spc/control', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-S4-控制图-XbarR-UCL-CL-LCL');

  await page.goto(BASE + '/spc/alarm', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-S5-告警列表-规则级别状态');

  await page.goto(BASE + '/spc/capability', { waitUntil: 'networkidle' });
  await shot(page, 'SPC-S6-能力分析-CPK-PPK等级');

  // ═══════════════════════════════════════════════════════════
  // 流程3: NCM 不良录入 + 8D
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══ NCM 不良管理+8D ═══');

  await page.goto(BASE + '/ncm/dash', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-S1-看板-不良率PPM-TOP5类型');

  await page.goto(BASE + '/ncm/entry', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-S2-不良录入-工序设备字典绑定');

  await page.goto(BASE + '/ncm/8d', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-S3-8D报告-D1-D8阶段跟踪审批');

  await page.goto(BASE + '/ncm/trend', { waitUntil: 'networkidle' });
  await shot(page, 'NCM-S4-趋势报表-连续监控预警');

  // ═══════════════════════════════════════════════════════════
  // 流程4: SQM 供应商四合一
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══ SQM 供应商质量 ═══');

  await page.goto(BASE + '/sqm/dash', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-S1-供应商看板-绩效排名');

  await page.goto(BASE + '/sqm/lifecycle', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-S2-供应商-全生命周期管理');

  await page.goto(BASE + '/sqm/audit', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-S3-审核管理-计划启动记录NC');

  await page.goto(BASE + '/sqm/change', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-S4-物料变更-冻结审批会签');

  await page.goto(BASE + '/sqm/abnormal', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-S5-来料异常-8D-CAPA联动');

  await page.goto(BASE + '/sqm/fmea', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-S6-FMEA-RPN评分高风险跟踪');

  await page.goto(BASE + '/sqm/trace', { waitUntil: 'networkidle' });
  await shot(page, 'SQM-S7-全链路追溯-正向反向树');

  // ═══════════════════════════════════════════════════════════
  // 流程5: 系统管理
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══ 系统管理 ═══');

  await page.goto(BASE + '/system/user', { waitUntil: 'networkidle' });
  await shot(page, 'SYS-S1-用户管理-组织角色分配');

  await page.goto(BASE + '/system/role', { waitUntil: 'networkidle' });
  await shot(page, 'SYS-S2-角色管理-菜单按钮权限');

  await browser.close();
  console.log('\n✅ 全部操作流程截图完成! → ' + OUT);
})();
