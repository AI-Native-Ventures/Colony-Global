import { ArrowLeft, MessageCircle, Plus, RefreshCw, X } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AntMark } from "./AntMark";
import type {
  Conversation,
  ConversationMember,
  ConversationMessage,
  createConversationClient,
} from "./conversationClient";

type Client = ReturnType<typeof createConversationClient>;

function displayTime(seconds: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(seconds * 1_000);
}

function messageAuthor(
  message: ConversationMessage,
  members: ConversationMember[],
  ownPubkey: string,
) {
  if (message.pubkey === ownPubkey) return "You";
  const member = members.find((entry) => entry.pubkey === message.pubkey);
  return member?.name ?? `Member ${message.pubkey.slice(0, 7)}`;
}

function MessageRow({
  message,
  members,
  ownPubkey,
  onDiscuss,
}: {
  message: ConversationMessage;
  members: ConversationMember[];
  ownPubkey: string;
  onDiscuss?: (message: ConversationMessage, opener: HTMLButtonElement) => void;
}) {
  const agent = members.some(
    (member) => member.pubkey === message.pubkey && member.isAgent,
  );
  return (
    <article className="conversation-message" data-message-id={message.id}>
      <span
        className={`message-avatar${agent ? " ant-avatar" : ""}`}
        aria-hidden="true"
      >
        {agent ? <AntMark /> : message.pubkey === ownPubkey ? "Y" : "·"}
      </span>
      <div className="message-body">
        <div className="message-meta">
          <strong>{messageAuthor(message, members, ownPubkey)}</strong>
          <time dateTime={new Date(message.createdAt * 1_000).toISOString()}>
            {displayTime(message.createdAt)}
          </time>
        </div>
        <p>{message.content}</p>
        {onDiscuss && (
          <button
            className="text-button message-discuss"
            type="button"
            onClick={(event) => onDiscuss(message, event.currentTarget)}
          >
            <MessageCircle size={15} aria-hidden="true" /> Discuss in thread
          </button>
        )}
      </div>
    </article>
  );
}

