import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
  Sparkles,
} from "lucide-react";
import { Button, Empty, SectionHeading } from "../components/primitives";
import { CommonContent, type ScreenProps } from "./shared";
import { useMock } from "../data/mock-store";

export function NalediDesk({
  state,
  onDestination,
  renderCard,
  onNotice,
  embedded = false,
  readOnly = false,
}: ScreenProps & { embedded?: boolean; readOnly?: boolean }) {
  const [month, setMonth] = useState(state === "month");
  const [week, setWeek] = useState(0);
  const [platform, setPlatform] = useState(
    ["instagram", "tiktok", "facebook"].includes(state) ? state : "all",
  );
  const first = state === "first-week" || state === "empty";
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const data = useMock();
  const currentStatus = data.cards["C-05"].status;
  const posts = [
    {
      day: 1,
      title: "Spring linen, now in",
      id: "C-05",
      platform: "instagram",
      status:
        state === "posted"
          ? "Posted"
          : state === "missed"
            ? "Missed"
            : "Ready to post",
    },
    {
      day: 3,
      title: "Linen dress in morning light",
      id: "C-04",
      platform: "instagram",
      status: "Draft",
    },
    {
      day: 4,
      title: "The 3 pieces",
      id: "C-05",
      platform: "facebook",
      status: "Skipped",
    },
    {
      day: 5,
      title: "Spring linen, now in",
      id: "C-05",
      platform: "tiktok",
      status: "Draft",
    },
  ].filter((p) => platform === "all" || p.platform === platform);
  return (
    <div className={"naledi-desk " + (embedded ? "embedded" : "")}>
      {!embedded && (
        <>
          <Button
            tone="quiet"
            className="back-link"
            onClick={() =>
              onDestination("M-02", "working", { employee: "Naledi" })
            }
          >
            <ArrowLeft size={15} />
            Naledi
          </Button>
          <header className="page-heading">
            <span className="eyebrow">Social media</span>
            <h1>Naledi's desk.</h1>
          </header>
        </>
      )}
      <CommonContent state={state} onRetry={() => onDestination("D-03")}>
        {first ? (
          <Empty text="Naledi is studying your Instagram and website. Your brand kit comes to you for a yes first." />
        ) : (
          <>
            <SectionHeading
              title="Ready to post"
              action={readOnly ? undefined : "Message Naledi"}
              onAction={() =>
                onDestination("M-07", undefined, { employee: "Naledi" })
              }
            />
            {state === "missed" && (
              <div className="inline-warning">
                Missed: Tuesday's carousel. Post it now or skip it?
              </div>
            )}
            <div className="desk-ready">
              {renderCard(
                "C-05",
                readOnly || state === "posted"
                  ? "posted"
                  : state === "offline"
                    ? "desk-offline"
                    : state === "missed"
                      ? "missed"
                      : currentStatus === "waiting"
                        ? "ready"
                        : undefined,
              )}
            </div>
            <div className="desk-ai-note">
              <Sparkles size={16} />
              <p>
                This post has AI-made images. Turn on Instagram's AI label when
                you post it.
              </p>
            </div>
            {!readOnly && (
              <>
                <SectionHeading title="Waiting on you" />
                {state === "brand-waiting" ? (
                  <div className="brand-waiting">
                    <strong>Your brand kit is ready.</strong>
                    <p>
                      Colours, fonts, logo, voice, photo style. Once you
                      approve, every post and website page uses it.
                    </p>
                    <Button onClick={() => onDestination("C-14")}>
                      Look at the brand kit
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="batch-waiting"
                    onClick={() => onDestination("C-04", "batch")}
                  >
                    <span className="batch-stack">
                      <Images size={23} />
                    </span>
                    <span>
                      <strong>Next week's 5 posts</strong>
                      <small>13 to 19 October · From Naledi</small>
                    </span>
                    <span>
                      Look at the posts
                      <ArrowRight size={15} />
                    </span>
                  </button>
                )}
                <div className="desk-actions">
                  <Button tone="quiet" onClick={() => onDestination("C-06")}>Video script to film</Button>
                  <Button tone="quiet" onClick={() => onDestination("C-07")}>Choose spring backgrounds</Button>
                </div>
              </>
            )}
          </>
        )}
        <div className="calendar-heading">
          <h2>Content calendar</h2>
          <div className="calendar-controls">
            <select
              aria-label="Filter by platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="all">All platforms</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
            </select>
            <div className="segmented" aria-label="Calendar view">
              <button aria-pressed={!month} onClick={() => setMonth(false)}>
                Week
              </button>
              <button aria-pressed={month} onClick={() => setMonth(true)}>
                Month
              </button>
            </div>
          </div>
        </div>
        <div className="calendar-range">
          <Button
            aria-label="Previous week"
            tone="quiet"
            onClick={() => setWeek(week - 1)}
          >
            <ChevronLeft size={17} />
          </Button>
          <strong>
            {month
              ? "October 2026"
              : week === 0
                ? "12 to 18 October"
                : week === 1
                  ? "19 to 25 October"
                  : week === -1
                    ? "5 to 11 October"
                    : "Week of " + (12 + week * 7) + " October"}
          </strong>
          <Button
            aria-label="Next week"
            tone="quiet"
            onClick={() => setWeek(week + 1)}
          >
            <ChevronRight size={17} />
          </Button>
          {week !== 0 && (
            <Button tone="quiet" onClick={() => setWeek(0)}>
              Today
            </Button>
          )}
        </div>
        <div
          className={"calendar " + (month ? "month" : "week")}
          role="group"
          aria-label="Content calendar"
        >
          {Array.from({ length: month ? 35 : 7 }, (_, i) => {
            const day = i % 7;
            const date = month ? i - 2 : 12 + week * 7 + i;
            const dayPosts =
              !first && week === 0 && (!month || (i >= 14 && i < 21))
                ? posts.filter((p) => p.day === day)
                : [];
            return (
              <div
                className={
                  "calendar-day " +
                  (date === 12 ? "today" : "") +
                  (date < 1 || date > 31 ? " outside-month" : "")
                }
                key={i}
              >
                <button
                  className="calendar-date"
                  aria-label={
                    days[day] +
                    ", " +
                    date +
                    " October" +
                    (dayPosts.length ? ", " + dayPosts.length + " posts" : "")
                  }
                  onClick={() =>
                    dayPosts.length
                      ? onDestination(
                          dayPosts[0].id,
                          dayPosts[0].status === "Ready to post"
                            ? "ready"
                            : undefined,
                        )
                      : onNotice("No posts for " + days[day] + ".")
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "ArrowRight" ||
                      e.key === "ArrowLeft" ||
                      e.key === "ArrowUp" ||
                      e.key === "ArrowDown"
                    ) {
                      e.preventDefault();
                      const buttons = e.currentTarget
                        .closest(".calendar")!
                        .querySelectorAll<HTMLButtonElement>(".calendar-date");
                      const offset =
                        e.key === "ArrowRight"
                          ? 1
                          : e.key === "ArrowLeft"
                            ? -1
                            : e.key === "ArrowDown"
                              ? 7
                              : -7;
                      buttons[
                        (i + offset + buttons.length) % buttons.length
                      ]?.focus();
                    }
                  }}
                >
                  <small>{days[day].slice(0, 3)}</small>
                  <strong>{date > 0 && date <= 31 ? date : ""}</strong>
                </button>
                {dayPosts.map((p) => (
                  <button
                    key={p.platform}
                    className={
                      "calendar-post status-" +
                      p.status.toLowerCase().replaceAll(" ", "-")
                    }
                    onClick={() =>
                      onDestination(
                        p.id,
                        p.status === "Posted"
                          ? "posted"
                          : p.status === "Ready to post"
                            ? "ready"
                            : p.status === "Skipped"
                              ? "skipped"
                              : p.status === "Missed"
                                ? "missed"
                                : undefined,
                      )
                    }
                  >
                    <span>{p.status}</span>
                    <strong>{p.title}</strong>
                    <small>
                      {p.platform === "instagram"
                        ? "Instagram"
                        : p.platform === "facebook"
                          ? "Facebook"
                          : "TikTok"}{" "}
                      · 18:00
                    </small>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <div className="desk-resources">
          <section>
            <SectionHeading
              title="Brand kit"
              action="Open"
              onAction={() => onDestination("C-14")}
            />
            <div
              className="brand-colours"
              role="img"
              aria-label="Brand colours: olive, warm cream, clay"
            >
              <i />
              <i />
              <i />
            </div>
            <p className="brand-font">
              Lerato Designs<span>Manrope</span>
            </p>
            <p>Warm, confident, kind.</p>
            <small>
              {state === "brand-waiting" || first
                ? "Waiting for your OK"
                : "Approved by Lerato, Friday 10:42"}
            </small>
          </section>
          <section>
            <SectionHeading
              title="Photo library"
              action="Open"
              onAction={() => onDestination("D-03a")}
            />
            <div className="photo-strip" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <p>{data.desks.photos.length} photos, {data.desks.photos.filter(p=>p.ai).length} AI-made.</p>
            <small>Real photos and AI-made images are always told apart.</small>
          </section>
        </div>
        <section className="social-account-line">
          <span className="eyebrow">Account names</span>
          {state === "no-accounts" ? (
            <p>
              Add your Instagram name so Open Instagram goes to your account.
            </p>
          ) : (
            <p>
              Instagram @leratodesigns{" "}
              <span>· TikTok @leratodesigns · Facebook Lerato Designs</span>
            </p>
          )}
          <Button tone="quiet" onClick={() => onDestination("S-04")}>
            {state === "no-accounts"
              ? "Add account names"
              : "Edit account names"}
            <ArrowRight size={14} />
          </Button>
        </section>
        {readOnly && (
          <p className="muted">Let go by Lerato on 3 Nov. Routines are off.</p>
        )}
      </CommonContent>
    </div>
  );
}
