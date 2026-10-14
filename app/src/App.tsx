import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccountError,
  type Account,
  createAccountClient,
} from "./accountClient";
import { getDefaultRelayUrl, getRelayHttpUrl, getRelayWsUrl } from "./bridge";
import { ColonyShell, type Destination } from "./ColonyShell";
import { FirstRun } from "./FirstRun";

type Connection =
  | "checking"
  | "host-unavailable"
  | "relay-unavailable"
  | "identity-unavailable"
  | "signed-out"
  | "signed-in";

type RelayContext = {
  client: ReturnType<typeof createAccountClient>;
  wsUrl: string;
  httpUrl: string;
};

const headings: Record<Destination, string> = {
  today: "Today",
  conversations: "Conversations",
  team: "Team",
  settings: "Settings",
  needs: "Needs you",
};

export default function App() {
  const generation = useRef(0);
  const [connection, setConnection] = useState<Connection>("checking");
  const [destination, setDestination] = useState<Destination>("today");
  const [relay, setRelay] = useState<RelayContext | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  const connect = useCallback(() => {
    const request = ++generation.current;
    setConnection("checking");
    void (async () => {
      let wsUrl: string;
      let httpUrl: string;
      try {
        await getDefaultRelayUrl();
        [wsUrl, httpUrl] = await Promise.all([
          getRelayWsUrl(),
          getRelayHttpUrl(),
        ]);
      } catch {
        if (generation.current === request) setConnection("host-unavailable");
        return;
      }
      try {
        const client = createAccountClient(httpUrl);
        const current = await client.currentAccount();
        if (generation.current !== request) return;
        setRelay({ client, wsUrl, httpUrl });
        setAccount(current);
        setConnection(current ? "signed-in" : "signed-out");
      } catch (error) {
        if (generation.current !== request) return;
        setConnection(
          error instanceof AccountError &&
            ["identity_unavailable", "identity_changed"].includes(error.code)
            ? "identity-unavailable"
            : "relay-unavailable",
        );
      }
    })();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      generation.current += 1;
    };
  }, [connect]);

  if (connection !== "signed-in" || !account) {
    if (connection === "signed-out" && relay) {
      return (
        <FirstRun
          client={relay.client}
          relayWsUrl={relay.wsUrl}
          relayHttpUrl={relay.httpUrl}
          onAuthenticated={(authenticated) => {
            setAccount(authenticated);
            setConnection("signed-in");
          }}
        />
      );
    }
    const unavailable = connection !== "checking";
    return (
      <main className="startup-state" id="main-content">
        <div className="state-panel" role={unavailable ? "alert" : "status"}>
          <h1>
            {connection === "checking"
              ? "Starting Colony"
              : connection === "host-unavailable"
                ? "Colony host unavailable"
                : connection === "identity-unavailable"
                  ? "This computer's account needs attention"
                  : "Colony can't reach your account"}
          </h1>
          <p>
            {connection === "checking"
              ? "Checking the desktop host and your account."
              : connection === "host-unavailable"
                ? "The desktop host did not respond. Try again, or quit and reopen the app."
                : connection === "identity-unavailable"
                  ? "Colony couldn't read this computer's identity. Try again after unlocking your keychain."
                  : "Check your internet or relay connection, then try again."}
          </p>
          {unavailable && (
            <button type="button" className="primary-button" onClick={connect}>
              Try again
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <ColonyShell active={destination} onNavigate={setDestination} hostReady>
      <div className="screen-content">
        <h1>{headings[destination]}</h1>
        <div className="empty-state">
          <span
            className="scout-portrait"
            role="img"
            aria-label="Scout, AI-made ant portrait"
            data-ant-portrait="Scout"
          />
          <div>
            <h2>
              {destination === "today"
                ? "Your team will meet you here"
                : `${headings[destination]} is being rebuilt`}
            </h2>
            <p>
              {destination === "today"
                ? "The new Colony app is being connected to your company. No work or decisions are shown until they come from the real team."
                : "This part of Colony is being rebuilt. It will appear when its real company data and actions are ready."}
            </p>
          </div>
        </div>
      </div>
    </ColonyShell>
  );
}
