import { displayName } from "../data/team-actions";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Mic,
  Paperclip,
  Square,
  Play,
  X,
  AtSign,
  FileImage,
} from "lucide-react";
import { employees } from "../data/fixtures";
import { Avatar, Button, IconButton, PersonInitials } from "./primitives";
import { AttachmentList, FileViewer, prepareFiles } from "./Attachments";
import { VoicePanel, type VoiceStage } from "./VoiceNote";
import { sampleVoice } from "../data/conversation-fixtures";
import type { Attachment, MessagePayload, VoiceNote } from "../data/types";
export interface ComposerProps {
  onSend: (text: string, payload?: MessagePayload) => void;
  placeholder?: string;
  offline?: boolean;
  paused?: boolean;
  initial?: string;
  mentionInitially?: boolean;
  compact?: boolean;
  quoted?: string;
  onClearQuote?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  voiceTranscript?: string;
  initialFiles?: Attachment[];
  initialVoice?: VoiceStage;
  fileError?: string;
  voiceSeconds?: number;
  initialLocked?: boolean;
}
export function Composer({
  onSend,
  placeholder = "Message Scout",
  offline = false,
  paused = false,
  initial = "",
  mentionInitially = false,
  compact = false,
  quoted,
  onClearQuote,
  autoFocus = false,
  disabled = false,
  voiceTranscript = "Can we do something for the spring launch?",
  initialFiles = [],
  initialVoice,
  fileError = "",
  voiceSeconds = 0,
  initialLocked = false,
}: ComposerProps) {
  const [text, setText] = useState(initial);
  const [voice, setVoice] = useState<VoiceStage | "idle">(
    initialVoice || "idle",
  );
  const [voiceLocked, setVoiceLocked] = useState(initialLocked);
  const [mention, setMention] = useState(mentionInitially);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [files, setFiles] = useState<Attachment[]>(initialFiles);
  const [error, setError] = useState(fileError);
  const [viewer, setViewer] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const hold = useRef<{
    timer?: number;
    started: number;
    active: boolean;
    locked: boolean;
    skipClick: boolean;
  }>({ started: 0, active: false, locked: false, skipClick: false });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const people = [
    ...employees.map((e) => ({
      name: e.name,
      label: displayName(e.name),
      role: e.role,
      employee: true,
    })),
    { name: "Lerato", label: "Lerato", role: "Owner", employee: false },
    { name: "Kagiso", label: "Kagiso", role: "Partner", employee: false },
  ];
  const matches = people.filter((e) => {
    const q = text.split("@").at(-1) || "";
    return !mention || e.label.toLowerCase().includes(q.toLowerCase());
  });
  useEffect(() => {
    setText(initial);
    setMention(mentionInitially);
  }, [initial, mentionInitially]);
  useEffect(() => {
    if (autoFocus) textarea.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    if (voice === "idle") setVoiceLocked(false);
  }, [voice]);
  const choose = (name: string) => {
    setText(text.replace(/@[^@]*$/, "@" + name + " "));
    setMention(false);
    textarea.current?.focus();
  };
  const submit = () => {
    if (disabled) return;
    const value = voice === "review" ? voiceTranscript : text.trim();
    if (!value && !files.length) return;
    onSend(value, {
      attachments: files.length
        ? files.map((f) => ({ ...f, status: offline ? "waiting" : "ready" }))
        : undefined,
      voice:
        voice === "review"
          ? {
              ...sampleVoice,
              transcript: voiceTranscript,
              url:
                voiceTranscript === "XS to XL."
                  ? "./assets/voice-sizes.wav"
                  : sampleVoice.url,
            }
          : undefined,
    });
    setText("");
    setFiles([]);
    setVoice("idle");
    setMention(false);
  };
  const sendVoice = (note: VoiceNote) => {
    onSend(note.transcript, { voice: note });
    setVoice("idle");
  };
  const addFiles = async (incoming: File[]) => {
    const result = await prepareFiles(incoming, files.length);
    setFiles((current) => [...current, ...result.files].slice(0, 10));
    setError(result.error || "");
  };
  useEffect(() => {
    const active = () => {
      const modal = document.querySelector("dialog[open]");
      return !modal || modal.contains(root.current);
    };
    const drop = (e: DragEvent) => {
      if (active() && e.dataTransfer?.files.length) {
        e.preventDefault();
        void addFiles([...e.dataTransfer.files]);
      }
    };
    const over = (e: DragEvent) => {
      if (active() && e.dataTransfer?.types.includes("Files"))
        e.preventDefault();
    };
    const paste = (e: ClipboardEvent) => {
      if (active() && e.clipboardData?.files.length) {
        e.preventDefault();
        void addFiles([...e.clipboardData.files]);
      }
    };
    document.addEventListener("drop", drop);
    document.addEventListener("dragover", over);
    document.addEventListener("paste", paste);
    return () => {
      document.removeEventListener("drop", drop);
      document.removeEventListener("dragover", over);
      document.removeEventListener("paste", paste);
    };
  }, [files.length]);
  useEffect(() => () => clearTimeout(hold.current.timer), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const modal = document.querySelector("dialog[open]");
      if (modal && !modal.contains(picker.current)) return;
      if (e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        setVoice((v) => (v === "recording" ? "review" : "recording"));
      }
      if (e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        picker.current?.click();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div
      ref={root}
      className={"composer-container " + (compact ? "compact" : "")}
    >
      {quoted && (
        <div className="quote">
          <span>{quoted}</span>
          <IconButton label="Remove quoted message" onClick={onClearQuote}>
            <X size={14} />
          </IconButton>
        </div>
      )}
      {files.length > 0 && (
        <AttachmentList
          files={files}
          onRemove={(id) => setFiles(files.filter((f) => f.id !== id))}
          onOpen={setViewer}
          onRetry={(id) =>
            setFiles(
              files.map((f) =>
                f.id === id
                  ? { ...f, status: offline ? "waiting" : "ready" }
                  : f,
              ),
            )
          }
        />
      )}
      {error && (
        <div className="file-error" role="alert">
          <span>{error}</span>
          <IconButton label="Dismiss file message" onClick={() => setError("")}>
            <X size={15} />
          </IconButton>
        </div>
      )}
      <div className="composer">
        {voice === "idle" ? (
          <textarea
            ref={textarea}
            aria-label={placeholder}
            placeholder={placeholder}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setMention(
                e.target.value.includes("@") && !e.target.value.endsWith(" "),
              );
              setMentionIndex(0);
            }}
            onKeyDown={(e) => {
              if (mention && matches.length) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex(
                    (mentionIndex +
                      (e.key === "ArrowDown" ? 1 : -1) +
                      matches.length) %
                      matches.length,
                  );
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  choose(matches[mentionIndex]?.label || matches[0].label);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMention(false);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
        ) : (
          <VoicePanel
            stage={voice}
            onStage={setVoice}
            onCancel={() => {
              setVoice("idle");
              setTimeout(() => textarea.current?.focus(), 0);
            }}
            onSend={sendVoice}
            onLock={() => {
              hold.current.locked = true;
              setVoiceLocked(true);
            }}
            locked={voiceLocked}
            transcript={voiceTranscript}
            initialSeconds={voiceSeconds}
            offline={offline}
          />
        )}
        <div className="composer-actions">
          <span className="composer-tools">
            <IconButton
              label="Add files (Cmd/Ctrl+Shift+A)"
              onClick={() => picker.current?.click()}
            >
              <Paperclip size={18} />
            </IconButton>
            <IconButton
              label={
                voice === "recording"
                  ? "Stop voice note"
                  : voice === "review"
                    ? "Play voice note"
                    : "Record a voice note (Cmd/Ctrl+Shift+R)"
              }
              onPointerDown={(e) => {
                if (
                  (e.pointerType !== "mouse" && e.pointerType !== "touch") ||
                  voice !== "idle"
                )
                  return;
                hold.current = {
                  started: Date.now(),
                  active: false,
                  locked: false,
                  skipClick: false,
                };
                setVoiceLocked(false);
                e.currentTarget.setPointerCapture(e.pointerId);
                hold.current.timer = window.setTimeout(() => {
                  hold.current.active = true;
                  setVoice("recording");
                }, 350);
              }}
              onPointerUp={() => {
                clearTimeout(hold.current.timer);
                if (!hold.current.active) return;
                hold.current.skipClick = true;
                if (hold.current.locked) return;
                const seconds = (Date.now() - hold.current.started) / 1000;
                if (seconds < 1) {
                  setVoice("idle");
                  setError("Hold to record.");
                } else
                  sendVoice({
                    ...sampleVoice,
                    transcript: voiceTranscript,
                    seconds: Math.round(seconds),
                  });
                hold.current.active = false;
              }}
              onPointerMove={(e) => {
                if (
                  !hold.current.active ||
                  hold.current.locked ||
                  e.buttons !== 1
                )
                  return;
                const rect = e.currentTarget.getBoundingClientRect();
                const target = document.elementFromPoint(e.clientX, e.clientY);
                if (target?.closest(".voice-lock")) {
                  hold.current.locked = true;
                  setVoiceLocked(true);
                  return;
                }
                if (
                  e.clientX < rect.left - 25 ||
                  e.clientX > rect.right + 25 ||
                  e.clientY < rect.top - 25 ||
                  e.clientY > rect.bottom + 25
                ) {
                  setVoice("idle");
                  hold.current.active = false;
                  hold.current.skipClick = true;
                }
              }}
              onPointerCancel={() => {
                clearTimeout(hold.current.timer);
                hold.current.active = false;
                setVoice("idle");
              }}
              onClick={() => {
                if (hold.current.skipClick) {
                  hold.current.skipClick = false;
                  return;
                }
                if (voice === "review") {
                  const audio = new Audio(
                    "./assets/" +
                      (voiceTranscript === "XS to XL."
                        ? "voice-sizes.wav"
                        : "voice-note.wav"),
                  );
                  void audio.play();
                } else setVoice(voice === "idle" ? "recording" : "review");
              }}
            >
              <span>
                {voice === "recording" ? (
                  <Square size={16} />
                ) : voice === "review" ? (
                  <Play size={17} />
                ) : (
                  <Mic size={18} />
                )}
              </span>
            </IconButton>
            <IconButton
              label="Name someone with @"
              onClick={() => {
                setText(text + "@");
                setMention(true);
                textarea.current?.focus();
              }}
            >
              <AtSign size={17} />
            </IconButton>
          </span>
          <span className="composer-send">
            <span className="composer-hint">
              {disabled
                ? "You can decide when you're back online."
                : offline
                  ? "Waiting to send"
                  : paused
                    ? "Scout will reply when the team is back."
                    : "Enter to send"}
            </span>
            <IconButton
              label="Send message"
              className="send-button"
              disabled={
                disabled ||
                (!text.trim() && !files.length && voice !== "review")
              }
              onClick={submit}
            >
              <ArrowUp size={18} />
            </IconButton>
          </span>
        </div>
        <input
          ref={picker}
          type="file"
          multiple
          className="visually-hidden"
          aria-label="Choose photos and files"
          accept=".jpg,.jpeg,.png,.heic,.webp,.mp4,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          onChange={(e) => {
            void addFiles(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
      </div>
      {mention && (
        <div className="mention-list" role="listbox" aria-label="Name someone">
          {matches.map((e, i) => (
            <button
              key={e.label}
              role="option"
              aria-selected={i === mentionIndex}
              onClick={() => choose(e.label)}
              className={i === mentionIndex ? "selected" : ""}
            >
              {e.employee ? (
                <Avatar
                  name={e.name as import("../data/types").EmployeeId}
                  size="small"
                />
              ) : (
                <PersonInitials partner={e.name === "Kagiso"} />
              )}
              <span>
                {e.label}
                <small>{e.role}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      {viewer !== null && (
        <FileViewer
          files={files}
          initial={viewer}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
