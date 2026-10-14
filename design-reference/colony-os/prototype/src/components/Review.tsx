import { Moon, Sun, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import registry from "../data/screen-registry.json";
import { Avatar, Button, CloseButton, Dialog } from "./primitives";
import type { Destination } from "../data/types";
export function ReviewControls({
  id,
  state,
  theme,
  form,
  platform,
  person,
  onDestination,
  onReview,
  onReset,
}: {
  id: string;
  state: string;
  theme: string;
  form: string;
  platform: string;
  person: string;
  onDestination: Destination;
  onReview: () => void;
  onReset: () => void;
}) {
  const entry = registry.screens.find((s) => s.id === id);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const update = () =>
      document.body.style.setProperty(
        "--review-height",
        ref.current!.getBoundingClientRect().height + "px",
      );
    const observer = new ResizeObserver(update);
    observer.observe(ref.current!);
    update();
    return () => {
      observer.disconnect();
      document.body.style.removeProperty("--review-height");
    };
  }, []);
  return (
    <div ref={ref} className="review-controls" data-review-ui>
      <button onClick={onReview} title="Open milestone review">
        Colony <span>Design review</span>
      </button>
      <label>
        Screen
        <select
          aria-label="Review screen"
          value={id}
          onChange={(e) => onDestination(e.target.value)}
        >
          {registry.screens.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} · {s.name}
            </option>
          ))}
          <option value="foundations">Foundations</option>
        </select>
      </label>
      <label>
        State
        <select
          aria-label="Review state"
          value={state}
          onChange={(e) => onDestination(id, e.target.value)}
        >
          {(entry?.states || [{ key: "normal", label: "Normal" }]).map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {entry?.forms.includes("inline") && (
        <label>
          Form
          <select
            aria-label="Review card form"
            value={form}
            onChange={(e) => onDestination(id, state, { form: e.target.value })}
          >
            <option value="full">Full</option>
            <option value="inline">Inline</option>
          </select>
        </label>
      )}
      <label>
        View
        <select
          aria-label="View as"
          value={person}
          onChange={(e) =>
            onDestination(
              id,
              ["partner", "owner-only"].includes(state)
                ? entry?.defaultState
                : state,
              { person: e.target.value },
            )
          }
        >
          <option value="owner">Owner</option>
          <option value="partner">Partner</option>
        </select>
      </label>
      <label>
        Appearance
        <select
          aria-label="Appearance"
          value={theme}
          onChange={(e) => onDestination(id, state, { theme: e.target.value })}
        >
          <option value="system">Match this computer</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label>
        Platform
        <select
          aria-label="Platform"
          value={platform}
          onChange={(e) =>
            onDestination(id, state, { platform: e.target.value })
          }
        >
          <option value="mac">Mac</option>
          <option value="windows">Windows</option>
        </select>
      </label>
      <Button tone="quiet" onClick={onReset} aria-label="Reset mock data">
        <RotateCcw size={14} />
      </Button>
    </div>
  );
}
export function ReviewHome({
  onDestination,
  onFoundations,
}: {
  onDestination: Destination;
  onFoundations: () => void;
}) {
  return (
    <div className="review-home" data-review-ui>
      <header>
        <div className="review-brand">
          <Avatar name="Scout" size="large" />
          <span>Colony / Design review</span>
        </div>
        <span className="eyebrow">
          Today + Conversations + Team + Desks · 12 October 2026
        </span>
        <h1>
          A quieter place
          <br />
          to run your company.
        </h1>
        <p>
          One voice in Scout. A small team of ants. Clear decisions, with you in
          control.
        </p>
        <div className="button-row">
          <Button tone="primary" onClick={() => onDestination("T-01")}>
            Open Today
            <ArrowRight size={16} />
          </Button>
          <Button onClick={() => onDestination("O-01")}>Open first run</Button>
          <Button onClick={onFoundations}>Design foundations</Button>
          <Button onClick={() => onDestination("T-02")}>
            Open Conversations
          </Button>
          <Button onClick={() => onDestination("M-01")}>Open Team</Button>
          <Button onClick={() => onDestination("D-01")}>Open employee desks</Button>
        </div>
      </header>
      <section className="review-screens">
        <h2>{registry.screens.length} screens. Every state.</h2>
        <p>
          Choose a screen, then use the review bar to switch its states, theme,
          platform and card form. This is a local mock prototype.
        </p>
        <div className="screen-grid">
          {registry.screens.map((s) => (
            <button key={s.id} onClick={() => onDestination(s.id)}>
              <span>{s.id}</span>
              <strong>{s.name}</strong>
              <small>
                {s.states.length} states ·{" "}
                {s.forms.length === 2 ? "Inline + full" : "Screen"}
              </small>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </section>
      <section className="review-gate">
        <h2>Owner review gate</h2>
        <p>
          Today's simpler direction is approved. Conversations, Team and all
          six employee desks now connect the work to decisions and history.
          First run, remaining cards, settings and native system surfaces are
          reserved for later milestones.
        </p>
        <p>
          Flows F-01 to F-08 have future dependencies. In-scope paths are
          clickable; deferred destinations are labelled in the review layer.
          Nothing here sends, posts, charges or runs a real team.
        </p>
      </section>
    </div>
  );
}
export function DeferredDestination({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={"Deferred destination " + id}
      onClose={onClose}
      className="review-dialog"
    >
      <CloseButton onClose={onClose} />
      <span className="eyebrow">Design review only</span>
      <h2>{id} is in a later milestone.</h2>
      <p>
        The product action is retained. This destination will receive its own
        design in its own section after review.
      </p>
      <p>See COVERAGE.md for the full inventory and flow dependencies.</p>
      <Button tone="primary" onClick={onClose}>
        Back to the prototype
      </Button>
    </Dialog>
  );
}
