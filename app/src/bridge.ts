export interface ColonyDesktopBridge {
  request(
    type: "invoke",
    payload: { command: string; args: Record<string, unknown> },
  ): Promise<unknown>;
}

declare global {
  interface Window {
    colonyDesktop?: ColonyDesktopBridge;
  }
}

/** Invoke the existing native host without trusting its return shape. */
export async function nativeInvoke(
  command: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const bridge = window.colonyDesktop;
  if (!bridge) throw new Error("The Colony native host is unavailable.");
  return bridge.request("invoke", { command, args });
}

async function nativeString(command: string): Promise<string> {
  const value = await nativeInvoke(command);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`The Colony native host returned an invalid ${command}.`);
  }
  return value;
}

/** Reads the default relay location before the app shows product data. */
export function getDefaultRelayUrl(): Promise<string> {
  return nativeString("get_default_relay_url");
}

/** The current community relay, including any native override. */
export function getRelayWsUrl(): Promise<string> {
  return nativeString("get_relay_ws_url");
}

/** The current community account API location. */
export function getRelayHttpUrl(): Promise<string> {
  return nativeString("get_relay_http_url");
}

export type NativeIdentity = {
  pubkey: string;
  lost: boolean;
  locked: boolean;
  resetFailed: boolean;
};

function identityFrom(value: unknown): NativeIdentity {
  if (typeof value !== "object" || value === null) {
    throw new Error("The Colony identity is unavailable.");
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.pubkey !== "string" || !/^[0-9a-f]{64}$/i.test(raw.pubkey)) {
    throw new Error("The Colony identity is unavailable.");
  }
  return {
    pubkey: raw.pubkey,
    lost: raw.lost === true,
    locked: raw.locked === true,
    resetFailed: raw.reset_failed === true,
  };
}

/** Inspect the active native identity without exposing its signing key. */
export async function getIdentity(): Promise<NativeIdentity> {
  return identityFrom(await nativeInvoke("get_identity"));
}

/** Persist a verified account's signing identity through the existing host. */
export async function importIdentity(nsec: string): Promise<NativeIdentity> {
  return identityFrom(await nativeInvoke("import_identity", { nsec }));
}

/** Sign a Nostr HTTP authentication event with the native identity. */
export async function signEvent(input: {
  kind: number;
  content: string;
  tags: string[][];
}): Promise<Record<string, unknown>> {
  const raw = await nativeInvoke("sign_event", input);
  if (typeof raw !== "string")
    throw new Error("The native signer did not return an event.");
  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    throw new Error("The native signer returned an invalid event.");
  }
  if (typeof event !== "object" || event === null || Array.isArray(event)) {
    throw new Error("The native signer returned an invalid event.");
  }
  return event as Record<string, unknown>;
}

export type JoinPolicy = {
  version: string;
  ageAttestationRequired: boolean;
  hasTerms: boolean;
  hasPrivacy: boolean;
};

/** Discover the relay's current policy via native networking. */
export async function getJoinPolicy(
  relayWsUrl: string,
): Promise<JoinPolicy | null> {
  const value = await nativeInvoke("fetch_join_policy", {
    relayUrl: relayWsUrl,
  });
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The relay returned an invalid join policy.");
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.version !== "string" ||
    raw.version.length < 1 ||
    raw.version.length > 64 ||
    typeof raw.age_attestation_required !== "boolean"
  ) {
    throw new Error("The relay returned an invalid join policy.");
  }
  return {
    version: raw.version,
    ageAttestationRequired: raw.age_attestation_required,
    hasTerms:
      typeof raw.terms_markdown === "string" && raw.terms_markdown.length > 0,
    hasPrivacy:
      typeof raw.privacy_markdown === "string" &&
      raw.privacy_markdown.length > 0,
  };
}
