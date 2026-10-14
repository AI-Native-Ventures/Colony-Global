import { useEffect, useState } from "react";
import { Check, ArrowLeft, LoaderCircle, TriangleAlert } from "lucide-react";
import { Avatar, Button, CloseButton, Dialog } from "../components/primitives";
import { mockStore, useMock } from "../data/mock-store";
import { displayName, letGo } from "../data/team-actions";
import { employee } from "../data/fixtures";
import type { EmployeeId } from "../data/types";
import { CommonContent, type ScreenProps } from "./shared";
export function NewHire(
  props: ScreenProps & { name: EmployeeId; autoOpen?: boolean },
) {
  const { name, state, partner, onDestination, onNotice, autoOpen } = props,
    { team } = useMock(),
    label = displayName(name),
    actor = partner ? "Kagiso" : "Lerato";
  const [stage, setStage] = useState(
      state === "done" ? "done" : state === "failed" ? "failed" : "starting",
    ),
    [cancel, setCancel] = useState(state === "cancel-confirm");
  const waiting = ["computer-off", "paused-credits", "offline"].includes(state);
  const done = stage === "done";
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (!retrying || cancel) return;
    const timer = setTimeout(() => {
      if (!mockStore.get().team.profiles[name].retired) setStage("done");
      setRetrying(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [retrying, name, cancel]);
  const open = () => {
    mockStore.change((s) => ({
      ...s,
      team: {
        ...s.team,
        profiles: {
          ...s.team.profiles,
          [name]: {
            ...s.team.profiles[name],
            setup: done ? "done" : "starting",
            lifecycle: done ? "first-week" : "starting",
            retired: false,
            changedBy: actor,
          },
        },
        plans: {
          ...s.team.plans,
          [name]: { status: "not-ready", actor, reviewed: false },
        },
      },
    }));
    onDestination("M-02", done ? "first-week" : "starting", {
      employee: name,
      tab: "Desk",
    });
  };
  useEffect(() => {
    if (
      stage !== "starting" ||
      !autoOpen ||
      waiting ||
      cancel ||
      !["starting", "normal", "other-computer"].includes(state)
    )
      return;
    const timer = setTimeout(() => setStage("done"), 2200);
    return () => clearTimeout(timer);
  }, [stage, autoOpen, waiting, state, cancel]);
  useEffect(() => {
    if (!done || !autoOpen || cancel) return;
    const timer = setTimeout(open, 1800);
    return () => clearTimeout(timer);
  }, [done, autoOpen, cancel]);
  return (
    <div className="new-hire-page">
      <Button
        tone="quiet"
        className="back-link"
        onClick={() => onDestination("M-01")}
      >
        <ArrowLeft size={15} />
        Team
      </Button>
      <CommonContent
        state={state}
        onRetry={() => onDestination("M-08", undefined, { employee: name })}
      >
        <header className="new-hire-intro">
          <Avatar name={name} size="hero" />
          <span className="eyebrow">YOUR TEAM IS GROWING</span>
          <h1>{label} is joining your team.</h1>
          <p>
            {employee(name).role} · Reports to{" "}
            {name === "Naledi" ? "Maya" : "Scout"}
          </p>
          <p>
            ${team.profiles[name].budget.toFixed(2)} weekly budget. Approved by
            Lerato, 10:42.
          </p>
        </header>
        <div className="hire-steps" aria-label="Setup progress">
          {[
            "Setting up on your team's computer",
            "Reading your business profile",
            "Saying hello to the team",
            "Starting the first week",
          ].map((step, i) => (
            <div key={step} className="hire-step">
              {done || (i === 0 && !waiting && stage !== "failed") ? (
                <Check size={18} />
              ) : stage === "failed" && i === 0 ? (
                <TriangleAlert size={18} />
              ) : stage !== "failed" && i === (waiting ? 0 : 1) ? (
                <LoaderCircle size={18} />
              ) : (
                <span className="step-dot" />
              )}
              <span>{step}</span>
              <small>
                {done
                  ? "Done"
                  : stage === "failed" && i === 0
                    ? "Needs a hand"
                    : waiting || stage === "failed"
                      ? "Waiting"
                      : i === 0
                        ? "Done"
                        : i === 1
                          ? "In progress"
                          : "Next"}
              </small>
            </div>
          ))}
        </div>
        <p className="hire-state-line" role="status">
          {done
            ? label + " is ready."
            : stage === "failed"
              ? "Setup didn't finish: your team's computer went to sleep. It continues when it wakes."
              : state === "computer-off"
                ? "Setup starts when Lerato's MacBook is on."
                : state === "other-computer"
                  ? "Setting up on Lerato's MacBook."
                  : state === "paused-credits"
                    ? "Setup waits for credits."
                    : state === "offline"
                      ? "You're offline. Setup carries on when you're back."
                      : label + "'s first plan comes to you for a yes."}
        </p>
        <p className="team-secondary-note">
          First routines: Plan check, Mondays at 09:00.{" "}
          {name === "Leo"
            ? "Site check, Wednesdays at 09:00."
            : "Next week’s posts, Mondays at 10:00."}
        </p>
        <div className="button-row hire-actions">
          {stage === "failed" && (
            <Button
              tone="primary"
              disabled={state === "offline"}
              onClick={() => {
                setStage("starting");
                setRetrying(true);
              }}
            >
              Try again
            </Button>
          )}
          <Button tone="primary" disabled={state === "offline"} onClick={open}>
            Go to {label}'s page
          </Button>
          {done && (
            <Button
              onClick={() =>
                onDestination("M-07", undefined, { employee: name })
              }
            >
              Message {label}
            </Button>
          )}
          <Button
            tone="quiet"
            onClick={() =>
              onDestination("T-03", undefined, {
                quote: "How is " + label + "'s setup going?",
              })
            }
          >
            Ask Scout
          </Button>
          {!done && (
            <Button
              tone="quiet"
              disabled={state === "offline"}
              onClick={() => setCancel(true)}
            >
              Cancel hire
            </Button>
          )}
        </div>
        {cancel && (
          <Dialog
            title={"Cancel " + label + "'s hire?"}
            onClose={() => setCancel(false)}
            className="team-confirm"
          >
            <CloseButton onClose={() => setCancel(false)} />
            <h2>Cancel {label}'s hire?</h2>
            <p>{label} is removed and no further credits are used.</p>
            <div className="button-row">
              <Button onClick={() => setCancel(false)}>Keep setting up</Button>
              <Button
                tone="danger"
                onClick={() => {
                  letGo(name, actor, true);
                  onDestination("M-01");
                  onNotice("Hire cancelled.");
                }}
              >
                Cancel hire
              </Button>
            </div>
          </Dialog>
        )}
      </CommonContent>
    </div>
  );
}
