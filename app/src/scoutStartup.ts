import { nativeInvoke } from "./bridge";
import type { BusinessProfile, Company } from "./companyClient";
import type { createConversationClient } from "./conversationClient";
import { createCreditsClient } from "./creditsClient";

type Conversations = ReturnType<typeof createConversationClient>;
const PUBKEY = /^[0-9a-f]{64}$/i;
const SCOUT_PERSONA = "builtin:fizz";

type Agent = {
  pubkey: string;
  name: string;
  persona_id: string | null;
  relay_url: string;
  status: string;
};

export class ScoutStartupError extends Error {
  constructor(readonly code: "power" | "connection" | "host" | "scope") {
    super(code);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ScoutStartupError("host");
  return value as Record<string, unknown>;
}

function agentFrom(value: unknown): Agent {
  const raw = record(value);
  if (
    typeof raw.pubkey !== "string" ||
    !PUBKEY.test(raw.pubkey) ||
    typeof raw.name !== "string" ||
    (raw.persona_id !== null && typeof raw.persona_id !== "string") ||
    typeof raw.relay_url !== "string" ||
    typeof raw.status !== "string"
  )
    throw new ScoutStartupError("host");
  return raw as Agent;
}

async function agents(conversations: Conversations): Promise<Agent[]> {
  await conversations.assertScope();
  const raw = await nativeInvoke("list_managed_agents");
  await conversations.assertScope();
  if (!Array.isArray(raw) || raw.length > 2_000)
    throw new ScoutStartupError("host");
  return raw.map(agentFrom);
}

/** A stable company-local UUID prevents retries from creating another first conversation. */
export async function scoutSetupChannelId(companyId: string): Promise<string> {
  const input = new TextEncoder().encode(
    `colony-global:scout-first-turn:${companyId}`,
  );
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes.slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function ensureCreditsConnection(
  conversations: Conversations,
  accountRelayHttpUrl: string,
  accountPubkey: string,
  existingAgents: Agent[],
) {
  await conversations.assertScope();
  const config = record(await nativeInvoke("get_global_agent_config"));
  await conversations.assertScope();
  if (config.provider != null && config.provider !== "colony-credits")
    throw new ScoutStartupError("connection");
  const credits = createCreditsClient(accountRelayHttpUrl, accountPubkey);
  if (!(await credits.capability())) throw new ScoutStartupError("power");
  const snapshot = await credits.snapshot();
  await conversations.assertScope();
  if (snapshot.balanceUsdCents <= 0) throw new ScoutStartupError("power");
  if (
    config.provider === "colony-credits" &&
    config.preferred_runtime === "buzz-agent"
  )
    return;
  // Global defaults affect every employee on this computer. Never change an
  // existing team implicitly while preparing the first company Scout.
  if (
    existingAgents.some(
      (agent) =>
        agent.persona_id !== SCOUT_PERSONA ||
        agent.relay_url !== conversations.relayUrl,
    )
  )
    throw new ScoutStartupError("connection");
  await nativeInvoke("set_global_agent_config", {
    config: {
      ...config,
      env_vars: config.env_vars ?? {},
      provider: "colony-credits",
      model: null,
      preferred_runtime: "buzz-agent",
    },
  });
  await conversations.assertScope();
  const confirmed = record(await nativeInvoke("get_global_agent_config"));
  if (
    confirmed.provider !== "colony-credits" ||
    confirmed.preferred_runtime !== "buzz-agent"
  )
    throw new ScoutStartupError("host");
}

async function ensureAgent(
  conversations: Conversations,
  accountPubkey: string,
  known: Agent[],
) {
  const matching = known.filter(
    (agent) =>
      agent.name === "Scout" &&
      agent.persona_id === SCOUT_PERSONA &&
      agent.relay_url === conversations.relayUrl,
  );
  if (matching.length > 1) throw new ScoutStartupError("host");
  if (matching[0]) return matching[0];
  await conversations.assertScope();
  const personas = await nativeInvoke("list_personas");
  await conversations.assertScope();
  if (!Array.isArray(personas)) throw new ScoutStartupError("host");
  const scout = personas
    .map(record)
    .find((persona) => persona.id === SCOUT_PERSONA);
  if (
    !scout ||
    typeof scout.system_prompt !== "string" ||
    !scout.system_prompt.includes("colony profile propose")
  )
    throw new ScoutStartupError("host");
  if (scout.is_active !== true) {
    await nativeInvoke("set_persona_active", {
      id: SCOUT_PERSONA,
      active: true,
    });
    await conversations.assertScope();
  }
  try {
    await nativeInvoke("create_managed_agent", {
      input: {
        name: "Scout",
        personaId: SCOUT_PERSONA,
        relayUrl: conversations.relayUrl,
        acpCommand: "buzz-acp",
        agentCommand: "buzz-agent",
        harnessOverride: true,
        spawnAfterCreate: false,
        startOnAppLaunch: true,
        respondTo: "owner-only",
        parallelism: 1,
        backend: { type: "local" },
        uniqueCompanyScout: true,
        expectedRelayUrl: conversations.relayUrl,
        expectedSignerPubkey: accountPubkey,
      },
    });
  } catch {
    // A lost response or a concurrent window may already have created Scout.
  }
  const recovered = (await agents(conversations)).filter(
    (agent) =>
      agent.name === "Scout" &&
      agent.persona_id === SCOUT_PERSONA &&
      agent.relay_url === conversations.relayUrl,
  );
  if (recovered.length !== 1) throw new ScoutStartupError("host");
  return recovered[0];
}

/** One owner action resumes from native and relay state after any partial failure. */
export async function startScoutFirstTurn({
  company,
  profile,
  accountPubkey,
  accountRelayHttpUrl,
  conversations,
}: {
  company: Company;
  profile: BusinessProfile;
  accountPubkey: string;
  accountRelayHttpUrl: string;
  conversations: Conversations;
}): Promise<string> {
  if (company.role !== "owner") throw new ScoutStartupError("scope");
  const known = await agents(conversations);
  await ensureCreditsConnection(
    conversations,
    accountRelayHttpUrl,
    accountPubkey,
    known,
  );
  const scout = await ensureAgent(conversations, accountPubkey, known);
  const channelId = await scoutSetupChannelId(company.id);
  await conversations.assertScope();
  const channel = await conversations.ensureSetupChannel(channelId);
  await conversations.ensureAgentMember(channel.id, scout.pubkey);
  if (scout.status !== "running") {
    await conversations.assertScope();
    const started = agentFrom(
      await nativeInvoke("start_managed_agent", {
        pubkey: scout.pubkey,
        expectedRelayUrl: conversations.relayUrl,
        expectedSignerPubkey: accountPubkey,
        replayFloorUnix: Math.max(0, Math.floor(Date.now() / 1_000) - 10),
      }),
    );
    await conversations.assertScope();
    if (started.status !== "running") throw new ScoutStartupError("host");
  }
  // Native marker lookup serializes the check and publish, so a lost response
  // or repeat click returns the same owner-signed kickoff event ID.
  return conversations.sendScoutKickoff(
    channel.id,
    company.id,
    scout.pubkey,
    profile.name,
  );
}
