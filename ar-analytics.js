if (page.url().includes('/login')) {
  await page.locator('input[type="email"]').first().fill('m.elsayed@qbs.jo')
  await page.locator('input[type="password"]').first().fill('2312312')
  await page.getByRole('button', { name: /^sign in$|تسجيل/i }).first().click()
  await page.waitForTimeout(1200)
  const skip = page.getByRole('button', { name: /skip for now|skip|تخطّ/i }).first()
  if (await skip.count()) { await skip.click(); await page.waitForTimeout(900) }
}
const el = page.getByText('الاستبيانات', { exact: true }).first()
if (await el.count()) { await el.click().catch(()=>{}); await page.waitForTimeout(1200) }
// open Analytics (التحليلات) via the 3rd row-action icon
const a = page.getByLabel('التحليلات').first()
if (await a.count()) { await a.click(); await page.waitForTimeout(1300) }
