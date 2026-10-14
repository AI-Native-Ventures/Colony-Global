import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Avatar, Button, IconButton } from "../components/primitives";
import { Composer } from "../components/Composer";
import { CommonContent, isOffline, isPaused, type ScreenProps } from "./shared";
import type { MessagePayload } from "../data/types";

export function NewConversation({
  state,
  onDestination,
  onSend,
  onConnectedSend,
  onClose,
  prefill = "",
  initialQuote = "",
}: ScreenProps & {
  onConnectedSend?: (text: string, payload?: MessagePayload) => void;
  onClose: () => void;
  prefill?: string;
  initialQuote?: string;
}) {
  const [quote, setQuote] = useState(initialQuote);
  const [waiting, setWaiting] = useState<{
    text: string;
    payload?: MessagePayload;
  } | null>(null);
  const send = (text: string, payload?: MessagePayload) => {
    const context = { ...payload, quote: payload?.quote || quote || undefined };
    if (isOffline(state)) setWaiting({ text, payload: context });
    else onSend(text, context);
    setQuote("");
  };
  useEffect(() => {
    const online = () => {
      if (waiting) {
        (onConnectedSend || onSend)(waiting.text, waiting.payload);
        setWaiting(null);
      }
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [waiting, onSend]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !document.querySelector("dialog[open]") &&
        !document.querySelector(".mention-list") &&
        !document.querySelector(".voice-panel")
      ) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onDestination]);
  return (
    <div className="new-topic-page">
      <div className="new-topic-top">
        <IconButton label="Close new conversation" onClick={onClose}>
          <ArrowLeft size={18} />
        </IconButton>
        <span>New conversation</span>
      </div>
      <CommonContent state={state} onRetry={() => onDestination("T-04")}>
        <div className="new-topic-intro">
          <Avatar name="Scout" size="large" />
          <p className="new-scout-name">
            Scout <span>Chief of Staff</span>
          </p>
          <h1>What do you want to work on?</h1>
          <div className="starting-points" aria-label="Starting points">
            {[
              ["Plan a sale", "I want to plan a sale."],
              ["Get more customers", "I want to get more customers."],
              ["Update my website", "I want to update my website."],
              ["Answer a customer", "I want to answer a customer."],
            ].map(([label, text]) => (
              <button
                key={label}
                onClick={() => send(text)}
              >
                {label}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
        {waiting && (
          <div className="new-topic-waiting" role="status">
            <p>{waiting.text}</p>
            <span>Waiting to send</span>
            <Button tone="quiet" onClick={() => setWaiting(null)}>
              Cancel
            </Button>
          </div>
        )}
        <div className="new-topic-composer">
          <Composer
            autoFocus
            initial={prefill}
            quoted={quote}
            onClearQuote={() => setQuote("")}
            onSend={send}
            offline={isOffline(state)}
            paused={isPaused(state)}
          />
          <p>Scout brings the right people in.</p>
        </div>
      </CommonContent>
    </div>
  );
}
