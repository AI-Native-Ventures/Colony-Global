import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EmployeeShell } from "../components/EmployeeShell";
import { EmployeePlanCard } from "../components/EmployeePlanCard";
import { Button } from "../components/primitives";
import { useMock } from "../data/mock-store";
import { displayName } from "../data/team-actions";
import { planItems } from "../data/team-fixtures";
import type { EmployeeId } from "../data/types";
import type { ScreenProps } from "./shared";
export function EmployeePlan(props: ScreenProps & { name: EmployeeId }) {
  const { state, name, onDestination, renderCard } = props,
    data = useMock(),
    label = displayName(name),
    plan = data.team.plans[name];
  const [previous, setPrevious] = useState(state === "previous");
  const gone = state === "let-go" || data.team.profiles[name].retired;
  const status =
    name === "Scout"
      ? data.cards["C-03"].status
      : plan.reviewed
        ? plan.status
        : state === "waiting"
          ? "waiting"
          : state === "changes"
            ? "changes"
            : plan.status;
  return (
    <EmployeeShell {...props} tab="Plan">
      {state === "empty" || state === "first-week" || status === "not-ready" ? (
        <p className="team-empty-line">
          No plan yet. {label}'s first plan comes after{" "}
          {name === "Naledi" ? "she has" : label + " has"} studied your
          business.
        </p>
      ) : (
        <>
          <div className="team-section-heading">
            <div>
              <span className="eyebrow">
                {previous ? "29 SEPTEMBER TO 12 OCTOBER" : "13 TO 26 OCTOBER"}
              </span>
              <h2>
                {name === "Scout" ? "The company plan." : "The next two weeks."}
              </h2>
            </div>
            {previous ? (
              <Button onClick={() => setPrevious(false)}>
                <ArrowLeft size={14} />
                Back to current plan
              </Button>
            ) : (
              !gone && (
                <Button
                  tone="quiet"
                  onClick={() =>
                    onDestination("M-07", undefined, {
                      employee: name,
                      quote: label + "'s plan for 13 to 26 October",
                    })
                  }
                >
                  Talk about this plan
                  <ArrowRight size={14} />
                </Button>
              )
            )}
          </div>
          <p className="team-goal">More customers and sales each month.</p>
          <p className="plan-status" role="status">
            {previous
              ? "8 of 10 done."
              : state === "ended"
                ? "This plan ended. The next one is on its way."
                : status === "waiting"
                  ? "Waiting on you"
                  : status === "withdrawn"
                    ? "This plan was withdrawn when " +
                      label +
                      " left the team."
                    : status === "changes"
                      ? "Changes requested by " +
                        (plan.reviewed ? plan.actor : "Kagiso") +
                        ". A new version comes back here."
                      : "Approved by " +
                        plan.actor +
                        " on 13 Oct. Runs 13 to 26 Oct."}
          </p>
          {(state.startsWith("paused") ||
            data.team.profiles[name].lifecycle?.startsWith("paused")) && (
            <p className="inline-warning">
              Plan on hold while {label} is paused.
            </p>
          )}
          {!previous &&
            !gone &&
            (status === "waiting" || status === "changes") &&
            (name === "Scout" ? (
              renderCard("C-03", state === "offline" ? "offline" : status)
            ) : (
              <EmployeePlanCard {...props} readOnly={state === "offline"} />
            ))}
          {plan.note && (
            <p className="plan-note">
              {plan.actor}: {plan.note}
            </p>
          )}
          <p className="plan-progress">
            {state === "behind"
              ? "Behind: 2 items are late."
              : previous
                ? "8 of 10 done."
                : Math.ceil(planItems[name].length / 2) +
                  " of " +
                  planItems[name].length +
                  " done. On track."}
          </p>
          {[1, 2].map((week) => (
            <section className="plan-week" key={week}>
              <h3>Week {week}</h3>
              {planItems[name]
                .slice(
                  week === 1 ? 0 : Math.ceil(planItems[name].length / 2),
                  week === 1
                    ? Math.ceil(planItems[name].length / 2)
                    : undefined,
                )
                .map((item, i) => (
                  <div className="plan-item" key={item}>
                    <span
                      className={
                        "plan-item-status " + (week === 1 ? "done" : "")
                      }
                    >
                      {previous
                        ? "Done"
                        : week === 1
                          ? "Done"
                          : i === 0
                            ? "In progress"
                            : state === "behind" && i === 1
                              ? "Blocked"
                              : "Not started"}
                    </span>
                    <span>
                      {item}
                      {!previous && week === 2 && i === 1 && (
                        <small>Waiting on you</small>
                      )}
                    </span>
                    <time>
                      {week === 1 ? "Tuesday 14 Oct" : "Monday 20 Oct"}
                    </time>
                    {name === "Naledi" && week === 1 && i === 1 && (
                      <Button
                        tone="quiet"
                        onClick={() =>
                          onDestination("C-05", undefined, {
                            readOnly: previous || gone ? "1" : "0",
                          })
                        }
                      >
                        See result
                        <ArrowRight size={13} />
                      </Button>
                    )}
                  </div>
                ))}
            </section>
          ))}
          <div className="plan-footnotes">
            <p>What {label} needs from you: prices for the bundle offer.</p>
            <p>
              This plan should use about $
              {name === "Naledi" ? 14 : data.team.profiles[name].budget * 2} of
              credits. Weekly budget: $
              {data.team.profiles[name].budget.toFixed(2)}.
            </p>
            <p>Next plan due 27 Oct. Checked every Monday at 09:00.</p>
          </div>
          {!previous && (
            <div className="previous-plans">
              <h3>Previous plans</h3>
              <Button tone="quiet" onClick={() => setPrevious(true)}>
                29 Sep to 12 Oct <span>8 of 10 done</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </>
      )}
    </EmployeeShell>
  );
}
