import { chromium } from '@playwright/test'

const modules = [
  { name: 'fia', tabs: ['dash', 'tasks', 'entry', 'approve', 'stdlib', 'trigcfg', 'trace'] },
  { name: 'spc', tabs: ['dash', 'control', 'collect', 'alarm', 'capability', 'paramcfg', 'rulecfg'] },
  { name: 'ncm', tabs: ['dash', 'entry', 'analysis', 'trend', 'compare', '8d', 'dict', 'realtime'] },
  { name: 'sqm', tabs: ['dash', 'audit', 'lifecycle', 'capa', 'change', 'trace', 'abnormal', 'fmea'] },
  { name: 'asm', tabs: ['dash', 'workorder', 'satisfaction'] },
  { name: 'tlm', tabs: ['dash', 'lifecycle', 'maint'] },
  { name: 'msm', tabs: ['dash', 'calib'] },
  { name: 'qsm', tabs: ['dash', 'audit', 'health'] },
  { name: 'system', tabs: ['user', 'role', 'config'] },
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const results = []

  // 登录并进入集团总览（单页面加载，之后不刷新）
  await page.goto('http://localhost:5180/login', { waitUntil: 'networkidle', timeout: 10000 })
  await page.click('button:has-text("admin")')
  await page.click('button:has-text("登 录")')
  await page.waitForURL(/\/company-select/, { timeout: 10000 })
  await page.click('button:has-text("进入集团总览")')
  await page.waitForURL(/\/overview/, { timeout: 10000 })
  await page.waitForTimeout(800)

  for (const mod of modules) {
    // 点击主导航（通过 emoji+标题匹配）
    try {
      await page.click(`.nav-item:has-text("${getEmoji(mod.name)}${getTitle(mod.name)}")`)
      await page.waitForTimeout(500)
    } catch (e) {
      console.log(`${mod.name}: 主导航点击失败 - ${e.message}`)
      continue
    }

    for (const tab of mod.tabs) {
      try {
        // 点击二级标签
        await page.click(`.sub-tab:has-text("${await getTabTitle(page, mod.name, tab)}")`)
        await page.waitForTimeout(700)

        const title = await page.title().catch(() => '')
        const bodyText = await page.locator('body').innerText().catch(() => '')
        const hasError = bodyText.includes('应用加载错误') || bodyText.includes('Cannot read') || bodyText.includes('TypeError') || bodyText.includes('ReferenceError') || bodyText.includes('页面不存在')
        const empty = bodyText.trim().length < 200 && !hasError
        results.push({ module: mod.name, tab, title, hasError: hasError ? '❌' : empty ? '⚠️' : '✅', note: empty ? 'empty-ish' : '' })
        console.log(`${mod.name}/${tab}: ${hasError ? 'ERROR' : empty ? 'EMPTY' : 'OK'} | ${title}`)
      } catch (e) {
        results.push({ module: mod.name, tab, title: 'click failed', hasError: '❌', note: e.message })
        console.log(`${mod.name}/${tab}: CLICK_FAIL - ${e.message}`)
      }
    }
  }

  await browser.close()
  console.log('\n--- Summary ---')
  const bad = results.filter((r) => r.hasError !== '✅')
  console.log(`Total: ${results.length}, Issues: ${bad.length}`)
  bad.forEach((r) => console.log(`- ${r.module}/${r.tab}: ${r.hasError} ${r.note}`))
}

function getEmoji(mod) {
  const map = { fia: '①', spc: '②', ncm: '③', sqm: '④', asm: '⑤', tlm: '⑥', msm: '⑦', qsm: '⑧', system: '⚙' }
  return map[mod] || ''
}

function getTitle(mod) {
  const map = { fia: '首件检验', spc: '过程能力', ncm: '不良管理', sqm: '供应商质量', asm: '售后管理', tlm: '工装管理', msm: '计量管理', qsm: '体系管理', system: '系统管理' }
  return map[mod] || mod
}

async function getTabTitle(page, mod, tab) {
  // 从菜单里找标题，这里简化直接用已知映射
  const map = {
    fia: { dash: '看板总览', tasks: '检验任务', entry: '检验录入', approve: '审批中心', stdlib: '检验标准库', trigcfg: '触发与签名配置', trace: '追溯归档' },
    spc: { dash: '看板总览', control: '控制图监控', collect: '数据采集', alarm: '告警处理', capability: '能力分析', paramcfg: '参数配置', rulecfg: '判异规则' },
    ncm: { dash: '看板总览', entry: '不良录入', analysis: '不良分析', trend: '趋势报表', compare: '不良对比', '8d': '8D 整改', dict: '不良字典', realtime: '实时看板' },
    sqm: { dash: '总览看板', audit: '供应商审核', lifecycle: '供应商全生命周期', capa: 'CAPA 纠正预防', change: '物料变更', trace: '来料追溯', abnormal: '来料异常整改', fmea: 'FMEA 风险跟踪' },
    asm: { dash: '总览看板', workorder: '售后工单', satisfaction: '客户满意度' },
    tlm: { dash: '工装总览', lifecycle: '全生命周期', maint: '保养管理' },
    msm: { dash: '计量总览', calib: '器具与校准' },
    qsm: { dash: '体系总览', audit: '内审管理', health: '合规监控' },
    system: { user: '用户组织', role: '角色权限', config: '配置中心' },
  }
  return map[mod]?.[tab] || tab
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


