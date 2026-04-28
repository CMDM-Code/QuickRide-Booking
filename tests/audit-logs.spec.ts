import { test, expect } from '@playwright/test';

/**
 * Audit Log Viewer Tests
 * 
 * Tests the audit log functionality including filtering, syncing, and offline support.
 */

test.describe('Audit Log Viewer', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin first
    await page.goto('/admin-login');
    await page.fill('input[type="email"]', 'admin@quickridebooking.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);
  });

  test('audit logs page loads correctly', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    
    // Check header
    await expect(page.locator('h1:has-text("Audit Logs")')).toBeVisible();
    await expect(page.locator('text=Immutable audit trail')).toBeVisible();
    
    // Check stats cards
    await expect(page.locator('text=Total Logs')).toBeVisible();
    await expect(page.locator('text=Filtered')).toBeVisible();
    
    // Check buttons
    await expect(page.locator('button:has-text("Sync")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('filter functionality works', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    
    // Open filters
    await page.click('button:has-text("Filters")');
    
    // Select entity type filter
    await page.selectOption('select:has-text("Entity Type")', 'booking');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check that filter count shows
    await expect(page.locator('text=1')).toBeVisible();
  });

  test('sync button shows status', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    
    // Check online status indicator
    await expect(page.locator('text=Online')).toBeVisible();
    
    // Click sync button
    await page.click('button:has-text("Sync")');
    
    // Should show synced or no changes
    await expect(page.locator('button:has-text("Synced")').or(page.locator('button:has-text("Sync")'))).toBeVisible();
  });

  test('export functionality works', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    
    // Click export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export")')
    ]);
    
    // Verify download started
    expect(download.suggestedFilename()).toContain('audit-logs');
  });

  test('log entry expands to show details', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    // Click on first log row
    await page.click('table tbody tr:first-child');
    
    // Check that before/after snapshots are visible
    await expect(page.locator('text=Before').or(page.locator('text=After'))).toBeVisible();
  });

  test('offline status indicator shows when offline', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    
    // Simulate offline
    await page.context().setOffline(true);
    
    // Should show offline status
    await expect(page.locator('text=Offline')).toBeVisible();
    
    // Sync button should be disabled
    await expect(page.locator('button:has-text("Sync")')).toBeDisabled();
    
    // Restore online
    await page.context().setOffline(false);
  });
});
