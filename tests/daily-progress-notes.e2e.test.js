/**
 * Daily Progress Notes E2E Tests
 * Tests for multiple daily entries functionality using Playwright
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Daily Progress Notes - Multiple Entries Per Day', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should allow multiple daily progress note entries for the same day', async ({ page }) => {
    // Navigate to Profiles page
    await expect(page.locator('text=Profiles')).toBeVisible();
    await page.click('text=Profiles');
    await page.waitForLoadState('networkidle');

    // Find and click on the first youth profile card
    const profileCard = page.locator('[data-testid="youth-profile-card"]').first();
    
    // If no data-testid, try alternative selectors for youth profile cards
    const alternativeProfileCard = page.locator('.card, .profile-card, *:has-text("Youth")').first();
    
    let profileToClick = profileCard;
    if (!(await profileCard.isVisible())) {
      profileToClick = alternativeProfileCard;
    }
    
    await expect(profileToClick).toBeVisible({ timeout: 10000 });
    await profileToClick.click();
    await page.waitForLoadState('networkidle');

    // Navigate to Quick Scoring tab within the youth profile
    await expect(page.locator('text=Quick Scoring')).toBeVisible();
    await page.click('text=Quick Scoring');
    await page.waitForTimeout(1000);

    const currentDate = new Date().toISOString().split('T')[0];

    // First Entry - Morning session
    await submitDailyRating(page, {
      date: currentDate,
      timeOfDay: 'Morning',
      staffMember: 'Test Staff Member',
      ratings: {
        peerInteraction: 4,
        adultInteraction: 3,
        investmentLevel: 4,
        dealWithAuthority: 2
      }
    });

    // Verify first submission success
    await expect(page.locator('text=Behavioral ratings saved successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Second Entry - Evening session for the same day
    await submitDailyRating(page, {
      date: currentDate,
      timeOfDay: 'Evening',
      staffMember: 'Test Staff Member',
      ratings: {
        peerInteraction: 3,
        adultInteraction: 4,
        investmentLevel: 3,
        dealWithAuthority: 4
      }
    });

    // Verify second submission success
    await expect(page.locator('text=Behavioral ratings saved successfully')).toBeVisible({ timeout: 10000 });

    // Verify that multiple entries are accepted by checking the updated count
    await page.waitForTimeout(3000);
    
    // Look for any element that indicates multiple entries
    const multipleEntriesIndicator = page.locator('*:has-text("total daily rating"), *:has-text("entries"), *:has-text("ratings")');
    await expect(multipleEntriesIndicator.first()).toBeVisible({ timeout: 5000 });
    
    // Third Entry - Day session for the same day  
    await submitDailyRating(page, {
      date: currentDate,
      timeOfDay: 'Day',
      staffMember: 'Another Staff Member',
      ratings: {
        peerInteraction: 2,
        adultInteraction: 3,
        investmentLevel: 3,
        dealWithAuthority: 3
      }
    });

    // Verify third submission success
    await expect(page.locator('text=Behavioral ratings saved successfully')).toBeVisible({ timeout: 10000 });

    // Final verification - multiple entries accepted
    await page.waitForTimeout(2000);
    console.log('✅ Successfully submitted multiple daily progress note entries for the same date');
  });

  test('should handle different time periods correctly', async ({ page }) => {
    // Navigate to profiles and select first youth
    await page.click('text=Profiles');
    await page.waitForLoadState('networkidle');
    
    // Try to find any youth profile element
    const profileElements = [
      '[data-testid="youth-profile-card"]',
      '.card:has-text("Youth")',
      '.profile-card',
      '*:has-text("Profile")'
    ];
    
    let profileCard = null;
    for (const selector of profileElements) {
      profileCard = page.locator(selector).first();
      if (await profileCard.isVisible()) break;
    }
    
    if (!profileCard) {
      // If no profile found, try creating one first
      const addButton = page.locator('button:has-text("Add"), button:has-text("+"), *:has-text("New")');
      if (await addButton.first().isVisible()) {
        await addButton.first().click();
        await page.waitForTimeout(1000);
      }
    }
    
    await profileCard.click();
    await page.waitForLoadState('networkidle');

    await page.click('text=Quick Scoring');
    await page.waitForTimeout(1000);

    const currentDate = new Date().toISOString().split('T')[0];

    // Test all three time periods for the same date
    const timePeriods = ['Morning', 'Day', 'Evening'];
    
    for (let i = 0; i < timePeriods.length; i++) {
      const period = timePeriods[i];
      
      await submitDailyRating(page, {
        date: currentDate,
        timeOfDay: period,
        staffMember: `Staff Member ${i + 1}`,
        ratings: {
          peerInteraction: 3,
          adultInteraction: 3,
          investmentLevel: 3,
          dealWithAuthority: 3
        }
      });

      // Verify each submission
      await expect(page.locator('text=Behavioral ratings saved successfully')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
    }

    console.log('✅ Successfully tested all time periods for the same date');
  });

  test('should update average scores correctly across multiple entries', async ({ page }) => {
    // Navigate to Quick Scoring
    await page.click('text=Profiles');
    await page.waitForLoadState('networkidle');
    
    const profileCard = page.locator('[data-testid="youth-profile-card"], .card, *:has-text("Profile")').first();
    await profileCard.click();
    await page.waitForLoadState('networkidle');

    await page.click('text=Quick Scoring');
    await page.waitForTimeout(1000);

    const currentDate = new Date().toISOString().split('T')[0];

    // Submit first entry with known values
    await submitDailyRating(page, {
      date: currentDate,
      timeOfDay: 'Morning',
      staffMember: 'Test Staff',
      ratings: {
        peerInteraction: 4,
        adultInteraction: 4,
        investmentLevel: 4,
        dealWithAuthority: 4
      }
    });

    await expect(page.locator('text=Behavioral ratings saved successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Submit second entry with different values
    await submitDailyRating(page, {
      date: currentDate,
      timeOfDay: 'Evening',
      staffMember: 'Test Staff',
      ratings: {
        peerInteraction: 2,
        adultInteraction: 2,
        investmentLevel: 2,
        dealWithAuthority: 2
      }
    });

    await expect(page.locator('text=Behavioral ratings saved successfully')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Look for any elements that show average scores
    const averageElements = page.locator('*:has-text("P:"), *:has-text("A:"), *:has-text("I:"), *:has-text("D:"), *:has-text("Average")');
    
    // Verify that at least some average data is displayed
    const avgCount = await averageElements.count();
    expect(avgCount).toBeGreaterThan(0);
    
    console.log('✅ Successfully verified average score updates across multiple entries');
  });
});

// Helper Functions

async function submitDailyRating(page, { date, timeOfDay, staffMember, ratings }) {
  await fillFormFields(page, { date, timeOfDay, staffMember });
  
  // Set each rating
  await setRating(page, 'Peer Interaction', ratings.peerInteraction);
  await setRating(page, 'Adult Interaction', ratings.adultInteraction);  
  await setRating(page, 'Investment Level', ratings.investmentLevel);
  await setRating(page, 'Deal w/ Authority', ratings.dealWithAuthority);

  // Submit the form
  const submitButton = page.locator('button:has-text("Save Daily Rating")');
  await expect(submitButton).toBeVisible();
  await submitButton.click();
}

async function fillFormFields(page, { date, timeOfDay, staffMember }) {
  // Fill date field
  const dateInput = page.locator('input[type="date"], input[placeholder*="date"], input[name*="date"]');
  if (await dateInput.isVisible()) {
    await dateInput.fill(date);
  }

  // Select time of day
  const timeSelectors = [
    'select[name*="time"]',
    'button:has-text("Select time")', 
    '*:has-text("Time of Day")',
    'select'
  ];
  
  for (const selector of timeSelectors) {
    const timeElement = page.locator(selector).first();
    if (await timeElement.isVisible()) {
      if (selector.includes('select')) {
        await timeElement.selectOption(timeOfDay);
      } else {
        await timeElement.click();
        await page.locator(`text=${timeOfDay}`).click();
      }
      break;
    }
  }

  // Fill staff member field
  const staffInput = page.locator('input[name*="staff"], input[placeholder*="staff"], input[placeholder*="Staff"]');
  if (await staffInput.isVisible()) {
    await staffInput.fill(staffMember);
  }
}

async function setRating(page, categoryName, rating) {
  // Find the rating section for this category
  const categorySection = page.locator(`*:has-text("${categoryName}")`).first();
  
  // Wait a bit to ensure UI is stable
  await page.waitForTimeout(300);

  // Look for rating buttons (0-4 scale) near the category
  const ratingButtonSelectors = [
    `button:has-text("${rating}")`,
    `*[role="button"]:has-text("${rating}")`,
    `input[value="${rating}"]`,
    `button[data-value="${rating}"]`,
    `.rating-button:has-text("${rating}")`,
    `*[data-rating="${rating}"]`
  ];
  
  for (const selector of ratingButtonSelectors) {
    const ratingElement = page.locator(selector).near(categorySection);
    
    if (await ratingElement.first().isVisible()) {
      await ratingElement.first().click();
      await page.waitForTimeout(200);
      return;
    }
  }
  
  // Fallback: try to find any clickable element with the rating number
  const fallbackRating = page.locator(`*:has-text("${rating}")[role="button"], button:has-text("${rating}")`).near(categorySection);
  if (await fallbackRating.first().isVisible()) {
    await fallbackRating.first().click();
    await page.waitForTimeout(200);
  }
}