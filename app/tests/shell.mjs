import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { preview } from "vite";

const url = "http://127.0.0.1:4318/";
let server;
let browser;
const tracedContexts = [];
const relaySecret = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const relaySelf = getPublicKey(relaySecret);
const defaultCompany = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "lerato-designs",
  normalized_host: "lerato-designs.colony.example.test",
  owner_pubkey: "a".repeat(64),
  role: "owner",
};

function profileEvent(profile, revision = 1) {
  return finalizeEvent(
    {
      kind: 30657,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["d", "business-profile"],
        ["revision", String(revision)],
      ],
      content: JSON.stringify(profile),
    },
    relaySecret,
  );
}

const defaultProfile = {
  schemaVersion: 1,
  name: "Lerato Designs",
  timeZone: "Africa/Johannesburg",
  whatYouSell: "Clothing and fashion",
};

async function tracedPage(name, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  await context.tracing.start({ screenshots: true, snapshots: true });
  tracedContexts.push({ context, name });
  return context.newPage();
}

async function installMock(page, options = {}) {
  await page.exposeFunction("__COLONY_SIGN_PROFILE__", (profile) =>
    profileEvent(profile),
  );
  await page.addInitScript(
    (settings) => {
      const key = "a".repeat(64);
      const account = {
        id: "account-1",
        email: "lerato@example.com",
        pubkey: key,
        has_password: false,
        google_linked: false,
      };
      const persisted = JSON.parse(
        sessionStorage.getItem("__mock_relay_company") || "null",
      );
      const state = {
        commands: [],
        requests: [],
        account: persisted?.account ?? settings.initialAccount,
        policy: settings.policy,
        hostFailures: settings.hostFailures,
        policyFailures: settings.policyFailures,
        startFailures: [...settings.startFailures],
        verifyFailures: [...settings.verifyFailures],
        networkFailure: settings.networkFailure,
        importFailure: false,
        imported: false,
        companies: persisted?.companies ?? structuredClone(settings.companies),
        profileEvent: persisted?.profileEvent ?? settings.profileEvent,
        companyFailures: [...settings.companyFailures],
        profileSaveFailures: [...settings.profileSaveFailures],
        createFailures: [...settings.createFailures],
      };
      const persistCompany = () =>
        sessionStorage.setItem(
          "__mock_relay_company",
          JSON.stringify({
            account: state.account,
            companies: state.companies,
            profileEvent: state.profileEvent,
          }),
        );
      window.__COLONY_TEST__ = state;
      window.colonyDesktop = {
        request: async (type, payload) => {
          if (type !== "invoke") throw new Error("Unexpected bridge type");
          state.commands.push(payload.command);
          switch (payload.command) {
            case "get_default_relay_url":
              if (state.hostFailures-- > 0) throw new Error("Host restarting");
              return "ws://127.0.0.1:3000";
            case "get_relay_ws_url":
              return "ws://127.0.0.1:3000";
            case "get_relay_http_url":
              return settings.httpUrl;
            case "get_identity":
              return {
                pubkey: key,
                lost: false,
                locked: false,
                reset_failed: false,
              };
            case "sign_event":
              return JSON.stringify({
                id: "event-1",
                pubkey: key,
                kind: payload.args.kind,
                tags: payload.args.tags,
                content: payload.args.content,
                created_at: 1,
                sig: "signed-in-native-host",
              });
            case "fetch_join_policy":
              if (state.policyFailures-- > 0) throw new Error("Policy offline");
              return state.policy;
            case "import_identity":
              if (state.importFailure) throw new Error("Keyring locked");
              if (payload.args.nsec !== "nsec1testsecret")
                throw new Error("Wrong key");
              state.imported = true;
              state.account = true;
              persistCompany();
              return {
                pubkey: settings.importPubkey,
                lost: false,
                locked: false,
                reset_failed: false,
              };
            default:
              throw new Error(`Unexpected host command ${payload.command}`);
          }
        },
      };
      const realFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const target = typeof input === "string" ? input : input.url;
        if (
          !target.startsWith("http://127.0.0.1:3000/") &&
          !target.startsWith("https://lerato-designs.colony.example.test/") &&
          !target.endsWith(".colony.example.test/") &&
          !target.includes(".colony.example.test/")
        ) {
          return realFetch(input, init);
        }
        const path = new URL(target).pathname;
        const body = init?.body ? JSON.parse(init.body) : undefined;
        state.requests.push({
          path,
          method: init?.method,
          body,
          authorization: init?.headers?.Authorization,
          target,
        });
        if (state.networkFailure) throw new TypeError("Relay unavailable");
        const json = (value, status = 200) => Response.json(value, { status });
        if (path === "/api/accounts/me") {
          return state.account
            ? json(account)
            : json({ error: "account_not_found" }, 404);
        }
        if (path === "/api/accounts/code/start") {
          const next = state.startFailures.shift();
          return next
            ? json(
                { error: next.code, retry_after_secs: next.retryAfterSecs },
                next.status,
              )
            : json({ sent: true, resendAfterSeconds: 1 });
        }
        if (path === "/api/accounts/code/verify") {
          const next = state.verifyFailures.shift();
          return next
            ? json(
                {
                  error: next.code,
                  attempts_left: next.attemptsLeft,
                  retry_after_secs: next.retryAfterSecs,
                },
                next.status,
              )
            : json({
                account,
                nsec: "nsec1testsecret",
                created: !settings.existingEmail,
              });
        }
        if (path === "/api/communities/config") {
          return json({
            self_serve: true,
            domain: "colony.example.test",
            public: true,
            max_per_owner: 5,
          });
        }
        if (path === "/api/communities/mine") {
          const next = state.companyFailures.shift();
          if (next) return json({ error: next.code }, next.status);
          return json({ owner_pubkey: key, communities: state.companies });
        }
        if (path === "/api/communities") {
          const next = state.createFailures.shift();
          if (next && !next.afterCommit)
            return json({ error: next.code }, next.status);
          const company = {
            id: "22222222-2222-4222-8222-222222222222",
            slug: body.name,
            normalized_host: `${body.name}.colony.example.test`,
            owner_pubkey: key,
            role: "owner",
          };
          state.companies.push(company);
          persistCompany();
          if (next) return json({ error: next.code }, next.status);
          return json({ community: company });
        }
        if (path === "/" && target.includes(".colony.example.test")) {
          return json({ self: settings.relaySelf });
        }
        if (path === "/query") {
          return json(state.profileEvent ? [state.profileEvent] : []);
        }
        if (path === "/events") {
          const next = state.profileSaveFailures.shift();
          if (next) return json({ error: next.code }, next.status);
          const action = JSON.parse(body.content);
          state.profileEvent = await window.__COLONY_SIGN_PROFILE__({
            ...action.profile,
            bestSellers: [],
            voiceWords: [],
            contact: {},
            invoice: {},
            socialAccounts: {},
          });
          persistCompany();
          return json({
            event_id: body.id,
            accepted: true,
            message: 'response:{"revision":1}',
          });
        }
        throw new Error(`Unexpected relay path ${path}`);
      };
    },
    {
      initialAccount: options.initialAccount ?? false,
      policy: options.policy ?? null,
      hostFailures: options.hostFailures ?? 0,
      policyFailures: options.policyFailures ?? 0,
      startFailures: options.startFailures ?? [],
      verifyFailures: options.verifyFailures ?? [],
      networkFailure: options.networkFailure ?? false,
      existingEmail: options.existingEmail ?? false,
      httpUrl: options.httpUrl ?? "http://127.0.0.1:3000",
      importPubkey: options.importPubkey ?? "a".repeat(64),
      companies:
        options.companies ??
        (options.initialAccount || options.existingEmail
          ? [defaultCompany]
          : []),
      profileEvent:
        options.profileEvent === undefined
          ? options.initialAccount || options.existingEmail
            ? profileEvent(defaultProfile)
            : null
          : options.profileEvent,
      relaySelf,
      companyFailures: options.companyFailures ?? [],
      profileSaveFailures: options.profileSaveFailures ?? [],
      createFailures: options.createFailures ?? [],
    },
  );
}

