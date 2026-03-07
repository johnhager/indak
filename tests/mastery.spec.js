import { test, expect } from '@playwright/test';

test.describe('Mastery Dashboard', () => {

    test('should open Mastery Dashboard gracefully', async ({ page }) => {
        await page.goto('/');

        // Wait for curriculum container
        await expect(page.locator('#curriculum-container')).toBeVisible();

        // Open Mastery Dashboard
        const masteryBtn = page.locator('#mastery-btn');
        await expect(masteryBtn).toBeVisible();
        await masteryBtn.click({ force: true });

        // Verify Dashboard UI opens
        const dashboard = page.locator('#mastery-btn').locator('..').locator('..').locator('..').locator('..').locator('.glass-card', { hasText: 'Mastery & Growth' });
        // Since the hero section hides, we can just ensure the lesson elements are gone or wait for a specific text
        await expect(page.locator('.hero-section')).toHaveClass(/hidden/);
        await expect(dashboard).toBeVisible();
    });

});
