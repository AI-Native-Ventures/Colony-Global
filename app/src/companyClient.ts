import { verifyEvent } from "nostr-tools/pure";
import { signEvent } from "./bridge";

const TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const PROFILE_D = "business-profile";
const PROFILE_HEAD_KIND = 30657;
const PROFILE_ACTION_KIND = 47046;
const ASK_HEAD_KIND = 30643;
const ASK_RESPONSE_KIND = 47033;
const ID = /^[0-9a-f]{64}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERSON_PROFILE_KIND = 0;

export type Company = {
  id: string;
  slug: string;
  host: string;
  ownerPubkey: string;
  role: "owner" | "admin" | "partner" | "member";
};

export type ProvisioningConfig = {
  domain: string;
  public: boolean;
  maxPerOwner: number;
};

export type BusinessProfile = {
  schemaVersion: 1;
  name: string;
  timeZone: string;
  whatYouSell?: string | null;
  whoBuys?: string | null;
  whereYouSell?: string[];
  city?: string | null;
  country?: string | null;
  links?: string[];
  website?: string | null;
  goals?: string[];
  bestSellers?: string[];
  priceRange?: string | null;
  voiceWords?: string[];
  contact?: {
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    address?: string | null;
  };
  buyLink?: string | null;
  invoice?: {
    registeredName?: string | null;
    registrationNumber?: string | null;
    vatNumber?: string | null;
    bankDetails?: string | null;
  };
  socialAccounts?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    linkedin?: string | null;
    x?: string | null;
  };
};

export type ProfileProposalHead = {
  eventId: string;
  askId: string;
  channelId: string;
  threadRootId: string;
  askerPubkey: string;
  status: "open" | "resolved" | "cancelled";
  summary: string;
  profile: BusinessProfile;
  resolvedByPubkey: string | null;
  outcome: "approved" | "rejected" | null;
};

export class CompanyError extends Error {
  constructor(
    readonly code:
      | "network"
      | "invalid_response"
      | "not_enabled"
      | "not_allowed"
      | "taken"
      | "limit"
      | "rate_limited"
      | "conflict"
      | "save_failed",
  ) {
    super(code);
    this.name = "CompanyError";
  }
}

/** A stable private address candidate; the person's business name stays in the profile. */
export function companySlug(name: string): string {
  const stem =
    name
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/g, "") || "company";
  return `${stem}-${crypto.randomUUID().slice(0, 8)}`;
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function secureBase(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CompanyError("invalid_response");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new CompanyError("invalid_response");
  }
  return url;
}

async function boundedJson(response: Response): Promise<unknown> {
  const declared = response.headers.get("Content-Length");
  if (declared && Number(declared) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new CompanyError("invalid_response");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new CompanyError("invalid_response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new CompanyError("invalid_response");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch (error) {
    if (error instanceof CompanyError) throw error;
    throw new CompanyError("invalid_response");
  } finally {
    for (const chunk of chunks) chunk.fill(0);
  }
}

function relayError(response: Response, body: unknown): CompanyError {
  const message = object(body)?.error;
  if (response.status === 403) return new CompanyError("not_allowed");
  if (response.status === 404) return new CompanyError("not_enabled");
  if (response.status === 429) return new CompanyError("rate_limited");
  if (response.status === 409) {
    if (typeof message === "string" && message.startsWith("limit_reached:"))
      return new CompanyError("limit");
    if (typeof message === "string" && message.startsWith("taken:"))
      return new CompanyError("taken");
    return new CompanyError("conflict");
  }
  return new CompanyError("save_failed");
}

function hexKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function companyFrom(value: unknown, domain: string, pubkey: string): Company {
  const raw = object(value);
  if (
    !raw ||
    typeof raw.id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(raw.id) ||
    typeof raw.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug) ||
    typeof raw.normalized_host !== "string" ||
    raw.normalized_host !== `${raw.slug}.${domain}` ||
    !hexKey(raw.owner_pubkey)
  ) {
    throw new CompanyError("invalid_response");
  }
  const role = raw.role ?? (raw.owner_pubkey === pubkey ? "owner" : "member");
  if (
    role !== "owner" &&
    role !== "admin" &&
    role !== "partner" &&
    role !== "member"
  ) {
    throw new CompanyError("invalid_response");
  }
  return {
    id: raw.id,
    slug: raw.slug,
    host: raw.normalized_host,
    ownerPubkey: raw.owner_pubkey,
    role,
  };
}

