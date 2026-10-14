import { useCallback, useEffect, useRef, useState } from "react";
import { getDefaultRelayUrl } from "./bridge";
import { ColonyShell, type Destination } from "./ColonyShell";

type Connection = "checking" | "ready" | "unavailable";

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

  const connect = useCallback(() => {
    const request = ++generation.current;
    setConnection("checking");
    void getDefaultRelayUrl().then(
      () => {
        if (generation.current === request) setConnection("ready");
      },
      () => {
        if (generation.current === request) setConnection("unavailable");
      },
    );
  }, []);

  useEffect(() => {
    connect();
    return () => { generation.current += 1; };
  }, [connect]);

  return (
    <ColonyShell active={destination} onNavigate={setDestination} connected={connection === "ready"}>
      <div className="screen-content">
        {connection === "checking" ? (
          <div className="state-panel" role="status">
            <h1>Connecting to Colony</h1>
            <p>Checking the connection to your team computer.</p>
          </div>
        ) : connection === "unavailable" ? (
          <div className="state-panel" role="alert">
            <h1>Colony can't connect</h1>
            <p>Colony could not reach the team computer. Try again, or quit and reopen the app.</p>
            <button className="primary-button" onClick={connect}>Try again</button>
          </div>
        ) : (
          <>
            <h1>{headings[destination]}</h1>
            <div className="empty-state">
              <span className="scout-portrait" role="img" aria-label="Scout, AI-made ant portrait" data-ant-portrait="Scout" />
              <div>
                <h2>{destination === "today" ? "Your team will meet you here" : `${headings[destination]} is being rebuilt`}</h2>
                <p>
                  {destination === "today"
                    ? "The new Colony app is being connected to your company. No work or decisions are shown until they come from the real team."
                    : "This part of Colony is being rebuilt. It will appear when its real company data and actions are ready."}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </ColonyShell>
  );
}
