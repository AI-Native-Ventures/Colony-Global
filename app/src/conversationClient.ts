import { verifyEvent } from "nostr-tools/pure";
import { nativeInvoke } from "./bridge";

const ID = /^[0-9a-f]{64}$/i;
const CHANNEL_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CHANNELS = 2_000;
const MAX_EVENTS = 500;

export type Conversation = {
  id: string;
  name: string;
  description: string;
  lastMessageAt: string | null;
};

export type ConversationMessage = {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  tags: string[][];
};

export type ConversationMember = {
  pubkey: string;
  name: string | null;
  isAgent: boolean;
};

export class ConversationError extends Error {
  constructor(readonly code: "scope" | "invalid" | "network") {
    super(code);
    this.name = "ConversationError";
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ConversationError("invalid");
  return value as Record<string, unknown>;
}

function companyRelay(host: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9.-]+$/i.test(host))
    throw new ConversationError("invalid");
  return `wss://${host}`;
}

function nativeRelay(value: string) {
  return new URL(value).origin
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");
}

/** Bind all native reads and writes to the selected company and signed-in identity. */
export function createConversationClient(
  companyHost: string,
  companyId: string,
  accountPubkey: string,
) {
  if (!ID.test(accountPubkey)) throw new ConversationError("invalid");
  if (!CHANNEL_ID.test(companyId)) throw new ConversationError("invalid");
  const relayUrl = companyRelay(companyHost);

  async function assertScope() {
    let active: Record<string, unknown>;
    try {
      active = object(await nativeInvoke("get_active_workspace"));
    } catch {
      throw new ConversationError("scope");
    }
    if (
      typeof active.relay_url !== "string" ||
      nativeRelay(active.relay_url) !== relayUrl ||
      active.pubkey !== accountPubkey
    )
      throw new ConversationError("scope");
  }

  async function scopedRead(command: string, args: Record<string, unknown>) {
    await assertScope();
    let value: unknown;
    try {
      value = await nativeInvoke(command, args);
    } catch {
      throw new ConversationError("network");
    }
    await assertScope();
    return value;
  }

  function parseChannel(value: unknown): Conversation | null {
    const raw = object(value);
    if (
      typeof raw.id !== "string" ||
      !CHANNEL_ID.test(raw.id) ||
      typeof raw.name !== "string" ||
      raw.name.length < 1 ||
      raw.name.length > 150 ||
      typeof raw.description !== "string" ||
      raw.description.length > 2_000 ||
      (raw.last_message_at !== null &&
        typeof raw.last_message_at !== "string") ||
      typeof raw.is_member !== "boolean" ||
      (raw.archived_at !== null && typeof raw.archived_at !== "string") ||
      typeof raw.channel_type !== "string"
    )
      throw new ConversationError("invalid");
    if (!raw.is_member || raw.archived_at || raw.channel_type !== "stream")
      return null;
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      lastMessageAt: raw.last_message_at,
    };
  }

  function parseMessage(
    value: unknown,
    channelId: string,
  ): ConversationMessage | null {
    const raw = object(value);
    if (
      typeof raw.id !== "string" ||
      !ID.test(raw.id) ||
      typeof raw.pubkey !== "string" ||
      !ID.test(raw.pubkey) ||
      typeof raw.content !== "string" ||
      raw.content.length > 100_000 ||
      typeof raw.created_at !== "number" ||
      !Number.isSafeInteger(raw.created_at) ||
      !Array.isArray(raw.tags) ||
      !verifyEvent(raw as Parameters<typeof verifyEvent>[0])
    )
      throw new ConversationError("invalid");
    const tags = raw.tags as string[][];
    if (
      tags.filter((tag) => tag[0] === "h" && tag[1] === channelId).length !==
        1 ||
      tags.some((tag) => tag[0] === "h" && tag[1] !== channelId)
    )
      throw new ConversationError("invalid");
    if (raw.kind !== 9 && raw.kind !== 40002) return null;
    return {
      id: raw.id,
      pubkey: raw.pubkey,
      content: raw.content,
      createdAt: raw.created_at,
      tags,
    };
  }

  function parseMessages(value: unknown, channelId: string) {
    if (!Array.isArray(value) || value.length > MAX_EVENTS)
      throw new ConversationError("invalid");
    return value
      .map((event) => parseMessage(event, channelId))
      .filter((event): event is ConversationMessage => event !== null)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }

  async function readChannels(): Promise<Conversation[]> {
    const raw = object(await scopedRead("get_channels", { knownHash: null }));
    if (!Array.isArray(raw.channels) || raw.channels.length > MAX_CHANNELS)
      throw new ConversationError("invalid");
    return raw.channels
      .map(parseChannel)
      .filter((channel): channel is Conversation => channel !== null)
      .sort(
        (a, b) =>
          Date.parse(b.lastMessageAt ?? "") -
            Date.parse(a.lastMessageAt ?? "") || a.name.localeCompare(b.name),
      );
  }

  async function readMembers(channelId: string): Promise<ConversationMember[]> {
    if (!CHANNEL_ID.test(channelId)) throw new ConversationError("invalid");
    const raw = object(await scopedRead("get_channel_members", { channelId }));
    if (!Array.isArray(raw.members) || raw.members.length > 2_000)
      throw new ConversationError("invalid");
    return raw.members.map((member) => {
      const entry = object(member);
      if (
        typeof entry.pubkey !== "string" ||
        !ID.test(entry.pubkey) ||
        (entry.display_name !== null && typeof entry.display_name !== "string")
      )
        throw new ConversationError("invalid");
      return {
        pubkey: entry.pubkey,
        name:
          typeof entry.display_name === "string" && entry.display_name.trim()
            ? entry.display_name.slice(0, 80)
            : null,
        isAgent: entry.is_agent === true,
      };
    });
  }

  return {
    relayUrl,
    assertScope,
    async activate() {
      await nativeInvoke("apply_workspace", {
        relayUrl,
        nsec: null,
        reposDir: null,
        agentManagedProfiles: false,
        businessCommunityId: companyId,
        clientChannelId: null,
      });
      await assertScope();
    },
    list: readChannels,
    members: readMembers,
    async ensureSetupChannel(channelId: string): Promise<Conversation> {
      if (!CHANNEL_ID.test(channelId)) throw new ConversationError("invalid");
      const existing = (await readChannels()).find(
        (channel) => channel.id === channelId,
      );
      if (existing) return existing;
      await assertScope();
      let raw: unknown = null;
      try {
        raw = await nativeInvoke("create_channel", {
          name: "Getting started",
          channelType: "stream",
          visibility: "private",
          description: "Scout's first conversation with your company",
          ttlSeconds: null,
          requestedChannelId: channelId,
          expectedRelayUrl: relayUrl,
          expectedSignerPubkey: accountPubkey,
        });
      } catch {
        // The relay may have committed the channel before the reply was lost.
      }
      await assertScope();
      const created = raw ? parseChannel(raw) : null;
      if (created && created.id === channelId) return created;
      const recovered = (await readChannels()).find(
        (channel) => channel.id === channelId,
      );
      if (recovered) return recovered;
      throw new ConversationError("network");
    },
    async ensureAgentMember(
      channelId: string,
      agentPubkey: string,
    ): Promise<void> {
      if (!CHANNEL_ID.test(channelId) || !ID.test(agentPubkey))
        throw new ConversationError("invalid");
      if (
        (await readMembers(channelId)).some(
          (member) => member.pubkey === agentPubkey,
        )
      )
        return;
      await assertScope();
      let result: Record<string, unknown>;
      try {
        result = object(
          await nativeInvoke("add_channel_members", {
            channelId,
            pubkeys: [agentPubkey],
            role: "bot",
            expectedRelayUrl: relayUrl,
            expectedSignerPubkey: accountPubkey,
          }),
        );
      } catch {
        throw new ConversationError("network");
      }
      await assertScope();
      if (!Array.isArray(result.errors) || !Array.isArray(result.added))
        throw new ConversationError("invalid");
      if (
        !(await readMembers(channelId)).some(
          (member) => member.pubkey === agentPubkey,
        )
      )
        throw new ConversationError("network");
    },
    async sendScoutKickoff(
      channelId: string,
      companyId: string,
      scoutPubkey: string,
      businessName: string,
    ): Promise<string> {
      if (
        !CHANNEL_ID.test(channelId) ||
        !CHANNEL_ID.test(companyId) ||
        !ID.test(scoutPubkey)
      )
        throw new ConversationError("invalid");
      const name = businessName.trim();
      if (!name || name.length > 120) throw new ConversationError("invalid");
      await assertScope();
      let result: Record<string, unknown>;
      try {
        result = object(
          await nativeInvoke("send_channel_message", {
            channelId,
            content: `I finished setting up ${name}. Please get to know the business and propose our profile and team.`,
            parentEventId: null,
            rootEventId: null,
            mentionPubkeys: [scoutPubkey],
            setupFirstTurn: true,
            setupMarker: `colony-global-scout-first-turn:${companyId}`,
            expectedRelayUrl: relayUrl,
            expectedSignerPubkey: accountPubkey,
          }),
        );
      } catch {
        throw new ConversationError("network");
      }
      await assertScope();
      if (typeof result.event_id !== "string" || !ID.test(result.event_id))
        throw new ConversationError("invalid");
      return result.event_id;
    },
    async timeline(channelId: string): Promise<ConversationMessage[]> {
      if (!CHANNEL_ID.test(channelId)) throw new ConversationError("invalid");
      const events = parseMessages(
        await scopedRead("get_channel_window", {
          channelId,
          limitRows: 100,
          cursor: null,
        }),
        channelId,
      );
      return events.filter(
        (event) =>
          !event.tags.some(
            (tag) => tag[0] === "e" && ["root", "reply"].includes(tag[3]),
          ),
      );
    },
    async replies(
      channelId: string,
      rootId: string,
    ): Promise<ConversationMessage[]> {
      if (!CHANNEL_ID.test(channelId) || !ID.test(rootId))
        throw new ConversationError("invalid");
      const raw = object(
        await scopedRead("get_thread_replies", {
          channelId,
          rootEventId: rootId,
          limit: 100,
          depthLimit: 64,
          cursor: null,
        }),
      );
      const events = parseMessages(raw.events, channelId);
      if (
        events.some(
          (event) =>
            !event.tags.some(
              (tag) =>
                tag[0] === "e" &&
                tag[1] === rootId &&
                (tag[3] === "root" || tag[3] === "reply"),
            ),
        )
      )
        throw new ConversationError("invalid");
      return events;
    },
    async send(channelId: string, content: string, rootId?: string) {
      if (!CHANNEL_ID.test(channelId) || (rootId && !ID.test(rootId)))
        throw new ConversationError("invalid");
      const text = content.trim();
      if (!text || text.length > 10_000) throw new ConversationError("invalid");
      await assertScope();
      let result: Record<string, unknown>;
      try {
        result = object(
          await nativeInvoke("send_channel_message", {
            channelId,
            content: text,
            parentEventId: rootId ?? null,
            rootEventId: rootId ?? null,
            expectedRelayUrl: relayUrl,
            expectedSignerPubkey: accountPubkey,
          }),
        );
      } catch {
        throw new ConversationError("network");
      }
      await assertScope();
      if (typeof result.event_id !== "string" || !ID.test(result.event_id))
        throw new ConversationError("invalid");
      return result.event_id;
    },
    async create(title: string): Promise<Conversation> {
      const name = title.trim();
      if (name.length < 1 || name.length > 80)
        throw new ConversationError("invalid");
      await assertScope();
      let raw: unknown;
      try {
        raw = await nativeInvoke("create_channel", {
          name,
          channelType: "stream",
          visibility: "private",
          description: "",
          ttlSeconds: null,
          expectedRelayUrl: relayUrl,
          expectedSignerPubkey: accountPubkey,
        });
      } catch {
        throw new ConversationError("network");
      }
      await assertScope();
      const channel = parseChannel(raw);
      if (!channel) throw new ConversationError("invalid");
      return channel;
    },
  };
}
