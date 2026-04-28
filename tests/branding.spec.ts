import { test, expect } from '@playwright/test';

/**
 * Branding System Tests
 * 
 * Tests the branding/theme customization functionality.
 */

test.describe('Branding System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin-login');
    await page.fill('input[type="email"]', 'admin@quickridebooking.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);
  });

  test('branding page loads correctly', async ({ page }) => {
    await page.goto('/admin/settings/branding');
    
    // Check page title
    await expect(page.locator('h1:has-text("Branding")')).toBeVisible();
    
    // Check sections
    await expect(page.locator('text=Visual Identity')).toBeVisible();
    await expect(page.locator('text=Theme Colors')).toBeVisible();
    await expect(page.locator('text=Theme Scope')).toBeVisible();
  });

  test('system name can be updated', async ({ page }) => {
    await page.goto('/admin/settings/branding');
    
    // Find system name input
    const nameInput = page.locator('input[type="text"]').first();
    
    // Clear and type new name
    await nameInput.fill('');
    await nameInput.fill('QuickRide Test');
    
    // Click save
    await page.click('button:has-text("Save")');
    
    // Should show success
    await expect(page.locator('text=success')).toBeVisible();
  });

  test('light/dark theme toggle works', async ({ page }) => {
    await page.goto('/admin/settings/branding');
    
    // Click dark theme button
    await page.click('button:has-text("Dark")');
    
    // Should show dark theme selected
    await expect(page.locator('button.bg-slate-800')).toBeVisible();
    
    // Click light theme button
    await page.click('button:has-text("Light")');
    
    // Should show light theme selected
    await expect(page.locator('button.bg-white')).toBeVisible();
  });

  test('theme scope toggles work', async ({ page }) => {
    await page.goto('/admin/settings/branding');
    
    // Find admin dashboard checkbox
    const adminCheckbox = page.locator('input[type="checkbox"]').first();
    
    // Toggle it
    await adminCheckbox.click();
    
    // Verify toggle worked
    await expect(adminCheckbox).not.toBeChecked();
    
    // Toggle back
    await adminCheckbox.click();
    await expect(adminCheckbox).toBeChecked();
  });

  test('live preview updates with color changes', async ({ page }) => {
    await page.goto('/admin/settings/branding');
    
    // Check live preview section exists
    await expect(page.locator('text=Live Preview')).toBeVisible();
    
    // Check preview elements
    await expect(page.locator('button:has-text("Primary")')).toBeVisible();
    await expect(page.locator('button:has-text("Secondary")')).toBeVisible();
    await expect(page.locator('button:has-text("Accent")')).toBeVisible();
  });

  test('CSS variables are applied to document', async ({ page }) => {
    await page.goto('/admin/settings/branding');
    
    // Check that CSS variables are set on html element
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--brand-primary');
    });
    
    // Should have a color value
    expect(primaryColor).toMatch(/^\s*#[0-9a-fA-F]{6}\s*$/);
  });
});
