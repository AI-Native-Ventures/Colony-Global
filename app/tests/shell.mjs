import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { finalizeEvent, getPublicKey, verifyEvent } from "nostr-tools/pure";
import { preview } from "vite";

const url = "http://127.0.0.1:4318/";
let server;
let browser;
const tracedContexts = [];
const relaySecret = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const relaySelf = getPublicKey(relaySecret);
const accountSecret = Uint8Array.from({ length: 32 }, (_, index) => index + 33);
const accountPubkey = getPublicKey(accountSecret);
const scoutSecret = Uint8Array.from({ length: 32 }, (_, index) => index + 65);
const scoutPubkey = getPublicKey(scoutSecret);
const defaultCompany = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "lerato-designs",
  normalized_host: "lerato-designs.colony.example.test",
  owner_pubkey: accountPubkey,
  role: "owner",
};
const sampleChannelId = "33333333-3333-4333-8333-333333333333";

function sampleChannel(name = "Spring launch") {
  return {
    id: sampleChannelId,
    name,
    channel_type: "stream",
    visibility: "private",
    description: "",
    member_count: 1,
    member_pubkeys: [accountPubkey],
    last_message_at: null,
    archived_at: null,
    participants: [],
    participant_pubkeys: [],
    is_member: true,
    ttl_seconds: null,
    ttl_deadline: null,
  };
}

function channelMessage(content, options = {}) {
  return finalizeEvent(
    {
      kind: 9,
      created_at: Math.floor(Date.now() / 1_000) + (options.offset ?? 0),
      tags: [
        ["h", options.channelId ?? sampleChannelId],
        ...(options.rootId
          ? options.parentId && options.parentId !== options.rootId
            ? [
                ["e", options.rootId, "", "root"],
                ["e", options.parentId, "", "reply"],
              ]
            : [["e", options.rootId, "", "reply"]]
          : []),
        ...(options.extraTags ?? []),
      ],
      content,
    },
    accountSecret,
  );
}

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

function scoutMessage(content, channelId = sampleChannelId, rootId = null) {
  return finalizeEvent(
    {
      kind: 9,
      created_at: Math.floor(Date.now() / 1_000),
      tags: [["h", channelId], ...(rootId ? [["e", rootId, "", "reply"]] : [])],
      content,
    },
    scoutSecret,
  );
}

function profileProposalHead(profile, options = {}) {
  const channelId = options.channelId ?? sampleChannelId;
  const askId = options.askId ?? "44444444-4444-4444-8444-444444444444";
  const rootId = options.rootId ?? "a".repeat(64);
  return finalizeEvent(
    {
      kind: 30643,
      created_at: Math.floor(Date.now() / 1_000),
      tags: [
        ["h", channelId],
        ["d", `channel:${channelId}:ask:${askId}`],
        ["e", rootId, "", "root"],
        ["colony:profile-proposal", "1"],
      ],
      content: JSON.stringify({
        schemaVersion: 1,
        askId,
        status: options.status ?? "open",
        askerPubkey: scoutPubkey,
        createdAt: new Date().toISOString(),
        ask: {
          schemaVersion: 1,
          askId,
          type: "approval",
          category: "general",
          title: "Your business profile",
          threadRootEventId: rootId,
          profileProposal: {
            summary: "I added details from your website.",
            profile,
          },
        },
        ...(options.resolution ? { resolution: options.resolution } : {}),
        sourceActionEventId: "b".repeat(64),
      }),
    },
    relaySecret,
  );
}

function personEvent(name, other = {}) {
  return finalizeEvent(
    {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify({ ...other, display_name: name }),
    },
    accountSecret,
  );
}

const defaultProfile = {
  schemaVersion: 1,
  name: "Lerato Designs",
  timeZone: "Africa/Johannesburg",
  whatYouSell: "Clothing and fashion",
};
const creditPacks = [5, 15, 50, 120].map((amount) => ({
  id: `usd-${amount}`,
  chargeMinorUnits: amount * 100,
  chargeCurrency: "USD",
  grantUsdCents: amount * 100,
}));

async function tracedPage(name, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  await context.tracing.start({ screenshots: true, snapshots: true });
  tracedContexts.push({ context, name });
  return context.newPage();
}

