import { useState } from "react";
import { ArrowRight, ChevronDown, Home, Plus, Search } from "lucide-react";
import { Avatar, Button, Empty } from "../components/primitives";
import { TopicMenu } from "../components/TopicMenu";
import { mockStore, useMock } from "../data/mock-store";
import type { Topic } from "../data/types";
import { CommonContent, type ScreenProps } from "./shared";

export function Conversations({
  state,
  partner,
  onDestination,
  onNotice,
}: ScreenProps) {
  const snapshot = useMock();
  const actor = partner ? "Kagiso" : "Lerato";
  const [showArchive, setShowArchive] = useState(
    state === "archived-empty" || state === "archived",
  );
  const topics = Object.values(snapshot.topics)
    .map((t) =>
      state === "empty"
        ? { ...t, archived: true }
        : state === "archive-activity" && t.id === "gettingStarted"
          ? {
              ...t,
              archived: false,
              updatedAt: Date.now(),
              notice: "Back from the archive: new card from Naledi",
            }
          : t,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const open = topics.filter((t) => !t.archived);
  const archived =
    state === "archived-empty" ? [] : topics.filter((t) => t.archived);
  const row = (topic: Topic) => {
    const latest = snapshot.messages
      .filter((m) => (m.conversationId || "spring") === topic.id && !m.event && !m.threadRoot)
      .at(-1);
    const count = topic.cardIds.filter((id) =>
      ["waiting", "changes", "ready", "ready-send"].includes(
        snapshot.cards[id]?.status,
      ),
    ).length;
    const line =
      topic.lastLine ||
      (latest?.id === "m4"
        ? "Naledi: 5 posts for next week"
        : latest
          ? (latest.from === actor ? "You" : latest.from) +
            ": " +
            (latest.voice?.transcript ||
              latest.text ||
              latest.attachments?.map((f) => f.name).join(", "))
          : "New conversation");
    return (
      <div
        className="topic-row"
        key={topic.id}
        role="listitem"
        data-topic-id={topic.id}
      >
        <button
          className="topic-open"
          data-topic-open
          onClick={() =>
            onDestination("T-03", undefined, { conversation: topic.id })
          }
          aria-label={
            topic.title +
            (topic.unread[actor] ? ", unread" : "") +
            (count ? ", " + count + " need you" : "")
          }
        >
          <span className="topic-leading">
            <Avatar name="Scout" size="small" />
            {topic.unread[actor] && (
              <span className="topic-unread" aria-hidden="true" />
            )}
          </span>
          <span className="topic-copy">
            <span className="topic-title">{topic.title}</span>
            <span className="topic-last-line">{line}</span>
            {topic.notice && (
              <span className="topic-return-note">{topic.notice}</span>
            )}
          </span>
          <span className="topic-trailing">
            <time>{topic.time}</time>
            {count > 0 && <span className="topic-needs">{count} need you</span>}
            <span
              className="topic-ants"
              aria-label={topic.employees.join(", ")}
            >
              {topic.employees
                .filter((n) => n !== "Scout")
                .slice(0, 3)
                .map((n) => (
                  <Avatar key={n} name={n} size="small" />
                ))}
            </span>
            {topic.work.length > 0 && (
              <span className="topic-working">
                <i aria-hidden="true" />
                Working
              </span>
            )}
          </span>
        </button>
        <TopicMenu
          topic={topic}
          unread={topic.unread[actor]}
          onRename={(title) => {
            mockStore.renameTopic(topic.id, title, actor);
            onNotice("Renamed.");
          }}
          onRead={(read) => mockStore.markRead(topic.id, actor, read)}
          onArchive={(value) => {
            mockStore.archiveTopic(topic.id, value);
            onNotice(
              value
                ? topic.work.length
                  ? "Archived. " +
                    (topic.id === "spring"
                      ? "Naledi"
                      : topic.employees.at(-1)) +
                    " is still working there."
                  : "Archived."
                : "Brought back.",
              () => mockStore.archiveTopic(topic.id, !value),
            );
          }}
        />
      </div>
    );
  };
  return (
    <div className="topics-page">
      <header className="topics-heading">
        <div>
          <span className="eyebrow">LERATO DESIGNS</span>
          <h1>Conversations.</h1>
          <p>One topic at a time, with Scout.</p>
        </div>
        <Button tone="primary" onClick={() => onDestination("T-04")}>
          <Plus size={16} />
          New conversation
        </Button>
      </header>
      <CommonContent state={state} onRetry={() => onDestination("T-02")}>
        <section
          className="topic-list"
          aria-label="Conversations"
          role="list"
          onKeyDown={(e) => {
            if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
              const row = (e.target as HTMLElement).closest(".topic-row");
              if (row) {
                e.preventDefault();
                row
                  .querySelector<HTMLButtonElement>(".topic-menu > button")
                  ?.click();
              }
            }
            if (
              !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) ||
              (e.target as HTMLElement).closest(".topic-menu")
            )
              return;
            e.preventDefault();
            const buttons = [
              ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                "[data-topic-open]",
              ),
            ];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            buttons[
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? buttons.length - 1
                  : (index + (e.key === "ArrowUp" ? -1 : 1) + buttons.length) %
                    buttons.length
            ]?.focus();
          }}
        >
          <div className="topic-row today-topic" role="listitem">
            <button
              className="topic-open"
              data-topic-open
              onClick={() => onDestination("T-01")}
            >
              <span className="today-topic-icon">
                <Home size={20} />
              </span>
              <span className="topic-copy">
                <span className="topic-title">Today</span>
                <span className="topic-last-line">
                  Scout's brief, your team, and what needs you.
                </span>
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
          {open.length ? (
            open.map(row)
          ) : (
            <div role="listitem">
              <Empty
                text="No open conversations. Start one with Scout."
                action="New conversation"
                onAction={() => onDestination("T-04")}
              />
            </div>
          )}
          <div className="topic-archive-section" role="listitem">
            <button
              className="archive-toggle"
              aria-expanded={showArchive}
              onClick={() => setShowArchive(!showArchive)}
            >
              <ChevronDown
                className={showArchive ? "expanded" : ""}
                size={16}
              />
              Archived <span>{archived.length}</span>
            </button>
            {showArchive &&
              (archived.length ? (
                <div role="list" aria-label="Archived conversations">
                  {archived.map(row)}
                </div>
              ) : (
                <p className="archive-empty">Nothing archived.</p>
              ))}
          </div>
        </section>
        <button
          className="topic-search-link"
          onClick={() => onDestination("T-06")}
        >
          <Search size={17} />
          Search conversations<span className="keycap">⌘ / Ctrl K</span>
        </button>
      </CommonContent>
    </div>
  );
}