async function enterCode(page, email = "lerato@example.com") {
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByRole("heading", { name: "Email code" }).waitFor();
}

async function signInNewAccount(page) {
  await enterCode(page);
  await page.getByRole("textbox", { name: "6-digit code" }).fill("482913");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("heading", { name: "Tell Scout about your business" })
    .waitFor();
  if (process.env.COLONY_COMPANY_ENTRY_SHOT) {
    await page.screenshot({ path: process.env.COLONY_COMPANY_ENTRY_SHOT });
  }
}

async function completeBusiness(page) {
  await page.getByRole("textbox", { name: "Your name" }).fill("Lerato");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Business name" })
    .fill("Lerato Designs");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Clothing and fashion" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (let index = 0; index < 2; index++) {
    await page.getByRole("button", { name: "Skip for now" }).click();
  }
  await page
    .getByRole("textbox", { name: "Links or @names" })
    .fill("https://leratodesigns.co.za @leratodesigns");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("textbox", { name: "City and country" })
    .fill("Johannesburg, South Africa");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "More sales" }).click();
  await page.getByRole("button", { name: "Review answers" }).click();
  await page.getByRole("heading", { name: "Here's what I have" }).waitFor();
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

test("returning account restores via signed lookup into the ant workroom", async () => {
  const page = await tracedPage("returning-account");
  await installMock(page, { initialAccount: true });
  await page.goto(url);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  assert.equal(await page.getByText("Desktop host ready").count(), 1);
  assert.equal(await page.locator("[data-ant-portrait='Scout']").count(), 1);
  assert.equal(await page.getByText("Buzz", { exact: true }).count(), 0);
  const colors = await page.evaluate(() => ({
    main: getComputedStyle(document.querySelector("main")).backgroundColor,
    sidebar: getComputedStyle(document.querySelector("aside")).backgroundImage,
  }));
  assert.equal(colors.main, "rgb(255, 255, 255)");
  assert.match(colors.sidebar, /linear-gradient/u);
  const lookup = await page.evaluate(() =>
    window.__COLONY_TEST__.requests.find((r) => r.path === "/api/accounts/me"),
  );
  assert.match(lookup.authorization, /^Nostr /u);
  await page.reload();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Conversations" }).focus();
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

test("new account enters email code and imports the verified identity", async () => {
  const page = await tracedPage("new-account");
  await installMock(page);
  await page.goto(url);
  await page.getByRole("heading", { name: "Welcome and sign in" }).waitFor();
  assert.equal(await page.locator("[data-screen-id='O-01']").count(), 1);
  assert.equal(await page.locator("[data-ant-portrait='Scout']").count(), 1);
  if (process.env.COLONY_FIRST_RUN_SHOT) {
    await page.screenshot({ path: process.env.COLONY_FIRST_RUN_SHOT });
  }
  await enterCode(page, "LERATO@example.com ");
  assert.equal(await page.locator("[data-screen-id='O-02']").count(), 1);
  await page.getByRole("textbox", { name: "6-digit code" }).fill("482913");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("heading", { name: "Tell Scout about your business" })
    .waitFor();
  const state = await page.evaluate(() => ({
    calls: window.__COLONY_TEST__.requests,
    commands: window.__COLONY_TEST__.commands,
    imported: window.__COLONY_TEST__.imported,
    text: document.body.innerText,
    storage: Object.entries(localStorage),
  }));
  assert.equal(
    state.calls.find((r) => r.path === "/api/accounts/code/start").body.email,
    "lerato@example.com",
  );
  assert.deepEqual(
    state.calls.find((r) => r.path === "/api/accounts/code/verify").body,
    {
      email: "lerato@example.com",
      code: "482913",
      termsVersion: "colony-first-run-2026-10-13",
    },
  );
  assert.equal(state.imported, true);
  assert.equal(state.commands.includes("import_identity"), true);
  assert.equal(state.text.includes("nsec1testsecret"), false);
  assert.equal(
    JSON.stringify(state.storage).includes("nsec1testsecret"),
    false,
  );
  await page.close();
});

test("returning email signs in on a computer without a linked account", async () => {
  const page = await tracedPage("returning-email");
  await installMock(page, { existingEmail: true });
  await page.goto(url);
  await enterCode(page);
  await page.getByRole("textbox", { name: "6-digit code" }).fill("482913");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(state.imported, true);
  assert.equal(
    state.requests.filter((r) => r.path === "/api/accounts/code/verify").length,
    1,
  );
  await page.close();
});

test("wrong and expired codes stay recoverable", async () => {
  const page = await tracedPage("code-recovery");
  await installMock(page, {
    verifyFailures: [
      { status: 400, code: "invalid_code", attemptsLeft: 4 },
      { status: 410, code: "code_expired" },
    ],
  });
  await page.goto(url);
  await enterCode(page);
  await page.getByRole("textbox", { name: "6-digit code" }).fill("000000");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("alert").getByText("4 tries left").waitFor();
  await page.getByRole("textbox", { name: "6-digit code" }).fill("111111");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("alert").getByText("That code has expired").waitFor();
  await page
    .getByRole("button", { name: "Send a new code", exact: true })
    .click();
  await page
    .getByRole("status")
    .getByText("Check your email for a new code")
    .waitFor();
  await page.getByRole("textbox", { name: "6-digit code" }).fill("482913");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("heading", { name: "Tell Scout about your business" })
    .waitFor();
  await page.close();
});

test("relay and native import failures do not claim sign-in", async () => {
  const page = await tracedPage("service-recovery");
  await installMock(page);
  await page.goto(url);
  await page.evaluate(() => {
    window.__COLONY_TEST__.networkFailure = true;
  });
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("lerato@example.com");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByRole("alert").getByText("isn't answering").waitFor();
  await page.evaluate(() => {
    window.__COLONY_TEST__.networkFailure = false;
  });
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByRole("heading", { name: "Email code" }).waitFor();
  await page.evaluate(() => {
    window.__COLONY_TEST__.importFailure = true;
  });
  await page.getByRole("textbox", { name: "6-digit code" }).fill("482913");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("alert")
    .getByText("couldn't save your account")
    .waitFor();
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
  await page.getByRole("button", { name: "Use a different email" }).click();
  await page.getByRole("heading", { name: "Welcome and sign in" }).waitFor();
  await page.close();
});

test("policy and age gate precede sending a code", async () => {
  const page = await tracedPage("policy-gate");
  await installMock(page, {
    policyFailures: 1,
    policy: {
      version: "v5",
      age_attestation_required: true,
      terms_markdown: "Terms",
      privacy_markdown: "Privacy",
    },
  });
  await page.goto(url);
  await page
    .getByRole("alert")
    .getByText("couldn't check its sign-in terms")
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Continue with email" })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await page
    .getByRole("checkbox", { name: "I am at least 18 years old." })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Continue with email" })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("checkbox", { name: "I am at least 18 years old." })
    .check();
  assert.equal(
    await page.getByRole("link", { name: "Terms" }).getAttribute("href"),
    "http://127.0.0.1:3000/api/join-policy/terms",
  );
  await enterCode(page);
  await page.getByRole("textbox", { name: "6-digit code" }).fill("482913");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("heading", { name: "Tell Scout about your business" })
    .waitFor();
  const verify = await page.evaluate(() =>
    window.__COLONY_TEST__.requests.find(
      (r) => r.path === "/api/accounts/code/verify",
    ),
  );
  assert.equal(verify.body.termsVersion, "v5");
  await page.close();
});

test("rate limits and offline state block duplicate code sends and recover", async () => {
  const page = await tracedPage("send-recovery");
  await installMock(page, {
    startFailures: [
      { status: 429, code: "resend_cooldown", retryAfterSecs: 1 },
    ],
  });
  await page.goto(url);
  await page.getByRole("heading", { name: "Welcome and sign in" }).waitFor();
  await page.context().setOffline(true);
  await page.getByText("Connect to the internet to sign in.").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Continue with email" })
      .isDisabled(),
    true,
  );
  await page.context().setOffline(false);
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("lerato@example.com");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByRole("alert").getByText("Please wait 1 second").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Try again in 1 second" })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByRole("heading", { name: "Email code" }).waitFor();
  const sends = await page.evaluate(
    () =>
      window.__COLONY_TEST__.requests.filter(
        (r) => r.path === "/api/accounts/code/start",
      ).length,
  );
  assert.equal(sends, 2);
  await page.close();
});

test("startup relay outage holds account state until an explicit retry", async () => {
  const page = await tracedPage("startup-relay-recovery");
  await installMock(page, { initialAccount: true, networkFailure: true });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Colony can't reach your account" })
    .waitFor();
  assert.equal(
    await page.getByRole("heading", { name: "Welcome and sign in" }).count(),
    0,
  );
  await page.evaluate(() => {
    window.__COLONY_TEST__.networkFailure = false;
  });
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.close();
});

test("remote plaintext relay is rejected before any account request", async () => {
  const page = await tracedPage("insecure-relay");
  await installMock(page, { httpUrl: "http://relay.example.test" });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Colony can't reach your account" })
    .waitFor();
  const requests = await page.evaluate(() => window.__COLONY_TEST__.requests);
  assert.deepEqual(requests, []);
  await page.close();
});

test("a mismatched imported identity cannot enter the workroom", async () => {
  const page = await tracedPage("mismatched-identity");
  await installMock(page, { importPubkey: "b".repeat(64) });
  await page.goto(url);
  await enterCode(page);
  await page.getByRole("textbox", { name: "6-digit code" }).fill("482913");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("alert")
    .getByText("couldn't save your account")
    .waitFor();
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
  await page.close();
});

test("missing and restarting native hosts remain recoverable", async () => {
  const missing = await tracedPage("missing-host");
  await missing.goto(url);
  await missing
    .getByRole("heading", { name: "Colony host unavailable" })
    .waitFor();
  assert.equal(
    await missing.getByRole("button", { name: "Try again" }).count(),
    1,
  );
  assert.equal(await missing.getByText("Lerato Designs").count(), 0);
  await missing.close();

  const retry = await tracedPage("retry-host");
  await installMock(retry, { hostFailures: 1, initialAccount: true });
  await retry.goto(url);
  await retry
    .getByRole("heading", { name: "Colony host unavailable" })
    .waitFor();
  await retry.getByRole("button", { name: "Try again" }).click();
  await retry.getByRole("heading", { name: "Today" }).waitFor();
  await retry.close();
});

test("new owner creates a company and reopens its signed business profile", async () => {
  const page = await tracedPage("company-create-reopen");
  await installMock(page);
  await page.goto(url);
  await signInNewAccount(page);
  assert.equal(await page.locator("[data-screen-id='O-03']").count(), 1);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  assert.match(
    await page.locator(".titlebar-company").innerText(),
    /Lerato Designs/u,
  );
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  const created = state.requests.find(
    (request) => request.path === "/api/communities",
  );
  const saved = state.requests.find((request) => request.path === "/events");
  assert.match(created.authorization, /^Nostr /u);
  assert.match(saved.authorization, /^Nostr /u);
  assert.equal(JSON.parse(saved.body.content).profile.name, "Lerato Designs");
  assert.deepEqual(JSON.parse(saved.body.content).profile.links, [
    "https://leratodesigns.co.za",
    "@leratodesigns",
  ]);
  assert.equal(JSON.parse(saved.body.content).expectedRevision, null);
  assert.equal(state.profileEvent.pubkey, relaySelf);
  assert.equal(
    state.requests.some((request) => request.path === "/query"),
    true,
  );
  assert.equal(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) =>
        key.startsWith("colony-global-business-draft:"),
      ),
    ),
    false,
  );
  await page.reload();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  assert.match(
    await page.locator(".titlebar-company").innerText(),
    /Lerato Designs/u,
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "Tell Scout about your business" })
      .count(),
    0,
  );
  await page.close();
});