async function installMock(page, options = {}) {
  await page.exposeFunction("__COLONY_SIGN_PROFILE__", (profile, revision) =>
    profileEvent(profile, revision),
  );
  await page.exposeFunction("__COLONY_SIGN_PROPOSAL__", (profile, options) =>
    profileProposalHead(profile, options),
  );
  await page.exposeFunction("__COLONY_SIGN_EVENT__", (event) =>
    finalizeEvent(
      {
        kind: event.kind,
        created_at: Math.floor(Date.now() / 1000),
        tags: event.tags,
        content: event.content,
      },
      accountSecret,
    ),
  );
  await page.exposeFunction("__COLONY_SIGN_CHANNEL_MESSAGE__", (input) =>
    channelMessage(input.content, {
      channelId: input.channelId,
      rootId: input.rootId,
      offset: input.offset,
    }),
  );
  await page.addInitScript(
    (settings) => {
      const key = settings.accountPubkey;
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
        activeRelay: persisted?.activeRelay ?? "ws://127.0.0.1:3000",
        workspaceFailures: persisted?.workspaceFailures ?? [
          ...settings.workspaceFailures,
        ],
        channels: persisted?.channels ?? structuredClone(settings.channels),
        events: persisted?.events ?? structuredClone(settings.events),
        members: persisted?.members ?? structuredClone(settings.members),
        agents: persisted?.agents ?? [],
        agentConfig: persisted?.agentConfig ?? {
          env_vars: {},
          provider: null,
          model: null,
          preferred_runtime: null,
        },
        kickoffFailures: persisted?.kickoffFailures ?? [
          ...settings.kickoffFailures,
        ],
        sendFailures: [...settings.sendFailures],
        scopeSwitchOnRead: settings.scopeSwitchOnRead,
        nextMessageOffset: persisted?.nextMessageOffset ?? 1,
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
        askHeads: persisted?.askHeads ?? structuredClone(settings.askHeads),
        personEvent: persisted?.personEvent ?? settings.personEvent,
        creditBalanceCents:
          persisted?.creditBalanceCents ?? settings.creditBalanceCents,
        creditIntents: persisted?.creditIntents ?? settings.creditIntents,
        openedUrls: [],
        copiedLinks: [],
        openFailure: settings.openFailure,
        checkoutFailures: persisted?.checkoutFailures ?? [
          ...settings.checkoutFailures,
        ],
        companyFailures: [...settings.companyFailures],
        profileSaveFailures: [...settings.profileSaveFailures],
        askResponseFailures: persisted?.askResponseFailures ?? [
          ...settings.askResponseFailures,
        ],
        personSaveFailures: [...settings.personSaveFailures],
        createFailures: [...settings.createFailures],
        profileQueryFailures: [...settings.profileQueryFailures],
        personQueryFailures: [...settings.personQueryFailures],
      };
      const persistCompany = () =>
        sessionStorage.setItem(
          "__mock_relay_company",
          JSON.stringify({
            account: state.account,
            activeRelay: state.activeRelay,
            workspaceFailures: state.workspaceFailures,
            channels: state.channels,
            events: state.events,
            members: state.members,
            agents: state.agents,
            agentConfig: state.agentConfig,
            kickoffFailures: state.kickoffFailures,
            nextMessageOffset: state.nextMessageOffset,
            companies: state.companies,
            profileEvent: state.profileEvent,
            askHeads: state.askHeads,
            askResponseFailures: state.askResponseFailures,
            personEvent: state.personEvent,
            creditBalanceCents: state.creditBalanceCents,
            creditIntents: state.creditIntents,
            checkoutFailures: state.checkoutFailures,
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
            case "get_default_relay_http_url":
              return settings.httpUrl;
            case "get_relay_ws_url":
              return state.activeRelay;
            case "get_relay_http_url":
              return settings.httpUrl;
            case "apply_workspace": {
              const failure = state.workspaceFailures.shift();
              if (failure) throw new Error(failure);
              state.activeRelay = payload.args.relayUrl;
              persistCompany();
              return null;
            }
            case "get_active_workspace":
              return { relay_url: state.activeRelay, pubkey: key };
            case "get_channels":
              if (state.scopeSwitchOnRead === "get_channels")
                state.activeRelay = "wss://another-shop.colony.example.test";
              return {
                hash: "mock",
                channels: state.channels,
                last_messages: {},
              };
            case "get_channel_members":
              return { members: state.members, next_cursor: null };
            case "get_global_agent_config":
              return state.agentConfig;
            case "set_global_agent_config":
              state.agentConfig = payload.args.config;
              persistCompany();
              return {
                config: state.agentConfig,
                restarted_count: 0,
                failed_restart_count: 0,
              };
            case "list_personas":
              return [
                {
                  id: "builtin:fizz",
                  system_prompt:
                    "Use colony profile propose for a complete profile.",
                  is_active: true,
                },
              ];
            case "list_managed_agents":
              return state.agents;
            case "create_managed_agent": {
              if (
                payload.args.input.expectedRelayUrl !== state.activeRelay ||
                payload.args.input.expectedSignerPubkey !== key
              )
                throw new Error("active community changed");
              const existing = state.agents.find(
                (agent) =>
                  agent.relay_url === payload.args.input.relayUrl &&
                  agent.persona_id === "builtin:fizz" &&
                  agent.name === "Scout",
              );
              if (existing) throw new Error("company Scout already exists");
              const agent = {
                pubkey: settings.scoutPubkey,
                name: "Scout",
                persona_id: "builtin:fizz",
                relay_url: payload.args.input.relayUrl,
                status: "stopped",
              };
              state.agents.push(agent);
              persistCompany();
              return {
                agent,
                private_key_nsec: "test-only",
                profile_sync_error: null,
                spawn_error: null,
              };
            }
            case "start_managed_agent": {
              if (
                payload.args.expectedRelayUrl !== state.activeRelay ||
                payload.args.expectedSignerPubkey !== key
              )
                throw new Error("active community changed");
              const agent = state.agents.find(
                (item) => item.pubkey === payload.args.pubkey,
              );
              if (!agent) throw new Error("missing agent");
              agent.status = "running";
              persistCompany();
              return agent;
            }
            case "add_channel_members": {
              if (
                payload.args.expectedRelayUrl !== state.activeRelay ||
                payload.args.expectedSignerPubkey !== key
              )
                throw new Error("active community changed");
              for (const pubkey of payload.args.pubkeys) {
                if (!state.members.some((member) => member.pubkey === pubkey))
                  state.members.push({
                    pubkey,
                    role: "bot",
                    is_agent: true,
                    display_name: "Scout",
                  });
              }
              persistCompany();
              return { added: payload.args.pubkeys, errors: [] };
            }
            case "get_channel_window":
              return state.events.filter(
                (event) =>
                  event.tags.some(
                    (tag) =>
                      tag[0] === "h" && tag[1] === payload.args.channelId,
                  ) &&
                  !event.tags.some(
                    (tag) => tag[0] === "e" && tag[3] === "root",
                  ),
              );
            case "get_thread_replies":
              return {
                events: state.events.filter(
                  (event) =>
                    event.tags.some(
                      (tag) =>
                        tag[0] === "h" && tag[1] === payload.args.channelId,
                    ) &&
                    event.tags.some(
                      (tag) =>
                        tag[0] === "e" &&
                        tag[1] === payload.args.rootEventId &&
                        ["root", "reply"].includes(tag[3]),
                    ),
                ),
                next_cursor: null,
              };
            case "send_channel_message": {
              if (
                payload.args.expectedRelayUrl !== state.activeRelay ||
                payload.args.expectedSignerPubkey !== key
              )
                throw new Error("active community changed");
              if (payload.args.setupFirstTurn) {
                const existing = state.events.find((event) =>
                  event.tags.some(
                    (tag) =>
                      tag[0] === "client" &&
                      tag[1] === payload.args.setupMarker,
                  ),
                );
                if (existing)
                  return {
                    event_id: existing.id,
                    created_at: existing.created_at,
                  };
                const event = await window.__COLONY_SIGN_EVENT__({
                  kind: 9,
                  content: payload.args.content,
                  tags: [
                    ["h", payload.args.channelId],
                    ["p", payload.args.mentionPubkeys[0]],
                    ["colony:setup", "first-turn"],
                    ["client", payload.args.setupMarker],
                  ],
                });
                state.events.push(event);
                const failure = state.kickoffFailures.shift();
                persistCompany();
                if (failure) throw new Error("Kickoff response lost");
                return { event_id: event.id, created_at: event.created_at };
              }
              const failure = state.sendFailures.shift();
              if (failure) throw new Error(failure);
              const event = await window.__COLONY_SIGN_CHANNEL_MESSAGE__({
                channelId: payload.args.channelId,
                content: payload.args.content,
                rootId: payload.args.rootEventId,
                offset: state.nextMessageOffset++,
              });
              state.events.push(event);
              persistCompany();
              return {
                event_id: event.id,
                parent_event_id: payload.args.parentEventId,
                root_event_id: payload.args.rootEventId,
                depth: payload.args.rootEventId ? 1 : 0,
                created_at: event.created_at,
              };
            }
            case "create_channel": {
              if (
                payload.args.expectedRelayUrl !== state.activeRelay ||
                payload.args.expectedSignerPubkey !== key
              )
                throw new Error("active community changed");
              const existing = state.channels.find(
                (channel) => channel.id === payload.args.requestedChannelId,
              );
              if (existing) return existing;
              const channel = {
                ...settings.sampleChannel,
                id: payload.args.requestedChannelId ?? crypto.randomUUID(),
                name: payload.args.name,
              };
              state.channels.push(channel);
              persistCompany();
              return channel;
            }
            case "colony_credits_gateway_enabled":
              return settings.creditsEnabled;
            case "plugin:opener|open_url":
              if (state.openFailure) throw new Error("Browser unavailable");
              state.openedUrls.push(payload.args.url);
              return null;
            case "copy_text_to_clipboard":
              state.copiedLinks.push(payload.args.text);
              return null;
            case "get_identity":
              return {
                pubkey: key,
                lost: false,
                locked: false,
                reset_failed: false,
              };
            case "sign_event":
              return JSON.stringify(
                await window.__COLONY_SIGN_EVENT__(payload.args),
              );
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
        if (path === "/api/credits-gateway/capabilities") {
          if (settings.creditCapabilityMissing)
            return new Response("Not found", { status: 404 });
          return json(settings.creditCapability);
        }
        if (path === "/api/payments/packs") {
          return json(settings.creditCatalog);
        }
        if (path === "/api/payments/history") {
          return json({ paymentIntents: state.creditIntents });
        }
        if (path === "/api/payments/balance") {
          return json({ balanceUsdCents: state.creditBalanceCents });
        }
        if (path === "/api/payments/checkout") {
          const failure = state.checkoutFailures.shift();
          if (failure && !failure.afterCommit)
            return json({ error: failure.code }, failure.status);
          let intent = state.creditIntents.find(
            (item) => item.idempotencyKey === body.idempotencyKey,
          );
          if (!intent) {
            intent = {
              reference: "credit-55555555-5555-4555-8555-555555555555",
              idempotencyKey: body.idempotencyKey,
              packId: body.packId,
              status: "pending",
              createdAt: new Date().toISOString(),
            };
            state.creditIntents.unshift(intent);
          }
          persistCompany();
          if (failure)
            return json(
              { error: failure.code, reference: intent.reference },
              failure.status,
            );
          const pack = settings.creditCatalog.packs.find(
            (item) => item.id === intent.packId,
          );
          return json({
            reference: intent.reference,
            idempotencyKey: intent.idempotencyKey,
            status: intent.status,
            provider: "stripe",
            currency: "USD",
            amountMinorUnits:
              settings.checkoutAmountMinorUnits ?? pack.chargeMinorUnits,
            grantUsdCents: pack.grantUsdCents,
            authorizationMethod: "GET",
            authorizationUrl: settings.checkoutUrl,
          });
        }
        if (path.startsWith("/api/payments/intents/")) {
          const reference = path.split("/").at(-1);
          const intent = state.creditIntents.find(
            (item) => item.reference === reference,
          );
          return intent
            ? json(intent)
            : json({ error: "unknown_reference" }, 404);
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
          if (body?.[0]?.kinds?.includes(30643)) return json(state.askHeads);
          if (body?.[0]?.kinds?.includes(0)) {
            const next = state.personQueryFailures.shift();
            if (next) return json({ error: next.code }, next.status);
            return json(state.personEvent ? [state.personEvent] : []);
          }
          const index = state.profileQueryFailures.findIndex((failure) =>
            target.includes(failure.host),
          );
          if (index >= 0) {
            const [failure] = state.profileQueryFailures.splice(index, 1);
            return json({ error: failure.code }, failure.status);
          }
          return json(state.profileEvent ? [state.profileEvent] : []);
        }
        if (path === "/events") {
          if (body.kind === 47033) {
            const answer = JSON.parse(body.content);
            const current = state.askHeads.find((head) =>
              head.tags.some(
                (tag) =>
                  tag[0] === "d" &&
                  tag[1] ===
                    `channel:${body.tags.find((tag) => tag[0] === "h")?.[1]}:ask:${answer.askId}`,
              ),
            );
            if (!current || current.id !== answer.expectedHeadEventId)
              return json({ error: "stale_head" }, 409);
            const next = state.askResponseFailures.shift();
            persistCompany();
            if (next && !next.afterCommit)
              return json({ error: next.code }, next.status);
            const old = JSON.parse(current.content);
            const resolved = await window.__COLONY_SIGN_PROPOSAL__(
              old.ask.profileProposal.profile,
              {
                channelId: body.tags.find((tag) => tag[0] === "h")?.[1],
                askId: answer.askId,
                rootId: old.ask.threadRootEventId,
                status: "resolved",
                resolution: {
                  outcome: answer.outcome,
                  reason: answer.reason,
                  resolvedByPubkey: key,
                  resolvedAt: new Date().toISOString(),
                  responseEventId: body.id,
                },
              },
            );
            state.askHeads = [resolved];
            persistCompany();
            if (next) return json({ error: next.code }, next.status);
            return json({ event_id: body.id, accepted: true, message: "" });
          }
          if (body.kind === 0) {
            const next = state.personSaveFailures.shift();
            if (next && !next.afterCommit)
              return json({ error: next.code }, next.status);
            state.personEvent = body;
            persistCompany();
            if (next) return json({ error: next.code }, next.status);
            return json({ event_id: body.id, accepted: true, message: "" });
          }
          const next = state.profileSaveFailures.shift();
          if (next) return json({ error: next.code }, next.status);
          const action = JSON.parse(body.content);
          const canonicalProfile = { ...action.profile };
          if (canonicalProfile.bestSellers?.length === 0)
            delete canonicalProfile.bestSellers;
          if (canonicalProfile.priceRange == null)
            delete canonicalProfile.priceRange;
          if (canonicalProfile.website == null) delete canonicalProfile.website;
          state.profileEvent = await window.__COLONY_SIGN_PROFILE__(
            action.expectedRevision == null
              ? {
                  ...canonicalProfile,
                  bestSellers: [],
                  voiceWords: [],
                  contact: {},
                  invoice: {},
                  socialAccounts: {},
                }
              : canonicalProfile,
            (action.expectedRevision ?? 0) + 1,
          );
          persistCompany();
          return json({
            event_id: body.id,
            accepted: true,
            message: `response:{"revision":${(action.expectedRevision ?? 0) + 1}}`,
          });
        }
        throw new Error(`Unexpected relay path ${path}`);
      };
    },
    {
      initialAccount: options.initialAccount ?? false,
      accountPubkey,
      policy: options.policy ?? null,
      hostFailures: options.hostFailures ?? 0,
      policyFailures: options.policyFailures ?? 0,
      startFailures: options.startFailures ?? [],
      verifyFailures: options.verifyFailures ?? [],
      networkFailure: options.networkFailure ?? false,
      existingEmail: options.existingEmail ?? false,
      httpUrl: options.httpUrl ?? "http://127.0.0.1:3000",
      creditsEnabled: options.creditsEnabled ?? false,
      creditCapability: options.creditCapability ?? {
        enabled: true,
        runtime: "colony",
        model: "server-selected",
      },
      creditCapabilityMissing: options.creditCapabilityMissing ?? false,
      creditCatalog: options.creditCatalog ?? {
        enabled: true,
        provider: "stripe",
        packs: creditPacks,
        policyUrls: {
          terms: "https://colony.global/terms.html",
          acceptableUse: "https://colony.global/acceptable-use.html",
        },
      },
      creditBalanceCents: options.creditBalanceCents ?? 0,
      creditIntents: options.creditIntents ?? [],
      checkoutUrl:
        options.checkoutUrl ??
        "https://checkout.stripe.com/c/pay/cs_test_colony",
      checkoutAmountMinorUnits: options.checkoutAmountMinorUnits,
      checkoutFailures: options.checkoutFailures ?? [],
      openFailure: options.openFailure ?? false,
      importPubkey: options.importPubkey ?? accountPubkey,
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
      personEvent: options.personEvent ?? null,
      relaySelf,
      workspaceFailures: options.workspaceFailures ?? [],
      channels: options.channels ?? [],
      events: options.events ?? [],
      members: options.members ?? [
        {
          pubkey: accountPubkey,
          role: "member",
          is_agent: false,
          display_name: "Lerato",
        },
      ],
      sendFailures: options.sendFailures ?? [],
      kickoffFailures: options.kickoffFailures ?? [],
      scoutPubkey,
      scopeSwitchOnRead: options.scopeSwitchOnRead,
      sampleChannel: sampleChannel(),
      companyFailures: options.companyFailures ?? [],
      profileSaveFailures: options.profileSaveFailures ?? [],
      askHeads: options.askHeads ?? [],
      askResponseFailures: options.askResponseFailures ?? [],
      personSaveFailures: options.personSaveFailures ?? [],
      createFailures: options.createFailures ?? [],
      profileQueryFailures: options.profileQueryFailures ?? [],
      personQueryFailures: options.personQueryFailures ?? [],
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
  await page.getByRole("heading", { name: "Conversations." }).waitFor();
  await page.getByRole("heading", { name: "No conversations yet" }).waitFor();
  await page.setViewportSize({ width: 1024, height: 700 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= 1024),
    true,
  );
  await page.close();
});

test("owner reviews signed Scout proposal, edits a field, then confirms the saved profile", async () => {
  const page = await tracedPage("scout-profile-review");
  const proposed = {
    ...defaultProfile,
    whatYouSell: "Linen clothing made in Johannesburg",
    whoBuys: "People who like local clothing",
    bestSellers: ["Linen dress"],
    voiceWords: ["warm", "local"],
    contact: {},
    invoice: {},
    socialAccounts: {},
  };
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel("Getting started")],
    members: [
      {
        pubkey: accountPubkey,
        role: "member",
        is_agent: false,
        display_name: "Lerato",
      },
      {
        pubkey: scoutPubkey,
        role: "bot",
        is_agent: true,
        display_name: "Scout",
      },
    ],
    events: [
      scoutMessage(
        "I have read your business profile. I'm checking the links you shared.",
      ),
    ],
    askHeads: [profileProposalHead(proposed)],
  });
  await page.goto(url);
  const card = page.getByRole("region", {
    name: "Business profile for review",
  });
  await card.waitFor();
  if (process.env.COLONY_SCOUT_REVIEW_SHOT)
    await page.screenshot({ path: process.env.COLONY_SCOUT_REVIEW_SHOT });
  await page
    .getByText("I have read your business profile.", { exact: false })
    .waitFor();
  await card
    .getByRole("textbox", { name: "Who buys" })
    .fill("Local shoppers and boutiques");
  await card.getByRole("button", { name: "Looks right" }).click();
  await page.getByText("Your business profile is confirmed.").waitFor();
  const result = await page.evaluate(() => ({
    writes: window.__COLONY_TEST__.requests.filter(
      (request) => request.path === "/events",
    ),
    current: JSON.parse(window.__COLONY_TEST__.profileEvent.content),
    ask: JSON.parse(window.__COLONY_TEST__.askHeads[0].content),
  }));
  assert.deepEqual(
    result.writes.map((write) => write.body.kind),
    [47046, 47033],
  );
  assert.equal(JSON.parse(result.writes[0].body.content).expectedRevision, 1);
  assert.equal(result.current.whoBuys, "Local shoppers and boutiques");
  assert.equal(result.ask.status, "resolved");
  assert.equal(result.ask.resolution.outcome, "approved");
  await page.close();
});

