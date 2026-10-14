import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { preview } from "vite";

const url = "http://127.0.0.1:4318/";
let server;
let browser;

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

test("the new renderer uses the approved ant shell at wide and narrow sizes", async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
  assert.equal(await page.locator("[data-ant-portrait='Scout']").count(), 1);
  assert.equal(await page.getByRole("navigation", { name: "Main navigation" }).count(), 1);
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
  await page.getByRole("button", { name: "Conversations" }).click();
  await page.getByRole("heading", { name: "Conversations", exact: true }).waitFor();
  assert.match(await page.locator("main").innerText(), /being rebuilt/u);
  await page.setViewportSize({ width: 1024, height: 700 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= 1024),
    true,
  );
  await page.close();
});

test("a missing native bridge stays recoverable and never renders fixture data", async () => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  await page.goto(url);
  await page.getByRole("heading", { name: "Colony can't connect" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Try again" }).count(), 1);
  assert.equal(await page.getByText("Lerato Designs").count(), 0);
  await page.close();
});

test("a rejected host request can succeed on retry", async () => {
  const page = await browser.newPage();
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
  await page.getByRole("heading", { name: "Colony can't connect" }).waitFor();
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.close();
});
