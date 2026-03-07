import { test, expect } from '@playwright/test';

test.describe('Free Play Mode', () => {

    test('should open Free Play drill menu and allow start/cancel', async ({ page }) => {
        await page.goto('/');

        // Wait for curriculum container to confirm loaded
        await expect(page.locator('#curriculum-container')).toBeVisible();

        // 1. Open Rhythm Prep
        const startBtn = page.locator('#start-btn');
        await expect(startBtn).toBeVisible();
        await startBtn.click({ force: true });

        // Check if Rhythm Prep screen is visible
        const rhythmPrep = page.locator('#rhythm-prep');
        await expect(rhythmPrep).not.toHaveClass(/hidden/);

        // Verify the instructions exist
        await expect(rhythmPrep.locator('h2')).toHaveText('How to Play');

        // 2. Test Cancel Button
        const cancelBtn = page.locator('#cancel-prep-btn');
        await cancelBtn.click();

        // Verify menu is back
        await expect(page.locator('.hero-section')).not.toHaveClass(/hidden/);
        await expect(rhythmPrep).toHaveClass(/hidden/);
    });

});
