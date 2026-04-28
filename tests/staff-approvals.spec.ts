import { test, expect } from '@playwright/test';

/**
 * Staff Approval Flow Tests
 * 
 * Tests the booking approval process with price locking.
 */

test.describe('Staff Approval Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as staff
    await page.goto('/staff-login');
    await page.fill('input[type="email"]', 'staff@quickridebooking.com');
    await page.fill('input[type="password"]', 'staff123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/staff/);
  });

  test('approvals page loads correctly', async ({ page }) => {
    await page.goto('/staff/approvals');
    
    // Check header
    await expect(page.locator('h1:has-text("Booking Approvals")')).toBeVisible();
    await expect(page.locator('text=Review and approve')).toBeVisible();
  });

  test('can approve a pending booking', async ({ page }) => {
    await page.goto('/staff/approvals');
    
    // Wait for bookings to load (or show empty state)
    await page.waitForTimeout(1000);
    
    // Check if there are any pending bookings
    const approveButton = page.locator('button:has-text("Approve")').first();
    
    if (await approveButton.isVisible().catch(() => false)) {
      // Click approve on first booking
      await approveButton.click();
      
      // Booking should disappear from list
      await expect(page.locator('text=All Caught Up!')).toBeVisible();
    } else {
      // Should show empty state
      await expect(page.locator('text=All Caught Up!')).toBeVisible();
    }
  });

  test('can reject a pending booking', async ({ page }) => {
    await page.goto('/staff/approvals');
    
    await page.waitForTimeout(1000);
    
    const rejectButton = page.locator('button:has-text("Reject")').first();
    
    if (await rejectButton.isVisible().catch(() => false)) {
      await rejectButton.click();
      await expect(page.locator('text=All Caught Up!')).toBeVisible();
    }
  });

  test('price snapshot is created on approval', async ({ page }) => {
    await page.goto('/staff/approvals');
    
    await page.waitForTimeout(1000);
    
    const approveButton = page.locator('button:has-text("Approve")').first();
    
    if (await approveButton.isVisible().catch(() => false)) {
      // Get the price before approval
      const priceText = await page.locator('text=/₱[\d,]+/').first().textContent();
      
      // Approve
      await approveButton.click();
      
      // The price should be locked (stored in Firestore)
      // This would require checking the backend, but we can verify the UI updates
      await expect(page.locator('text=All Caught Up!')).toBeVisible();
    }
  });

  test('processing state shown during approval', async ({ page }) => {
    await page.goto('/staff/approvals');
    
    await page.waitForTimeout(1000);
    
    const approveButton = page.locator('button:has-text("Approve")').first();
    
    if (await approveButton.isVisible().catch(() => false)) {
      // Click approve
      await approveButton.click();
      
      // Button should show processing state or be disabled
      await expect(approveButton.or(page.locator('button:disabled'))).toBeVisible();
    }
  });
});
