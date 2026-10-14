export interface ColonyDesktopBridge {
  request(type: "invoke", payload: { command: string; args: Record<string, never> }): Promise<unknown>;
}

declare global {
  interface Window {
    colonyDesktop?: ColonyDesktopBridge;
  }
}

/** Reads the relay location through the native host before showing product data. */
export async function getDefaultRelayUrl(): Promise<string> {
  const bridge = window.colonyDesktop;
  if (!bridge) throw new Error("The Colony native host is unavailable.");
  const result = await bridge.request("invoke", {
    command: "get_default_relay_url",
    args: {},
  });
  if (typeof result !== "string" || !result.trim()) {
    throw new Error("The Colony native host did not provide a relay URL.");
  }
  return result;
}
