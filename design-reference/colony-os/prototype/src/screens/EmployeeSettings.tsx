import { useEffect, useRef, useState } from "react";
import { Avatar, Button, CloseButton, Dialog } from "../components/primitives";
import { EmployeeShell } from "../components/EmployeeShell";
import { useMock } from "../data/mock-store";
import {
  displayName,
  letGo,
  restartEmployee,
  saveProfile,
} from "../data/team-actions";
import { employee } from "../data/fixtures";
import { employeeIds, neverAlone } from "../data/team-fixtures";
import type { EmployeeId, EmployeeProfile } from "../data/types";
import type { ScreenProps } from "./shared";
export function EmployeeSettings(props: ScreenProps & { name: EmployeeId }) {
  const { name, state, partner, onDestination, onNotice } = props,
    { team } = useMock(),
    profile = team.profiles[name],
    label = displayName(name),
    actor = partner ? "Kagiso" : "Lerato";
  const [draft, setDraft] = useState(profile.displayName),
    [budget, setBudget] = useState(String(profile.budget)),
    [avatar, setAvatar] = useState(profile.avatar);
  const [failed, setFailed] = useState(state === "save-failed"),
    [saving, setSaving] = useState(state === "saving");
  const [confirm, setConfirm] = useState<"pause" | "let-go" | null>(
    state === "confirm-pause"
      ? "pause"
      : state === "confirm-let-go"
        ? "let-go"
        : null,
  );
  const offline = state === "offline",
    gone = state === "let-go" || profile.retired,
    paused = profile.lifecycle?.startsWith("paused") || state === "paused";
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const save = () => {
    if (offline || saving) return;
    setSaving(true);
    setFailed(false);
    const patch: Partial<EmployeeProfile> = {
      displayName: name === "Scout" ? "Scout" : draft.trim() || label,
      budget: Number(budget),
      avatar,
    };
    if (
      (profile.lifecycle === "paused-budget" || state === "paused-budget") &&
      Number(budget) > profile.budget
    )
      patch.lifecycle = "working";
    setTimeout(() => {
      if (!alive.current) return;
      onNotice("Settings saved.", saveProfile(name, patch, actor));
      setSaving(false);
      if (patch.lifecycle === "working")
        onDestination("M-06", undefined, { employee: name });
    }, 250);
  };
  return (
    <EmployeeShell {...props} tab="Settings">
      {!gone && (
        <>
          <form
            className="team-settings-form team-form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="team-section-heading">
              <div>
                <h2>A few things to make it yours.</h2>
                <p>
                  {offline
                    ? "You're offline. Change settings when you're back."
                    : "Your changes apply everywhere."}
                </p>
              </div>
            </div>
            <fieldset disabled={offline || saving}>
              <div className="settings-name-grid">
                <label>
                  Name
                  <input
                    value={draft}
                    readOnly={name === "Scout"}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={40}
                    required
                  />
                </label>
                <div className="fixed-role">
                  <span>Role</span>
                  <p>
                    {name === "Scout"
                      ? "Chief of Staff"
                      : name === "Maya"
                        ? "Growth Marketer"
                        : name === "Naledi"
                          ? "Social Media Manager"
                          : name === "Sipho"
                            ? "Sales Director"
                            : name === "Leo"
                              ? "Website Builder"
                              : "Customer Care and Admin"}
                  </p>
                </div>
              </div>
              <div className="settings-portrait">
                <h3>Photo</h3>
                <p>Choose an ant portrait.</p>
                <div
                  className="ant-choices"
                  role="group"
                  aria-label="Ant portraits"
                >
                  {employeeIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={avatar === id}
                      aria-label={"Use " + id + " ant portrait"}
                      onClick={() => setAvatar(id)}
                    >
                      <Avatar name={id} variant={id} size="large" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-budget">
                <label>
                  Weekly budget
                  <input
                    type="number"
                    min="0.50"
                    max="500"
                    step="0.50"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    required
                  />
                </label>
                <div>
                  <p>Used ${employee(name).used.toFixed(2)} this week.</p>
                  <p>A typical week: ${profile.budget.toFixed(2)}.</p>
                  <p>
                    When {label} reaches {name === "Naledi" ? "her" : "the"}{" "}
                    budget {name === "Naledi" ? "she" : label} pauses and Scout
                    asks you.
                  </p>
                </div>
              </div>
              <Button tone="primary" type="submit">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </fieldset>
            {failed && (
              <div className="settings-save-error" role="alert">
                <p>Couldn't save your changes. Try again.</p>
                <Button onClick={save} type="button">
                  Try again
                </Button>
              </div>
            )}
          </form>
          <section className="settings-section">
            <h3>Working together</h3>
            {name === "Scout" ? (
              <p>
                Scout runs the team, so pausing Scout pauses everyone.{" "}
                <Button tone="quiet" onClick={() => onDestination("S-07")}>
                  Pause the team in Settings
                </Button>
              </p>
            ) : (
              <div className="settings-action-row">
                <div>
                  <strong>{paused ? "Paused" : "Pause " + label}</strong>
                  <p>
                    {paused
                      ? "Paused by " +
                        (profile.changedBy || "Kagiso") +
                        " at 14:05. Resume when you’re ready."
                      : label +
                        " finishes what " +
                        (name === "Naledi" ? "she's" : "they're") +
                        " doing, then waits."}
                  </p>
                </div>
                <Button
                  disabled={offline}
                  onClick={() => {
                    if (paused) {
                      onNotice(
                        label + " resumed.",
                        saveProfile(name, { lifecycle: "working" }, actor),
                      );
                      onDestination("M-06", undefined, { employee: name });
                    } else setConfirm("pause");
                  }}
                >
                  {paused ? "Resume" : "Pause " + label}
                </Button>
              </div>
            )}
            <div className="settings-action-row">
              <div>
                <strong>Restart {label}</strong>
                <p>
                  {profile.lifecycle === "restart-waiting"
                    ? "Restarts when Lerato's MacBook is back on."
                    : label +
                      " picks up where " +
                      (name === "Naledi" ? "she" : "they") +
                      " left off."}
                </p>
              </div>
              <Button
                disabled={offline}
                onClick={() => {
                  restartEmployee(name, actor, state === "computer-off");
                  onNotice(
                    state === "computer-off"
                      ? "Restarts when Lerato's MacBook is back on."
                      : label + " is getting ready.",
                  );
                }}
              >
                Restart
              </Button>
            </div>
          </section>
          <section className="settings-section">
            <h3>Always asks you first</h3>
            <ul className="never-alone">
              {neverAlone[name].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="team-secondary-note">
              Reports to{" "}
              {name === "Scout"
                ? "you"
                : name === "Naledi"
                  ? displayName("Maya")
                  : "Scout"}
              . To change {label}'s job, ask Scout.
            </p>
          </section>
          {name !== "Scout" && (
            <section className="settings-section settings-let-go">
              <div>
                <h3>Let {label} go</h3>
                <p>
                  Posts, drafts and history stay readable. Open decisions are
                  withdrawn and routines stop.
                </p>
              </div>
              <Button
                tone="danger"
                disabled={offline}
                onClick={() => setConfirm("let-go")}
              >
                Let {label} go
              </Button>
            </section>
          )}
        </>
      )}
      {confirm && (
        <Dialog
          title={
            confirm === "pause"
              ? "Pause " + label + "?"
              : "Let " + label + " go?"
          }
          onClose={() => setConfirm(null)}
          className="team-confirm"
        >
          <CloseButton onClose={() => setConfirm(null)} />
          <h2>
            {confirm === "pause"
              ? "Pause " + label + "?"
              : "Let " + label + " go?"}
          </h2>
          <p>
            {confirm === "pause"
              ? name === "Naledi"
                ? "She finishes what she's doing, then waits."
                : label + " finishes this step, then waits."
              : name === "Naledi"
                ? "She stops now. Her posts and history stay here."
                : label + " stops now. Posts and history stay here."}
          </p>
          {confirm === "let-go" && (
            <p>
              Open decisions are withdrawn. Routines stop. Every conversation
              keeps its messages.
            </p>
          )}
          <div className="button-row">
            <Button onClick={() => setConfirm(null)}>
              Keep {confirm === "pause" ? "working" : label}
            </Button>
            <Button
              tone={confirm === "pause" ? "primary" : "danger"}
              onClick={() => {
                if (confirm === "pause") {
                  onNotice(
                    label + " paused.",
                    saveProfile(name, { lifecycle: "paused-person" }, actor),
                  );
                  setConfirm(null);
                } else {
                  const undo = letGo(name, actor);
                  setConfirm(null);
                  onDestination("M-01");
                  onNotice(label + " left the team.", undo);
                }
              }}
            >
              {confirm === "pause" ? "Pause " + label : "Let " + label + " go"}
            </Button>
          </div>
        </Dialog>
      )}
    </EmployeeShell>
  );
}
