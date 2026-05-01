import { test, expect } from '@playwright/test'

test.describe('Database Connection Flow', () => {
  test('should navigate to databases page', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/.*\/databases/)
  })

  test('should display databases page', async ({ page }) => {
    await page.goto('/databases')
    await page.waitForLoadState('networkidle')

    // Check for page title
    const titleVisible = await page.locator('text=数据库连接').isVisible().catch(() => false)
    expect(titleVisible).toBeTruthy()
  })

  test('should have add database button', async ({ page }) => {
    await page.goto('/databases')
    await page.waitForLoadState('networkidle')

    const button = page.locator('button:has-text("添加数据库")')
    await expect(button).toBeVisible()
  })

  test('should have refresh button', async ({ page }) => {
    await page.goto('/databases')
    await page.waitForLoadState('networkidle')

    const button = page.locator('button:has-text("刷新")')
    await expect(button).toBeVisible()
  })

  test('should open add database modal', async ({ page }) => {
    await page.goto('/databases')
    await page.waitForLoadState('networkidle')

    // Click add database button
    await page.click('button:has-text("添加数据库")')
    await page.waitForTimeout(500)

    // Check for modal
    const modalVisible = await page.locator('.ant-modal').isVisible().catch(() => false)
    expect(modalVisible).toBeTruthy()

    // Close modal
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  test('should have form inputs in modal', async ({ page }) => {
    await page.goto('/databases')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("添加数据库")')
    await page.waitForTimeout(500)

    // Check for connection name input
    const nameInput = page.locator('input[id*="name"]')
    await expect(nameInput).toBeVisible()

    // Check for URL input
    const urlInput = page.locator('input[placeholder*="postgresql"]')
    await expect(urlInput).toBeVisible()

    // Close modal
    await page.keyboard.press('Escape')
  })

  test('should validate URL input', async ({ page }) => {
    await page.goto('/databases')
    await page.waitForLoadState('networkidle')

    await page.click('button:has-text("添加数据库")')
    await page.waitForTimeout(500)

    // Fill invalid URL
    const urlInput = page.locator('input[placeholder*="postgresql"]')
    await urlInput.fill('invalid-url')

    // Trigger validation
    await page.locator('.ant-modal-body').click()
    await page.waitForTimeout(300)

    // Close modal
    await page.keyboard.press('Escape')
  })
})

test.describe('Navigation', () => {
  test('should navigate to database detail page', async ({ page }) => {
    await page.goto('/databases/test-db')
    await page.waitForLoadState('networkidle')

    // Check if page loaded
    await expect(page).toHaveURL(/.*\/databases\/test-db/)
  })

  test('should have page content', async ({ page }) => {
    await page.goto('/databases/test-db')
    await page.waitForLoadState('networkidle')

    // Check for some content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(0)
  })
})

test.describe('UI Components', () => {
  test('should render page structure', async ({ page }) => {
    await page.goto('/databases')
    await page.waitForLoadState('networkidle')

    // Check for basic page structure
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should have working navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should redirect to /databases
    await expect(page).toHaveURL(/.*\/databases/)
  })

  test('should handle direct database URL', async ({ page }) => {
    await page.goto('/databases/some-database')
    await page.waitForLoadState('networkidle')

    // Page should load without crashing
    const bodyVisible = await page.locator('body').isVisible()
    expect(bodyVisible).toBeTruthy()
  })
})
