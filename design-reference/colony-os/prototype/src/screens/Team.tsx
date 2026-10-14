import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { useMock } from "../data/mock-store";
import { displayName } from "../data/team-actions";
import { openDeskCount } from "../data/desk-actions";
import { EmployeeShell } from "../components/EmployeeShell";
import { employees } from "../data/fixtures";
import {
  Avatar,
  Button,
  Empty,
  Identity,
  StatusChip,
  employeeWithState,
} from "../components/primitives";
import { CommonContent, type ScreenProps } from "./shared";
import type { EmployeeId } from "../data/types";
import { EmployeeDesk } from "./desks/EmployeeDesk";

export function Team({ state, partner, onDestination, onNotice }: ScreenProps) {
  const data = useMock();
  const active = employees.filter((e) => !data.team.profiles[e.name].retired);
  const list = state === "only-scout" ? active.slice(0, 1) : active;
  const former = employees.filter((e) => data.team.profiles[e.name].retired);
  const waiting =
    Object.values(data.cards).filter(
      (c) =>
        ["waiting", "changes", "ready"].includes(c.status) &&
        ["C-05", "C-01"].includes(c.id),
    ).length +
    Object.values(data.team.plans).filter(
      (c) => c.status === "waiting" || c.status === "changes",
    ).length + openDeskCount(data);
  const used = list.reduce((n, e) => n + e.used, 0);
  return (
    <div className="team-screen">
      <header className="page-heading">
        <span className="eyebrow">{data.settings.business.name}</span>
        <h1>Your team.</h1>
        <p>
          {state === "first-day"
            ? "Your team is getting to know your business. Each plan comes to you for a yes."
            : state === "only-scout"
              ? "Only Scout is on your team right now. Ask Scout to hire someone."
              : state === "waiting"
                ? `${waiting} ${waiting === 1 ? "decision" : "decisions"} waiting on you. ${list.length} ${list.length === 1 ? "employee" : "employees"}. $${used.toFixed(2)} used this week.`
                : `${list.length} ${list.length === 1 ? "employee" : "employees"}. ${waiting} ${waiting === 1 ? "decision" : "decisions"} waiting on you. $${used.toFixed(2)} used this week.`}
        </p>
        {state === "other-computer" && (
          <p className="muted">Your team runs on Lerato's MacBook</p>
        )}
        {state === "offline" && <p className="muted">As of 10:42</p>}
      </header>
      <CommonContent state={state} onRetry={() => onDestination("M-01")}>
        {state === "empty" ? (
          <Empty text="Your team is getting ready." />
        ) : (
          <div className="employee-list" role="group" aria-label="Team members">
            {list.map((e, i) => {
              const person = employeeWithState(
                e.name,
                state === "stopped-elsewhere" ? "team-stopped" : data.paused && ["normal", "partner"].includes(state) ? "paused-person" : state,
              );
              return (
                <article
                  key={e.name}
                  className={
                    "employee-row " +
                    (e.name === "Naledi" ? "reports-to-maya" : "")
                  }
                >
                  <div className="employee-row-person">
                    <Identity
                      person={person}
                      onOpen={() =>
                        onDestination(
                          data.team.profiles[e.name].setup === "starting"
                            ? "M-08"
                            : "M-02",
                          undefined,
                          { employee: e.name, restoreTab: "1" },
                        )
                      }
                      showStatus={false}
                    />
                    <small className="reporting-line">
                      {e.name === "Scout"
                        ? "Reports to you"
                        : "Reports to " +
                          displayName(e.reportsTo as EmployeeId)}
                    </small>
                  </div>
                  <button
                    className="employee-task"
                    onClick={() =>
                      onDestination(
                        data.team.profiles[e.name].setup === "starting"
                          ? "M-08"
                          : "M-02",
                        undefined,
                        { employee: e.name, restoreTab: "1" },
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowDown" ||
                        event.key === "ArrowUp"
                      ) {
                        event.preventDefault();
                        const rows =
                          document.querySelectorAll<HTMLButtonElement>(
                            ".employee-task",
                          );
                        rows[
                          (i +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            rows.length) %
                            rows.length
                        ]?.focus();
                      }
                    }}
                  >
                    <StatusChip status={person.status} />
                    <p>{person.task}</p>
                    <small>
                      {state === "offline"
                        ? "Last worked at 10:42"
                        : person.status === "Working"
                          ? "Active now"
                          : person.status === "Free"
                            ? "Last worked 2 hours ago"
                            : "Last active at 10:42"}
                    </small>
                  </button>
                  <div className="employee-week">
                    <strong>
                      {"$" + e.used.toFixed(2)}{" "}
                      <span>of {"$" + person.budget.toFixed(2)} this week</span>
                    </strong>
                    {person.waiting > 0 && (
                      <Button
                        tone="quiet"
                        onClick={() =>
                          onDestination("T-05", "employee", {
                            employee: e.name,
                          })
                        }
                      >
                        {person.waiting}{" "}
                        {person.waiting === 1 ? "decision" : "decisions"}{" "}
                        waiting
                        <ArrowRight size={13} />
                      </Button>
                    )}
                    <Button
                      tone="quiet"
                      disabled={state === "offline"}
                      title={
                        state === "offline"
                          ? "You're offline. Message when you're back."
                          : undefined
                      }
                      onClick={() =>
                        onDestination("M-07", undefined, { employee: e.name })
                      }
                    >
                      <MessageCircle size={14} />
                      Message {displayName(e.name)}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {state === "paused-person" && (
          <Button
            tone="primary"
            onClick={() => {
              onDestination("M-01");
              onNotice("Team resumed.");
            }}
          >
            Resume team
          </Button>
        )}
        {state === "team-stopped" && (
          <Button
            tone="primary"
            onClick={() => onDestination("M-01", "first-day")}
          >
            Restart team
          </Button>
        )}
        {state === "stopped-elsewhere" && <p>Restart from Lerato's MacBook</p>}
        <div className="hire-line">
          <Avatar name="Scout" />
          <div>
            <strong>Want someone new on the team? Ask Scout.</strong>
            <p>Tell Scout what you need a hand with.</p>
          </div>
          <Button
            onClick={() =>
              onDestination("T-04", undefined, {
                prefill: "I'd like to hire someone to help with ",
              })
            }
          >
            Ask Scout to hire someone
            <ArrowRight size={15} />
          </Button>
        </div>
        {(state === "former" || former.length > 0) && (
          <details className="former-team">
            <summary>
              Former team members
              <ChevronDown size={15} />
            </summary>
            {(former.length ? former : [employees[2]]).map((e) => (
              <button
                key={e.name}
                onClick={() =>
                  onDestination("M-02", "let-go", { employee: e.name })
                }
              >
                <Avatar name={e.name} />
                {displayName(e.name)} · Let go by{" "}
                {data.team.profiles[e.name].changedBy || "Lerato"} on 3 Nov.
                <ArrowRight size={14} />
              </button>
            ))}
          </details>
        )}
      </CommonContent>
    </div>
  );
}

export function EmployeePage(props: ScreenProps & { name: EmployeeId }) {
  const { state, name, onDestination } = props;
  const data = useMock(),
    person = employeeWithState(name, state);
  const gone = state === "let-go" || data.team.profiles[name].retired;
  return (
    <EmployeeShell {...props} tab="Desk">
      {" "}
      {state === "starting" ? (
        <Empty text={name + " is getting ready."} />
      ) : state === "first-week" ? (
        <Empty
          text={
            displayName(name) +
            (name === "Naledi"
              ? " is reading your Instagram and website. Her first plan comes to you here and in Needs you."
              : name === "Leo"
                ? " is reading your website. Their first plan comes to you here and in Needs you."
                : " is reading your business profile. Their first plan comes to you here and in Needs you.")
          }
        />
      ) : state === "empty" ? (
        <Empty text="Nothing here yet. Your first work arrives here." />
      ) : (
        <EmployeeDesk
          {...props}
          name={name}
          embedded
          readOnly={gone}
          onDestination={(id, next, params) =>
            onDestination(id, next, {
              ...params,
              ...(gone && id.startsWith("C-") ? { readOnly: "1" } : {}),
            })
          }
        />
      )}
    </EmployeeShell>
  );
}
