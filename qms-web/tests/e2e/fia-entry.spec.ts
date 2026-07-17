import { test, expect } from '@playwright/test'

test.describe('首件检验录入流程', () => {
  test('选择检验员角色进入系统', async ({ page }) => {
    await page.goto('/')
    // 如果重定向到登录页，选择检验员
    const roleCards = page.locator('.role-card')
    if (await roleCards.count() > 0) {
      await roleCards.nth(1).click() // 检验员
    }
    await expect(page).toHaveURL(/\/overview|\/$/)
  })

  test('导航到首件检验看板', async ({ page }) => {
    await page.goto('/')
    await page.getByText('首件检验').click()
    await expect(page).toHaveURL(/\/fia\/dash/)
  })

  test('查看检验任务列表', async ({ page }) => {
    await page.goto('/fia/tasks')
    await expect(page.locator('table')).toBeVisible()
  })

  test('进入检验录入页面', async ({ page }) => {
    await page.goto('/fia/entry')
    await expect(page.getByText('检验录入')).toBeVisible()
  })
})
