import {
  getIdentity,
  importIdentity,
  signEvent,
  type NativeIdentity,
} from "./bridge";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
export const TERMS_VERSION_WITHOUT_POLICY = "colony-first-run-2026-10-13";

export type Account = {
  id: string;
  email: string;
  pubkey: string;
  hasPassword: boolean;
  googleLinked: boolean;
};

export type AccountErrorCode =
  | "invalid_request"
  | "invalid_code"
  | "code_expired"
  | "too_many_attempts"
  | "resend_cooldown"
  | "rate_limited"
  | "account_not_found"
  | "network_error"
  | "invalid_response"
  | "invalid_relay_url"
  | "insecure_transport"
  | "identity_unavailable"
  | "identity_import_failed"
  | "identity_changed"
  | "server_error";

/** Failure metadata safe to show to first-run UI; no relay body or secret. */
export class AccountError extends Error {
  constructor(
    readonly code: AccountErrorCode,
    readonly retryAfterSecs?: number,
    readonly remainingAttempts?: number,
  ) {
    super(code);
    this.name = "AccountError";
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function integer(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function accountFrom(value: unknown): Account {
  const raw = record(value);
  if (
    !raw ||
    typeof raw.id !== "string" ||
    typeof raw.email !== "string" ||
    typeof raw.pubkey !== "string" ||
    !/^[0-9a-f]{64}$/i.test(raw.pubkey) ||
    typeof raw.has_password !== "boolean" ||
    typeof raw.google_linked !== "boolean"
  ) {
    throw new AccountError("invalid_response");
  }
  return {
    id: raw.id,
    email: raw.email,
    pubkey: raw.pubkey,
    hasPassword: raw.has_password,
    googleLinked: raw.google_linked,
  };
}

function relayBase(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AccountError("invalid_relay_url");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new AccountError("invalid_relay_url");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new AccountError("insecure_transport");
  }
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

function endpoint(base: URL, path: string): string {
  return new URL(path.replace(/^\//, ""), base).toString();
}

async function responseJson(response: Response): Promise<unknown> {
  const declared = response.headers.get("Content-Length");
  if (declared !== null && Number(declared) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new AccountError("invalid_response");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new AccountError("invalid_response");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        value.fill(0);
        await reader.cancel().catch(() => undefined);
        throw new AccountError("invalid_response");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
      chunk.fill(0);
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    } catch {
      throw new AccountError("invalid_response");
    } finally {
      bytes.fill(0);
    }
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("network_error");
  } finally {
    for (const chunk of chunks) chunk.fill(0);
  }
}

function failure(response: Response, body: unknown): AccountError {
  const raw = record(body);
  const code = raw?.error;
  const retry = integer(raw?.retry_after_secs);
  const attempts = integer(raw?.attempts_left ?? raw?.remaining_attempts);
  if (response.status === 404 && code === "account_not_found") {
    return new AccountError("account_not_found");
  }
  if (
    response.status === 400 &&
    (code === "invalid_request" || code === "invalid_code")
  ) {
    return new AccountError(code, undefined, attempts);
  }
  if (response.status === 410 && code === "code_expired") {
    return new AccountError("code_expired");
  }
  if (response.status === 429) {
    const limited =
      code === "too_many_attempts" || code === "resend_cooldown"
        ? code
        : "rate_limited";
    return new AccountError(limited, retry, attempts);
  }
  return new AccountError("server_error");
}

/** Account routes used by the shipped first-run screens. */
export function createAccountClient(
  baseUrl: string,
  fetcher: typeof fetch = fetch,
) {
  const base = relayBase(baseUrl);

  async function request(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    authorization?: string,
  ): Promise<unknown> {
    const url = endpoint(base, path);
    let response: Response;
    try {
      response = await fetcher(url, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(authorization ? { Authorization: authorization } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
      });
    } catch {
      throw new AccountError("network_error");
    }
    const parsed = await responseJson(response);
    if (!response.ok) throw failure(response, parsed);
    if (response.status !== 200) throw new AccountError("invalid_response");
    return parsed;
  }

  return {
    async startEmailSignIn(email: string): Promise<number> {
      const normalized = email.trim().toLowerCase();
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
        normalized.length > 320
      ) {
        throw new AccountError("invalid_request");
      }
      const raw = record(
        await request("POST", "/api/accounts/code/start", {
          email: normalized,
        }),
      );
      const wait = integer(raw?.resendAfterSeconds);
      if (raw?.sent !== true || wait === undefined || wait < 1) {
        throw new AccountError("invalid_response");
      }
      return wait;
    },

    async verifyEmailSignIn(
      email: string,
      code: string,
      termsVersion = TERMS_VERSION_WITHOUT_POLICY,
    ): Promise<Account> {
      if (!/^\d{6}$/.test(code) || !termsVersion || termsVersion.length > 64) {
        throw new AccountError("invalid_request");
      }
      const raw = record(
        await request("POST", "/api/accounts/code/verify", {
          email: email.trim().toLowerCase(),
          code,
          termsVersion,
        }),
      );
      if (!raw || typeof raw.nsec !== "string" || !raw.nsec) {
        throw new AccountError("invalid_response");
      }
      let nsec = raw.nsec;
      raw.nsec = "";
      try {
        const account = accountFrom(raw.account);
        if (account.email.toLowerCase() !== email.trim().toLowerCase()) {
          throw new AccountError("invalid_response");
        }
        let imported: NativeIdentity;
        try {
          imported = await importIdentity(nsec);
        } catch {
          throw new AccountError("identity_import_failed");
        }
        if (imported.pubkey.toLowerCase() !== account.pubkey.toLowerCase()) {
          throw new AccountError("identity_import_failed");
        }
        return account;
      } finally {
        nsec = "";
      }
    },

    async currentAccount(): Promise<Account | null> {
      let identity: NativeIdentity;
      try {
        identity = await getIdentity();
        if (identity.lost || identity.locked || identity.resetFailed) {
          throw new Error("Identity requires recovery");
        }
      } catch {
        throw new AccountError("identity_unavailable");
      }
      const url = endpoint(base, "/api/accounts/me");
      let event: Record<string, unknown>;
      try {
        event = await signEvent({
          kind: 27235,
          content: "",
          tags: [
            ["u", url],
            ["method", "GET"],
            ["nonce", crypto.randomUUID()],
          ],
        });
      } catch {
        throw new AccountError("identity_unavailable");
      }
      if (
        typeof event.pubkey !== "string" ||
        event.pubkey.toLowerCase() !== identity.pubkey.toLowerCase()
      ) {
        throw new AccountError("identity_changed");
      }
      let account: Account | null;
      try {
        const body = record(
          await request(
            "GET",
            "/api/accounts/me",
            undefined,
            `Nostr ${btoa(JSON.stringify(event))}`,
          ),
        );
        try {
          account = accountFrom(body);
        } catch (error) {
          if (
            !(error instanceof AccountError) ||
            error.code !== "invalid_response"
          )
            throw error;
          account = accountFrom(body?.account);
        }
        if (account.pubkey.toLowerCase() !== identity.pubkey.toLowerCase()) {
          throw new AccountError("invalid_response");
        }
      } catch (error) {
        if (
          !(error instanceof AccountError) ||
          error.code !== "account_not_found"
        )
          throw error;
        account = null;
      }
      const after = await getIdentity().catch(() => {
        throw new AccountError("identity_unavailable");
      });
      if (after.pubkey.toLowerCase() !== identity.pubkey.toLowerCase()) {
        throw new AccountError("identity_changed");
      }
      return account;
    },
  };
}
