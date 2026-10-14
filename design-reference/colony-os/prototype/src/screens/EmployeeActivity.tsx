import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { EmployeeShell } from "../components/EmployeeShell";
import { Button } from "../components/primitives";
import { useMock } from "../data/mock-store";
import { displayName } from "../data/team-actions";
import type { EmployeeId } from "../data/types";
import type { ScreenProps } from "./shared";
export function EmployeeActivity(props: ScreenProps & { name: EmployeeId }) {
  const { name, state, onDestination } = props,
    { team, cards } = useMock(),
    label = displayName(name);
  const [filter, setFilter] = useState(
      state === "filtered-empty" ? "Problems" : "All",
    ),
    [older, setOlder] = useState(state === "older");
  const base = [
    {
      id: "draft",
      time: "09:40",
      text:
        name === "Naledi"
          ? "Drafted 5 posts for next week."
          : name === "Sipho"
            ? "Found 12 boutiques for the spring launch."
            : name === "Leo"
              ? "Prepared the spring banner."
              : name === "Grace"
                ? "Drafted an answer to Thabo's order question."
                : name === "Scout"
                  ? "Shared your morning brief."
                  : "Put the spring campaign together.",
      why:
        name === "Naledi"
          ? "Routine: Next week's posts"
          : "Asked by you in Spring launch",
      credits: "$0.60",
      category: "Results",
      result: name === "Naledi" ? "C-05" : "T-03",
      day: "Today",
    },
    {
      id: "choice",
      time: "11:15",
      text:
        name === "Naledi"
          ? "Asked Maya which offer to feature. Maya chose the linen bundle."
          : "Checked the spring launch with Scout.",
      why: "Asked by Maya",
      credits: "$0.08",
      category: "Decisions",
      result: "T-03",
      day: "Today",
    },
    {
      id: "posted",
      time: "16:02",
      text:
        name === "Naledi"
          ? "Spring carousel marked as posted by Lerato."
          : name === "Leo"
            ? "Spring banner approved by Lerato."
            : name === "Sipho"
              ? "First stockist list approved by Lerato."
              : name === "Grace"
                ? "Customer answer approved by Lerato."
                : name === "Scout"
                  ? "Company plan checked with Lerato."
                  : "Spring offer approved by Lerato.",
      why: "Asked by you in Spring launch",
      credits: "",
      category: "Results",
      result: name === "Naledi" ? "C-05" : "T-03",
      day: "Yesterday",
    },
  ];
  const events = team.events
    .filter((e) => e.employee === name)
    .map((e) => ({
      id: e.id,
      time: "10:42",
      text: e.text,
      why: "Changed by " + e.actor,
      credits: "",
      category: e.category,
      result: "M-06",
      day: "Today",
    }));
  const decided = Object.values(cards)
    .filter((c) => c.from === name && c.history.length > 1)
    .map((c) => {
      const h = c.history.at(-1)!;
      return {
        id: c.id,
        time: h.time,
        text: h.text + " by " + h.person + (c.note ? ": " + c.note : ""),
        why: c.title,
        credits: "",
        category: "Decisions",
        result: c.id,
        day: "Today",
      };
    });
  const rows = [...events, ...decided, ...base].sort((a, b) =>
    a.day === b.day ? b.time.localeCompare(a.time) : a.day === "Today" ? -1 : 1,
  );
  if (older)
    rows.push({
      id: "older",
      time: "16:05",
      text: "Couldn't open Instagram at 16:05. Tried again at 16:20 and it worked.",
      why: "Routine: site check",
      credits: "$0.04",
      category: "Problems",
      result: "T-03",
      day: "9 October",
    });
  const visible =
    state === "empty"
      ? []
      : rows.filter((r) => filter === "All" || r.category === filter);
  return (
    <EmployeeShell {...props} tab="Activity">
      <div className="team-section-heading">
        <div>
          <h2>What {label} has been doing.</h2>
          <p>One thing at a time, newest first.</p>
        </div>
      </div>
      <div
        className="activity-filters"
        role="group"
        aria-label="Filter activity"
      >
        {["All", "Results", "Decisions", "Problems"].map((f, i) => (
          <button
            key={f}
            aria-pressed={filter === f}
            className={filter === f ? "selected" : ""}
            onClick={() => setFilter(f)}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
              e.preventDefault();
              const next = (i + (e.key === "ArrowLeft" ? -1 : 1) + 4) % 4;
              setFilter(["All", "Results", "Decisions", "Problems"][next]);
              e.currentTarget
                .parentElement!.querySelectorAll<HTMLButtonElement>("button")
                [next].focus();
            }}
          >
            {f}
          </button>
        ))}
      </div>
      {!visible.length ? (
        <p className="team-empty-line">
          {state === "empty"
            ? "Nothing yet. " +
              label +
              "'s work shows up here as " +
              (name === "Naledi" ? "she goes." : label + " goes.")
            : "No problems this week."}
        </p>
      ) : (
        <div className="activity-days">
          {[...new Set(visible.map((r) => r.day))].map((day) => (
            <section key={day}>
              <h3>{day}</h3>
              {visible
                .filter((r) => r.day === day)
                .map((r) => (
                  <article className="activity-line" key={r.id}>
                    <time>{r.time}</time>
                    <div>
                      <p>{r.text}</p>
                      <small>{r.why}</small>
                    </div>
                    <span>{r.credits}</span>
                    <Button
                      tone="quiet"
                      onClick={() =>
                        onDestination(
                          r.result === "M-06" &&
                            (state === "let-go" || team.profiles[name].retired)
                            ? "M-02"
                            : r.result,
                          state === "let-go" && r.result === "M-06"
                            ? "let-go"
                            : undefined,
                          {
                            employee: name,
                            readOnly:
                              state === "let-go" || team.profiles[name].retired
                                ? "1"
                                : "0",
                          },
                        )
                      }
                    >
                      Open
                      <ArrowRight size={13} />
                    </Button>
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
      {!older && state !== "empty" && (
        <Button
          tone="quiet"
          disabled={state === "offline"}
          onClick={() => setOlder(true)}
        >
          Show older
        </Button>
      )}
    </EmployeeShell>
  );
}