test("clearing Scout's best sellers can be confirmed when the relay omits the empty list", async () => {
  const page = await tracedPage("scout-clear-best-sellers");
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel("Getting started")],
    members: [
      {
        pubkey: accountPubkey,
        role: "member",
        is_agent: false,
        display_name: "Lerato",
      },
      {
        pubkey: scoutPubkey,
        role: "bot",
        is_agent: true,
        display_name: "Scout",
      },
    ],
    events: [scoutMessage("I have a draft profile for you.")],
    askHeads: [
      profileProposalHead({
        ...defaultProfile,
        bestSellers: ["Linen dress"],
        voiceWords: [],
        contact: {},
        invoice: {},
        socialAccounts: {},
      }),
    ],
  });
  await page.goto(url);
  const card = page.getByRole("region", {
    name: "Business profile for review",
  });
  await card.waitFor();
  await card.getByRole("textbox", { name: "Best sellers" }).fill("");
  await card.getByRole("button", { name: "Looks right" }).click();
  await page.getByText("Your business profile is confirmed.").waitFor();
  const saved = await page.evaluate(() =>
    JSON.parse(window.__COLONY_TEST__.profileEvent.content),
  );
  assert.equal(Object.hasOwn(saved, "bestSellers"), false);
  await page.close();
});

