import { displayName } from "../data/team-actions";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  ChevronDown,
  MoreHorizontal,
  Reply,
  FolderOpen,
} from "lucide-react";
import { employee } from "../data/fixtures";
import { mockStore, useMock } from "../data/mock-store";
import {
  Avatar,
  Button,
  Empty,
  IconButton,
  PersonInitials,
  StatusChip,
} from "../components/primitives";
import { Composer } from "../components/Composer";
import { TopicMenu } from "../components/TopicMenu";
import { MessageMedia } from "../components/MessageMedia";
import { LinkedText } from "../components/LinkedText";
import { ConversationSidePanel } from "../components/ConversationSidePanel";
import { CommonContent, isOffline, isPaused, type ScreenProps } from "./shared";
import type { EmployeeId, Message } from "../data/types";

export function Conversation({
  state,
  partner,
  onDestination,
  renderCard,
  onSend,
  onNotice,
  initialQuote = "",
  conversationId = "spring",
  highlight = "",
  initialThread = "",
  previewNew = false,
}: ScreenProps & {
  initialQuote?: string;
  conversationId?: string;
  highlight?: string;
  initialThread?: string;
  previewNew?: boolean;
}) {
  if (state === "search-result" && !highlight) highlight = "m2";
  const snapshot = useMock();
  const topic = snapshot.topics[conversationId] || snapshot.topics.spring;
  const messages = previewNew
    ? [
        {
          id: "new-first",
          from: partner ? ("Kagiso" as const) : ("Lerato" as const),
          text: "I want to plan a sale.",
          time: "10:42",
        },
        {
          id: "new-reply",
          from: "Scout" as const,
          text: "Nice. Which products, and when should it run?",
          time: "10:42",
        },
      ]
    : snapshot.messages.filter(
        (m) => (m.conversationId || "spring") === conversationId && !m.threadRoot,
      );
  const actor = partner ? "Kagiso" : "Lerato";
  const [unreadMarker] = useState(topic.unread[actor]);
  const [menu, setMenu] = useState(false);
  const [messageMenu, setMessageMenu] = useState("");
  const [quoted, setQuoted] = useState(
    initialQuote ||
      (state === "reply"
        ? "Let's launch the spring linen collection on 1 November."
        : ""),
  );
  const [archived, setArchived] = useState(state === "archived");
  const title = previewNew ? "New conversation" : topic.title;
  const [renaming, setRenaming] = useState(false);
  const [edit, setEdit] = useState("");
  const [editText, setEditText] = useState("");
  const [workOpen, setWorkOpen] = useState(false);
  const [latest, setLatest] = useState(true);
  const [older, setOlder] = useState(false);
  const [highlighted, setHighlighted] = useState(highlight);
  const [panel, setPanel] = useState<
    { kind: "thread"; root: string } | { kind: "workspace" } | null
  >(
    initialThread
      ? { kind: "thread", root: initialThread }
      : state === "workspace"
      ? { kind: "workspace" }
      : state === "thread"
        ? { kind: "thread", root: "message:m4" }
        : state === "card-thread"
          ? { kind: "thread", root: "card:C-05" }
          : null,
  );
  const panelOpener = useRef<HTMLElement | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const jump = () => {
    end.current?.scrollIntoView({ block: "end" });
    setLatest(true);
  };
  useEffect(() => {
    if (state !== "long-history" && !highlight && latest) jump();
    else setLatest(false);
  }, [state, messages.length]);
  useEffect(() => {
    if (!previewNew) mockStore.markRead(conversationId, actor, true);
  }, [conversationId, actor]);
  useEffect(() => {
    if (!highlight) return;
    setHighlighted(highlight);
    const move = setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(
            '[data-message-id="' + CSS.escape(highlight) + '"]',
          )
          ?.scrollIntoView({ block: "center" }),
      50,
    );
    const clear = setTimeout(() => setHighlighted(""), 4000);
    return () => {
      clearTimeout(move);
      clearTimeout(clear);
    };
  }, [highlight]);
  let shown = state === "new" || state === "empty" ? [] : messages;
  if (
    [
      "sending",
      "sent",
      "not-sent",
      "waiting-send",
      "edited",
      "deleted",
    ].includes(state)
  )
    shown = [
      ...messages,
      {
        id: "state-message",
        from: partner ? "Kagiso" : "Lerato",
        text: state === "deleted" ? "Message deleted" : "Can we do Friday?",
        time: "10:42",
        status:
          state === "not-sent"
            ? "Not sent"
            : state === "waiting-send"
              ? "Waiting to send"
              : state === "sending"
                ? "Sending"
                : undefined,
        edited: state === "edited",
      },
    ];
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    onNotice("Copied.");
    setMessageMenu("");
  };
  const own = (m: Message) => m.from === (partner ? "Kagiso" : "Lerato");
  const canEdit = (m: Message, i: number) =>
    own(m) &&
    !shown.slice(i + 1).some((next) => !next.event && next.from !== m.from) &&
    m.text !== "Message deleted";
  const cardAnchor =
    conversationId === "spring"
      ? "m4"
      : conversationId === "gettingStarted"
        ? "start1"
        : "";
  const threadCount = (root: string) =>
    snapshot.messages.filter(
      (m) =>
        (m.conversationId || "spring") === conversationId &&
        m.threadRoot === root,
    ).length;
  const openThread = (root: string, opener?: HTMLElement) => {
    panelOpener.current = opener || (document.activeElement as HTMLElement);
    setMessageMenu("");
    setPanel({ kind: "thread", root });
  };
  const openWorkspace = (opener: HTMLElement) => {
    panelOpener.current = opener;
    setPanel({ kind: "workspace" });
  };
  const closePanel = () => {
    const sourceKey = panel?.kind === "thread" ? panel.root : "";
    setPanel(null);
    window.setTimeout(() => {
      if (panelOpener.current?.isConnected) panelOpener.current.focus();
      else if (sourceKey) {
        const sourceButton = document.querySelector<HTMLButtonElement>(
          '[data-source-key="' + CSS.escape(sourceKey) + '"] .message-thread-link, ' +
          '[data-source-key="' + CSS.escape(sourceKey) + '"] .card-thread-link',
        );
        (sourceButton || document.querySelector<HTMLButtonElement>(".workspace-open"))?.focus();
      } else document.querySelector<HTMLButtonElement>(".workspace-open")?.focus();
    }, 0);
  };
  const findSource = (key: string) => {
    setPanel(null);
    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(
        '[data-source-key="' + CSS.escape(key) + '"]',
      );
      if (target) {
        target.scrollIntoView({ block: "center" });
        target.focus();
        if (key.startsWith("message:")) {
          setHighlighted(key.slice(8));
          window.setTimeout(() => setHighlighted(""), 4000);
        }
      } else if (key.startsWith("card:")) {
        onDestination(key.slice(5));
      }
    }, 0);
  };
  const cards = (ids = topic.cardIds) =>
    !previewNew &&
    ids.map((id) => (
      <div className="message-card" key={id} data-source-key={"card:" + id} tabIndex={-1}>
        {renderCard(
          id,
          id === "C-02" ? "conversation" : isOffline(state) ? "offline" : isPaused(state) ? "paused" : undefined,
        )}
        <button
          type="button"
          className="card-thread-link"
          onClick={(event) => openThread("card:" + id, event.currentTarget)}
        >
          <Reply size={14} />
          {threadCount("card:" + id)
            ? `${threadCount("card:" + id)} ${threadCount("card:" + id) === 1 ? "reply" : "replies"}`
            : "Discuss this"}
        </button>
      </div>
    ));
  return (
    <div className={"conversation-layout" + (panel ? " with-panel" : "")}>
    <div className="conversation-screen">
      <header className="conversation-header">
        <div className="conversation-heading">
          <IconButton
            label="Back to conversations"
            onClick={() => onDestination("T-02")}
          >
            <ArrowLeft size={19} />
          </IconButton>
          {renaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRenaming(false);
                onNotice("Renamed.");
              }}
            >
              <input
                aria-label="Conversation name"
                autoFocus
                value={title}
                onChange={(e) =>
                  mockStore.renameTopic(conversationId, e.target.value, actor)
                }
                maxLength={80}
              />
              <Button type="submit">Save</Button>
            </form>
          ) : (
            <h1>{title}</h1>
          )}
          {!previewNew && (
            <Button
              tone="quiet"
              className="workspace-open"
              aria-expanded={panel?.kind === "workspace"}
              onClick={(event) => openWorkspace(event.currentTarget)}
            >
              <FolderOpen size={16} /> Workspace
            </Button>
          )}
          <TopicMenu
            topic={{ ...topic, archived: archived || topic.archived }}
            unread={topic.unread[actor]}
            onRename={(value) => {
              mockStore.renameTopic(conversationId, value, actor);
              onNotice("Renamed.");
            }}
            onRead={(read) => {
              mockStore.markRead(conversationId, actor, read);
              onNotice(read ? "Marked as read." : "Marked as unread.");
            }}
            onArchive={(value) => {
              setArchived(value);
              mockStore.archiveTopic(conversationId, value);
              onNotice(
                value
                  ? topic.work.length
                    ? "Archived. Naledi is still working there."
                    : "Archived."
                  : "Brought back.",
                () => {
                  setArchived(!value);
                  mockStore.archiveTopic(conversationId, !value);
                },
              );
            }}
          />
        </div>
        <div className="conversation-people">
          {(previewNew ? (["Scout"] as EmployeeId[]) : topic.employees).map(
            (name) => (
              <button
                key={name}
                onClick={() =>
                  onDestination("M-02", undefined, { employee: name })
                }
              >
                <Avatar name={name} size="small" />
                <span>
                  {name}
                  <StatusChip
                    status={
                      isPaused(state)
                        ? "Paused"
                        : name === "Maya"
                          ? "Waiting on you"
                          : "Working"
                    }
                  />
                </span>
              </button>
            ),
          )}
        </div>
        {!!topic.summary && !previewNew && (
          <p className="where-stands">{topic.summary}</p>
        )}
        {(archived || topic.archived) && (
          <div className="archived-note">
            <span>Archived</span>
            <Button
              tone="quiet"
              onClick={() => {
                setArchived(false);
                mockStore.archiveTopic(conversationId, false);
              }}
            >
              Bring back
            </Button>
          </div>
        )}
      </header>
      <CommonContent state={state} onRetry={() => onDestination("T-03")}>
        <div
          className="conversation-scroll"
          ref={scroll}
          onScroll={() => {
            const s = scroll.current;
            if (s)
              setLatest(s.scrollHeight - s.clientHeight - s.scrollTop < 90);
          }}
        >
          {state === "long-history" && (
            <>
              <Button tone="quiet" onClick={() => setOlder(true)}>
                {older ? "Earlier messages loaded" : "Load earlier messages"}
              </Button>
              {older && (
                <div className="old-messages">
                  <p>Lerato · Friday, 09:15</p>
                  <p>Can the spring collection feel a little warmer?</p>
                  <p>Scout · Friday, 09:16</p>
                  <p>I'll ask Naledi to use the linen background.</p>
                </div>
              )}
              {!older && (
                <div
                  className="history-placeholder"
                  role="status"
                  aria-label="Older messages loading"
                />
              )}
            </>
          )}
          {!shown.length ? (
            <Empty text="What would you like to work on?" />
          ) : (
            <>
              <div className="day-separator">
                <span>Monday, 12 October</span>
              </div>
              {shown.map((m, i) => {
                if (m.event)
                  return (
                    <p className="quiet-event" key={m.id}>
                      {m.text}
                    </p>
                  );
                const human = m.from === "Lerato" || m.from === "Kagiso";
                return (
                  <div key={m.id}>
                    {(state === "unread" || unreadMarker) && m.id === "m4" && (
                      <div className="unread-divider">
                        <span>New messages</span>
                      </div>
                    )}
                    <article
                      className={
                        "message " +
                        (human ? "human " : "") +
                        (highlighted === m.id ? "message-highlight" : "")
                      }
                      data-message-id={m.id}
                      data-source-key={"message:" + m.id}
                      key={m.id}
                      tabIndex={0}
                      aria-label={m.from + ", " + m.time + ", " + m.text}
                      onKeyDown={(e) => {
                        if (
                          (e.shiftKey && e.key === "F10") ||
                          e.key === "ContextMenu"
                        ) {
                          e.preventDefault();
                          setMessageMenu(m.id);
                          setTimeout(
                            () =>
                              document
                                .querySelector<HTMLElement>(
                                  '[data-message-id="' +
                                    CSS.escape(m.id) +
                                    '"] [role="menuitem"]',
                                )
                                ?.focus(),
                            0,
                          );
                        }
                      }}
                    >
                      {human ? (
                        <PersonInitials partner={m.from === "Kagiso"} />
                      ) : (
                        <button
                          className="message-avatar"
                          aria-label={"Open " + m.from}
                          onClick={() =>
                            onDestination("M-02", undefined, {
                              employee: m.from,
                            })
                          }
                        >
                          <Avatar name={m.from as EmployeeId} />
                        </button>
                      )}
                      <div className="message-content">
                        <div className="message-meta">
                          <strong>
                            {m.from === "Lerato" || m.from === "Kagiso"
                              ? m.from
                              : displayName(m.from)}
                          </strong>
                          {!human && (
                            <span>{employee(m.from as EmployeeId).role}</span>
                          )}
                          <time>{m.time}</time>
                          {m.edited && <small>Edited</small>}
                        </div>
                        {edit === m.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              mockStore.edit(m.id, editText);
                              setEdit("");
                              onNotice("Edited.");
                            }}
                          >
                            <textarea
                              aria-label="Edit your message"
                              autoFocus
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                            />
                            <div className="button-row">
                              <Button type="submit" tone="primary">
                                Save
                              </Button>
                              <Button type="button" onClick={() => setEdit("")}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <>
                            {m.quote && (
                              <blockquote className="sent-quote">
                                {m.quote}
                              </blockquote>
                            )}
                            {!m.voice && (
                              <p
                                className={
                                  m.text === "Message deleted"
                                    ? "deleted-text"
                                    : ""
                                }
                              >
                                <LinkedText text={m.text} />
                              </p>
                            )}
                            <MessageMedia
                              message={m}
                              actor={actor}
                              onVoice={(voice) =>
                                mockStore.updateMessage(m.id, {
                                  voice,
                                  text: voice.transcript,
                                })
                              }
                              onFiles={(attachments) =>
                                mockStore.updateMessage(m.id, { attachments })
                              }
                              onLibrary={(files) => {
                                mockStore.addToLibrary(
                                  files.map((f) => f.id),
                                  m.id,
                                  partner ? "Kagiso" : "Lerato",
                                );
                                onNotice(
                                  "Added " +
                                    files.length +
                                    " photos to your library.",
                                );
                              }}
                              onDeclineLibrary={() =>
                                mockStore.updateMessage(m.id, {
                                  photoLibraryChoice: "declined",
                                })
                              }
                              onType={() => {
                                mockStore.updateMessage(m.id, {
                                  voice: undefined,
                                  text: "Message deleted",
                                });
                                document
                                  .querySelector<HTMLTextAreaElement>(
                                    ".composer textarea",
                                  )
                                  ?.focus();
                              }}
                            />
                            {m.from === "Scout" &&
                              m.text.includes(
                                "lerato-designs@inbox.colony.global",
                              ) && (
                                <Button
                                  tone="quiet"
                                  onClick={() =>
                                    copy("lerato-designs@inbox.colony.global")
                                  }
                                >
                                  Copy address
                                </Button>
                              )}
                          </>
                        )}
                        {m.status && (
                          <div
                            className={
                              "delivery-status " +
                              (m.status === "Not sent" ? "not-sent" : "")
                            }
                          >
                            <span>
                              {m.status === "Not sent"
                                ? "Not sent. Check your internet and try again."
                                : m.status}
                            </span>
                            {m.status === "Not sent" && (
                              <>
                                <Button
                                  tone="quiet"
                                  onClick={() => {
                                    onDestination("T-03", "sent");
                                    onNotice("Sent.");
                                  }}
                                >
                                  Try again
                                </Button>
                                <Button
                                  tone="quiet"
                                  onClick={() => {
                                    if (m.id === "state-message")
                                      onDestination("T-03");
                                    else mockStore.remove(m.id);
                                  }}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                        {(m.text !== "Message deleted" || threadCount("message:" + m.id) > 0) && (
                          <button
                            type="button"
                            className="message-thread-link"
                            onClick={(event) => openThread("message:" + m.id, event.currentTarget)}
                          >
                            <Reply size={14} />
                            {threadCount("message:" + m.id)
                              ? `${threadCount("message:" + m.id)} ${threadCount("message:" + m.id) === 1 ? "reply" : "replies"}`
                              : "Reply in thread"}
                          </button>
                        )}
                      </div>
                      <div className="message-menu-wrap">
                        <IconButton
                          label={"Message menu for " + m.from + " at " + m.time}
                          aria-expanded={messageMenu === m.id}
                          onClick={() =>
                            setMessageMenu(messageMenu === m.id ? "" : m.id)
                          }
                        >
                          <MoreHorizontal size={16} />
                        </IconButton>
                        {messageMenu === m.id && (
                          <div
                            className="popover menu"
                            role="menu"
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                e.stopPropagation();
                                setMessageMenu("");
                                e.currentTarget.parentElement
                                  ?.querySelector<HTMLButtonElement>(
                                    ".icon-button",
                                  )
                                  ?.focus();
                              }
                              if (["ArrowDown", "ArrowUp"].includes(e.key)) {
                                e.preventDefault();
                                const buttons = [
                                  ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                                    "button",
                                  ),
                                ];
                                const index = buttons.indexOf(
                                  document.activeElement as HTMLButtonElement,
                                );
                                buttons[
                                  (index +
                                    (e.key === "ArrowDown" ? 1 : -1) +
                                    buttons.length) %
                                    buttons.length
                                ]?.focus();
                              }
                            }}
                          >
                            <button
                              role="menuitem"
                              onClick={() => {
                                openThread("message:" + m.id);
                              }}
                            >
                              Reply in thread
                            </button>
                            <button
                              role="menuitem"
                              onClick={() => {
                                setQuoted(m.text);
                                setMessageMenu("");
                                document
                                  .querySelector<HTMLTextAreaElement>(
                                    ".composer textarea",
                                  )
                                  ?.focus();
                              }}
                            >
                              Quote in conversation
                            </button>
                            <button
                              role="menuitem"
                              onClick={() => copy(m.text)}
                            >
                              Copy text
                            </button>
                            {canEdit(m, i) && (
                              <button
                                role="menuitem"
                                onClick={() => {
                                  setEdit(m.id);
                                  setEditText(m.text);
                                  setMessageMenu("");
                                }}
                              >
                                Edit
                              </button>
                            )}
                            {own(m) && (
                              <button
                                role="menuitem"
                                onClick={() => {
                                  const before = structuredClone(m);
                                  mockStore.remove(m.id);
                                  onNotice("Message deleted", () =>
                                    mockStore.updateMessage(m.id, before),
                                  );
                                  setMessageMenu("");
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                    {conversationId === "spring" &&
                      m.id === "m3" &&
                      cards(["C-01"])}
                    {m.id === cardAnchor &&
                      cards(
                        conversationId === "spring" ? topic.cardIds.filter(id => id !== "C-01") : topic.cardIds,
                      )}
                  </div>
                );
              })}
              {!shown.some((m) => m.id === cardAnchor) && cards()}
            </>
          )}
          {state === "employee-stuck" && (
            <div className="conversation-event">
              <Avatar name="Scout" size="small" />
              <div>
                <strong>Scout</strong>
                <p>Naledi ran into a problem and stopped. Restart her?</p>
                <Button onClick={() => onDestination("C-18")}>
                  See what happened
                </Button>
              </div>
            </div>
          )}
          {(state === "working" || (!previewNew && topic.work.length > 0)) && (
            <div className="work-lines">
              <button
                onClick={() => setWorkOpen(!workOpen)}
                aria-expanded={workOpen}
              >
                <span className="working-pulse" />
                {topic.work.length >= 3
                  ? topic.work.length + " people are working on this"
                  : topic.work[0] ||
                    "Naledi is drafting 3 posts for the spring launch."}
                <ChevronDown size={14} />
              </button>
              {workOpen && (
                <>
                  {topic.work.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </>
              )}
            </div>
          )}
          {state === "writing" && (
            <div className="writing-line">
              <Avatar name="Scout" size="small" />
              <span>
                Scout is writing<span className="typing-dots"> · · ·</span>
              </span>
            </div>
          )}
          {(state === "routing" || topic.routing) && (
            <div className="routing-note">
              <Avatar name="Scout" size="small" />
              <div>
                <p>This sounds like Spring launch. Move it there?</p>
                <Button
                  tone="primary"
                  onClick={() => {
                    mockStore.moveTopic(conversationId, "spring");
                    onDestination("T-03", undefined, {
                      conversation: "spring",
                    });
                    onNotice("Moved here from Today");
                  }}
                >
                  Move to Spring launch
                </Button>
                <Button
                  tone="quiet"
                  onClick={() => {
                    mockStore.keepTopic(conversationId);
                    onDestination("T-03", undefined, {
                      conversation: conversationId,
                    });
                  }}
                >
                  Keep separate
                </Button>
              </div>
            </div>
          )}
          {(isPaused(state) || state.includes("stopped")) && (
            <p className="reply-waits">
              Scout will reply when the team is back.
            </p>
          )}
          <div ref={end} />
        </div>
        {!latest && (
          <Button className="jump-latest" onClick={jump}>
            <ArrowDown size={14} />
            Jump to latest
          </Button>
        )}
        {(!panel || panel.kind !== "thread") && <div className="conversation-composer">
          <Composer
            onSend={(text, payload) => {
              setArchived(false);
              onSend(text, { ...payload, quote: quoted || undefined });
              setQuoted("");
            }}
            offline={isOffline(state)}
            paused={isPaused(state)}
            initial={state === "mention" ? "@Na" : ""}
            mentionInitially={state === "mention"}
            quoted={quoted}
            onClearQuote={() => setQuoted("")}
          />
        </div>}
      </CommonContent>
    </div>
    {panel && !previewNew && (
      <ConversationSidePanel
        key={panel.kind === "thread" ? panel.root : "workspace"}
        conversationId={conversationId}
        panel={panel}
        actor={actor}
        offline={isOffline(state)}
        paused={isPaused(state)}
        onClose={closePanel}
        onSource={findSource}
        onCard={(id) => onDestination(id)}
        onThread={(root) => openThread(root)}
        onAddFiles={() => {
          document.querySelector<HTMLButtonElement>('.conversation-composer [aria-label^="Add files"]')?.click();
          setPanel(null);
        }}
        onNotice={onNotice}
      />
    )}
    </div>
  );
}