test("unfinished owner answers resume after reopening", async () => {
  const page = await tracedPage("company-draft-reopen");
  await installMock(page);
  await page.goto(url);
  await signInNewAccount(page);
  await page.getByRole("textbox", { name: "Your name" }).fill("Lerato");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Business name" })
    .fill("Lerato Designs");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("3 of 8").waitFor();
  await page.waitForFunction(
    () => window.__COLONY_TEST__.companies.length === 1,
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Tell Scout about your business" })
    .waitFor();
  assert.equal(await page.getByText("3 of 8").count(), 1);
  assert.equal(await page.getByText("Nice. What do you sell?").count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
  await page.close();
});

test("lost create response recovers the same company without duplicating it", async () => {
  const page = await tracedPage("company-create-recovery");
  await installMock(page, {
    createFailures: [{ status: 503, code: "unavailable", afterCommit: true }],
  });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(state.companies.length, 1);
  assert.equal(
    state.requests.filter((request) => request.path === "/api/communities")
      .length,
    1,
  );
  await page.close();
});

test("failed profile write keeps answers and retries without a second company", async () => {
  const page = await tracedPage("company-profile-retry");
  await installMock(page);
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.evaluate(() =>
    window.__COLONY_TEST__.profileSaveFailures.push({
      status: 503,
      code: "unavailable",
    }),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("alert")
    .getByText("couldn't save your business")
    .waitFor();
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
  assert.equal(
    (await page.getByText("Lerato Designs", { exact: true }).count()) > 0,
    true,
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(
    state.requests.filter((request) => request.path === "/api/communities")
      .length,
    1,
  );
  assert.equal(
    state.requests.filter((request) => request.path === "/events").length,
    2,
  );
  await page.close();
});

test("failed membership discovery never opens a fixture company", async () => {
  const page = await tracedPage("company-discovery-retry");
  await installMock(page, {
    initialAccount: true,
    companyFailures: [{ status: 503, code: "unavailable" }],
  });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Your company needs attention" })
    .waitFor();
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.close();
});

test("multiple memberships require a choice and members cannot create a missing profile", async () => {
  const second = {
    ...defaultCompany,
    id: "33333333-3333-4333-8333-333333333333",
    slug: "another-shop",
    normalized_host: "another-shop.colony.example.test",
  };
  const choice = await tracedPage("company-choice");
  await installMock(choice, {
    initialAccount: true,
    companies: [defaultCompany, second],
  });
  await choice.goto(url);
  await choice.getByRole("heading", { name: "Choose a company" }).waitFor();
  await choice.getByRole("button", { name: "Lerato Designs" }).first().click();
  await choice.getByRole("heading", { name: "Today" }).waitFor();
  await choice.close();

  const member = await tracedPage("company-member-permission");
  await installMock(member, {
    initialAccount: true,
    companies: [
      { ...defaultCompany, owner_pubkey: "b".repeat(64), role: "member" },
    ],
    profileEvent: null,
  });
  await member.goto(url);
  await member
    .getByRole("heading", { name: "Your company needs attention" })
    .waitFor();
  assert.equal(
    await member
      .getByRole("heading", { name: "Tell Scout about your business" })
      .count(),
    0,
  );
  await member.close();
});

test("a tampered business profile cannot open the company", async () => {
  const forged = {
    ...profileEvent(defaultProfile),
    content: JSON.stringify({ ...defaultProfile, name: "Fake company" }),
  };
  const page = await tracedPage("company-profile-signature");
  await installMock(page, { initialAccount: true, profileEvent: forged });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Your company needs attention" })
    .waitFor();
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
  assert.equal(await page.getByText("Fake company").count(), 0);
  await page.close();
});