function oneTag(tags: unknown, key: string): string | null {
  if (!Array.isArray(tags)) return null;
  const matches = tags.filter((tag) => Array.isArray(tag) && tag[0] === key);
  return matches.length === 1 &&
    matches[0].length === 2 &&
    typeof matches[0][1] === "string"
    ? matches[0][1]
    : null;
}

function profileFrom(
  value: unknown,
  relaySelf: string,
): { profile: BusinessProfile; revision: number } {
  const event = object(value);
  if (
    !event ||
    event.kind !== PROFILE_HEAD_KIND ||
    event.pubkey !== relaySelf ||
    !verifyEvent(event as Parameters<typeof verifyEvent>[0]) ||
    oneTag(event.tags, "d") !== PROFILE_D ||
    (Array.isArray(event.tags) &&
      event.tags.some((tag) => Array.isArray(tag) && tag[0] === "h")) ||
    typeof event.content !== "string"
  )
    throw new CompanyError("invalid_response");
  const revision = Number(oneTag(event.tags, "revision"));
  if (!Number.isSafeInteger(revision) || revision < 1)
    throw new CompanyError("invalid_response");
  let profile: Record<string, unknown> | null;
  try {
    profile = object(JSON.parse(event.content));
  } catch {
    throw new CompanyError("invalid_response");
  }
  if (
    !profile ||
    profile.schemaVersion !== 1 ||
    typeof profile.name !== "string" ||
    !profile.name.trim() ||
    profile.name.length > 120 ||
    typeof profile.timeZone !== "string" ||
    !profile.timeZone ||
    ["whereYouSell", "links", "goals"].some(
      (key) =>
        profile?.[key] !== undefined &&
        (!Array.isArray(profile[key]) ||
          (profile[key] as unknown[]).length > 10 ||
          !(profile[key] as unknown[]).every(
            (item) => typeof item === "string" && item.length <= 500,
          )),
    )
  )
    throw new CompanyError("invalid_response");
  try {
    new Intl.DateTimeFormat("en", { timeZone: profile.timeZone });
  } catch {
    throw new CompanyError("invalid_response");
  }
  return { profile: profile as BusinessProfile, revision };
}

function personProfileFrom(value: unknown, pubkey: string) {
  const event = object(value);
  if (
    !event ||
    event.kind !== PERSON_PROFILE_KIND ||
    event.pubkey !== pubkey ||
    !verifyEvent(event as Parameters<typeof verifyEvent>[0]) ||
    typeof event.content !== "string" ||
    !Number.isSafeInteger(event.created_at) ||
    (Array.isArray(event.tags) &&
      event.tags.some((tag) => Array.isArray(tag) && tag[0] === "h"))
  )
    throw new CompanyError("invalid_response");
  let content: Record<string, unknown> | null;
  try {
    content = object(JSON.parse(event.content));
  } catch {
    throw new CompanyError("invalid_response");
  }
  if (
    !content ||
    ["display_name", "name"].some(
      (key) =>
        content?.[key] !== undefined &&
        (typeof content[key] !== "string" || content[key].length > 120),
    )
  )
    throw new CompanyError("invalid_response");
  return {
    content,
    event,
    name:
      (content.display_name as string | undefined)?.trim() ||
      (content.name as string | undefined)?.trim() ||
      null,
  };
}

function profileMatches(
  current: BusinessProfile,
  expected: BusinessProfile,
): boolean {
  return (
    current.name === expected.name &&
    current.timeZone === expected.timeZone &&
    (current.whatYouSell ?? null) === (expected.whatYouSell ?? null) &&
    (current.whoBuys ?? null) === (expected.whoBuys ?? null) &&
    (current.city ?? null) === (expected.city ?? null) &&
    (current.country ?? null) === (expected.country ?? null) &&
    (current.website ?? null) === (expected.website ?? null) &&
    JSON.stringify(current.whereYouSell ?? []) ===
      JSON.stringify(expected.whereYouSell ?? []) &&
    JSON.stringify(current.links ?? []) ===
      JSON.stringify(expected.links ?? []) &&
    JSON.stringify(current.goals ?? []) === JSON.stringify(expected.goals ?? [])
  );
}