function SendBox({
  label,
  value,
  onChange,
  onSend,
  busy,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  return (
    <div className="conversation-composer">
      <label htmlFor={label}>{label}</label>
      <textarea
        id={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            if (!busy && value.trim()) onSend();
          }
        }}
        rows={2}
        maxLength={10_000}
        placeholder="Write a message…"
      />
      <div className="composer-actions">
        <small>Enter to send · Shift+Enter for a new line</small>
        <button
          type="button"
          className="primary-button"
          disabled={busy || !value.trim()}
          onClick={onSend}
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

/** Relay-backed company conversations, preserving the approved quiet workroom. */
export function Conversations({
  client,
  ownPubkey,
}: {
  client: Client;
  ownPubkey: string;
}) {
  const [channels, setChannels] = useState<Conversation[]>([]);
  const [listState, setListState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [timelineState, setTimelineState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [timelineChannelId, setTimelineChannelId] = useState<string | null>(
    null,
  );
  const [threadRoot, setThreadRoot] = useState<ConversationMessage | null>(
    null,
  );
  const [replies, setReplies] = useState<ConversationMessage[]>([]);
  const [threadState, setThreadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [draft, setDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const listGeneration = useRef(0);
  const timelineGeneration = useRef(0);
  const threadGeneration = useRef(0);
  const threadOpener = useRef<HTMLButtonElement | null>(null);
  const newTitleInput = useRef<HTMLInputElement | null>(null);
  const selectedId = selected?.id ?? null;

  useEffect(() => {
    if (newOpen) newTitleInput.current?.focus();
  }, [newOpen]);

  const refreshList = useCallback(async () => {
    const generation = ++listGeneration.current;
    try {
      const next = await client.list();
      if (listGeneration.current !== generation) return;
      setChannels(next);
      setSelected((current) => {
        if (!current) return null;
        const updated = next.find((item) => item.id === current.id);
        if (!updated) return null;
        return JSON.stringify(updated) === JSON.stringify(current)
          ? current
          : updated;
      });
      setListState("ready");
    } catch {
      if (listGeneration.current === generation) setListState("error");
    }
  }, [client]);

  useEffect(() => {
    void refreshList();
    const timer = window.setInterval(() => void refreshList(), 30_000);
    return () => {
      listGeneration.current++;
      window.clearInterval(timer);
    };
  }, [refreshList]);

  const refreshTimeline = useCallback(async () => {
    if (!selectedId) return null;
    const generation = ++timelineGeneration.current;
    try {
      const [nextMessages, nextMembers] = await Promise.all([
        client.timeline(selectedId),
        client.members(selectedId),
      ]);
      if (timelineGeneration.current !== generation) return null;
      setMessages(nextMessages);
      setMembers(nextMembers);
      setTimelineState("ready");
      return nextMessages;
    } catch {
      if (timelineGeneration.current === generation) setTimelineState("error");
      return null;
    }
  }, [client, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setTimelineChannelId(selectedId);
    setTimelineState("loading");
    setMessages([]);
    setMembers([]);
    setThreadRoot(null);
    setReplyDraft("");
    void refreshTimeline();
    const timer = window.setInterval(() => void refreshTimeline(), 15_000);
    return () => {
      timelineGeneration.current++;
      window.clearInterval(timer);
    };
  }, [selectedId, refreshTimeline]);

  const visibleTimelineState =
    timelineChannelId === selectedId ? timelineState : "loading";
  const visibleThreadRoot =
    timelineChannelId === selectedId ? threadRoot : null;

  const refreshThread = useCallback(async () => {
    if (!selectedId || !threadRoot) return null;
    const generation = ++threadGeneration.current;
    try {
      const next = await client.replies(selectedId, threadRoot.id);
      if (threadGeneration.current !== generation) return null;
      setReplies(next);
      setThreadState("ready");
      return next;
    } catch {
      if (threadGeneration.current === generation) setThreadState("error");
      return null;
    }
  }, [client, selectedId, threadRoot]);

  useEffect(() => {
    if (!threadRoot) return;
    setReplies([]);
    setThreadState("loading");
    void refreshThread();
    const timer = window.setInterval(() => void refreshThread(), 15_000);
    return () => {
      threadGeneration.current++;
      window.clearInterval(timer);
    };
  }, [threadRoot, refreshThread]);

  function closeThread() {
    setThreadRoot(null);
    setReplyDraft("");
    window.setTimeout(() => threadOpener.current?.focus(), 0);
  }

  async function send() {
    if (!selectedId || busy || !draft.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      const sentId = await client.send(selectedId, draft);
      setDraft("");
      const confirmed = await refreshTimeline();
      if (!confirmed?.some((message) => message.id === sentId))
        setNotice(
          "Sent to the company. Refresh if the message has not appeared yet.",
        );
      void refreshList();
    } catch {
      setNotice(
        "Couldn't confirm the send. Refresh this conversation before trying again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!selectedId || !threadRoot || replyBusy || !replyDraft.trim()) return;
    setReplyBusy(true);
    setNotice("");
    try {
      const sentId = await client.send(selectedId, replyDraft, threadRoot.id);
      setReplyDraft("");
      const confirmed = await refreshThread();
      if (!confirmed?.some((reply) => reply.id === sentId))
        setNotice(
          "Reply sent to the company. Refresh if it has not appeared yet.",
        );
    } catch {
      setNotice(
        "Couldn't confirm the reply. Refresh the thread before trying again.",
      );
    } finally {
      setReplyBusy(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (createBusy || !newTitle.trim()) return;
    setCreateBusy(true);
    setNotice("");
    try {
      const channel = await client.create(newTitle);
      setChannels((current) => [channel, ...current]);
      setSelected(channel);
      setNewTitle("");
      setNewOpen(false);
    } catch {
      setNotice(
        "Couldn't confirm the new conversation. Refresh the list before trying again.",
      );
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="conversations-page">
      {selected ? (
        <div
          className={`conversation-layout${visibleThreadRoot ? " with-thread" : ""}`}
        >
          <section className="conversation-main" aria-label={selected.name}>
            <header className="conversation-topbar">
              <button
                type="button"
                className="icon-button"
                aria-label="Back to conversations"
                onClick={() => {
                  closeThread();
                  setSelected(null);
                  setNotice("");
                }}
              >
                <ArrowLeft size={19} />
              </button>
              <div>
                <h1>{selected.name}</h1>
                {selected.description && <p>{selected.description}</p>}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Refresh conversation"
                onClick={() => void refreshTimeline()}
              >
                <RefreshCw size={17} />
              </button>
            </header>
            <div
              className="conversation-history"
              role="log"
              aria-label="Messages"
            >
              {visibleTimelineState === "loading" && (
                <p className="quiet-state">Loading messages…</p>
              )}
              {visibleTimelineState === "error" && (
                <div className="quiet-state" role="alert">
                  <p>Colony couldn't load this conversation.</p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => void refreshTimeline()}
                  >
                    Try again
                  </button>
                </div>
              )}
              {visibleTimelineState === "ready" && messages.length === 0 && (
                <div className="quiet-state">
                  <AntMark />
                  <h2>A new conversation</h2>
                  <p>
                    Write the first message. Your team will see it here when
                    connected.
                  </p>
                </div>
              )}
              {visibleTimelineState === "ready" &&
                messages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    members={members}
                    ownPubkey={ownPubkey}
                    onDiscuss={(root, opener) => {
                      threadOpener.current = opener;
                      setThreadRoot(root);
                    }}
                  />
                ))}
            </div>
            {notice && !visibleThreadRoot && (
              <p className="conversation-notice" role="alert">
                {notice}
              </p>
            )}
            <SendBox
              label="Message this conversation"
              value={draft}
              onChange={setDraft}
              onSend={() => void send()}
              busy={busy}
            />
          </section>
          {visibleThreadRoot && (
            <aside className="thread-panel" aria-label="Message thread">
              <header className="thread-heading">
                <div>
                  <span className="eyebrow">CONVERSATION THREAD</span>
                  <h2>Discuss this message</h2>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Close thread"
                  onClick={closeThread}
                >
                  <X size={19} />
                </button>
              </header>
              <div
                className="thread-history"
                role="log"
                aria-label="Thread replies"
              >
                <MessageRow
                  message={visibleThreadRoot}
                  members={members}
                  ownPubkey={ownPubkey}
                />
                {threadState === "loading" && (
                  <p className="quiet-state">Loading replies…</p>
                )}
                {threadState === "error" && (
                  <div className="quiet-state" role="alert">
                    <p>Colony couldn't load this thread.</p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => void refreshThread()}
                    >
                      Try again
                    </button>
                  </div>
                )}
                {threadState === "ready" && replies.length === 0 && (
                  <p className="quiet-state">No replies yet.</p>
                )}
                {threadState === "ready" &&
                  replies.map((reply) => (
                    <MessageRow
                      key={reply.id}
                      message={reply}
                      members={members}
                      ownPubkey={ownPubkey}
                    />
                  ))}
              </div>
              {notice && (
                <p className="conversation-notice" role="alert">
                  {notice}
                </p>
              )}
              <SendBox
                label="Reply in thread"
                value={replyDraft}
                onChange={setReplyDraft}
                onSend={() => void sendReply()}
                busy={replyBusy}
              />
            </aside>
          )}
        </div>
      ) : (
        <div className="conversation-index">
          <header className="conversation-index-heading">
            <div>
              <span className="eyebrow">YOUR COMPANY</span>
              <h1>Conversations.</h1>
              <p>One topic at a time, with your team.</p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => setNewOpen(true)}
            >
              <Plus size={17} aria-hidden="true" /> New conversation
            </button>
          </header>
          {newOpen && (
            <form
              className="new-conversation"
              onSubmit={(event) => void create(event)}
            >
              <label htmlFor="conversation-title">
                What is this conversation about?
              </label>
              <input
                id="conversation-title"
                ref={newTitleInput}
                value={newTitle}
                maxLength={80}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="For example, Spring launch"
              />
              <div className="new-conversation-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setNewOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={createBusy || !newTitle.trim()}
                >
                  {createBusy ? "Creating…" : "Create conversation"}
                </button>
              </div>
            </form>
          )}
          {notice && (
            <p className="conversation-notice" role="alert">
              {notice}
            </p>
          )}
          <div className="conversation-list-heading">
            <h2>Open conversations</h2>
            <button
              type="button"
              className="text-button"
              onClick={() => void refreshList()}
            >
              <RefreshCw size={15} aria-hidden="true" /> Refresh
            </button>
          </div>
          {listState === "loading" && (
            <p className="quiet-state">Loading conversations…</p>
          )}
          {listState === "error" && (
            <div className="quiet-state" role="alert">
              <p>Colony couldn't load this company's conversations.</p>
              <button
                type="button"
                className="text-button"
                onClick={() => void refreshList()}
              >
                Try again
              </button>
            </div>
          )}
          {listState === "ready" && channels.length === 0 && (
            <div className="quiet-state">
              <AntMark />
              <h2>No conversations yet</h2>
              <p>Start one to give your team a place to talk.</p>
            </div>
          )}
          {listState === "ready" && channels.length > 0 && (
            <ul className="conversation-list">
              {channels.map((channel) => (
                <li key={channel.id}>
                  <button type="button" onClick={() => setSelected(channel)}>
                    <span className="conversation-list-icon">
                      <MessageCircle size={20} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{channel.name}</strong>
                      <small>
                        {channel.description || "Open conversation"}
                      </small>
                    </span>
                    <span className="conversation-list-time">
                      {channel.lastMessageAt
                        ? new Intl.DateTimeFormat(undefined, {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(channel.lastMessageAt))
                        : "New"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
