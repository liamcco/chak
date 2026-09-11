import { expect, test } from "@playwright/test";

test("Administrator credentials are scoped to one browser context", async ({ browser }) => {
  const administrator = await browser.newContext();
  const page = await administrator.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Lösenord").fill(process.env.ADMIN_PASSWORD ?? "test-admin-password");
  await page.getByRole("button", { name: "Logga in" }).click();
  await expect(page.getByRole("heading", { name: "Namnvalet väntar" })).toBeVisible();

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto("/admin");
  await expect(visitorPage).toHaveURL(/\/admin\/login/);
  expect((await visitor.request.post("/api/admin/election")).status()).toBe(401);

  await administrator.close();
  await visitor.close();
});

test("incorrect Administrator credentials do not authenticate", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Lösenord").fill("wrong-password");
  await page.getByRole("button", { name: "Logga in" }).click();
  await expect(page.getByText("Fel lösenord.", { exact: true })).toBeVisible();
});
