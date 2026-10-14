import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  Avatar,
  Button,
  Identity,
  PersonInitials,
  employeeWithState,
} from "../components/primitives";
import { Composer } from "../components/Composer";
import { MessageMedia } from "../components/MessageMedia";
import { mockStore, useMock } from "../data/mock-store";
import {
  displayName,
  restartEmployee,
  saveProfile,
} from "../data/team-actions";
import type { EmployeeId, Message, MessagePayload, Attachment } from "../data/types";
import { CommonContent, type ScreenProps } from "./shared";
export function DirectChat(
  props: ScreenProps & { name: EmployeeId; quote?: string; initialFiles?: Attachment[] },
) {
  const { name, state, partner, onDestination, onNotice, renderCard } = props,
    data = useMock(),
    label = displayName(name),
    actor = partner ? "Kagiso" : "Lerato",
    scope = "direct-" + name;
  const [quote, setQuote] = useState(props.quote || "");
  const profile = data.team.profiles[name],
    gone = state === "let-go" || profile.retired,
    paused =
      state.startsWith("paused") ||
      state === "stopped" ||
      state === "failing" ||
      profile.lifecycle?.startsWith("paused") ||
      ["starting", "stopped", "failing"].includes(profile.lifecycle || "") ||
      data.paused;
  const person = employeeWithState(name, state);
  const stopped = ["stopped", "failing"].includes(profile.lifecycle || state);
  const credits = (profile.lifecycle || state) === "paused-credits";
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const online = () => setConnected(true);
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);
  const offline = state === "offline" && !connected;
  const live = data.messages.filter((m) => m.conversationId === scope);
  const initial: Message[] = ["first-time", "empty"].includes(state)
    ? []
    : [
        {
          id: "direct-example-" + name,
          from: name,
          text:
            name === "Naledi"
              ? "Tuesday's carousel is ready. Want to see it?"
              : name === "Leo"
                ? "The spring banner is ready for you to look at."
                : "The spring launch work is ready for you to look at.",
          time: "09:12",
          conversationId: scope,
        },
      ];
  const messages = [...initial, ...live],
    scroll = useRef<HTMLDivElement>(null);
  const reply = (id: string) => {
    const current = mockStore.get(),
      m = current.messages.find((m) => m.id === id),
      p = current.team.profiles[name];
    if (
      !m ||
      p.retired ||
      p.lifecycle?.startsWith("paused") ||
      ["starting", "stopped", "failing"].includes(p.lifecycle || "") ||
      m.answered
    )
      return;
    mockStore.change((s) => {
      if (s.messages.find((m) => m.id === id)?.answered) return s;
      return {
        ...s,
        messages: [
          ...s.messages.map((m) =>
            m.id === id ? { ...m, answered: true } : m,
          ),
          {
            id: crypto.randomUUID(),
            from: name,
            text:
              name === "Naledi" && /website|banner|Leo/i.test(m.text)
                ? "That needs Leo too. I'll bring Scout in."
                : "I'll work on that. Anything that needs your yes comes back here.",
            time: "10:42",
            conversationId: scope,
          },
        ],
      };
    });
  };
  const send = (text: string, payload: MessagePayload = {}) => {
    const id = mockStore.send(
      text,
      actor,
      offline || paused ? "Waiting to send" : "Sending",
      scope,
      { ...payload, quote: quote || undefined },
    );
    setQuote("");
    if (!offline && !paused)
      setTimeout(() => {
        const p = mockStore.get().team.profiles[name];
        if (p.retired) return;
        if (
          p.lifecycle?.startsWith("paused") ||
          ["starting", "stopped", "failing"].includes(p.lifecycle || "")
        ) {
          mockStore.updateMessage(id, { status: "Waiting to send" });
          return;
        }
        mockStore.deliver(id);
        reply(id);
      }, 600);
  };
  useEffect(() => {
    if (offline || paused || gone) return;
    for (const m of live.filter((m) => m.status === "Waiting to send")) {
      if (
        mockStore.get().messages.find((x) => x.id === m.id)?.status !==
        "Waiting to send"
      )
        continue;
      mockStore.deliver(m.id);
      reply(m.id);
    }
  }, [offline, paused, gone, live.length]);
  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
  }, [messages.length]);
  return (
    <div className="direct-page">
      <header className="direct-heading">
        <Button
          tone="quiet"
          aria-label="Back to employee page"
          onClick={() => onDestination("M-02", undefined, { employee: name })}
        >
          <ArrowLeft size={17} />
        </Button>
        <Identity
          person={person}
          showStatus={!gone}
          onOpen={() => onDestination("M-02", undefined, { employee: name })}
        />
        <Button
          tone="quiet"
          onClick={() =>
            onDestination("T-04", undefined, {
              prefill: "Can Scout help with this?",
              quote:
                "From your conversation with " +
                label +
                ": " +
                (messages.at(-1)?.text || quote),
            })
          }
        >
          Bring in Scout
          <ArrowUpRight size={14} />
        </Button>
      </header>
      <p className="direct-status">{person.task}</p>
      <p className="direct-rule">
        Just you and {label}. Scout still sees any decisions so the team stays
        in step.
      </p>
      <CommonContent
        state={state}
        onRetry={() => onDestination("M-07", undefined, { employee: name })}
      >
        <div className="direct-scroll" ref={scroll}>
          {!messages.length && (
            <div className="direct-first">
              <Avatar name={name} size="large" />
              <p>
                Ask {label} anything about{" "}
                {name === "Naledi"
                  ? "your social media"
                  : name === "Leo"
                    ? "your website"
                    : "the spring launch"}
                . Scout still sees any decisions.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <article className="direct-message" key={m.id}>
              {m.from === "Lerato" || m.from === "Kagiso" ? (
                <PersonInitials partner={m.from === "Kagiso"} />
              ) : (
                <Avatar name={m.from} />
              )}
              <div>
                <div className="message-meta">
                  <strong>
                    {m.from === "Lerato" || m.from === "Kagiso"
                      ? m.from
                      : displayName(m.from)}
                  </strong>
                  <time>{m.time}</time>
                </div>
                {m.quote && (
                  <blockquote className="message-quote">{m.quote}</blockquote>
                )}
                <p>{m.text}</p>
                <MessageMedia
                  message={m}
                  actor={actor}
                  onVoice={(voice) => mockStore.updateMessage(m.id, { voice })}
                  onFiles={(attachments) =>
                    mockStore.updateMessage(m.id, { attachments })
                  }
                  onType={() =>
                    document
                      .querySelector<HTMLTextAreaElement>(
                        ".direct-page textarea",
                      )
                      ?.focus()
                  }
                  onLibrary={(files) => {
                    mockStore.addToLibrary(
                      files.map((f) => f.id),
                      m.id,
                      actor,
                    );
                    onNotice("Added to your library.");
                  }}
                  onDeclineLibrary={() =>
                    mockStore.updateMessage(m.id, {
                      photoLibraryChoice: "declined",
                    })
                  }
                />
                {m.status && (
                  <small className="message-status">{m.status}</small>
                )}
              </div>
            </article>
          ))}
          {name === "Naledi" && initial.length > 0 && (
            <div className="direct-card">
              {renderCard(
                "C-05",
                gone ? "let-go" : offline ? "offline" : undefined,
              )}
            </div>
          )}
        </div>
        {gone ? (
          <p className="direct-waiting">{label} is no longer on the team.</p>
        ) : (
          <div className="direct-compose">
            {paused && (
              <div className="direct-waiting">
                <p>
                  {label}{" "}
                  {stopped
                    ? "stopped."
                    : person.status === "Starting"
                      ? "is getting ready."
                      : credits
                        ? "is waiting for credits."
                        : "is paused."}{" "}
                  Your message waits until{" "}
                  {name === "Naledi" ? "she's" : label + " is"} back.
                </p>
                <Button
                  onClick={() => {
                    if (credits) {
                      if (partner)
                        onNotice(
                          "Only Lerato can buy credits. We've let her know.",
                        );
                      else onDestination("S-02");
                      return;
                    }
                    if (stopped) restartEmployee(name, actor);
                    else saveProfile(name, { lifecycle: "working" }, actor);
                    onDestination("M-07", undefined, { employee: name });
                  }}
                >
                  {credits
                    ? partner
                      ? "Remind Lerato"
                      : "Buy credits"
                    : stopped
                      ? "Restart"
                      : "Resume"}
                </Button>
              </div>
            )}
            <Composer
              onSend={send}
              initialFiles={props.initialFiles}
              placeholder={"Message " + label}
              quoted={quote}
              onClearQuote={() => setQuote("")}
              offline={offline}
              paused={!!paused}
            />
          </div>
        )}
      </CommonContent>
    </div>
  );
}
