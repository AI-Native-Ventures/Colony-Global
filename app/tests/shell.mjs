import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";

const url = "http://127.0.0.1:4318/";
let server;
let browser;
const tracedContexts = [];

async function tracedPage(name, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  await context.tracing.start({ screenshots: true, snapshots: true });
  tracedContexts.push({ context, name });
  return context.newPage();
}

before(async () => {
  server = await preview({
    preview: { host: "127.0.0.1", port: 4318, strictPort: true },
  });
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await server?.httpServer.close();
});

afterEach(async () => {
  mkdirSync(new URL("../test-results/", import.meta.url), { recursive: true });
  for (const { context, name } of tracedContexts.splice(0)) {
    await context.tracing.stop({
      path: fileURLToPath(
        new URL(`../test-results/${name}.zip`, import.meta.url),
      ),
    });
    await context.close();
  }
});

test("the new renderer uses the approved ant shell at wide and narrow sizes", async () => {
  const page = await tracedPage("shell");
  await page.addInitScript(() => {
    window.colonyDesktop = {
      request: async (type, payload) => {
        if (type === "invoke" && payload.command === "get_default_relay_url") {
          return "ws://127.0.0.1:3000";
        }
        throw new Error("Unexpected host command");
      },
    };
  });
  await page.goto(url);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByText("Desktop host ready").waitFor();
  assert.equal(await page.getByText("Computer connected").count(), 0);
  assert.equal(await page.locator("[data-ant-portrait='Scout']").count(), 1);
  assert.equal(
    await page.getByRole("navigation", { name: "Main navigation" }).count(),
    1,
  );
  assert.equal(await page.getByText("Buzz", { exact: true }).count(), 0);
  const colors = await page.evaluate(() => ({
    main: getComputedStyle(document.querySelector("main")).backgroundColor,
    sidebar: getComputedStyle(document.querySelector("aside")).backgroundImage,
  }));
  assert.equal(colors.main, "rgb(255, 255, 255)");
  assert.match(colors.sidebar, /linear-gradient/u);
  if (process.env.COLONY_SHELL_SHOT) {
    await page.screenshot({ path: process.env.COLONY_SHELL_SHOT });
  }
  let conversationsFocused = false;
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    conversationsFocused = await page
      .getByRole("button", { name: "Conversations" })
      .evaluate((element) => element === document.activeElement);
    if (conversationsFocused) break;
  }
  assert.equal(conversationsFocused, true);
  await page.keyboard.press("Enter");
  await page
    .getByRole("heading", { name: "Conversations", exact: true })
    .waitFor();
  assert.match(await page.locator("main").innerText(), /being rebuilt/u);
  await page.setViewportSize({ width: 1024, height: 700 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= 1024),
    true,
  );
  await page.close();
});

test("a missing native bridge stays recoverable and never renders fixture data", async () => {
  const page = await tracedPage("missing-host", { width: 1024, height: 700 });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Colony host unavailable" })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Try again" }).count(),
    1,
  );
  assert.equal(await page.getByText("Lerato Designs").count(), 0);
  await page.close();
});

test("a rejected host request can succeed on retry", async () => {
  const page = await tracedPage("retry-host");
  await page.addInitScript(() => {
    let attempts = 0;
    window.colonyDesktop = {
      request: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("Host restarting");
        return "ws://127.0.0.1:3000";
      },
    };
  });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Colony host unavailable" })
    .waitFor();
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.close();
});
