import { useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Mic,
  Play,
  Square,
} from "lucide-react";
import { employee, statusWords } from "../data/fixtures";
import {
  Avatar,
  Button,
  CloseButton,
  Empty,
  Loading,
  StatusChip,
} from "./primitives";
import { CardContent } from "./CardContent";
import type { Card, CardStatus, Destination, EmployeeId } from "../data/types";
export interface CardViewProps {
  card: Card;
  state?: string;
  form?: "inline" | "full";
  partner?: boolean;
  readOnly?: boolean;
  offlineOverride?: boolean;
  allowOfflineMark?: boolean;
  noteTarget?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onAction: (action: string, value?: string) => void;
  onDestination: Destination;
  onApproveOne: (name: EmployeeId) => void;
  onBatch: (index: number, status: CardStatus, note?: string) => void;
}
export function cardStatusForState(card: Card, state: string): CardStatus {
  const direct = [
    "waiting",
    "changes",
    "approved",
    "declined",
    "ready",
    "ready-send",
    "posted",
    "sent",
    "live",
    "expired",
    "withdrawn",
    "replaced",
    "answered",
    "hired",
    "paid",
    "fixed",
    "chosen",
    "skipped",
    "ended",
  ];
  if (state === "two-people") return "approved";
  if (
    ["time-to-post", "late", "missed", "post-link", "change-time"].includes(
      state,
    )
  )
    return "ready";
  if (direct.includes(state) && state !== "waiting") return state as CardStatus;
  return card.status;
}
export function decidedLine(
  card: Card,
  status: CardStatus,
  state: string,
  partner = false,
) {
  if (card.employeePlan) {
    const person = card.history.at(-1)?.person || "Lerato";
    if (status === "approved") return "Approved by " + person + ", 10:42";
    if (status === "changes")
      return (
        "Changes requested by " + person + (card.note ? ": " + card.note : ".")
      );
    if (status === "withdrawn")
      return "Plan withdrawn when this employee left the team.";
  }
  const who =
    state === "two-people"
      ? "Kagiso"
      : card.status === status && card.history.at(-1)?.time === "10:42"
        ? card.history.at(-1)!.person
        : partner
          ? "Kagiso"
          : "Lerato";
  if (state === "two-people") return "Kagiso already approved this at 10:42.";
  if (status === "waiting") return "Waiting for you since 09:12";
  if (status === "approved") return "Approved by " + who + ", 10:42";
  if (status === "changes")
    return (
      "Changes asked by Lerato: " +
      (card.note ||
        (card.id === "C-05"
          ? "slide 3, use the green dress."
          : "use the green dress instead."))
    );
  if (status === "declined")
    return "Declined by Lerato: " + (card.note || "not before the launch.");
  if (status === "posted") return "Marked as posted by " + who + ", 18:04.";
  if (status === "ready")
    return (
      "Approved by " +
      who +
      ", 10:42. Ready to post " +
      card.scheduled.replace(" ", " at ") +
      "."
    );
  if (status === "withdrawn")
    return "Withdrawn by Naledi: the market was cancelled.";
  if (status === "answered")
    return "Answered by Lerato: " + (card.answer || "XS to XL.");
  return statusWords[status];
}
export function CardView({
  card,
  state = "normal",
  form = "inline",
  partner = false,
  readOnly = false,
  offlineOverride = false,
  allowOfflineMark = false,
  noteTarget = "",
  onOpen,
  onClose,
  onAction,
  onDestination,
  onApproveOne,
  onBatch,
}: CardViewProps) {
  const instanceId = card.employeePlan ? "plan-" + card.employeePlan : card.id;
  const status = cardStatusForState(card, state),
    full = form === "full";
  const [slide, setSlide] = useState(state === "slide-3" ? 2 : 0);
  const [note, setNote] = useState("");
  const [postLink, setPostLink] = useState("");
  const [time, setTime] = useState("2026-10-13T18:00");
  const [editing, setEditing] = useState<string | null>(
    ["note", "decline-note", "post-link", "change-time"].includes(state)
      ? state
      : null,
  );
  const [version, setVersion] = useState(0);
  const [noteVoice, setNoteVoice] = useState<"idle" | "recording" | "review">(
    "idle",
  );
  const closed = [
    "approved",
    "declined",
    "posted",
    "sent",
    "live",
    "expired",
    "withdrawn",
    "replaced",
    "answered",
    "hired",
    "paid",
    "fixed",
    "chosen",
    "skipped",
    "ended",
  ].includes(status);
  const ownerOnly = state === "owner-only",
    offline =
      state === "offline" || state === "desk-offline" || offlineOverride;
  const ready = status === "ready" || status === "ready-send";
  const invoke = (action: string) => {
    if (action === "Ask for changes") {
      setEditing("note");
      return;
    }
    if (action === "Decline") {
      setEditing("decline-note");
      return;
    }
    if (action === "Skip" && ["C-04", "C-05"].includes(card.id)) {
      setEditing("skip-note");
      return;
    }
    if (action === "Mark as posted") {
      setEditing("post-link");
      return;
    }
    if (action === "Change time") {
      setEditing("change-time");
      return;
    }
    onAction(action);
  };
  const batch = state === "batch" || state === "batch-mixed";
  const main = batch
    ? "Approve all"
    : card.id === "C-02"
      ? "Send"
      : card.id === "C-03"
        ? state === "employee-plan" || card.employeePlan
          ? "Approve"
          : "Approve all"
        : "Approve";
  const actions =
    batch && ready
      ? []
      : closed
        ? status === "posted"
          ? ["Undo the mark", ...(card.postLink ? ["Open the post"] : [])]
          : status === "replaced"
            ? ["Open latest version"]
            : status === "expired"
              ? ["Ask Scout"]
              : []
        : ownerOnly
          ? ["Remind Lerato"]
          : ready
            ? status === "ready-send"
              ? ["Copy text", "Save files", "Mark as sent"]
              : state === "missed"
                ? [
                    "Copy caption",
                    "Mark as posted",
                    "Skip",
                    "Save images",
                    "Open Instagram",
                    "Change time",
                  ]
                : [
                    "Copy caption",
                    "Save images",
                    "Open Instagram",
                    "Mark as posted",
                    "Change time",
                  ]
            : card.id === "C-02"
              ? ["You decide", "Skip"]
              : card.id === "C-03"
                ? [main, "Ask for changes"]
                : [
                    main,
                    "Ask for changes",
                    card.id === "C-04" || card.id === "C-05"
                      ? "Skip"
                      : "Decline",
                    ...(card.id === "C-01" ? ["Ask Scout"] : []),
                  ];
  if (state === "loading" || state === "loading-slow")
    return (
      <article className={"content-card " + form}>
        <Loading slow={state === "loading-slow"} />
      </article>
    );
  if (state === "empty")
    return (
      <article className={"content-card " + form}>
        <Empty text="Nothing needs you right now." />
      </article>
    );
  return (
    <article
      className={
        "content-card " +
        form +
        " card-" +
        card.id +
        " " +
        (ready ? "is-ready" : "")
      }
      data-card-id={instanceId}
      data-card-status={status}
      onKeyDown={(e: KeyboardEvent) => {
        if (
          full &&
          card.id === "C-05" &&
          (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
          )
        ) {
          e.preventDefault();
          setSlide((s) =>
            Math.max(0, Math.min(5, s + (e.key === "ArrowRight" ? 1 : -1))),
          );
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          if (readOnly) return;
          if (editing) {
            e.currentTarget.querySelector("form")?.requestSubmit();
            return;
          }
          if (!closed && !offline && !ownerOnly)
            invoke(ready ? "Mark as posted" : main);
        }
      }}
    >
      <header className="card-header">
        <div className="card-status-line">
          <StatusChip status={statusWords[status]} />
          <span className="card-time">{card.arrived}</span>
          {full && onClose && <CloseButton onClose={onClose} />}
        </div>
        <span className="card-type">
          {card.type}
          {card.id === "C-05" && " · 6 slides"}
        </span>
        {full ? (
          <h1>{card.title}</h1>
        ) : (
          <button className="card-title-button" onClick={onOpen}>
            <h3>{card.title}</h3>
            <ArrowRight size={16} />
          </button>
        )}
        {card.id !== "C-02" && <p className="card-summary">{card.summary}</p>}
      </header>
      {state === "problem" ? (
        <div className="inline-warning">
          Couldn't load this card. Your work is safe.
          <Button onClick={() => onAction("Try again")}>Try again</Button>
        </div>
      ) : (
        <>
          <div className="card-body">
            <CardContent
              card={card}
              state={state}
              status={status}
              inline={!full}
              slide={slide}
              setSlide={setSlide}
              onAction={onAction}
              onDestination={onDestination}
              onApproveOne={onApproveOne}
              onBatch={onBatch}
              partner={partner}
            />
          </div>
          <div className="card-provenance">
            <button
              className="card-author"
              onClick={() =>
                onDestination("M-02", undefined, { employee: card.from })
              }
            >
              <Avatar name={card.from} size="small" />
              <span>
                <strong>{card.from}</strong>
                <small>{employee(card.from).role}</small>
              </span>
            </button>
            <span className="muted">
              {ready ? card.scheduled : "In " + card.conversation}
            </span>
          </div>
          {state === "paused" && (
            <p className="card-notice">
              Naledi will act on this when the team is back.
            </p>
          )}
          {offline && (
            <p className="card-notice">
              You can decide when you're back online.
            </p>
          )}
          {card.postWaiting && <p className="card-notice">Waiting to send</p>}
          {ownerOnly && (
            <p className="card-notice">Only Lerato can approve this</p>
          )}
          {state === "late" && (
            <p className="card-notice">Post it tomorrow at 18:00 instead?</p>
          )}
          {state === "time-to-post" && (
            <p className="card-notice">
              Time to post: the linen carousel for Instagram.
            </p>
          )}
          {state === "missed" && (
            <p className="card-notice">Not posted yet. Post now or skip?</p>
          )}
          {(closed || status === "changes" || ready) && (
            <p className="decided-line">
              <Check size={14} />
              {decidedLine(card, status, state, partner)}
            </p>
          )}
          {status === "replaced" && (
            <p className="card-notice">
              Version 3: changed after Lerato's note
            </p>
          )}
          {full && (
            <div className="card-details">
              <div className="conversation-location">
                <span>In Spring launch</span>
                <Button tone="quiet" onClick={() => onDestination("T-03")}>
                  Open conversation
                  <ArrowRight size={14} />
                </Button>
              </div>
              <details open={state === "versions" || undefined}>
                <summary>
                  Version {card.version + version}: changed after Lerato's note
                  <ChevronDown size={15} />
                </summary>
                <p>Changes asked by Lerato: use the green dress instead.</p>
                <Button
                  tone="quiet"
                  onClick={() => setVersion(version === 0 ? -1 : 0)}
                >
                  {version === 0 ? "View version 1" : "View version 2"}
                </Button>
                {version < 0 && <p>Version 1. This is an earlier version.</p>}
              </details>
              <details open={state === "history" || undefined}>
                <summary>
                  History
                  <ChevronDown size={15} />
                </summary>
                {card.history.map((h, i) => (
                  <p key={i}>
                    <strong>{h.person}</strong> · {h.time}
                    <br />
                    {h.text}
                  </p>
                ))}
                {closed && <p>{decidedLine(card, status, state, partner)}</p>}
              </details>
            </div>
          )}
          {editing && (
            <form
              className="card-edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (editing === "note") {
                  onAction("Send changes", note);
                  setEditing(null);
                } else if (
                  editing === "decline-note" ||
                  editing === "skip-note"
                ) {
                  onAction(editing === "skip-note" ? "Skip" : "Decline", note);
                  setEditing(null);
                } else if (editing === "post-link") {
                  onAction("Post", postLink);
                  setEditing(null);
                } else {
                  onAction(
                    "Set time",
                    new Date(time)
                      .toLocaleString("en-GB", {
                        weekday: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      .replace(",", ""),
                  );
                  setEditing(null);
                }
              }}
            >
              <label htmlFor={"note-" + instanceId}>
                {editing === "note"
                  ? "Ask for changes" + (noteTarget ? " on " + noteTarget : "")
                  : editing === "decline-note" || editing === "skip-note"
                    ? "Reason (optional)"
                    : editing === "post-link"
                      ? "Post link (optional)"
                      : "Change time"}
              </label>
              {editing === "change-time" ? (
                <input
                  id={"note-" + instanceId}
                  type="datetime-local"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              ) : editing === "post-link" ? (
                <input
                  id={"note-" + instanceId}
                  type="url"
                  placeholder="https://www.instagram.com/p/"
                  value={postLink}
                  onChange={(e) => setPostLink(e.target.value)}
                />
              ) : (
                <textarea
                  autoFocus
                  id={"note-" + instanceId}
                  placeholder={
                    card.id === "C-05"
                      ? "Slide 3: use the green dress."
                      : "Use the green dress instead."
                  }
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}
              {editing === "note" && (
                <div className="button-row">
                  <Button
                    type="button"
                    onClick={() => {
                      if (noteVoice === "review") {
                        void new Audio("./assets/voice-changes.wav").play();
                      } else if (noteVoice === "recording") {
                        setNoteVoice("review");
                        setNote(
                          card.id === "C-05"
                            ? "Slide 3: use the green dress."
                            : "Use the green dress instead.",
                        );
                      } else setNoteVoice("recording");
                    }}
                  >
                    {noteVoice === "recording" ? (
                      <Square size={14} />
                    ) : noteVoice === "review" ? (
                      <Play size={14} />
                    ) : (
                      <Mic size={14} />
                    )}
                    {noteVoice === "recording"
                      ? "Stop voice note"
                      : noteVoice === "review"
                        ? "Play voice note"
                        : "Record a voice note"}
                  </Button>
                  {noteVoice !== "idle" && (
                    <span className="muted">
                      {noteVoice === "recording"
                        ? "Recording voice note"
                        : "0:12 · AI-made preview voice"}
                    </span>
                  )}
                </div>
              )}
              <div className="button-row">
                <Button
                  type="submit"
                  tone="primary"
                  disabled={editing === "note" && !note.trim()}
                >
                  {editing === "post-link"
                    ? "Mark as posted"
                    : editing === "change-time"
                      ? "Save time"
                      : editing === "decline-note"
                        ? "Decline"
                        : editing === "skip-note"
                          ? "Skip"
                          : "Send"}
                </Button>
                <Button type="button" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
          {!readOnly && !editing && actions.length > 0 && (
            <footer className="card-actions">
              {(full ? actions : actions.slice(0, 3)).map((a, i) => (
                <Button
                  key={a}
                  tone={
                    i === 0 && !ready
                      ? "primary"
                      : a === "Mark as posted"
                        ? "primary"
                        : i > 1
                          ? "quiet"
                          : "secondary"
                  }
                  data-main-action={i === 0 ? "true" : undefined}
                  disabled={
                    offline &&
                    ![
                      "Copy caption",
                      "Copy text",
                      "Save images",
                      "Save files",
                      ...(allowOfflineMark
                        ? ["Mark as posted", "Undo the mark"]
                        : []),
                    ].includes(a)
                  }
                  aria-describedby={
                    offline ? "offline-reason-" + card.id : undefined
                  }
                  onClick={() => invoke(a)}
                >
                  {a === "Copy caption" && <Copy size={14} />}
                  {a === "Save images" && <Download size={14} />}
                  {a === "Open Instagram" && <ExternalLink size={14} />}
                  {a}
                </Button>
              ))}
              {offline && (
                <span
                  id={"offline-reason-" + card.id}
                  className="visually-hidden"
                >
                  You can decide when you're back online.
                </span>
              )}
            </footer>
          )}
        </>
      )}
    </article>
  );
}
