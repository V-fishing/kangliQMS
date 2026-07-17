import { test, expect } from '@playwright/test'

test.describe('SPC 报警闭环', () => {
  test('查看 SPC 控制图', async ({ page }) => {
    await page.goto('/spc/control')
    await expect(page.getByText('SPC 控制图')).toBeVisible()
  })

  test('查看告警列表', async ({ page }) => {
    await page.goto('/spc/alarm')
    await expect(page.locator('table')).toBeVisible()
  })

  test('查看判异规则配置', async ({ page }) => {
    await page.goto('/spc/rulecfg')
    await expect(page.getByText('WECO')).toBeVisible()
  })
})
