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

test("Administrator manages Participant Invitations and a Participant confirms their identity", async ({ page }) => {
  const displayLabel = `Maja ${Date.now()}`;
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:3000" });
  await page.goto("/admin/login");
  await page.getByLabel("Lösenord").fill(process.env.ADMIN_PASSWORD ?? "test-admin-password");
  await page.getByRole("button", { name: "Logga in" }).click();

  await page.getByLabel("Deltagarnamn").fill(displayLabel);
  await page.getByRole("button", { name: "Lägg till deltagare" }).click();
  await expect(page.getByText("Deltagaren har lagts till.")).toBeVisible();
  await expect(page.getByLabel(`Namn för ${displayLabel}`)).toHaveValue(displayLabel);
  await page.getByLabel("Deltagarnamn").fill(" ");
  await page.getByRole("button", { name: "Lägg till deltagare" }).click();
  await expect(page.getByText("Deltagarnamnet får inte vara tomt")).toBeVisible();
  await page.getByLabel("Deltagarnamn").fill(displayLabel);
  await page.getByRole("button", { name: "Lägg till deltagare" }).click();
  await expect(page.getByText("Deltagarnamnet används redan")).toBeVisible();
  await page.getByRole("button", { name: "Kopiera inbjudan" }).click();
  const originalInvitation = await page.evaluate(() => navigator.clipboard.readText());
  expect(originalInvitation).toMatch(/\/vote\/[A-Za-z0-9_-]{8}$/);

  const secondDisplayLabel = `Björn ${Date.now()}`;
  await page.getByLabel("Deltagarnamn").fill(secondDisplayLabel);
  await page.getByRole("button", { name: "Lägg till deltagare" }).click();
  await page.getByRole("button", { name: "Kopiera alla inbjudningar" }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`^${displayLabel}\\n${originalInvitation}\\n\\n${secondDisplayLabel}\\nhttp://127\\.0\\.0\\.1:3000/vote/[A-Za-z0-9_-]{8}$`));

  const renamedDisplayLabel = `${displayLabel} L.`;
  await page.getByLabel(`Namn för ${displayLabel}`).fill(renamedDisplayLabel);
  await page.getByLabel(`Namn för ${displayLabel}`).locator("..").getByRole("button", { name: "Byt namn" }).click();
  await expect(page.getByText("Deltagaren har bytt namn.")).toBeVisible();

  await page.goto(originalInvitation);
  await expect(page.getByRole("heading", { name: `Du röstar som ${renamedDisplayLabel}` })).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Förnya inbjudan" }).click();
  await page.getByRole("button", { name: "Bekräfta" }).click();
  await expect(page.getByText("den gamla länken fungerar inte längre")).toBeVisible();
  await page.goto(originalInvitation);
  await expect(page.getByRole("heading", { name: "Den här länken fungerar inte" })).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Kopiera inbjudan" }).first().click();
  const renewedInvitation = await page.evaluate(() => navigator.clipboard.readText());
  await page.getByRole("button", { name: "Ta bort deltagare" }).first().click();
  await page.getByRole("button", { name: "Bekräfta" }).click();
  await page.goto(renewedInvitation);
  await expect(page.getByRole("heading", { name: "Den här länken fungerar inte" })).toBeVisible();
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
  await page.getByLabel("CSV-fil").setInputFiles({ name: "invalid.csv", mimeType: "text/csv", buffer: Buffer.from("suggestion,motivation\n") });
  await expect(page.getByText(/måste innehålla minst en Suggestion/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem").first()).toContainText("Ersättning 1");

  await page.getByRole("button", { name: "Flytta ner" }).first().click();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem").first()).toContainText("Ersättning 2");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Utkastets Suggestions" }).locator("..").getByRole("listitem").first()).toContainText("Ersättning 2");
});
