import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccountError,
  type Account,
  createAccountClient,
} from "./accountClient";
import { getDefaultRelayHttpUrl, getDefaultRelayUrl } from "./bridge";
import { ColonyShell, type Destination } from "./ColonyShell";
import { CompanyEntry, CompanyPicker } from "./CompanyEntry";
import { Conversations } from "./Conversations";
import { createConversationClient } from "./conversationClient";
import {
  type BusinessProfile,
  type Company,
  CompanyError,
  createCompanyClient,
  type ProvisioningConfig,
} from "./companyClient";
import { FirstRun } from "./FirstRun";
import { PowerEntry } from "./PowerEntry";

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

type CompanyContext = {
  client: ReturnType<typeof createCompanyClient>;
  config: ProvisioningConfig;
};

type CompanyState =
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | { kind: "new"; context: CompanyContext }
  | {
      kind: "choose";
      context: CompanyContext;
      companies: { company: Company; name: string; available: boolean }[];
    }
  | { kind: "setup"; context: CompanyContext; company: Company }
  | { kind: "ready"; company: Company; profile: BusinessProfile };

const headings: Record<Destination, string> = {
  today: "Today",
  conversations: "Conversations",
  team: "Team",
  settings: "Settings",
  needs: "Needs you",
};

function powerSetupKey(accountPubkey: string, companyId: string) {
  return `colony-global-power-setup:${accountPubkey}:${companyId}`;
}

