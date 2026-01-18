import { test, expect } from "@playwright/test";

test("should navigate to dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("h1")).toContainText("Dashboard");
});

test("should have proper navigation", async ({ page }) => {
  await page.goto("/dashboard");
  
  // Check if all navigation items exist
  await expect(page.locator("text=Dashboard")).toBeVisible();
  await expect(page.locator("text=Cancellation Rules")).toBeVisible();
  await expect(page.locator("text=Refunds")).toBeVisible();
  await expect(page.locator("text=Inventory")).toBeVisible();
  await expect(page.locator("text=Analytics")).toBeVisible();
});

test("should toggle dark mode", async ({ page }) => {
  await page.goto("/dashboard");
  
  // Find and click dark mode toggle
  const darkModeButton = page.locator('button:has-text("Dark mode")').first();
  await darkModeButton.click();
  
  // Check if dark class is added to html element
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/);
});
//updated

