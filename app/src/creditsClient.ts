import { verifyEvent } from "nostr-tools/pure";
import { nativeInvoke, signEvent } from "./bridge";

const TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const OPEN_STATUSES = ["pending", "delayed", "uncertain"] as const;
const STATUSES = [...OPEN_STATUSES, "paid", "failed", "cancelled"] as const;

export type CreditPack = {
  id: string;
  chargeMinorUnits: number;
  grantUsdCents: number;
};
export type CreditIntent = {
  reference: string;
  idempotencyKey: string;
  packId: string;
  status: (typeof STATUSES)[number];
  createdAt: string;
};
export type CreditCatalog = {
  packs: CreditPack[];
  policyUrls: { terms: string; acceptableUse: string };
};
export type CreditSnapshot = {
  balanceUsdCents: number;
  intents: CreditIntent[];
};
export type CreditCheckout = {
  reference: string;
  idempotencyKey: string;
  status: CreditIntent["status"];
  authorizationUrl: string | null;
  chargeMinorUnits: number;
  grantUsdCents: number;
};

export class CreditsError extends Error {
  constructor(
    readonly code:
      | "network"
      | "invalid_response"
      | "not_allowed"
      | "email_unverified"
      | "pending"
      | "closed"
      | "unavailable",
    readonly reference?: string,
  ) {
    super(code);
    this.name = "CreditsError";
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function baseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CreditsError("invalid_response");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new CreditsError("invalid_response");
  return url;
}

function httpsUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048)
    throw new CreditsError("invalid_response");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CreditsError("invalid_response");
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new CreditsError("invalid_response");
  return url.toString();
}

function stripeUrl(value: unknown): string {
  const safe = httpsUrl(value);
  if (new URL(safe).hostname !== "checkout.stripe.com")
    throw new CreditsError("invalid_response");
  return safe;
}

async function boundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES)
    throw new CreditsError("invalid_response");
  const reader = response.body?.getReader();
  if (!reader) throw new CreditsError("invalid_response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new CreditsError("invalid_response");
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
    if (error instanceof CreditsError) throw error;
    throw new CreditsError("invalid_response");
  } finally {
    for (const chunk of chunks) chunk.fill(0);
  }
}

function status(value: unknown): CreditIntent["status"] {
  if (typeof value !== "string" || !STATUSES.includes(value as never))
    throw new CreditsError("invalid_response");
  return value as CreditIntent["status"];
}

function intentFrom(value: unknown): CreditIntent {
  const item = object(value);
  if (
    !item ||
    typeof item.reference !== "string" ||
    !/^credit-[0-9a-f-]{36}$/i.test(item.reference) ||
    typeof item.idempotencyKey !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(item.idempotencyKey) ||
    typeof item.packId !== "string" ||
    item.packId.length > 100 ||
    typeof item.createdAt !== "string" ||
    !Number.isFinite(Date.parse(item.createdAt))
  )
    throw new CreditsError("invalid_response");
  return {
    reference: item.reference,
    idempotencyKey: item.idempotencyKey,
    packId: item.packId,
    status: status(item.status),
    createdAt: item.createdAt,
  };
}