test("Scout confirmation refuses to overwrite a profile changed by another owner action", async () => {
  const page = await tracedPage("scout-concurrent-profile-change");
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel("Getting started")],
    members: [
      {
        pubkey: accountPubkey,
        role: "member",
        is_agent: false,
        display_name: "Lerato",
      },
      {
        pubkey: scoutPubkey,
        role: "bot",
        is_agent: true,
        display_name: "Scout",
      },
    ],
    events: [scoutMessage("Please review this profile.")],
    askHeads: [
      profileProposalHead({
        ...defaultProfile,
        bestSellers: [],
        voiceWords: [],
        contact: {},
        invoice: {},
        socialAccounts: {},
      }),
    ],
  });
  await page.goto(url);
  const card = page.getByRole("region", {
    name: "Business profile for review",
  });
  await card.waitFor();
  await page.evaluate(async () => {
    window.__COLONY_TEST__.profileEvent = await window.__COLONY_SIGN_PROFILE__(
      {
        ...JSON.parse(window.__COLONY_TEST__.profileEvent.content),
        whatYouSell: "A newly updated product range",
      },
      2,
    );
  });
  await card.getByRole("button", { name: "Looks right" }).click();
  await page
    .getByText("Colony couldn't finish confirming this profile.", {
      exact: false,
    })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        window.__COLONY_TEST__.requests.filter(
          (request) => request.path === "/events",
        ).length,
    ),
    0,
  );
  await page.close();
});

