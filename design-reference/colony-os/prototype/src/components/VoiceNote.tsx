import { useEffect, useRef, useState } from "react";
import { Lock, Mic, Pause, Play, Square, X } from "lucide-react";
import { Button, IconButton } from "./primitives";
import { sampleVoice } from "../data/conversation-fixtures";
import type { Person, VoiceNote } from "../data/types";

export type VoiceStage =
  | "recording"
  | "review"
  | "permission"
  | "denied"
  | "no-mic"
  | "preparing";
export function VoicePanel({
  stage,
  onStage,
  onCancel,
  onSend,
  onLock,
  locked = false,
  transcript = sampleVoice.transcript,
  initialSeconds = 42,
  offline = false,
}: {
  stage: VoiceStage;
  onStage: (stage: VoiceStage) => void;
  onCancel: () => void;
  onSend: (voice: VoiceNote) => void;
  onLock?: () => void;
  locked?: boolean;
  transcript?: string;
  initialSeconds?: number;
  offline?: boolean;
}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (stage !== "recording") return;
    const timer = setInterval(
      () => setSeconds((s) => Math.min(300, s + 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [stage]);
  useEffect(() => {
    if (stage === "recording" && seconds >= 300) onStage("review");
  }, [seconds, stage]);
  useEffect(() => {
    if (stage === "review") setSeconds((s) => s || 12);
  }, [stage]);
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [onCancel]);
  if (["permission", "denied", "no-mic", "preparing"].includes(stage))
    return (
      <div className="voice-panel voice-help" role="status">
        <Mic size={25} />
        <div>
          <strong>
            {stage === "permission"
              ? "Use your microphone?"
              : stage === "denied"
                ? "Colony can't use your microphone. Turn it on in your computer's settings."
                : stage === "no-mic"
                  ? "No microphone found. Plug one in or type instead."
                  : "Getting voice notes ready on this computer. This takes about a minute."}
          </strong>
          <div className="button-row">
            {stage === "permission" && (
              <Button tone="primary" onClick={() => onStage("recording")}>
                Allow microphone
              </Button>
            )}
            {stage === "denied" && (
              <Button onClick={() => onStage("permission")}>
                Open settings
              </Button>
            )}
            {stage === "preparing" && (
              <Button onClick={() => onStage("recording")}>Try again</Button>
            )}
            <Button tone="quiet" onClick={onCancel}>
              Type instead
            </Button>
          </div>
        </div>
      </div>
    );
  const stamp =
    Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  return (
    <div
      className="voice-panel"
      aria-label={
        stage === "recording" ? "Recording voice note" : "Review voice note"
      }
    >
      <div className="voice-panel-top">
        <span
          className={
            "voice-indicator " + (stage === "recording" ? "recording" : "")
          }
        >
          <Mic size={17} />
          {stage === "recording" ? "Recording " + stamp : "Your voice note"}
        </span>
        <IconButton label="Cancel voice note" onClick={onCancel}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="voice-panel-wave">
        <span className="waveform" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <i key={i} style={{ height: 8 + ((i * 11) % 31) + "px" }} />
          ))}
        </span>
        <span>{stamp}</span>
      </div>
      {stage === "review" && (
        <>
          <audio
            ref={audio}
            src="./assets/voice-note.wav"
            onEnded={() => setPlaying(false)}
            preload="metadata"
          />
          <div className="voice-review-copy">
            <Button
              tone="quiet"
              onClick={() => {
                if (playing) audio.current?.pause();
                else void audio.current?.play();
                setPlaying(!playing);
              }}
              aria-label={playing ? "Pause voice note" : "Play voice note"}
            >
              {playing ? <Pause size={17} /> : <Play size={17} />}{" "}
              {playing ? "Pause" : "Play"}
            </Button>
            <p>{transcript}</p>
          </div>
        </>
      )}
      <div className="voice-panel-bottom">
        <small>
          {offline
            ? "Waiting to send"
            : seconds >= 270
              ? "Voice notes can be up to 5 minutes."
              : locked
                ? "Hands-free. Stop when you're ready."
                : "Hold to record. Let go to send."}
        </small>
        <div className="button-row">
          {stage === "recording" ? (
            <>
              {!locked && (
                <Button
                  className="voice-lock"
                  onPointerEnter={(e) => {
                    if (e.buttons === 1) onLock?.();
                  }}
                  onClick={onLock}
                >
                  <Lock size={15} />
                  Lock
                </Button>
              )}
              <Button onClick={() => onStage("review")}>
                <Square size={14} />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button tone="quiet" onClick={onCancel}>
                Discard
              </Button>
              <Button
                tone="primary"
                onClick={() => onSend({ ...sampleVoice, transcript, seconds })}
              >
                Send voice note
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function VoiceBubble({
  voice,
  sender,
  actor,
  onUpdate,
  onType,
}: {
  voice: VoiceNote;
  sender: string;
  actor: Person;
  onUpdate: (voice: VoiceNote) => void;
  onType: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(voice.transcript);
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="voice-bubble">
      <div className="voice-bubble-player">
        <audio
          ref={audio}
          src={voice.url}
          onEnded={() => setPlaying(false)}
          preload="metadata"
        />
        <IconButton
          label={playing ? "Pause voice note" : "Play voice note"}
          onClick={() => {
            if (playing) audio.current?.pause();
            else void audio.current?.play();
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </IconButton>
        <span className="waveform" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ height: 7 + ((i * 9) % 20) + "px" }} />
          ))}
        </span>
        <span>
          {Math.floor(voice.seconds / 60)}:
          {String(voice.seconds % 60).padStart(2, "0")}
        </span>
      </div>
      {voice.status === "transcribing" ? (
        <p role="status">Writing it down...</p>
      ) : voice.status === "failed" ? (
        <div className="voice-failed">
          <p>Couldn't write this one down.</p>
          {sender === actor && (
            <div className="button-row">
              <Button onClick={() => onUpdate({ ...voice, status: "ready" })}>
                Try again
              </Button>
              <Button tone="quiet" onClick={onType}>
                Type instead
              </Button>
            </div>
          )}
        </div>
      ) : editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) {
              onUpdate({ ...voice, transcript: text, fixedBy: actor });
              setEditing(false);
            }
          }}
        >
          <label>
            Transcript
            <textarea
              aria-label="Fix transcript"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
          </label>
          <div className="button-row">
            <Button type="submit" tone="primary" disabled={!text.trim()}>
              Save
            </Button>
            <Button type="button" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className={expanded ? "" : "voice-transcript"}>
            {voice.transcript}
          </p>
          {voice.transcript.length > 160 && (
            <Button tone="quiet" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : "Show full transcript"}
            </Button>
          )}
          {voice.fixedBy && <small>Transcript fixed by {voice.fixedBy}</small>}
          {sender === actor && (
            <Button
              tone="quiet"
              onClick={() => {
                setText(voice.transcript);
                setEditing(true);
              }}
            >
              Fix transcript
            </Button>
          )}
        </>
      )}
    </div>
  );
}
