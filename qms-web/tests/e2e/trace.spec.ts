import { test, expect } from '@playwright/test'

test.describe('追溯正逆向', () => {
  test('进入来料追溯页面', async ({ page }) => {
    await page.goto('/sqm/trace')
    await expect(page.getByText('追溯')).toBeVisible()
  })

  test('查看追溯树', async ({ page }) => {
    await page.goto('/sqm/trace')
    await expect(page.getByText('追溯树').or(page.getByText('正/逆向'))).toBeVisible()
  })

  test('查看首件追溯归档', async ({ page }) => {
    await page.goto('/fia/trace')
    await expect(page.getByText('追溯')).toBeVisible()
  })
})
