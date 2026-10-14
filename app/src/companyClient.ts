import { verifyEvent } from "nostr-tools/pure";
import { signEvent } from "./bridge";

const TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const PROFILE_D = "business-profile";
const PROFILE_HEAD_KIND = 30657;
const PROFILE_ACTION_KIND = 47046;

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
  };
}
