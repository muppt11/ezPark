/**
 * End-to-end test of the core loop against a running dev server with seeded data:
 *   host lists a driveway → payout setup → driver searches, pays → address reveal →
 *   capacity check → host sees booking → driver reports blocked spot → refund + rebook options.
 *
 *   npm run dev            # in another terminal (after npm run db:seed)
 *   npm run test:e2e
 *
 * Uses your installed Google Chrome (set PW_CHANNEL=chromium etc. to change).
 * Creates users e2e-*@example.com and deletes them (and their data) at the end.
 */
import assert from "node:assert/strict";
import path from "node:path";
import Database from "better-sqlite3";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB_FILE = path.resolve("prisma/dev.db");
const run = Date.now();
const errors = [];
const step = (msg) => console.log(`  ✓ ${msg}`);
// Set SHOTS_DIR=/some/folder to save a screenshot at each step.
const shot = (page, name) => process.env.SHOTS_DIR && page.screenshot({ path: path.join(process.env.SHOTS_DIR, `${name}.png`), fullPage: true });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });

// E2E_PHONE=1 runs everything at iPhone size.
const VIEWPORT = process.env.E2E_PHONE ? { width: 390, height: 844 } : { width: 1280, height: 860 };

async function newUserPage(viewport = VIEWPORT) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (e) => errors.push(e.message));
  return page;
}

async function signUp(page, { name, email, role }) {
  await page.goto(`${BASE}/signup?role=${role}`);
  await page.fill("input[name=name]", name);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "parkingpass1");
  await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/signup"));
}

