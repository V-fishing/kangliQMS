// QMS 全流程浏览器走查 + 截图 (修复登录+公司选择)
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/18280/Desktop/报告';
const BASE = 'http://localhost:5173';

async function shot(page, name) {
  await page.waitForTimeout(1500);
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log('  📸', name);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  // ========== 登录 (修复:正确等待并处理公司选择) ==========
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[autocomplete="username"]', 'admin');
  await page.fill('input[autocomplete="current-password"]', '123456');
  await page.click('button.submit');

  // 等待跳转到公司选择页
  try {
    await page.waitForURL('**/company-select', { timeout: 5000 });
    console.log('📋 进入公司选择页');
    // 点击第一家公司卡片 (梅州分公司)
    await page.click('button.card:first-child');
    await page.waitForTimeout(300);
    // 点击"进入所选公司"按钮
    await page.click('button.btn.primary');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('⚠️ 未进入公司选择页(可能已直接登录)');
  }

  // 等待实际页面加载 (登录后应自动跳到overview或fia)
  await page.waitForTimeout(2000);
  const currentUrl = page.url();
  console.log('✅ 当前页面:', currentUrl);

  // ========== 1. FIA 首件检验 ==========
  console.log('\n=== 1. FIA ===');
  await page.goto(BASE + '/fia/dash', { waitUntil: 'networkidle' });
  await shot(page, '1-FIA-看板');
  await page.goto(BASE + '/fia/tasks', { waitUntil: 'networkidle' });
  await shot(page, '2-FIA-任务列表');
  await page.goto(BASE + '/fia/entry', { waitUntil: 'networkidle' });
  await shot(page, '3-FIA-检验录入');
  await page.goto(BASE + '/fia/trigcfg', { waitUntil: 'networkidle' });
  await shot(page, '4-FIA-触发配置');

  // ========== 2. SPC ==========
  console.log('\n=== 2. SPC ===');
  await page.goto(BASE + '/spc/dash', { waitUntil: 'networkidle' });
  await shot(page, '5-SPC-看板');
  await page.goto(BASE + '/spc/control', { waitUntil: 'networkidle' });
  await shot(page, '6-SPC-控制图');
  await page.goto(BASE + '/spc/collect', { waitUntil: 'networkidle' });
  await shot(page, '7-SPC-数据采集');
  await page.goto(BASE + '/spc/alarm', { waitUntil: 'networkidle' });
  await shot(page, '8-SPC-告警处理');
  await page.goto(BASE + '/spc/capability', { waitUntil: 'networkidle' });
  await shot(page, '9-SPC-能力分析');

  // ========== 3. NCM ==========
  console.log('\n=== 3. NCM ===');
  await page.goto(BASE + '/ncm/dash', { waitUntil: 'networkidle' });
  await shot(page, '10-NCM-看板');
  await page.goto(BASE + '/ncm/entry', { waitUntil: 'networkidle' });
  await shot(page, '11-NCM-不良录入');
  await page.goto(BASE + '/ncm/analysis', { waitUntil: 'networkidle' });
  await shot(page, '12-NCM-不良分析');

  // ========== 4. 8D ==========
  console.log('\n=== 4. 8D ===');
  await page.goto(BASE + '/ncm/8d', { waitUntil: 'networkidle' });
  await shot(page, '13-8D-报告列表');

  // ========== 5. CAPA ==========
  await page.goto(BASE + '/ncm/capa', { waitUntil: 'networkidle' }).catch(()=>{});
  await shot(page, '14-CAPA-列表');

  // ========== 6. SQM ==========
  console.log('\n=== 6. SQM ===');
  await page.goto(BASE + '/sqm/dash', { waitUntil: 'networkidle' });
  await shot(page, '15-SQM-总览');
  await page.goto(BASE + '/sqm/lifecycle', { waitUntil: 'networkidle' });
  await shot(page, '16-SQM-供应商生命周期');
  await page.goto(BASE + '/sqm/audit', { waitUntil: 'networkidle' });
  await shot(page, '17-SQM-供应商审核');
  await page.goto(BASE + '/sqm/change', { waitUntil: 'networkidle' });
  await shot(page, '18-SQM-物料变更');
  await page.goto(BASE + '/sqm/abnormal', { waitUntil: 'networkidle' });
  await shot(page, '19-SQM-来料异常');
  await page.goto(BASE + '/sqm/fmea', { waitUntil: 'networkidle' });
  await shot(page, '20-FMEA-风险项');
  await page.goto(BASE + '/sqm/trace', { waitUntil: 'networkidle' });
  await shot(page, '21-SQM-追溯');

  // ========== 7. 系统管理 ==========
  console.log('\n=== 7. System ===');
  await page.goto(BASE + '/system/user', { waitUntil: 'networkidle' });
  await shot(page, '22-用户管理');
  await page.goto(BASE + '/system/role', { waitUntil: 'networkidle' });
  await shot(page, '23-角色管理');
  await page.goto(BASE + '/system/org', { waitUntil: 'networkidle' });
  await shot(page, '24-组织管理');

  // ========== 8. Overview ==========
  console.log('\n=== 8. Overview ===');
  await page.goto(BASE + '/overview', { waitUntil: 'networkidle' });
  await shot(page, '25-总览看板');

  await browser.close();
  console.log('\n✅ 截图完成! 共 25 张 →', OUT);
})();