test("Today shows Scout's signed reply from the first-turn thread", async () => {
  const page = await tracedPage("scout-first-thread-reply");
  const kickoff = channelMessage("Please get to know the business.", {
    extraTags: [
      ["p", scoutPubkey],
      ["colony:setup", "first-turn"],
      ["client", `colony-global-scout-first-turn:${defaultCompany.id}`],
    ],
  });
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel("Getting started")],
    members: [
      {
        pubkey: accountPubkey,
        role: "member",
        is_agent: false,
        display_name: "Lerato",
      },
      {
        pubkey: scoutPubkey,
        role: "bot",
        is_agent: true,
        display_name: "Scout",
      },
    ],
    events: [
      kickoff,
      scoutMessage(
        "I am reading your business links now.",
        sampleChannelId,
        kickoff.id,
      ),
    ],
  });
  await page.goto(url);
  await page.getByText("I am reading your business links now.").waitFor();
  assert.equal(
    await page.getByText("Waiting for Scout's first reply.").count(),
    0,
  );
  await page.close();
});

test("Change something opens the proposal discussion in a side thread", async () => {
  const page = await tracedPage("scout-proposal-thread");
  const kickoff = channelMessage("Please get to know the business.");
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel("Getting started")],
    members: [
      {
        pubkey: accountPubkey,
        role: "member",
        is_agent: false,
        display_name: "Lerato",
      },
      {
        pubkey: scoutPubkey,
        role: "bot",
        is_agent: true,
        display_name: "Scout",
      },
    ],
    events: [kickoff, scoutMessage("I have read the business profile.")],
    askHeads: [
      profileProposalHead(
        {
          ...defaultProfile,
          bestSellers: [],
          voiceWords: [],
          contact: {},
          invoice: {},
          socialAccounts: {},
        },
        { rootId: kickoff.id },
      ),
    ],
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Change something" }).click();
  await page.getByRole("heading", { name: "Getting started" }).waitFor();
  await page.getByRole("complementary", { name: "Message thread" }).waitFor();
  await page
    .getByRole("complementary", { name: "Message thread" })
    .getByText("Please get to know the business.")
    .waitFor();
  const result = await page.evaluate(() => ({
    writes: window.__COLONY_TEST__.requests.filter(
      (request) => request.path === "/events",
    ),
    ask: JSON.parse(window.__COLONY_TEST__.askHeads[0].content),
  }));
  assert.deepEqual(
    result.writes.map((write) => write.body.kind),
    [47033],
  );
  assert.equal(result.ask.resolution.outcome, "rejected");
  await page.close();
});

test("interrupted Scout confirmation recovers the edited profile without a second profile write", async () => {
  const page = await tracedPage("scout-profile-recovery");
  const proposed = {
    ...defaultProfile,
    whoBuys: "Local shoppers",
    bestSellers: [],
    voiceWords: [],
    contact: {},
    invoice: {},
    socialAccounts: {},
  };
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel("Getting started")],
    members: [
      {
        pubkey: accountPubkey,
        role: "member",
        is_agent: false,
        display_name: "Lerato",
      },
      {
        pubkey: scoutPubkey,
        role: "bot",
        is_agent: true,
        display_name: "Scout",
      },
    ],
    events: [scoutMessage("I have read your business profile.")],
    askHeads: [profileProposalHead(proposed)],
    askResponseFailures: [{ code: "temporarily_unavailable", status: 503 }],
  });
  await page.goto(url);
  const card = page.getByRole("region", {
    name: "Business profile for review",
  });
  await card.waitFor();
  await card
    .getByRole("textbox", { name: "Who buys" })
    .fill("Boutiques and local shoppers");
  await card.getByRole("button", { name: "Looks right" }).click();
  await page
    .getByText("Colony couldn't finish confirming this profile.", {
      exact: false,
    })
    .waitFor();
  const first = await page.evaluate(() => ({
    profile: JSON.parse(window.__COLONY_TEST__.profileEvent.content),
    ask: JSON.parse(window.__COLONY_TEST__.askHeads[0].content),
  }));
  assert.equal(first.profile.whoBuys, "Boutiques and local shoppers");
  assert.equal(first.ask.status, "open");

  await page.reload();
  await card.waitFor();
  await page
    .getByText("Your edits were recovered.", { exact: false })
    .waitFor();
  assert.equal(
    await card.getByRole("textbox", { name: "Who buys" }).inputValue(),
    "Boutiques and local shoppers",
  );
  await card.getByRole("button", { name: "Finish confirmation" }).click();
  await page.getByText("Your business profile is confirmed.").waitFor();
  const result = await page.evaluate(() => ({
    writes: window.__COLONY_TEST__.requests.filter(
      (request) => request.path === "/events",
    ),
    ask: JSON.parse(window.__COLONY_TEST__.askHeads[0].content),
  }));
  assert.deepEqual(
    result.writes.map((write) => write.body.kind),
    [47033],
  );
  assert.equal(result.ask.status, "resolved");
  await page.close();
});

test("funded owner starts one real Scout kickoff and a lost reply cannot duplicate it", async () => {
  const page = await tracedPage("scout-first-turn-startup");
  await installMock(page, {
    initialAccount: true,
    creditsEnabled: true,
    creditBalanceCents: 5000,
    kickoffFailures: [{ afterCommit: true }],
  });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Scout has not started here yet" })
    .waitFor();
  await page
    .getByRole("button", { name: "Start Scout with Colony credits" })
    .click();
  await page.getByText("Scout couldn't start.", { exact: false }).waitFor();
  await page
    .getByRole("button", { name: "Start Scout with Colony credits" })
    .click();
  await page.getByText("Waiting for Scout's first reply.").waitFor();
  const first = await page.evaluate(() => ({
    agents: window.__COLONY_TEST__.agents,
    channels: window.__COLONY_TEST__.channels,
    setup: window.__COLONY_TEST__.events.filter((event) =>
      event.tags.some(
        (tag) => tag[0] === "colony:setup" && tag[1] === "first-turn",
      ),
    ),
    config: window.__COLONY_TEST__.agentConfig,
  }));
  assert.equal(first.agents.length, 1);
  assert.equal(first.agents[0].status, "running");
  assert.equal(first.channels.length, 1);
  assert.equal(first.setup.length, 1);
  assert.equal(first.setup[0].pubkey, accountPubkey);
  assert.ok(
    first.setup[0].tags.some((tag) => tag[0] === "p" && tag[1] === scoutPubkey),
  );
  assert.equal(first.config.provider, "colony-credits");
  assert.equal(
    await page.getByText("I have read your business profile.").count(),
    0,
  );
  await page.reload();
  await page.getByText("Waiting for Scout's first reply.").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Start Scout with Colony credits" })
      .count(),
    0,
  );
  await page.close();
});

