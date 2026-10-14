import { useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Search, X } from "lucide-react";
import { Avatar, Button, Empty, IconButton } from "../components/primitives";
import { employees } from "../data/fixtures";
import { mockStore, useMock } from "../data/mock-store";
import { CommonContent, type ScreenProps } from "./shared";

function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  return index < 0 || !query ? (
    <>{text}</>
  ) : (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
export function ConversationSearch({
  state,
  onDestination,
  onSend,
  initial = "",
  onClose,
}: ScreenProps & { initial?: string; onClose: () => void }) {
  const snapshot = useMock();
  const [query, setQuery] = useState(
    initial ||
      (state === "no-results"
        ? "linen dress"
        : ["results", "archived", "voice", "filtered"].includes(state)
          ? state === "voice"
            ? "launch"
            : state === "archived"
              ? "Welcome"
              : "spring"
          : ""),
  );
  const [person, setPerson] = useState(state === "filtered" ? "Scout" : "");
  const [conversation, setConversation] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const has = (text: string) =>
    q && text.toLowerCase().includes(q) && state !== "no-results";
  const topics = Object.values(snapshot.topics).filter(
    (t) => has(t.title) && (!conversation || t.id === conversation),
  );
  const messages = snapshot.messages.filter(
    (m) =>
      !m.event &&
      has(m.voice?.transcript || m.text) &&
      (!person || m.from === person) &&
      (!conversation || (m.conversationId || "spring") === conversation),
  );
  const cards = Object.values(snapshot.cards).filter(
    (c) =>
      has(c.title + " " + c.summary) &&
      (!person || c.from === person) &&
      (!conversation || conversation === "spring"),
  );
  const total = topics.length + messages.length + cards.length;
  const open = (id: string, params: Record<string, string> = {}) => {
    mockStore.saveSearch(query);
    onDestination(id, undefined, params);
  };
  const recent = (
    <div className="search-recents">
      {state !== "empty" && (
        <>
          <section>
            <h2>Recent searches</h2>
            {snapshot.recentSearches.slice(0, 5).map((text) => (
              <button key={text} onClick={() => setQuery(text)}>
                <Search size={15} />
                {text}
              </button>
            ))}
          </section>
          <section>
            <h2>Recent conversations</h2>
            {snapshot.recentTopics
              .filter((id) => snapshot.topics[id])
              .slice(0, 5)
              .map((id) => (
                <button
                  key={id}
                  onClick={() =>
                    onDestination("T-03", undefined, { conversation: id })
                  }
                >
                  <MessageCircle size={16} />
                  {snapshot.topics[id].title}
                  {snapshot.topics[id].archived && <small>Archived</small>}
                </button>
              ))}
          </section>
        </>
      )}
    </div>
  );
  return (
    <div
      className="search-page"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (query) {
            setQuery("");
            input.current?.focus();
          } else onClose();
        }
        if (
          ["ArrowDown", "ArrowUp"].includes(e.key) &&
          !(e.target instanceof HTMLSelectElement)
        ) {
          const results = [
            ...root.current!.querySelectorAll<HTMLButtonElement>(
              ".search-result",
            ),
          ];
          if (!results.length) return;
          e.preventDefault();
          const index = results.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          results[
            (index + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
              results.length
          ]?.focus();
        }
      }}
    >
      <header className="search-heading">
        <IconButton label="Close search" onClick={onClose}>
          <ArrowLeft size={18} />
        </IconButton>
        <h1>Search conversations</h1>
      </header>
      <div className="search-input-wrap">
        <Search size={20} />
        <input
          ref={input}
          aria-label="Search conversations"
          placeholder="Search conversations"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={state === "offline"}
        />
        {query && (
          <IconButton
            label="Clear search"
            onClick={() => {
              setQuery("");
              input.current?.focus();
            }}
          >
            <X size={17} />
          </IconButton>
        )}
      </div>
      <CommonContent state={state} onRetry={() => onDestination("T-06")}>
        {state === "offline" ? (
          <>
            <p className="search-offline">Search needs the internet.</p>
            {recent}
          </>
        ) : !q ? (
          recent
        ) : (
          <>
            <div className="search-filters">
              <label>
                From
                <select
                  aria-label="Narrow by person"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                >
                  <option value="">Anyone</option>
                  {["Lerato", "Kagiso", ...employees.map((e) => e.name)].map(
                    (n) => (
                      <option key={n}>{n}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                In
                <select
                  aria-label="Narrow by conversation"
                  value={conversation}
                  onChange={(e) => setConversation(e.target.value)}
                >
                  <option value="">All conversations</option>
                  {Object.values(snapshot.topics).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <span>
                {total} {total === 1 ? "result" : "results"}
              </span>
            </div>
            {!total ? (
              <Empty
                text={
                  'Nothing found for "' +
                  query +
                  '". Try fewer words, or ask Scout.'
                }
                action="Ask Scout to find it"
                onAction={() => onSend("Find " + query)}
              />
            ) : (
              <div className="search-results">
                {!!topics.length && (
                  <section>
                    <h2>Conversations</h2>
                    {topics.map((t) => (
                      <button
                        className="search-result"
                        key={t.id}
                        onClick={() => open("T-03", { conversation: t.id })}
                      >
                        <Avatar name="Scout" size="small" />
                        <span>
                          <strong>
                            <Highlight text={t.title} query={query} />
                          </strong>
                          <small>{t.archived ? "Archived" : t.summary}</small>
                        </span>
                      </button>
                    ))}
                  </section>
                )}
                {!!messages.length && (
                  <section>
                    <h2>Messages</h2>
                    {messages.map((m) => {
                      const t = snapshot.topics[m.conversationId || "spring"];
                      return (
                        <button
                          className="search-result"
                          key={m.id}
                          onClick={() =>
                            open("T-03", m.threadRoot
                              ? { conversation: t.id, thread: m.threadRoot }
                              : { conversation: t.id, message: m.id })
                          }
                        >
                          <span className="search-result-symbol">
                            <MessageCircle size={17} />
                          </span>
                          <span>
                            <strong>
                              {m.from}
                              <time>{m.time}</time>
                            </strong>
                            <span>
                              <Highlight
                                text={m.voice?.transcript || m.text}
                                query={query}
                              />
                            </span>
                            <small>
                              In {t.title}
                              {t.archived ? " · Archived" : ""}
                              {m.voice ? " · Voice note" : ""}
                              {m.threadRoot ? " · Thread" : ""}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </section>
                )}
                {!!cards.length && (
                  <section>
                    <h2>Cards</h2>
                    {cards.map((c) => (
                      <button
                        className="search-result"
                        key={c.id}
                        onClick={() => open(c.id)}
                      >
                        <Avatar name={c.from} size="small" />
                        <span>
                          <strong>
                            <Highlight text={c.title} query={query} />
                          </strong>
                          <small>
                            {c.type} ·{" "}
                            {c.status === "ready"
                              ? "Ready to post"
                              : c.status === "waiting"
                                ? "Waiting for you"
                                : c.status === "changes"
                                  ? "Changes asked"
                                  : c.status}{" "}
                            · Spring launch
                          </small>
                        </span>
                      </button>
                    ))}
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </CommonContent>
    </div>
  );
}