export function sameFullProfile(
  left: BusinessProfile,
  right: BusinessProfile,
): boolean {
  const canonical = (profile: BusinessProfile) => ({
    schemaVersion: profile.schemaVersion,
    name: profile.name,
    timeZone: profile.timeZone,
    whatYouSell: profile.whatYouSell ?? null,
    bestSellers: profile.bestSellers ?? [],
    priceRange: profile.priceRange ?? null,
    whoBuys: profile.whoBuys ?? null,
    whereYouSell: profile.whereYouSell ?? [],
    city: profile.city ?? null,
    country: profile.country ?? null,
    links: profile.links ?? [],
    website: profile.website ?? null,
    voiceWords: profile.voiceWords ?? [],
    goals: profile.goals ?? [],
    contact: {
      email: profile.contact?.email ?? null,
      phone: profile.contact?.phone ?? null,
      whatsapp: profile.contact?.whatsapp ?? null,
      address: profile.contact?.address ?? null,
    },
    buyLink: profile.buyLink ?? null,
    invoice: {
      registeredName: profile.invoice?.registeredName ?? null,
      registrationNumber: profile.invoice?.registrationNumber ?? null,
      vatNumber: profile.invoice?.vatNumber ?? null,
      bankDetails: profile.invoice?.bankDetails ?? null,
    },
    socialAccounts: {
      instagram: profile.socialAccounts?.instagram ?? null,
      facebook: profile.socialAccounts?.facebook ?? null,
      tiktok: profile.socialAccounts?.tiktok ?? null,
      linkedin: profile.socialAccounts?.linkedin ?? null,
      x: profile.socialAccounts?.x ?? null,
    },
  });
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

/** Signed company discovery, creation and shared-profile operations for the shipped app. */
export function createCompanyClient(
  provisionBaseUrl: string,
  accountPubkey: string,
  fetcher: typeof fetch = fetch,
) {
  const provisionBase = secureBase(provisionBaseUrl);
  if (!hexKey(accountPubkey)) throw new CompanyError("invalid_response");

  async function signedHeader(
    url: string,
    method: "GET" | "POST",
    body?: string,
  ) {
    const tags = [
      ["u", url],
      ["method", method],
      ["nonce", crypto.randomUUID()],
    ];
    if (body !== undefined) {
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(body),
      );
      tags.push([
        "payload",
        Array.from(new Uint8Array(hash), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join(""),
      ]);
    }
    const event = await signEvent({ kind: 27235, content: "", tags });
    if (event.pubkey !== accountPubkey) throw new CompanyError("not_allowed");
    return `Nostr ${btoa(JSON.stringify(event))}`;
  }

  async function request(
    base: URL,
    path: string,
    method: "GET" | "POST",
    body?: string,
    signed = false,
    accept?: string,
  ) {
    const url = new URL(path.replace(/^\//, ""), base).toString();
    let response: Response;
    try {
      response = await fetcher(url, {
        method,
        headers: {
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(accept ? { Accept: accept } : {}),
          ...(signed
            ? { Authorization: await signedHeader(url, method, body) }
            : {}),
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof CompanyError) throw error;
      throw new CompanyError("network");
    }
    const result = await boundedJson(response);
    if (!response.ok) throw relayError(response, result);
    if (response.status !== 200) throw new CompanyError("invalid_response");
    return result;
  }

  function companyBase(company: Company, config: ProvisioningConfig): URL {
    if (company.host !== `${company.slug}.${config.domain}`)
      throw new CompanyError("invalid_response");
    return secureBase(`https://${company.host}/`);
  }

  async function profileHead(company: Company, config: ProvisioningConfig) {
    const base = companyBase(company, config);
    const info = object(
      await request(
        base,
        "/",
        "GET",
        undefined,
        false,
        "application/nostr+json",
      ),
    );
    if (!hexKey(info?.self)) throw new CompanyError("invalid_response");
    const events = await request(
      base,
      "/query",
      "POST",
      JSON.stringify([
        {
          kinds: [PROFILE_HEAD_KIND],
          authors: [info.self],
          "#d": [PROFILE_D],
          limit: 10,
        },
      ]),
      true,
    );
    if (!Array.isArray(events) || events.length >= 10)
      throw new CompanyError("invalid_response");
    const heads = events.map((event) =>
      profileFrom(event, info.self as string),
    );
    return heads.sort((a, b) => b.revision - a.revision)[0] ?? null;
  }

  async function relaySelf(company: Company, config: ProvisioningConfig) {
    const info = object(
      await request(
        companyBase(company, config),
        "/",
        "GET",
        undefined,
        false,
        "application/nostr+json",
      ),
    );
    if (!hexKey(info?.self)) throw new CompanyError("invalid_response");
    return info.self;
  }

  function parseProposalHead(
    value: unknown,
    self: string,
    channelId: string,
  ): ProfileProposalHead | null {
    const event = object(value);
    if (
      !event ||
      event.kind !== ASK_HEAD_KIND ||
      event.pubkey !== self ||
      !verifyEvent(event as Parameters<typeof verifyEvent>[0]) ||
      typeof event.id !== "string" ||
      !ID.test(event.id) ||
      oneTag(event.tags, "h") !== channelId ||
      oneTag(event.tags, "colony:profile-proposal") !== "1" ||
      typeof event.content !== "string"
    )
      return null;
    let head: Record<string, unknown> | null;
    try {
      head = object(JSON.parse(event.content));
    } catch {
      throw new CompanyError("invalid_response");
    }
    const ask = object(head?.ask);
    const proposal = object(ask?.profileProposal);
    const profile = object(proposal?.profile);
    const resolution =
      head?.resolution == null ? null : object(head.resolution);
    if (
      !head ||
      head.schemaVersion !== 1 ||
      typeof head.askId !== "string" ||
      !UUID.test(head.askId) ||
      typeof head.askerPubkey !== "string" ||
      !ID.test(head.askerPubkey) ||
      !["open", "resolved", "cancelled"].includes(String(head.status)) ||
      oneTag(event.tags, "d") !== `channel:${channelId}:ask:${head.askId}` ||
      !ask ||
      ask.type !== "approval" ||
      ask.category !== "general" ||
      ask.askId !== head.askId ||
      typeof ask.threadRootEventId !== "string" ||
      !ID.test(ask.threadRootEventId) ||
      !proposal ||
      typeof proposal.summary !== "string" ||
      !proposal.summary.trim() ||
      proposal.summary.length > 600 ||
      !profile ||
      profile.schemaVersion !== 1 ||
      typeof profile.name !== "string" ||
      !profile.name.trim() ||
      typeof profile.timeZone !== "string" ||
      !profile.timeZone
    )
      throw new CompanyError("invalid_response");
    try {
      new Intl.DateTimeFormat("en", { timeZone: profile.timeZone });
    } catch {
      throw new CompanyError("invalid_response");
    }
    const status = head.status as ProfileProposalHead["status"];
    if (
      (status === "resolved" &&
        (!resolution ||
          typeof resolution.resolvedByPubkey !== "string" ||
          !ID.test(resolution.resolvedByPubkey))) ||
      (status !== "resolved" && resolution)
    )
      throw new CompanyError("invalid_response");
    return {
      eventId: event.id,
      askId: head.askId,
      channelId,
      threadRootId: ask.threadRootEventId,
      askerPubkey: head.askerPubkey,
      status,
      summary: proposal.summary,
      profile: profile as BusinessProfile,
      resolvedByPubkey:
        typeof resolution?.resolvedByPubkey === "string"
          ? resolution.resolvedByPubkey
          : null,
      outcome:
        resolution?.outcome === "approved" || resolution?.outcome === "rejected"
          ? resolution.outcome
          : null,
    };
  }

  async function proposalHeads(
    company: Company,
    config: ProvisioningConfig,
    channelId: string,
  ): Promise<ProfileProposalHead[]> {
    if (!UUID.test(channelId)) throw new CompanyError("invalid_response");
    const self = await relaySelf(company, config);
    const events = await request(
      companyBase(company, config),
      "/query",
      "POST",
      JSON.stringify([
        {
          kinds: [ASK_HEAD_KIND],
          authors: [self],
          "#h": [channelId],
          limit: 100,
        },
      ]),
      true,
    );
    if (!Array.isArray(events) || events.length >= 100)
      throw new CompanyError("invalid_response");
    return events
      .map((event) => parseProposalHead(event, self, channelId))
      .filter((head): head is ProfileProposalHead => head !== null);
  }

  async function personProfileHead(
    company: Company,
    config: ProvisioningConfig,
  ) {
    const events = await request(
      companyBase(company, config),
      "/query",
      "POST",
      JSON.stringify([
        { kinds: [PERSON_PROFILE_KIND], authors: [accountPubkey], limit: 10 },
      ]),
      true,
    );
    if (!Array.isArray(events) || events.length >= 10)
      throw new CompanyError("invalid_response");
    return (
      events
        .map((event) => personProfileFrom(event, accountPubkey))
        .sort(
          (a, b) =>
            (b.event.created_at as number) - (a.event.created_at as number),
        )[0] ?? null
    );
  }

  return {
    async config(): Promise<ProvisioningConfig> {
      const raw = object(
        await request(provisionBase, "/api/communities/config", "GET"),
      );
      if (!raw || raw.self_serve !== true || typeof raw.domain !== "string")
        throw new CompanyError("not_enabled");
      const domain = raw.domain.toLowerCase();
      if (!/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/.test(domain) || domain.length > 253)
        throw new CompanyError("invalid_response");
      return {
        domain,
        public: raw.public === true,
        maxPerOwner:
          typeof raw.max_per_owner === "number" &&
          Number.isSafeInteger(raw.max_per_owner) &&
          raw.max_per_owner > 0
            ? raw.max_per_owner
            : 5,
      };
    },
    async list(config: ProvisioningConfig): Promise<Company[]> {
      const raw = object(
        await request(
          provisionBase,
          "/api/communities/mine?scope=member",
          "GET",
          undefined,
          true,
        ),
      );
      if (
        !raw ||
        raw.owner_pubkey !== accountPubkey ||
        !Array.isArray(raw.communities)
      )
        throw new CompanyError("invalid_response");
      return raw.communities.map((item) =>
        companyFrom(item, config.domain, accountPubkey),
      );
    },
    async create(config: ProvisioningConfig, slug: string): Promise<Company> {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 63)
        throw new CompanyError("invalid_response");
      const raw = object(
        await request(
          provisionBase,
          "/api/communities",
          "POST",
          JSON.stringify({ name: slug }),
          true,
        ),
      );
      return companyFrom(raw?.community, config.domain, accountPubkey);
    },
    async profile(
      company: Company,
      config: ProvisioningConfig,
    ): Promise<BusinessProfile | null> {
      return (await profileHead(company, config))?.profile ?? null;
    },
    async currentProfile(
      company: Company,
      config: ProvisioningConfig,
    ): Promise<{ profile: BusinessProfile; revision: number } | null> {
      return profileHead(company, config);
    },
    proposalHeads,
    async resolveProfileProposal(
      company: Company,
      config: ProvisioningConfig,
      head: ProfileProposalHead,
      outcome: "approved" | "rejected",
    ): Promise<ProfileProposalHead> {
      if (
        head.status !== "open" ||
        !UUID.test(head.channelId) ||
        !UUID.test(head.askId) ||
        !ID.test(head.eventId)
      )
        throw new CompanyError("invalid_response");
      const response = {
        schemaVersion: 1,
        askId: head.askId,
        expectedHeadEventId: head.eventId,
        outcome,
        reason:
          outcome === "approved"
            ? "The owner confirmed the business profile."
            : "The owner requested changes in the conversation.",
      };
      const event = await signEvent({
        kind: ASK_RESPONSE_KIND,
        content: JSON.stringify(response),
        tags: [
          ["h", head.channelId],
          ["d", `channel:${head.channelId}:ask:${head.askId}`],
        ],
      });
      if (event.pubkey !== accountPubkey) throw new CompanyError("not_allowed");
      let writeError: unknown = null;
      try {
        const result = object(
          await request(
            companyBase(company, config),
            "/events",
            "POST",
            JSON.stringify(event),
            true,
          ),
        );
        if (result?.accepted !== true || result.event_id !== event.id)
          throw new CompanyError("save_failed");
      } catch (error) {
        writeError = error;
      }
      const updated = (
        await proposalHeads(company, config, head.channelId)
      ).find((candidate) => candidate.askId === head.askId);
      if (
        updated?.status === "resolved" &&
        updated.resolvedByPubkey === accountPubkey &&
        updated.outcome === outcome
      )
        return updated;
      if (writeError) throw writeError;
      throw new CompanyError("save_failed");
    },
    async ensurePersonName(
      company: Company,
      config: ProvisioningConfig,
      requestedName: string,
    ): Promise<string> {
      const name = requestedName.trim();
      if (
        !name ||
        name.length > 80 ||
        [...name].some((char) => {
          const code = char.codePointAt(0) ?? 0;
          return code < 32 || code === 127;
        })
      )
        throw new CompanyError("invalid_response");
      const before = await personProfileHead(company, config);
      if (before?.name) return before.name;
      const event = await signEvent({
        kind: PERSON_PROFILE_KIND,
        content: JSON.stringify({ ...before?.content, display_name: name }),
        tags: (before?.event.tags as string[][] | undefined) ?? [],
      });
      if (event.pubkey !== accountPubkey) throw new CompanyError("not_allowed");
      if (!verifyEvent(event as Parameters<typeof verifyEvent>[0]))
        throw new CompanyError("invalid_response");
      try {
        const result = object(
          await request(
            companyBase(company, config),
            "/events",
            "POST",
            JSON.stringify(event),
            true,
          ),
        );
        if (result?.accepted !== true || result.event_id !== event.id)
          throw new CompanyError("save_failed");
      } catch (error) {
        const recovered = await personProfileHead(company, config).catch(
          () => null,
        );
        if (recovered?.name === name) return name;
        throw error;
      }
      const saved = await personProfileHead(company, config);
      if (saved?.name !== name) throw new CompanyError("save_failed");
      return name;
    },
    async saveProfile(
      company: Company,
      config: ProvisioningConfig,
      profile: BusinessProfile,
    ): Promise<BusinessProfile> {
      const before = await profileHead(company, config);
      if (before) {
        if (profileMatches(before.profile, profile)) return before.profile;
        throw new CompanyError("conflict");
      }
      const base = companyBase(company, config);
      const event = await signEvent({
        kind: PROFILE_ACTION_KIND,
        content: JSON.stringify({ profile, expectedRevision: null }),
        tags: [["d", PROFILE_D]],
      });
      if (event.pubkey !== accountPubkey) throw new CompanyError("not_allowed");
      try {
        const result = object(
          await request(base, "/events", "POST", JSON.stringify(event), true),
        );
        if (result?.accepted !== true || result.event_id !== event.id)
          throw new CompanyError("save_failed");
      } catch (error) {
        // A timed-out response can follow a committed write. Read before retrying.
        const recovered = await profileHead(company, config).catch(() => null);
        if (recovered && profileMatches(recovered.profile, profile))
          return recovered.profile;
        throw error;
      }
      const saved = await profileHead(company, config);
      if (!saved || !profileMatches(saved.profile, profile))
        throw new CompanyError("save_failed");
      return saved.profile;
    },
    async replaceProfile(
      company: Company,
      config: ProvisioningConfig,
      profile: BusinessProfile,
      expectedRevision: number,
    ): Promise<{ profile: BusinessProfile; revision: number }> {
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
        throw new CompanyError("invalid_response");
      const before = await profileHead(company, config);
      if (!before || before.revision !== expectedRevision)
        throw new CompanyError("conflict");
      if (sameFullProfile(before.profile, profile)) return before;
      const event = await signEvent({
        kind: PROFILE_ACTION_KIND,
        content: JSON.stringify({ profile, expectedRevision }),
        tags: [["d", PROFILE_D]],
      });
      if (event.pubkey !== accountPubkey) throw new CompanyError("not_allowed");
      try {
        const result = object(
          await request(
            companyBase(company, config),
            "/events",
            "POST",
            JSON.stringify(event),
            true,
          ),
        );
        if (result?.accepted !== true || result.event_id !== event.id)
          throw new CompanyError("save_failed");
      } catch (error) {
        const recovered = await profileHead(company, config).catch(() => null);
        if (
          recovered?.revision === expectedRevision + 1 &&
          sameFullProfile(recovered.profile, profile)
        )
          return recovered;
        throw error;
      }
      const saved = await profileHead(company, config);
      if (
        saved?.revision !== expectedRevision + 1 ||
        !sameFullProfile(saved.profile, profile)
      )
        throw new CompanyError("save_failed");
      return saved;
    },
  };
}
