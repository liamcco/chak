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

test("Administrator previews, imports, and reorders the complete Suggestion set", async ({ page }) => {
  const csv = ["suggestion,motivation", ...Array.from({ length: 32 }, (_, index) => `Namn ${index + 1},Motivation ${index + 1}`)].join("\n");
  await page.goto("/admin/login");
  await page.getByLabel("Lösenord").fill(process.env.ADMIN_PASSWORD ?? "test-admin-password");
  await page.getByRole("button", { name: "Logga in" }).click();

  await page.getByLabel("CSV-fil").setInputFiles({ name: "suggestions.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByRole("heading", { name: "Bekräfta import" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bekräfta import" }).locator("..").getByRole("listitem")).toHaveCount(32);
  await page.getByRole("button", { name: "Bekräfta import" }).click();
  await expect(page.getByText("Suggestions har sparats.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem")).toHaveCount(32);

  const replacement = ["suggestion,motivation", ...Array.from({ length: 32 }, (_, index) => `Ersättning ${index + 1},Ny motivation ${index + 1}`)].join("\n");
  await page.getByLabel("CSV-fil").setInputFiles({ name: "replacement.csv", mimeType: "text/csv", buffer: Buffer.from(replacement) });
  await page.getByRole("button", { name: "Avbryt" }).click();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem").first()).toContainText("Namn 1");
  await page.getByLabel("CSV-fil").setInputFiles({ name: "replacement.csv", mimeType: "text/csv", buffer: Buffer.from(replacement) });
  await page.getByRole("button", { name: "Bekräfta import" }).click();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem").first()).toContainText("Ersättning 1");
  await page.getByLabel("CSV-fil").setInputFiles({ name: "invalid.csv", mimeType: "text/csv", buffer: Buffer.from("suggestion,motivation\nBara en rad,Varför") });
  await expect(page.getByText(/måste innehålla exakt 32 Suggestions/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem").first()).toContainText("Ersättning 1");

  await page.getByRole("button", { name: "Flytta ner" }).first().click();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem").first()).toContainText("Ersättning 2");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem").first()).toContainText("Ersättning 2");
});