try {
  console.log(`ezPark e2e against ${BASE}`);

  // ── Host lists a driveway (goal: under 2 minutes) ─────────────────────────
  const host = await newUserPage();
  const hostEmail = `e2e-host-${run}@example.com`;
  await signUp(host, { name: "Erin Host", email: hostEmail, role: "host" });
  const listStart = Date.now();
  await host.goto(`${BASE}/host/new`);
  await host.fill("input[name=address]", "2100 San Antonio St, Austin, TX");
  await host.click("button:has-text('Find')");
  await host.waitForSelector("text=Which event?", { timeout: 30_000 });
  const venue = await host.locator("[aria-label=Venue] label").first().innerText();
  assert.match(venue, /Darrell K Royal|Moody/, "closest venue should be a campus venue");
  await host.setInputFiles("input[type=file]", path.resolve("public/demo/driveway-stone.jpg"));
  await host.waitForSelector("text=Change photo");
  await host.fill("input[name=flatPrice]", "30");
  await shot(host, "1-host-listing-form");
  await host.fill("textarea[name=instructions]", "E2E: park on the left, gate code 4321.");
  await host.click("button:has-text('Continue to payout setup')");
  await host.waitForURL("**/host/payouts?from=listing");
  await shot(host, "2-host-payouts");
  await host.click("text=Fill test details");
  await host.click("button:has-text('Save and publish')");
  await host.waitForURL((u) => u.pathname === "/host" && u.searchParams.has("published"));
  const listSecs = (Date.now() - listStart) / 1000;
  step(`host listed a driveway and set up payouts in ${listSecs.toFixed(1)}s (goal < 120s)`);
  assert.ok(listSecs < 120);

  // ── Driver searches, reserves and pays (goal: under 3 minutes) ────────────
  const driver = await newUserPage();
  const driverEmail = `e2e-driver-${run}@example.com`;
  await signUp(driver, { name: "Dana Driver", email: driverEmail, role: "driver" });
  const bookStart = Date.now();
  await driver.goto(`${BASE}/`);
  await driver.fill("input[name=q]", "Longhorns football");
  await driver.click("button:has-text('Find parking spots')");
  await driver.waitForSelector("[id^=listing-]");
  await driver.waitForTimeout(1500);
  await shot(driver, "3-driver-search");
  await driver.goto(`${driver.url()}${driver.url().includes("?") ? "&" : "?"}walk=any`);
  const card = driver.locator("[id^=listing-]", { hasText: "San Antonio" }).first();
  await card.click();
  await driver.waitForURL("**/spots/**");
  const listingId = driver.url().split("/spots/")[1];
  assert.doesNotMatch(await driver.locator("main").innerText(), /gate code 4321/, "instructions hidden before payment");
  assert.doesNotMatch(await driver.content(), /\/uploads\//, "host photo not sent before payment");
  await shot(driver, "4-driver-spot");
  await driver.click("a:has-text('Reserve')");
  await driver.waitForURL("**/book/**");

  // A declined card shows an error and books nothing.
  await driver.fill("input[name=cardNumber]", "4000 0000 0000 0002");
  await driver.fill("input[name=cardExp]", "12/30");
  await driver.fill("input[name=cardCvc]", "123");
  await driver.fill("input[name=cardZip]", "78705");
  await driver.click("button:has-text('Pay')");
  await driver.waitForSelector("text=declined");
  step("declined test card is rejected");

  await shot(driver, "5-driver-checkout-declined");
  await driver.click("text=Use test card 4242");
  await driver.click("button:has-text('Pay')");
  await driver.waitForURL("**/parking/**?new=1");
  const bookSecs = (Date.now() - bookStart) / 1000;
  const reservation = await driver.locator("main").innerText();
  assert.match(reservation, /You're booked/);
  assert.match(reservation, /San Antonio/);
  assert.match(reservation, /gate code 4321/);
  assert.equal(await driver.locator("img[alt='The driveway you booked']").count(), 1, "photo revealed after payment");
  step(`driver searched, reserved and paid in ${bookSecs.toFixed(1)}s (goal < 180s); exact address + instructions revealed`);
  assert.ok(bookSecs < 180);
  const bookingUrl = driver.url().replace(/\?.*/, "");
  await driver.waitForTimeout(1500);
  await shot(driver, "6-driver-confirmation");

  // ── Capacity: the 1-car driveway is now full for a second driver ──────────
  const driver2 = await newUserPage();
  await signUp(driver2, { name: "Sam Second", email: `e2e-driver2-${run}@example.com`, role: "driver" });
  await driver2.goto(`${BASE}/book/${listingId}`);
  await driver2.waitForSelector("text=full for this event");
  step("second driver can't book the full driveway");

  // ── Host sees the booking with the driver's details ───────────────────────
  await host.goto(`${BASE}/host`);
  await host.waitForSelector("text=Dana");
  assert.match(await host.locator("main").innerText(), /\$27\.00/, "host earns 90% of $30");
  step("host sees the booking and a $27.00 payout (90% of $30)");
  await shot(host, "7-host-dashboard");

  // ── Driver protection: blocked spot → instant refund + rebook options ─────
  await driver.goto(bookingUrl);
  await driver.click("button:has-text('Report a problem')");
  await driver.check("input[value=SPOT_BLOCKED]");
  await driver.click("button:has-text('Send report')");
  await driver.waitForSelector("text=Rebook nearby for the same event");
  assert.match(await driver.locator("main").innerText(), /Refunded/);
  step("blocked-spot report refunds in full and shows rebook options");
  await shot(driver, "8-driver-refund-rebook");

  // ── Signed-in users skip the login page ───────────────────────────────────
  await driver.goto(`${BASE}/login`);
  await driver.waitForURL((u) => !u.pathname.startsWith("/login"));
  step("signed-in driver is not asked to log in again");

  assert.deepEqual(errors, [], "no page errors");
  console.log("\nAll checks passed.");
} catch (e) {
  console.error("\n✗ FAILED:", e.message);
  if (errors.length) console.error("Page errors:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
  cleanup();
}

function cleanup() {
  const db = new Database(DB_FILE);
  db.pragma("foreign_keys = ON");
  const ids = db.prepare("SELECT id FROM User WHERE email LIKE 'e2e-%@example.com'").all().map((r) => r.id);
  for (const id of ids) {
    db.prepare("DELETE FROM Incident WHERE reporterId = ?").run(id);
    db.prepare("DELETE FROM Booking WHERE driverId = ? OR listingId IN (SELECT id FROM Listing WHERE hostId = ?)").run(id, id);
    db.prepare("DELETE FROM Listing WHERE hostId = ?").run(id);
    db.prepare("DELETE FROM User WHERE id = ?").run(id);
  }
  db.close();
}
