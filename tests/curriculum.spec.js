import { test, expect } from '@playwright/test';

test.describe('Curriculum Session Tests', () => {

    test('should open curriculum and start a session', async ({ page }) => {
        await page.goto('/');

        // Wait for curriculum to load and see greetings 101
        await expect(page.locator('#curriculum-container')).toBeVisible();

        // Click the lesson item for Greetings 101
        const lessonPath = page.locator('.lesson-item', { hasText: 'Greetings 101' });
        await expect(lessonPath).toBeVisible();
        await lessonPath.click({ force: true });

        // Wait for Lesson Modal
        await expect(page.locator('#lesson-modal')).toBeVisible();

        // Ensure we see vocabulary items loaded inside
        const vocabList = page.locator('#lesson-vocab-list');
        await expect(vocabList).not.toBeEmpty();

        // Click Start Session
        await page.locator('#start-lesson-btn').click({ force: true });

        // Check if grammar screen appears
        const grammarScreen = page.locator('#grammar-screen');
        if (await grammarScreen.isVisible()) {
            await page.locator('#start-grammar-btn').click({ force: true });
        }

        // Check for specific UI elements of Swipe Sorter
        await expect(page.locator('#game-stage')).toBeVisible();

        // Wait for the swipe card to be created
        await expect(page.locator('.swipe-card')).toBeVisible();

    });

});
