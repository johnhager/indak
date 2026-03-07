import { test, expect } from '@playwright/test';

test.describe('Curriculum Session Tests', () => {

    test('should open curriculum and start a session', async ({ page }) => {
        await page.goto('/');

        // Wait for curriculum to load and see greetings 101
        await expect(page.locator('#curriculum-container')).toBeVisible();

        // Find the specific lesson title by locating the element
        const lessonPath = page.locator('.path-node-title', { hasText: 'M1: Greetings 101' });
        await expect(lessonPath).toBeVisible();

        // Click the node bubble it belongs to.
        // The title is in an absolute div, but there's a `.node-bubble` sibling or parent
        const nodeBubble = page.locator('.path-node', { has: page.locator('text="M1: Greetings 101"') }).locator('.node-bubble');
        await nodeBubble.click();

        // Wait for Lesson Modal
        await expect(page.locator('#lesson-modal')).toBeVisible();

        // Ensure we see vocabulary items loaded inside
        const vocabList = page.locator('#lesson-vocab-list');
        await expect(vocabList).not.toBeEmpty();

        // Click Start Session
        await page.locator('#start-lesson-btn').click();

        // Check if grammar screen appears
        const grammarScreen = page.locator('#grammar-screen');
        if (await grammarScreen.isVisible()) {
            await page.locator('#start-grammar-btn').click();
        }

        // We should now be in the Swipe Sorter (or rhythm game depending on the exact flow)
        // Check for specific UI elements
        await expect(page.locator('#game-stage')).toBeVisible();

        // Wait for the swipe card to be created
        await expect(page.locator('.swipe-card')).toBeVisible();

    });

});