/** Signed payment operations against one pinned account relay. */
export function createCreditsClient(
  relayHttpUrl: string,
  accountPubkey: string,
  fetcher: typeof fetch = fetch,
) {
  const base = baseUrl(relayHttpUrl);
  if (!/^[0-9a-f]{64}$/i.test(accountPubkey))
    throw new CreditsError("invalid_response");

  async function request(
    path: string,
    method: "GET" | "POST" = "GET",
    body?: string,
    signed = false,
  ): Promise<{ result: unknown; response: Response }> {
    const url = new URL(path.replace(/^\//, ""), base).toString();
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (signed) {
      const tags = [
        ["u", url],
        ["method", method],
        ["nonce", crypto.randomUUID()],
      ];
      if (body !== undefined) {
        const digest = new Uint8Array(
          await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)),
        );
        tags.push([
          "payload",
          Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
            "",
          ),
        ]);
      }
      const event = await signEvent({ kind: 27235, content: "", tags });
      if (
        event.pubkey !== accountPubkey ||
        !verifyEvent(event as Parameters<typeof verifyEvent>[0])
      )
        throw new CreditsError("not_allowed");
      headers.Authorization = `Nostr ${btoa(JSON.stringify(event))}`;
    }
    let response: Response;
    try {
      response = await fetcher(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
      });
    } catch {
      throw new CreditsError("network");
    }
    return { result: await boundedJson(response), response };
  }

  function paymentError(response: Response, value: unknown): never {
    const raw = object(value);
    const reference =
      typeof raw?.reference === "string" &&
      /^credit-[0-9a-f-]{36}$/i.test(raw.reference)
        ? raw.reference
        : undefined;
    if (raw?.error === "email_unverified")
      throw new CreditsError("email_unverified");
    if (response.status === 401 || response.status === 403)
      throw new CreditsError("not_allowed");
    if (
      response.status === 409 &&
      reference &&
      ["payment_pending", "payment_uncertain"].includes(String(raw?.error))
    )
      throw new CreditsError("pending", reference);
    if (response.status === 409 && raw?.error === "checkout_closed")
      throw new CreditsError("closed", reference);
    throw new CreditsError(
      response.status === 503 ? "unavailable" : "network",
      reference,
    );
  }

  return {
    async capability(): Promise<CreditCatalog | null> {
      const native = await nativeInvoke("colony_credits_gateway_enabled");
      if (native === false) return null;
      if (native !== true) throw new CreditsError("invalid_response");
      const gateway = await request("/api/credits-gateway/capabilities");
      if (gateway.response.status === 404) return null;
      if (!gateway.response.ok) paymentError(gateway.response, gateway.result);
      const available = object(gateway.result);
      if (
        available?.enabled !== true ||
        available.runtime !== "colony" ||
        typeof available.model !== "string" ||
        !available.model.trim()
      )
        return null;
      const catalog = await request("/api/payments/packs");
      if (!catalog.response.ok) paymentError(catalog.response, catalog.result);
      const data = object(catalog.result);
      if (data?.enabled !== true || data.provider !== "stripe") return null;
      const policies = object(data.policyUrls);
      if (!policies || !Array.isArray(data.packs) || data.packs.length > 16)
        throw new CreditsError("invalid_response");
      const packs = data.packs.map((value): CreditPack => {
        const pack = object(value);
        if (
          !pack ||
          typeof pack.id !== "string" ||
          !/^[a-z0-9-]{1,100}$/.test(pack.id) ||
          pack.chargeCurrency !== "USD" ||
          !Number.isSafeInteger(pack.chargeMinorUnits) ||
          (pack.chargeMinorUnits as number) <= 0 ||
          !Number.isSafeInteger(pack.grantUsdCents) ||
          (pack.grantUsdCents as number) <= 0
        )
          throw new CreditsError("invalid_response");
        return {
          id: pack.id,
          chargeMinorUnits: pack.chargeMinorUnits as number,
          grantUsdCents: pack.grantUsdCents as number,
        };
      });
      if (
        packs.length === 0 ||
        new Set(packs.map((pack) => pack.id)).size !== packs.length
      )
        throw new CreditsError("invalid_response");
      return {
        packs,
        policyUrls: {
          terms: httpsUrl(policies.terms),
          acceptableUse: httpsUrl(policies.acceptableUse),
        },
      };
    },
    async snapshot(): Promise<CreditSnapshot> {
      const history = await request(
        "/api/payments/history",
        "GET",
        undefined,
        true,
      );
      if (!history.response.ok) paymentError(history.response, history.result);
      const data = object(history.result);
      if (
        !Array.isArray(data?.paymentIntents) ||
        data.paymentIntents.length > 100
      )
        throw new CreditsError("invalid_response");
      const intents = data.paymentIntents.map(intentFrom);
      const balance = await request(
        "/api/payments/balance",
        "GET",
        undefined,
        true,
      );
      if (!balance.response.ok) paymentError(balance.response, balance.result);
      const funds = object(balance.result)?.balanceUsdCents;
      if (!Number.isSafeInteger(funds) || (funds as number) < 0)
        throw new CreditsError("invalid_response");
      return { balanceUsdCents: funds as number, intents };
    },
    async checkout(
      packId: string,
      idempotencyKey: string,
    ): Promise<CreditCheckout> {
      const body = JSON.stringify({ packId, idempotencyKey });
      const reply = await request("/api/payments/checkout", "POST", body, true);
      if (!reply.response.ok) paymentError(reply.response, reply.result);
      const checkout = object(reply.result);
      if (
        !checkout ||
        checkout.provider !== "stripe" ||
        checkout.idempotencyKey !== idempotencyKey ||
        typeof checkout.reference !== "string" ||
        !/^credit-[0-9a-f-]{36}$/i.test(checkout.reference) ||
        checkout.currency !== "USD" ||
        !Number.isSafeInteger(checkout.amountMinorUnits) ||
        (checkout.amountMinorUnits as number) <= 0 ||
        !Number.isSafeInteger(checkout.grantUsdCents) ||
        (checkout.grantUsdCents as number) <= 0 ||
        (checkout.authorizationUrl !== null &&
          checkout.authorizationMethod !== "GET") ||
        (checkout.authorizationUrl === null &&
          checkout.authorizationMethod !== null)
      )
        throw new CreditsError("invalid_response");
      return {
        reference: checkout.reference,
        idempotencyKey,
        status: status(checkout.status),
        chargeMinorUnits: checkout.amountMinorUnits as number,
        grantUsdCents: checkout.grantUsdCents as number,
        authorizationUrl:
          checkout.authorizationUrl === null
            ? null
            : stripeUrl(checkout.authorizationUrl),
      };
    },
    async intent(reference: string): Promise<CreditIntent> {
      if (!/^credit-[0-9a-f-]{36}$/i.test(reference))
        throw new CreditsError("invalid_response");
      const reply = await request(
        `/api/payments/intents/${encodeURIComponent(reference)}`,
        "GET",
        undefined,
        true,
      );
      if (!reply.response.ok) paymentError(reply.response, reply.result);
      return intentFrom(reply.result);
    },
  };
}

export function openCreditIntent(
  snapshot: CreditSnapshot,
): CreditIntent | null {
  return (
    snapshot.intents.find((intent) =>
      OPEN_STATUSES.includes(intent.status as (typeof OPEN_STATUSES)[number]),
    ) ?? null
  );
}
