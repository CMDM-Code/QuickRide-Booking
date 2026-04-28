import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * 
 * Tests the core authentication flows for all user roles.
 */

test.describe('Admin Authentication', () => {
  test('admin login page loads correctly', async ({ page }) => {
    await page.goto('/admin-login');
    
    // Check page title
    await expect(page).toHaveTitle(/QuickRide/i);
    
    // Check login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('admin can login with valid credentials', async ({ page }) => {
    await page.goto('/admin-login');
    
    // Fill in credentials (using test credentials)
    await page.fill('input[type="email"]', 'admin@quickridebooking.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    
    // Verify admin dashboard loaded
    await expect(page.locator('text=System Overview')).toBeVisible();
  });

  test('admin sees error with invalid credentials', async ({ page }) => {
    await page.goto('/admin-login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible();
  });
});

test.describe('Staff Authentication', () => {
  test('staff login page loads correctly', async ({ page }) => {
    await page.goto('/staff-login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('staff can login with valid credentials', async ({ page }) => {
    await page.goto('/staff-login');
    
    await page.fill('input[type="email"]', 'staff@quickridebooking.com');
    await page.fill('input[type="password"]', 'staff123');
    await page.click('button[type="submit"]');
    
    // Should redirect to staff dashboard
    await expect(page).toHaveURL(/\/staff/);
    await expect(page.locator('text=Staff Dashboard')).toBeVisible();
  });
});

test.describe('Client Authentication', () => {
  test('client login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('unauthenticated user redirected from admin', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/admin-login/);
  });

  test('unauthenticated user redirected from staff', async ({ page }) => {
    await page.goto('/staff/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/staff-login/);
  });
});