export default function App() {
  const generation = useRef(0);
  const companyGeneration = useRef(0);
  const [connection, setConnection] = useState<Connection>("checking");
  const [destination, setDestination] = useState<Destination>("today");
  const [relay, setRelay] = useState<RelayContext | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [companyState, setCompanyState] = useState<CompanyState>({
    kind: "checking",
  });
  const [powerPending, setPowerPending] = useState(false);
  const [showPower, setShowPower] = useState(false);
  const [powerStorageWarning, setPowerStorageWarning] = useState(false);
  const [workspaceBinding, setWorkspaceBinding] = useState<{
    key: string;
    status: "checking" | "ready" | "error";
  }>({ key: "", status: "checking" });
  const workspaceGeneration = useRef(0);

  const connect = useCallback(() => {
    const request = ++generation.current;
    setConnection("checking");
    void (async () => {
      let wsUrl: string;
      let httpUrl: string;
      try {
        [wsUrl, httpUrl] = await Promise.all([
          getDefaultRelayUrl(),
          getDefaultRelayHttpUrl(),
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

  const openCompany = useCallback(
    async (company: Company, context: CompanyContext, request: number) => {
      try {
        const profile = await context.client.profile(company, context.config);
        if (companyGeneration.current !== request) return;
        if (profile) {
          let pending = false;
          try {
            pending =
              company.role === "owner" &&
              localStorage.getItem(
                powerSetupKey(account?.pubkey ?? "", company.id),
              ) === "pending";
          } catch {
            /* A server profile remains usable when local setup storage is unavailable. */
          }
          setPowerPending(pending);
          setShowPower(pending);
          setCompanyState({ kind: "ready", company, profile });
        } else if (company.role === "owner")
          setCompanyState({ kind: "setup", context, company });
        else
          setCompanyState({
            kind: "error",
            message:
              "This company is still being set up by its owner. Try again later.",
          });
      } catch {
        if (companyGeneration.current === request) {
          setCompanyState({
            kind: "error",
            message:
              "Colony couldn't load this company's business profile. Check your connection and try again.",
          });
        }
      }
    },
    [account?.pubkey],
  );

  const refreshCompanies = useCallback(() => {
    if (!relay || !account) return;
    const request = ++companyGeneration.current;
    setCompanyState({ kind: "checking" });
    setPowerPending(false);
    setShowPower(false);
    void (async () => {
      try {
        const client = createCompanyClient(relay.httpUrl, account.pubkey);
        const config = await client.config();
        const companies = await client.list(config);
        if (companyGeneration.current !== request) return;
        const context = { client, config };
        if (companies.length === 0) setCompanyState({ kind: "new", context });
        else if (companies.length === 1)
          await openCompany(companies[0], context, request);
        else {
          const named = await Promise.all(
            companies.map(async (company) => {
              try {
                return {
                  company,
                  name:
                    (await client.profile(company, config))?.name ??
                    "Company being set up",
                  available: true,
                };
              } catch {
                return {
                  company,
                  name: "Company temporarily unavailable",
                  available: false,
                };
              }
            }),
          );
          if (companyGeneration.current === request)
            setCompanyState({ kind: "choose", context, companies: named });
        }
      } catch (error) {
        if (companyGeneration.current !== request) return;
        setCompanyState({
          kind: "error",
          message:
            error instanceof CompanyError && error.code === "not_enabled"
              ? "Company setup isn't available on this Colony service yet. Try again after it is enabled."
              : "Colony couldn't find your companies. Check your internet and try again.",
        });
      }
    })();
  }, [account, relay, openCompany]);

  useEffect(() => {
    if (connection === "signed-in" && account && relay) refreshCompanies();
    return () => {
      companyGeneration.current += 1;
    };
  }, [connection, account, relay, refreshCompanies]);

  const readyCompany =
    companyState.kind === "ready" ? companyState.company : null;
  const workspaceKey =
    readyCompany && account
      ? `${readyCompany.id}:${readyCompany.host}:${account.pubkey}`
      : "";
  const workspaceStatus =
    workspaceBinding.key === workspaceKey
      ? workspaceBinding.status
      : "checking";
  const conversationClient = useMemo(
    () =>
      readyCompany && account
        ? createConversationClient(
            readyCompany.host,
            readyCompany.id,
            account.pubkey,
          )
        : null,
    [readyCompany, account],
  );

  const activateCompany = useCallback(() => {
    if (!conversationClient) return;
    const request = ++workspaceGeneration.current;
    setWorkspaceBinding({ key: workspaceKey, status: "checking" });
    void conversationClient.activate().then(
      () => {
        if (workspaceGeneration.current === request)
          setWorkspaceBinding({ key: workspaceKey, status: "ready" });
      },
      () => {
        if (workspaceGeneration.current === request)
          setWorkspaceBinding({ key: workspaceKey, status: "error" });
      },
    );
  }, [conversationClient, workspaceKey]);

  useEffect(() => {
    activateCompany();
    return () => {
      workspaceGeneration.current++;
    };
  }, [activateCompany]);

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

  if (companyState.kind === "new" || companyState.kind === "setup") {
    return (
      <CompanyEntry
        key={`${account.pubkey}:${companyState.kind === "setup" ? companyState.company.id : "new"}`}
        accountPubkey={account.pubkey}
        client={companyState.context.client}
        config={companyState.context.config}
        initialCompany={
          companyState.kind === "setup" ? companyState.company : null
        }
        onComplete={(company, profile) => {
          let warning = false;
          try {
            localStorage.setItem(
              powerSetupKey(account.pubkey, company.id),
              "pending",
            );
          } catch {
            warning = true;
          }
          setPowerStorageWarning(warning);
          setPowerPending(true);
          setShowPower(true);
          setCompanyState({ kind: "ready", company, profile });
        }}
      />
    );
  }

  if (companyState.kind === "choose") {
    return (
      <CompanyPicker
        companies={companyState.companies}
        onRetry={refreshCompanies}
        onSelect={(company) => {
          const request = ++companyGeneration.current;
          setCompanyState({ kind: "checking" });
          void openCompany(company, companyState.context, request);
        }}
      />
    );
  }

  if (companyState.kind !== "ready") {
    return (
      <main className="startup-state" id="main-content">
        <div
          className="state-panel"
          role={companyState.kind === "error" ? "alert" : "status"}
        >
          <h1>
            {companyState.kind === "checking"
              ? "Finding your company"
              : "Your company needs attention"}
          </h1>
          <p>
            {companyState.kind === "checking"
              ? "Checking the companies linked to your account."
              : companyState.message}
          </p>
          {companyState.kind === "error" && (
            <button
              type="button"
              className="primary-button"
              onClick={refreshCompanies}
            >
              Try again
            </button>
          )}
        </div>
      </main>
    );
  }

  if (showPower && companyState.company.role === "owner" && relay) {
    return (
      <PowerEntry
        key={`${account.pubkey}:${companyState.company.id}`}
        accountPubkey={account.pubkey}
        companyName={companyState.profile.name}
        relayHttpUrl={relay.httpUrl}
        onBack={() => setShowPower(false)}
        storageWarning={powerStorageWarning}
      />
    );
  }

  return (
    <ColonyShell
      active={destination}
      onNavigate={setDestination}
      hostReady={workspaceStatus === "ready"}
      companyName={companyState.profile.name}
    >
      {workspaceStatus !== "ready" ? (
        <div className="screen-content">
          <h1>
            {workspaceStatus === "checking"
              ? "Opening your company"
              : "Your company is unavailable"}
          </h1>
          <div
            className="empty-state"
            role={workspaceStatus === "error" ? "alert" : "status"}
          >
            <p>
              {workspaceStatus === "checking"
                ? "Connecting this computer to your company's conversations."
                : "Colony couldn't connect the desktop host to this company. Check your connection and try again."}
            </p>
            {workspaceStatus === "error" && (
              <button
                type="button"
                className="primary-button"
                onClick={activateCompany}
              >
                Try again
              </button>
            )}
          </div>
        </div>
      ) : destination === "conversations" && conversationClient ? (
        <Conversations
          key={workspaceKey}
          client={conversationClient}
          ownPubkey={account.pubkey}
        />
      ) : (
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
              {destination === "today" && powerPending && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowPower(true)}
                >
                  Continue team setup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ColonyShell>
  );
}
