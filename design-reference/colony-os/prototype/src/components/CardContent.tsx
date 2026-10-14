import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  ImageOff,
  Sparkles,
} from "lucide-react";
import {
  caption,
  employee,
  employees,
  planOutcomes,
  slideTitles,
  weekTwoOutcomes,
} from "../data/fixtures";
import { displayName } from "../data/team-actions";
import { AIChip, Avatar, Button } from "./primitives";
import { Composer } from "./Composer";
import type { Card, CardStatus, Destination, EmployeeId } from "../data/types";

export function CampaignImage({
  carousel = false,
  slide = 0,
  failed = false,
  onRetry,
  small = false,
}: {
  carousel?: boolean;
  slide?: number;
  failed?: boolean;
  onRetry?: () => void;
  small?: boolean;
}) {
  if (failed)
    return (
      <div className="campaign-image failed">
        <ImageOff size={30} />
        <span>Couldn't load this image.</span>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    );
  return (
    <figure
      className={"campaign-image " + (small ? "small" : "") + " slide-" + slide}
    >
      <img
        src="./assets/linen-background.png"
        alt="AI-made background: cream linen and an olive branch in warm morning light. No product photo."
      />
      {carousel && (
        <div className="campaign-art">
          <span className="campaign-brand">LERATO DESIGNS</span>
          <strong>{slideTitles[slide]}</strong>
          <span className="campaign-edition">SPRING COLLECTION</span>
        </div>
      )}
      <figcaption>
        <AIChip />
        {carousel && <span className="slide-count">{slide + 1} / 6</span>}
      </figcaption>
    </figure>
  );
}
interface CardContentProps {
  card: Card;
  state: string;
  status: CardStatus;
  onAction: (action: string, value?: string) => void;
  onDestination: Destination;
  inline?: boolean;
  slide: number;
  setSlide: (value: number) => void;
  onApproveOne: (name: EmployeeId) => void;
  onBatch: (index: number, status: CardStatus, note?: string) => void;
  partner?: boolean;
}
export function CardContent({
  card,
  state,
  status,
  onAction,
  onDestination,
  inline = false,
  slide,
  setSlide,
  onApproveOne,
  onBatch,
  partner = false,
}: CardContentProps) {
  const [answer, setAnswer] = useState(card.answer || "");
  const [options, setOptions] = useState<string[]>([]);
  const [retried, setRetried] = useState(false);
  const [batchEdit, setBatchEdit] = useState<number | null>(null);
  const [batchNote, setBatchNote] = useState("");
  const [batchKind, setBatchKind] = useState<"changes" | "skipped">("changes");
  const isPost =
    ["C-00", "C-04", "C-05"].includes(card.id) &&
    ["Social post", "Carousel"].includes(card.type) &&
    ![
      "hired",
      "paid",
      "fixed",
      "live",
      "answered",
      "chosen",
      "ready-send",
      "sent",
    ].includes(status);
  const batch = state === "batch" || state === "batch-mixed";
  if (batch)
    return (
      <div className="batch-posts">
        <p>5 posts for 13 to 19 October</p>
        {Array.from({ length: 5 }, (_, i) => {
          const s =
            card.batchStatuses?.[i] ||
            (state === "batch-mixed"
              ? i === 0
                ? "ready"
                : i === 1
                  ? "changes"
                  : "waiting"
              : "waiting");
          return (
            <article className="batch-post" key={i}>
              <CampaignImage carousel={i === 0} slide={i} small />
              <div>
                <span className="eyebrow">
                  {s === "ready"
                    ? "Ready to post"
                    : s === "changes"
                      ? "Changes asked"
                      : s === "skipped"
                        ? "Skipped"
                        : "Waiting for you"}
                </span>
                <h3>{slideTitles[i]}</h3>
                {s === "ready" && (
                  <p className="batch-decided">
                    Approved by{" "}
                    {card.batchActors?.[i] || (partner ? "Kagiso" : "Lerato")},
                    10:42
                  </p>
                )}
                {s === "changes" && (
                  <p className="batch-decided">
                    Changes asked:{" "}
                    {card.batchNotes?.[i] || "use the green dress instead."}
                  </p>
                )}
                <p>
                  Instagram feed ·{" "}
                  {["Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"][i]}{" "}
                  18:00
                </p>
                {batchEdit === i ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onBatch(i, batchKind, batchNote);
                      setBatchEdit(null);
                      setBatchNote("");
                    }}
                  >
                    <label htmlFor={"batch-note-" + i}>
                      {batchKind === "changes"
                        ? "Ask for changes"
                        : "Reason (optional)"}
                    </label>
                    <textarea
                      id={"batch-note-" + i}
                      autoFocus
                      value={batchNote}
                      onChange={(e) => setBatchNote(e.target.value)}
                      placeholder="Use the green dress instead."
                    />
                    <div className="button-row">
                      <Button
                        type="submit"
                        tone="primary"
                        disabled={batchKind === "changes" && !batchNote.trim()}
                      >
                        {batchKind === "changes" ? "Send" : "Skip"}
                      </Button>
                      <Button type="button" onClick={() => setBatchEdit(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="button-row">
                    {s === "waiting" && (
                      <Button
                        tone="primary"
                        onClick={() => onBatch(i, "ready")}
                      >
                        Approve
                      </Button>
                    )}
                    {s === "ready" && (
                      <Button onClick={() => onAction("Open post", String(i))}>
                        Open
                      </Button>
                    )}
                    {s !== "skipped" && (
                      <>
                        <Button
                          onClick={() => {
                            setBatchEdit(i);
                            setBatchKind("changes");
                          }}
                        >
                          Ask for changes
                        </Button>
                        <Button
                          tone="quiet"
                          onClick={() => {
                            setBatchEdit(i);
                            setBatchKind("skipped");
                          }}
                        >
                          Skip
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  if (card.id === "C-02") {
    if (inline && state === "conversation" && ["waiting", "changes"].includes(status))
      return <p className="remaining-intro">Open this question to answer Naledi.</p>;
    const choice = state === "options" || state === "multiple";
    return (
      <div className="question-content">
        {!inline && (
          <p className="large-copy">
            {choice
              ? "What's your return window: 7, 14 or 30 days?"
              : "Which sizes does the linen dress come in?"}
          </p>
        )}
        {status === "answered" ? (
          <div className="answer-result">
            <Check size={18} />
            Answered by Lerato: {card.answer || "XS to XL."}
          </div>
        ) : status === "skipped" ? (
          <p>Skipped. Naledi will use last season's photos.</p>
        ) : ["expired", "withdrawn", "approved"].includes(status) ? (
          <p>
            {status === "expired"
              ? "The question expired. Naledi carried on with the sizes already on the website."
              : status === "approved"
                ? "Kagiso already approved this at 10:42."
                : "Withdrawn by Naledi: the market was cancelled."}
          </p>
        ) : choice ? (
          <div
            className="choice-list"
            role="group"
            aria-label="Choose an answer"
            onKeyDown={(e) => {
              if (e.key === "Enter" && answer) {
                e.preventDefault();
                onAction("Answer", answer);
              }
            }}
          >
            {["7 days", "14 days", "30 days"].map((o) => (
              <label key={o}>
                <input
                  type={state === "multiple" ? "checkbox" : "radio"}
                  name="answer"
                  checked={options.includes(o)}
                  onChange={() => {
                    const next =
                      state === "multiple"
                        ? options.includes(o)
                          ? options.filter((x) => x !== o)
                          : [...options, o]
                        : [o];
                    setOptions(next);
                    setAnswer(next.join(", "));
                  }}
                />
                {o}
              </label>
            ))}
            <Button
              tone="primary"
              disabled={!answer}
              onClick={() => onAction("Answer", answer)}
            >
              Send
            </Button>
          </div>
        ) : state === "files" ? (
          <label className="file-answer">
            Can you send 10 photos of the new collection?
            <input
              aria-label="Add files as the answer"
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files?.length)
                  onAction(
                    "Answer",
                    Array.from(e.target.files)
                      .map((f) => f.name)
                      .join(", "),
                  );
              }}
            />
          </label>
        ) : (
          <div className="answer-input">
            <Composer
              placeholder="Answer"
              compact
              onSend={(text) => onAction("Answer", text)}
              disabled={state === "offline"}
              voiceTranscript="XS to XL."
            />
          </div>
        )}
      </div>
    );
  }
  if (card.id === "C-03") {
    if (inline)
      return (
        <div className="plan-inline">
          <div className="plan-avatar-row">
            {(card.employeePlan
              ? [employee(card.employeePlan)]
              : employees
            ).map((e) => (
              <Avatar key={e.name} name={e.name} size="small" />
            ))}
          </div>
          <p>
            {card.employeePlan ? (
              `About $${card.employeeCredits?.toFixed(2)} of credits`
            ) : (
              <>
                Up to $19.00 a week{" "}
                <span className="muted">· $18.40 in credits</span>
              </>
            )}
          </p>
        </div>
      );
    const single = state === "employee-plan" || !!card.employeePlan;
    const people = single
      ? [employee(card.employeePlan || "Naledi")]
      : employees;
    return (
      <div className="plan-content">
        <p className="large-copy">
          {single ? "More customers and sales each month." : card.summary}
        </p>
        <div className="plan-budget">
          <span>13 to 26 October</span>
          <strong>
            {single
              ? "Weekly budget: $" +
                (card.employeeBudget ?? people[0].budget).toFixed(2)
              : "Up to $19.00 a week"}
          </strong>
          <span>
            {card.employeePlan
              ? "About $" + card.employeeCredits?.toFixed(2) + " of credits"
              : "$18.40 in credits"}
          </span>
        </div>
        {state === "above-budget" && (
          <div className="inline-warning">
            Needs more than Naledi's weekly budget ($5.50 against $5.00)
            <Button onClick={() => onDestination("C-16")}>
              Open money request
            </Button>
          </div>
        )}
        {state === "not-enough-credits" && (
          <div className="inline-warning">
            {partner ? "Only Lerato can buy credits" : "Not enough credits"}
            <Button
              onClick={() =>
                partner ? onAction("Remind Lerato") : onDestination("S-02")
              }
            >
              {partner ? "Remind Lerato" : "Buy credits"}
            </Button>
          </div>
        )}
        <div className="employee-plans">
          {people.map((e) => (
            <details key={e.name} open={single || undefined}>
              <summary>
                <Avatar name={e.name} size="small" />
                <span>
                  <strong>{displayName(e.name)}</strong>
                  <small>{e.role}</small>
                </span>
                <span className="plan-approval">
                  {status === "approved" ||
                  card.planApprovals?.includes(e.name) ||
                  (state === "partly-approved" && e.name === "Maya")
                    ? "Approved by " +
                      (card.employeePlan
                        ? card.history.at(-1)?.person || "Lerato"
                        : "Lerato")
                    : "Waiting for you"}
                </span>
                <ChevronDown size={16} />
              </summary>
              <div className="employee-plan-body">
                <h3>Week 1</h3>
                {planOutcomes[e.name].map((line) => (
                  <p key={line}>
                    <Check size={14} />
                    {line}
                  </p>
                ))}
                <h3>Week 2</h3>
                {weekTwoOutcomes[e.name].map((line) => (
                  <p key={line}>
                    <Check size={14} />
                    {line}
                  </p>
                ))}
                <h3>Routines</h3>
                <p>Plan check, Monday 09:00.</p>
                <h3>Decisions to expect</h3>
                <p>
                  Anything public, any money and any big call comes to you for
                  approval.
                </p>
                <h3>Needs from you</h3>
                <p>
                  {e.name === "Naledi"
                    ? "10 photos of the new collection."
                    : "Your OK on the plan."}
                </p>
                <p>
                  <strong>
                    Estimated credits: {"$" + e.budget.toFixed(2)} a week
                  </strong>{" "}
                  · {"$" + e.budget.toFixed(2)} weekly budget
                </p>
                <div className="button-row">
                  <Button
                    disabled={
                      status === "approved" ||
                      status === "ended" ||
                      card.planApprovals?.includes(e.name)
                    }
                    onClick={() => onApproveOne(e.name)}
                  >
                    Approve one
                  </Button>
                  <Button onClick={() => onAction("Ask for changes", e.name)}>
                    Ask for changes on one
                  </Button>
                </div>
              </div>
            </details>
          ))}
        </div>
        <div className="plan-needs">
          <h3>What the team needs from you</h3>
          <p>Naledi needs 10 photos of the new collection from you.</p>
          <p>One OK starts everyone.</p>
        </div>
      </div>
    );
  }
  if (isPost) {
    if (inline)
      return (
        <CampaignImage
          carousel={card.id === "C-05"}
          slide={slide}
          failed={state === "image-failed" && !retried}
          onRetry={() => setRetried(true)}
          small
        />
      );
    return (
      <div className="post-content">
        <div className="post-visual">
          <CampaignImage
            carousel={card.id === "C-05"}
            slide={slide}
            failed={state === "image-failed" && !retried}
            onRetry={() => setRetried(true)}
          />
          {card.id === "C-05" && (
            <>
              <div className="slide-navigation">
                <Button
                  aria-label="Previous slide"
                  disabled={slide === 0}
                  onClick={() => setSlide(slide - 1)}
                >
                  <ArrowLeft size={16} />
                </Button>
                <span>Slide {slide + 1} of 6</span>
                <Button
                  aria-label="Next slide"
                  disabled={slide === 5}
                  onClick={() => setSlide(slide + 1)}
                >
                  <ArrowRight size={16} />
                </Button>
              </div>
              <div className="slide-thumbnails">
                {slideTitles.map((title, i) => (
                  <button
                    key={i}
                    className={slide === i ? "selected" : ""}
                    aria-label={"Slide " + (i + 1) + ": " + title}
                    aria-pressed={slide === i}
                    onClick={() => setSlide(i)}
                  >
                    <CampaignImage carousel slide={i} small />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="post-copy">
          <div className="post-channel">
            <span>Instagram feed</span>
            <ExternalLink size={14} />
          </div>
          <h3>Caption</h3>
          <p className="caption">{caption.split("\n\n")[0]}</p>
          <p className="hashtags">{caption.split("\n\n")[1]}</p>
          <div className="post-schedule">
            <Clock3 size={16} />
            <div>
              <strong>{card.scheduled}</strong>
              <p>Your followers are most active around 18:00</p>
            </div>
          </div>
          <h3>Campaign</h3>
          <button className="text-link" onClick={() => onDestination("T-03")}>
            Spring launch
          </button>
          <h3>Alt description</h3>
          <p>
            Cream linen and an olive branch in warm morning light. AI-made
            background, no product photo.
          </p>
          <h3>Notes</h3>
          <p>AI-made background concept.</p>
          {card.id === "C-05" && (
            <p>
              Slide {slide + 1}: {slideTitles[slide]}.
            </p>
          )}
          <div className="ai-reminder">
            <Sparkles size={17} />
            <p>
              This post has AI-made images. Turn on Instagram's AI label when
              you post.
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (inline) return null;
  if (card.id === "C-00" && card.type !== "Social post")
    return <p className="large-copy">{card.summary}</p>;
  return (
    <div className="decision-content">
      <p className="large-copy">{card.summary}</p>
      <div className="decision-outcomes">
        <div>
          <span className="eyebrow">If you approve</span>
          <p>
            Maya prepares the spring sale. You approve anything public before it
            goes out.
          </p>
        </div>
        <div>
          <span className="eyebrow">If you decline</span>
          <p>The linen range stays at its current prices.</p>
        </div>
      </div>
      <p className="deadline">
        Decide by Friday 12:00, or the sale starts without the banner.
      </p>
      <Button tone="quiet" onClick={() => onDestination("C-03")}>
        Open the team's plan <ArrowRight size={15} />
      </Button>
    </div>
  );
}