test("Scout startup refuses unfunded credits before creating an agent or channel", async () => {
  const page = await tracedPage("scout-first-turn-no-funds");
  await installMock(page, { initialAccount: true, creditsEnabled: true });
  await page.goto(url);
  await page
    .getByRole("button", { name: "Start Scout with Colony credits" })
    .click();
  await page
    .getByText("Scout needs available Colony credits", { exact: false })
    .waitFor();
  const result = await page.evaluate(() => ({
    agents: window.__COLONY_TEST__.agents.length,
    channels: window.__COLONY_TEST__.channels.length,
    config: window.__COLONY_TEST__.agentConfig.provider,
  }));
  assert.deepEqual(result, { agents: 0, channels: 0, config: null });
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
  await page.getByRole("heading", { name: "Welcome and sign in" }).waitFor();
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
  await page.getByText("Connect to the internet to sign in.").waitFor({
    state: "hidden",
  });
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
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
  assert.match(
    await page.locator(".titlebar-company").innerText(),
    /Lerato Designs/u,
  );
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  const created = state.requests.find(
    (request) => request.path === "/api/communities",
  );
  const saved = state.requests.find(
    (request) => request.path === "/events" && request.body.kind === 47046,
  );
  const person = state.requests.find(
    (request) => request.path === "/events" && request.body.kind === 0,
  );
  assert.match(created.authorization, /^Nostr /u);
  assert.match(saved.authorization, /^Nostr /u);
  assert.match(person.authorization, /^Nostr /u);
  assert.equal(JSON.parse(person.body.content).display_name, "Lerato");
  assert.equal(state.personEvent.pubkey, accountPubkey);
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
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
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

test("a new owner reaches the real power choice after saving the business", async () => {
  const page = await tracedPage("power-choice-after-business");
  await installMock(page);
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
  assert.equal(await page.locator("[data-screen-id='O-04']").count(), 1);
  assert.equal(await page.locator("[data-ant-portrait='Scout']").count(), 1);
  assert.match(
    await page.locator("main").innerText(),
    /Choose how to power it/u,
  );
  assert.equal(
    await page.getByRole("radio", { name: /Colony credits/u }).isDisabled(),
    true,
  );
  assert.equal(
    await page.evaluate(() =>
      window.__COLONY_TEST__.requests.some(
        (r) => r.path === "/api/payments/balance",
      ),
    ),
    false,
  );
  await page.close();
});

test("credits stay unavailable without relay capability or secure customer terms", async () => {
  for (const [name, options] of [
    ["relay-missing", { creditCapabilityMissing: true }],
    [
      "relay-off",
      {
        creditCapability: { enabled: false, runtime: "colony", model: "ready" },
      },
    ],
    [
      "terms-insecure",
      {
        creditCatalog: {
          enabled: true,
          provider: "stripe",
          packs: creditPacks,
          policyUrls: {
            terms: "http://colony.global/terms.html",
            acceptableUse: "https://colony.global/acceptable-use.html",
          },
        },
      },
    ],
  ]) {
    const page = await tracedPage(`credits-gate-${name}`);
    await installMock(page, { creditsEnabled: true, ...options });
    await page.goto(url);
    await signInNewAccount(page);
    await completeBusiness(page);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("heading", { name: "Power your team" }).waitFor();
    assert.equal(
      await page.getByRole("radio", { name: /Colony credits/u }).isDisabled(),
      true,
    );
    assert.equal(
      await page.evaluate(() =>
        window.__COLONY_TEST__.requests.some(
          (request) => request.path === "/api/payments/balance",
        ),
      ),
      false,
    );
    if (name === "relay-missing")
      assert.equal(await page.getByRole("alert").count(), 0);
    await page.close();
  }
});

test("power and checkout work by keyboard at the compact desktop size", async () => {
  const page = await tracedPage("credits-compact-keyboard", {
    width: 1024,
    height: 700,
  });
  await installMock(page, { creditsEnabled: true });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "Continue to credits" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Choose your credits" }).waitFor();
  const pack = page.getByRole("radio", { name: /\$15\.00/u });
  await pack.focus();
  await page.keyboard.press("Space");
  assert.equal(await pack.isChecked(), true);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "Pay in browser" }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByText("Finish paying in your browser", { exact: false })
    .waitFor();
  assert.equal(
    await page.evaluate(() => window.__COLONY_TEST__.creditIntents[0].packId),
    "usd-15",
  );
  await page.close();
});

test("configured credits show server-priced packs and open one signed Stripe checkout", async () => {
  const page = await tracedPage("credits-checkout");
  await installMock(page, { creditsEnabled: true });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue to credits" }).click();
  await page.getByRole("heading", { name: "Choose your credits" }).waitFor();
  assert.equal(await page.getByRole("radio", { name: /\$5\.00/u }).count(), 1);
  assert.equal(
    await page.getByRole("radio", { name: /\$120\.00/u }).count(),
    1,
  );
  await page.getByRole("radio", { name: /\$15\.00/u }).check();
  await page
    .getByRole("button", { name: "Pay in browser" })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await page
    .getByText("Finish paying in your browser", { exact: false })
    .waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  const checkout = state.requests.find(
    (request) => request.path === "/api/payments/checkout",
  );
  assert.equal(checkout.body.packId, "usd-15");
  assert.match(checkout.body.idempotencyKey, /^[0-9a-f-]{36}$/iu);
  assert.match(checkout.authorization, /^Nostr /u);
  assert.equal(
    verifyEvent(
      JSON.parse(
        Buffer.from(checkout.authorization.slice(6), "base64").toString(),
      ),
    ),
    true,
  );
  assert.deepEqual(state.openedUrls, [
    "https://checkout.stripe.com/c/pay/cs_test_colony",
  ]);
  assert.equal(state.creditIntents.length, 1);
  assert.equal(
    state.requests.filter(
      (request) => request.path === "/api/payments/checkout",
    ).length,
    1,
  );
  await page.close();
});

test("pending payment resumes after restart and reuses its checkout key", async () => {
  const page = await tracedPage("credits-resume");
  await installMock(page, { creditsEnabled: true, openFailure: true });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue to credits" }).click();
  await page.getByRole("button", { name: "Pay in browser" }).click();
  await page.getByRole("alert").getByText("didn't open").waitFor();
  await page.getByRole("button", { name: "Copy the payment link" }).click();
  assert.equal(
    (await page.evaluate(() => window.__COLONY_TEST__.copiedLinks)).length,
    1,
  );
  await page.evaluate(() => {
    window.__COLONY_TEST__.openFailure = false;
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Open the payment page again" })
    .waitFor();
  await page.evaluate(() => {
    window.__COLONY_TEST__.openFailure = false;
  });
  await page
    .getByRole("button", { name: "Open the payment page again" })
    .click();
  await page.waitForFunction(
    () => window.__COLONY_TEST__.openedUrls.length === 1,
  );
  const calls = await page.evaluate(() =>
    window.__COLONY_TEST__.requests.filter(
      (request) => request.path === "/api/payments/checkout",
    ),
  );
  assert.equal(calls.length, 1);
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(
    calls[0].body.idempotencyKey,
    state.creditIntents[0].idempotencyKey,
  );
  await page.close();
});

test("a lost checkout response recovers the committed intent without a new key", async () => {
  const page = await tracedPage("credits-lost-response");
  await installMock(page, {
    creditsEnabled: true,
    checkoutFailures: [
      { status: 503, code: "payment_unavailable", afterCommit: true },
    ],
  });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue to credits" }).click();
  await page.getByRole("radio", { name: /\$15\.00/u }).check();
  await page.getByRole("button", { name: "Pay in browser" }).click();
  await page
    .getByRole("button", { name: "Open the payment page again" })
    .waitFor();
  const original = await page.evaluate(
    () => window.__COLONY_TEST__.creditIntents[0],
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Open the payment page again" })
    .click();
  await page.waitForFunction(
    () => window.__COLONY_TEST__.openedUrls.length === 1,
  );
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  const retry = state.requests.filter(
    (request) => request.path === "/api/payments/checkout",
  );
  assert.equal(retry.length, 1);
  assert.equal(retry[0].body.idempotencyKey, original.idempotencyKey);
  assert.equal(retry[0].body.packId, "usd-15");
  assert.equal(state.creditIntents.length, 1);
  await page.close();
});

test("cancelled checkout releases its key for one fresh attempt", async () => {
  const page = await tracedPage("credits-cancelled");
  await installMock(page, { creditsEnabled: true });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue to credits" }).click();
  await page.getByRole("button", { name: "Pay in browser" }).click();
  const original = await page.evaluate(
    () => window.__COLONY_TEST__.creditIntents[0].idempotencyKey,
  );
  await page.evaluate(() => {
    window.__COLONY_TEST__.creditIntents[0].status = "cancelled";
  });
  await page.getByRole("button", { name: "Check again" }).click();
  await page.getByRole("button", { name: "Pay in browser" }).waitFor();
  await page.getByRole("button", { name: "Pay in browser" }).click();
  await page.waitForFunction(
    () => window.__COLONY_TEST__.creditIntents.length === 2,
  );
  const next = await page.evaluate(
    () => window.__COLONY_TEST__.creditIntents[0].idempotencyKey,
  );
  assert.notEqual(next, original);
  await page.close();
});

test("payment is ready only after the server reports paid intent and funded ledger", async () => {
  const page = await tracedPage("credits-paid-ledger");
  await installMock(page, { creditsEnabled: true });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue to credits" }).click();
  await page.getByRole("button", { name: "Pay in browser" }).click();
  await page.getByRole("button", { name: "Check again" }).click();
  assert.equal(
    await page.getByRole("heading", { name: "Credits are ready" }).count(),
    0,
  );
  await page.evaluate(() => {
    window.__COLONY_TEST__.creditIntents[0].status = "paid";
  });
  await page.getByRole("button", { name: "Check again" }).click();
  assert.equal(
    await page.getByRole("heading", { name: "Credits are ready" }).count(),
    0,
  );
  await page.evaluate(() => {
    window.__COLONY_TEST__.creditBalanceCents = 5000;
  });
  await page.getByRole("button", { name: "Check again" }).click();
  await page.getByRole("heading", { name: "Credits are ready" }).waitFor();
  assert.match(await page.locator("main").innerText(), /\$50\.00/u);
  await page.close();
});

test("an untrusted checkout address cannot open in the browser", async () => {
  const page = await tracedPage("credits-untrusted-checkout");
  await installMock(page, {
    creditsEnabled: true,
    checkoutUrl: "https://not-stripe.example/c/pay/fake",
  });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue to credits" }).click();
  await page.getByRole("button", { name: "Pay in browser" }).click();
  await page.getByRole("alert").getByText("couldn't verify").waitFor();
  assert.deepEqual(
    await page.evaluate(() => window.__COLONY_TEST__.openedUrls),
    [],
  );
  await page.close();
});

test("a checkout price that differs from the server catalog cannot open", async () => {
  const page = await tracedPage("credits-price-mismatch");
  await installMock(page, {
    creditsEnabled: true,
    checkoutAmountMinorUnits: 1,
  });
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue to credits" }).click();
  await page.getByRole("button", { name: "Pay in browser" }).click();
  await page.getByRole("alert").getByText("couldn't verify").waitFor();
  assert.deepEqual(
    await page.evaluate(() => window.__COLONY_TEST__.openedUrls),
    [],
  );
  await page.close();
});

test("failed person profile save keeps the owner draft for retry after reopening", async () => {
  const page = await tracedPage("person-name-retry");
  await installMock(page);
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.evaluate(() =>
    window.__COLONY_TEST__.personSaveFailures.push({
      status: 503,
      code: "unavailable",
    }),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("alert").getByText("couldn't save").waitFor();
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
  assert.equal(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) =>
        key.startsWith("colony-global-business-draft:"),
      ),
    ),
    true,
  );
  await page.reload();
  await page.getByRole("heading", { name: "Here's what I have" }).waitFor();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(JSON.parse(state.personEvent.content).display_name, "Lerato");
  assert.equal(state.companies.length, 1);
  await page.close();
});

test("lost person profile response is recovered from the signed relay copy", async () => {
  const page = await tracedPage("person-name-lost-response");
  await installMock(page);
  await page.goto(url);
  await signInNewAccount(page);
  await completeBusiness(page);
  await page.evaluate(() =>
    window.__COLONY_TEST__.personSaveFailures.push({
      status: 503,
      code: "unavailable",
      afterCommit: true,
    }),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(JSON.parse(state.personEvent.content).display_name, "Lerato");
  assert.equal(
    state.requests.filter(
      (request) => request.path === "/events" && request.body.kind === 0,
    ).length,
    1,
  );
  await page.close();
});

test("company setup preserves an existing signed person profile", async () => {
  const page = await tracedPage("person-name-preserved");
  const existing = personEvent("Amira", { about: "Designer" });
  await installMock(page, {
    initialAccount: true,
    companies: [defaultCompany],
    profileEvent: null,
    personEvent: existing,
  });
  await page.goto(url);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(state.personEvent.id, existing.id);
  assert.equal(
    state.requests.filter(
      (request) => request.path === "/events" && request.body.kind === 0,
    ).length,
    0,
  );
  await page.close();
});

test("a tampered person profile cannot finish company setup", async () => {
  const page = await tracedPage("person-name-signature");
  const forged = {
    ...personEvent("Amira"),
    content: '{"display_name":"Forged"}',
  };
  await installMock(page, {
    initialAccount: true,
    companies: [defaultCompany],
    profileEvent: null,
    personEvent: forged,
  });
  await page.goto(url);
  await completeBusiness(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("alert").getByText("couldn't save").waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(state.profileEvent, null);
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
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
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
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
  await page.getByRole("heading", { name: "Power your team" }).waitFor();
  const state = await page.evaluate(() => window.__COLONY_TEST__);
  assert.equal(
    state.requests.filter((request) => request.path === "/api/communities")
      .length,
    1,
  );
  assert.equal(
    state.requests.filter(
      (request) => request.path === "/events" && request.body.kind === 47046,
    ).length,
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

test("a partner reopens the shared company profile", async () => {
  const page = await tracedPage("company-partner-entry");
  await installMock(page, {
    initialAccount: true,
    companies: [
      { ...defaultCompany, owner_pubkey: "b".repeat(64), role: "partner" },
    ],
  });
  await page.goto(url);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  assert.match(
    await page.locator(".titlebar-company").innerText(),
    /Lerato Designs/u,
  );
  await page.close();
});

test("one unavailable company does not block another company", async () => {
  const second = {
    ...defaultCompany,
    id: "44444444-4444-4444-8444-444444444444",
    slug: "another-shop",
    normalized_host: "another-shop.colony.example.test",
  };
  const page = await tracedPage("company-partial-outage");
  await installMock(page, {
    initialAccount: true,
    companies: [defaultCompany, second],
    profileQueryFailures: [
      { host: "another-shop", status: 503, code: "unavailable" },
    ],
  });
  await page.goto(url);
  await page.getByRole("heading", { name: "Choose a company" }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Company temporarily unavailable" })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page.getByRole("button", { name: "Try loading again" }).count(),
    1,
  );
  await page.getByRole("button", { name: "Lerato Designs" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.close();
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

test("company conversations use relay channels, messages, and a side thread", async () => {
  const root = channelMessage("Let's plan the spring collection");
  const earlierReply = channelMessage("I can prepare the notes", {
    rootId: root.id,
    offset: 1,
  });
  const deeperReply = channelMessage("Let's compare dates", {
    rootId: root.id,
    parentId: earlierReply.id,
    offset: 2,
  });
  const page = await tracedPage("conversation-thread");
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel()],
    events: [root, earlierReply, deeperReply],
  });
  await page.goto(url);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Conversations" }).click();
  await page.getByRole("heading", { name: "Conversations." }).waitFor();
  await page.getByRole("button", { name: /Spring launch/u }).click();
  await page.getByText("Let's plan the spring collection").waitFor();
  assert.equal(await page.getByText("I can prepare the notes").count(), 0);
  await page.getByRole("button", { name: "Discuss in thread" }).click();
  await page
    .getByRole("complementary", { name: "Message thread" })
    .getByText("I can prepare the notes")
    .waitFor();
  await page
    .getByRole("complementary", { name: "Message thread" })
    .getByText("Let's compare dates")
    .waitFor();
  if (process.env.COLONY_CONVERSATION_SHOT)
    await page.screenshot({ path: process.env.COLONY_CONVERSATION_SHOT });
  await page
    .getByRole("textbox", { name: "Reply in thread" })
    .fill("Let's discuss the launch date");
  await page.getByRole("button", { name: "Send" }).last().click();
  await page
    .getByRole("complementary", { name: "Message thread" })
    .getByText("Let's discuss the launch date")
    .waitFor();
  await page.getByRole("button", { name: "Close thread" }).click();
  await page
    .getByRole("textbox", { name: "Message this conversation" })
    .fill("A fresh top-level note");
  await page
    .getByRole("textbox", { name: "Message this conversation" })
    .press("Enter");
  await page.getByText("A fresh top-level note").waitFor();
  const commands = await page.evaluate(() => window.__COLONY_TEST__.commands);
  for (const command of [
    "apply_workspace",
    "get_channels",
    "get_channel_window",
    "get_thread_replies",
    "send_channel_message",
  ])
    assert.ok(commands.includes(command), `${command} used the native host`);
  const active = await page.evaluate(() => window.__COLONY_TEST__.activeRelay);
  assert.equal(active, `wss://${defaultCompany.normalized_host}`);
  await page.close();
});

test("a failed company handoff is retryable and account discovery stays on the deployment relay", async () => {
  const page = await tracedPage("company-workspace-retry");
  await installMock(page, {
    initialAccount: true,
    workspaceFailures: ["relay temporarily offline"],
  });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Your company is unavailable" })
    .waitFor();
  assert.equal(await page.getByRole("heading", { name: "Today" }).count(), 0);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Today" }).waitFor();
  const accountRequests = await page.evaluate(() =>
    window.__COLONY_TEST__.requests.filter(
      (entry) => entry.path === "/api/accounts/me",
    ),
  );
  assert.ok(accountRequests.length >= 1);
  assert.ok(
    accountRequests.every((entry) =>
      entry.target.startsWith("http://127.0.0.1:3000/"),
    ),
  );
  await page.close();
});

test("unsigned conversation data fails closed and the send draft survives a host error", async () => {
  const signed = channelMessage("A real message");
  const tampered = { ...signed, content: "Forged message" };
  const page = await tracedPage("conversation-invalid-event");
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel()],
    events: [tampered],
    sendFailures: ["relay unreachable"],
  });
  await page.goto(url);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Conversations" }).click();
  await page.getByRole("button", { name: /Spring launch/u }).click();
  await page.getByText("Colony couldn't load this conversation.").waitFor();
  assert.equal(await page.getByText("Forged message").count(), 0);
  const composer = page.getByRole("textbox", {
    name: "Message this conversation",
  });
  await composer.fill("Please save this draft");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText(/Couldn't confirm the send/u).waitFor();
  assert.equal(await composer.inputValue(), "Please save this draft");
  await page.close();
});

test("a native workspace switch during a channel read cannot expose the returned list", async () => {
  const page = await tracedPage("conversation-scope-switch");
  await installMock(page, {
    initialAccount: true,
    channels: [sampleChannel("Private spring plan")],
    scopeSwitchOnRead: "get_channels",
  });
  await page.goto(url);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Conversations" }).click();
  await page
    .getByText("Colony couldn't load this company's conversations.")
    .waitFor();
  assert.equal(await page.getByText("Private spring plan").count(), 0);
  await page.close();
});

test("a person can create a private conversation on the selected company relay", async () => {
  const page = await tracedPage("conversation-create");
  await installMock(page, { initialAccount: true });
  await page.goto(url);
  await page.getByRole("heading", { name: "Today" }).waitFor();
  await page.getByRole("button", { name: "Conversations" }).click();
  await page.getByRole("heading", { name: "No conversations yet" }).waitFor();
  await page.getByRole("button", { name: "New conversation" }).click();
  await page
    .getByRole("textbox", { name: "What is this conversation about?" })
    .fill("New collection");
  await page.getByRole("button", { name: "Create conversation" }).click();
  await page.getByRole("heading", { name: "New collection" }).waitFor();
  const commands = await page.evaluate(() => window.__COLONY_TEST__.commands);
  assert.ok(commands.includes("create_channel"));
  await page.close();
});
