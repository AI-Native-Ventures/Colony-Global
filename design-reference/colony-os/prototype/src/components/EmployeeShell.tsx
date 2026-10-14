import { useEffect, type ReactNode } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Avatar, Button, StatusChip, employeeWithState } from "./primitives";
import { mockStore, useMock } from "../data/mock-store";
import {
  displayName,
  rememberTab,
  restartEmployee,
  saveProfile,
} from "../data/team-actions";
import type { EmployeeId } from "../data/types";
import { CommonContent, type ScreenProps } from "../screens/shared";
export const employeeTabs = [
  "Desk",
  "Plan",
  "Schedule",
  "Activity",
  "Settings",
];
export const tabRoutes = ["M-02", "M-03", "M-04", "M-05", "M-06"];
export function EmployeeShell({
  name,
  tab = "Desk",
  children,
  ...props
}: ScreenProps & { name: EmployeeId; tab?: string; children: ReactNode }) {
  const { state, partner, onDestination, onNotice } = props;
  const data = useMock(),
    profile = data.team.profiles[name],
    person = employeeWithState(name, state),
    label = displayName(name);
  const gone = profile.retired || state === "let-go";
  const actor = partner ? "Kagiso" : "Lerato";
  const tabs = employeeTabs.filter((t) => !gone || t !== "Settings");
  const lifecycle =
    state === "working" ||
    ![
      "paused-person",
      "paused-credits",
      "paused-budget",
      "paused-plan",
      "stopped",
      "failing",
      "starting",
    ].includes(state)
      ? profile.lifecycle || state
      : state;
  const navigateTab = (target: string) => {
    rememberTab(name, target);
    onDestination(
      tabRoutes[employeeTabs.indexOf(target)],
      gone ? "let-go" : state === "offline" ? "offline" : undefined,
      { employee: name, tab: target, focusTab: "1" },
    );
  };
  useEffect(() => {
    const params = new URLSearchParams(location.hash.split("?")[1]);
    if (
      params.get("focusTab") === "1" &&
      !document.querySelector("dialog[open]")
    )
      document.getElementById("employee-tab-" + tab)?.focus();
  }, [name, tab]);
  return (
    <div className="employee-page team-detail">
      <Button
        tone="quiet"
        className="back-link"
        onClick={() => onDestination("M-01")}
      >
        <ArrowLeft size={15} />
        Team
      </Button>
      {["stopped", "failing"].includes(lifecycle) && (
        <div className="employee-problem">
          <Avatar name="Scout" size="small" />
          <p>
            {label} ran into a problem and stopped. Restart{" "}
            {name === "Naledi" ? "her" : label}?
          </p>
          <Button
            tone="quiet"
            onClick={() =>
              onDestination("T-03", undefined, {
                quote: "What happened to " + label + "?",
              })
            }
          >
            Ask Scout what happened
          </Button>
        </div>
      )}
      <CommonContent
        state={state}
        onRetry={() =>
          onDestination(tabRoutes[employeeTabs.indexOf(tab)], undefined, {
            employee: name,
          })
        }
      >
        <header className="employee-hero">
          <Avatar name={name} size="hero" />
          <div className="employee-hero-copy">
            <span className="eyebrow">{person.role}</span>
            <h1>
              {label}
              {!gone && <StatusChip status={person.status} />}
            </h1>
            <p className="reporting-line">
              Reports to{" "}
              {name === "Scout"
                ? "you"
                : displayName(person.reportsTo as EmployeeId)}
            </p>
            <p className="employee-current">
              {gone
                ? "Let go by " + (profile.changedBy || "Lerato") + " on 3 Nov."
                : person.task}
            </p>
            {state !== "waiting" && person.waiting > 0 && !gone && (
              <Button
                tone="quiet"
                onClick={() =>
                  onDestination("T-05", "employee", { employee: name })
                }
              >
                {person.waiting}{" "}
                {person.waiting === 1 ? "decision" : "decisions"} waiting on
                you.
              </Button>
            )}
            {state === "waiting" && (
              <Button tone="quiet" onClick={() => onDestination("C-14")}>
                Waiting on you: approve the brand kit, and 1 more.
              </Button>
            )}
            {state === "other-computer" && (
              <p className="muted">Your team runs on Lerato's MacBook.</p>
            )}
            {!gone && lifecycle === "paused-person" && (
              <Button
                disabled={state === "offline"}
                onClick={() => {
                  saveProfile(name, { lifecycle: "working" }, actor);
                  onDestination(
                    tabRoutes[employeeTabs.indexOf(tab)],
                    undefined,
                    { employee: name },
                  );
                  onNotice(label + " resumed.");
                }}
              >
                Resume
              </Button>
            )}
            {!gone && ["stopped", "failing"].includes(lifecycle) && (
              <Button
                disabled={state === "offline"}
                onClick={() => {
                  restartEmployee(name, actor, state === "computer-off");
                  onDestination(
                    tabRoutes[employeeTabs.indexOf(tab)],
                    undefined,
                    { employee: name },
                  );
                }}
              >
                Restart
              </Button>
            )}
            {state === "paused-credits" &&
              (partner ? (
                <p className="muted">
                  Only Lerato can buy credits. We've let her know.
                </p>
              ) : (
                <Button onClick={() => onDestination("S-02")}>
                  Buy credits
                </Button>
              ))}
            {state === "paused-budget" && (
              <Button
                onClick={() =>
                  onDestination("C-16", undefined, { employee: name })
                }
              >
                Raise budget
              </Button>
            )}
            {state === "paused-plan" && (
              <Button onClick={() => onDestination("S-03")}>
                See your plan
              </Button>
            )}
          </div>
          <div className="employee-hero-side">
            <p>
              <strong>${person.used.toFixed(2)}</strong> of $
              {person.budget.toFixed(2)} this week.
            </p>
            {!gone && (
              <Button
                onClick={() =>
                  onDestination(
                    "M-07",
                    state === "offline" ? "offline" : undefined,
                    { employee: name },
                  )
                }
              >
                <MessageCircle size={15} />
                Message {label}
              </Button>
            )}
          </div>
        </header>
        <div
          className="tabs employee-tabs"
          role="tablist"
          aria-label={label + "'s work"}
        >
          {tabs.map((t, i) => (
            <button
              role="tab"
              key={t}
              id={"employee-tab-" + t}
              aria-controls="employee-panel"
              aria-selected={tab === t}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => navigateTab(t)}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                  return;
                e.preventDefault();
                const buttons =
                  e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                    "[role=tab]",
                  );
                buttons[
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (i + (e.key === "ArrowLeft" ? -1 : 1) + tabs.length) %
                        tabs.length
                ]?.focus();
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <section
          className="desk-panel team-panel"
          id="employee-panel"
          role="tabpanel"
          aria-labelledby={
            gone && tab === "Settings" ? undefined : "employee-tab-" + tab
          }
          aria-label={
            gone && tab === "Settings" ? "Settings unavailable" : undefined
          }
          tabIndex={0}
        >
          {state === "starting" && tab !== "Desk" ? (
            <p className="team-empty-line">{label} is getting ready.</p>
          ) : gone && tab === "Settings" ? (
            <p>Settings are no longer available.</p>
          ) : (
            children
          )}
        </section>
      </CommonContent>
    </div>
  );
}
