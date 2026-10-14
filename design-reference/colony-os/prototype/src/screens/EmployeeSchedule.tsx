import { useState } from "react";
import { Button, Dialog, CloseButton } from "../components/primitives";
import { EmployeeShell } from "../components/EmployeeShell";
import { useMock } from "../data/mock-store";
import { displayName, saveRoutine } from "../data/team-actions";
import type { EmployeeId, Routine } from "../data/types";
import type { ScreenProps } from "./shared";
export function EmployeeSchedule(props: ScreenProps & { name: EmployeeId }) {
  const { name, state, partner, onDestination, onNotice } = props,
    data = useMock(),
    label = displayName(name),
    actor = partner ? "Kagiso" : "Lerato";
  const readonly =
    state === "offline" ||
    state === "let-go" ||
    data.team.profiles[name].retired;
  const [confirm, setConfirm] = useState<Routine | null>(
    state === "confirm-off" ? data.team.routines[name][0] : null,
  );
  const [editing, setEditing] = useState<Routine | null>(
    state === "change-time" ? data.team.routines[name][1] : null,
  );
  const commit = (r: Routine, on: boolean) => {
    const undo = saveRoutine(name, r.id, { on }, actor);
    onNotice(r.name + (on ? " turned on." : " turned off."), undo);
    setConfirm(null);
  };
  return (
    <EmployeeShell {...props} tab="Schedule">
      <div className="team-section-heading">
        <div>
          <h2>A little rhythm.</h2>
          <p>Times are Johannesburg time.</p>
        </div>
      </div>
      {state === "empty" ? (
        <p className="team-empty-line">
          Routines appear here once {label}'s first week starts.
        </p>
      ) : (
        <div className="routine-list">
          {data.team.routines[name].map((r, i) => {
            const off =
              state === "let-go" ||
              data.team.profiles[name].retired ||
              !r.on ||
              (state === "routine-off" && i === 1);
            return (
              <article className="routine-row" key={r.id}>
                <div>
                  <h3>{r.name}</h3>
                  <p>
                    {r.days} at {r.time}
                  </p>
                  <small>
                    {off
                      ? "Off since 14 Oct. Turned off by " +
                        (r.changedBy || "Lerato") +
                        "."
                      : state === "running" && i === 1
                        ? "Running now"
                        : state.startsWith("paused") ||
                            data.team.profiles[name].lifecycle?.startsWith(
                              "paused",
                            )
                          ? "On hold while " + label + " is paused"
                          : r.next}
                  </small>
                  <small>
                    {state === "missed" && i === 1
                      ? "Missed at 09:00 while your team's computer was off. Done at 09:40."
                      : state === "didnt-finish" && i === 1
                        ? "Didn't finish: couldn't reach Instagram. Scout is looking into it."
                        : r.last}
                  </small>
                </div>
                <div className="routine-actions">
                  <button
                    role="switch"
                    aria-checked={!off}
                    aria-label={r.name + " routine"}
                    disabled={readonly}
                    className="routine-switch"
                    onClick={() =>
                      !off && ["plan", "brief"].includes(r.id)
                        ? setConfirm(r)
                        : commit(r, off)
                    }
                  >
                    <span aria-hidden="true" />
                    {off ? "Off" : "On"}
                  </button>
                  <Button
                    tone="quiet"
                    disabled={readonly}
                    onClick={() => setEditing(r)}
                  >
                    Change time
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="team-secondary-note">
        {label} also works when{" "}
        {name === "Naledi"
          ? "Maya or Scout"
          : name === "Scout"
            ? "you"
            : "Scout"}{" "}
        asks, or when you message {name === "Naledi" ? "her" : label}.
      </p>
      <p className="team-secondary-note">
        Routines run while your team's computer is on.{" "}
        <Button tone="quiet" onClick={() => onDestination("S-07")}>
          Running settings
        </Button>
      </p>
      {readonly && (
        <p className="team-secondary-note">
          {state === "offline"
            ? "You're offline. Change routines when you're back."
            : "These routines are off and read-only."}
        </p>
      )}
      {confirm && (
        <Dialog
          title={"Turn off " + confirm.name.toLowerCase() + "?"}
          onClose={() => setConfirm(null)}
          className="team-confirm"
        >
          <CloseButton onClose={() => setConfirm(null)} />
          <h2>Turn off {confirm.name.toLowerCase()}?</h2>
          <p>
            {confirm.id === "plan"
              ? label + " won't send new plans."
              : "Scout won't send your morning brief."}
          </p>
          <div className="button-row">
            <Button onClick={() => setConfirm(null)}>Keep on</Button>
            <Button tone="primary" onClick={() => commit(confirm, false)}>
              Turn off
            </Button>
          </div>
        </Dialog>
      )}
      {editing && (
        <RoutineTime
          routine={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            onNotice(
              "Time changed.",
              saveRoutine(name, editing.id, patch, actor),
            );
            setEditing(null);
          }}
        />
      )}
    </EmployeeShell>
  );
}
function RoutineTime({
  routine,
  onClose,
  onSave,
}: {
  routine: Routine;
  onClose: () => void;
  onSave: (patch: Partial<Routine>) => void;
}) {
  const [days, setDays] = useState(routine.days),
    [time, setTime] = useState(routine.time);
  return (
    <Dialog
      title={"Change " + routine.name}
      onClose={onClose}
      className="team-confirm"
    >
      <CloseButton onClose={onClose} />
      <h2>When should it run?</h2>
      <form
        className="team-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ days, time, next: "Next: " + days + ", " + time });
        }}
      >
        <label>
          Days
          <select
            aria-label="Days"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            {[
              ...new Set([
                routine.days,
                "Every Monday",
                "Tuesdays",
                "Wednesdays",
                "Thursdays",
                "Fridays",
                "Weekdays",
                "Every day",
                "First Monday of the month",
                "Last Friday of the month",
              ]),
            ].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Time
          <input
            aria-label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </label>
        <p>Times are Johannesburg time.</p>
        <div className="button-row">
          <Button onClick={onClose} type="button">
            Cancel
          </Button>
          <Button tone="primary" type="submit">
            Save time
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
