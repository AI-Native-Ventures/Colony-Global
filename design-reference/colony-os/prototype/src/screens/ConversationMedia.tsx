import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Avatar,
  Button,
  IconButton,
  PersonInitials,
} from "../components/primitives";
import { Composer } from "../components/Composer";
import { FileViewer } from "../components/Attachments";
import { MessageMedia } from "../components/MessageMedia";
import { VoiceBubble, type VoiceStage } from "../components/VoiceNote";
import {
  sampleDocument,
  samplePhoto,
  sampleScreenshot,
  sampleVoice,
} from "../data/conversation-fixtures";
import { mockStore } from "../data/mock-store";
import type { Attachment, Message, VoiceNote } from "../data/types";
import { CommonContent, type ScreenProps } from "./shared";

function MediaHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="media-page-heading">
      <IconButton label="Back to conversation" onClick={onBack}>
        <ArrowLeft size={18} />
      </IconButton>
      <div>
        <span className="eyebrow">SPRING LAUNCH</span>
        <h1>{title}</h1>
      </div>
    </header>
  );
}
export function VoiceNotes({
  state,
  partner,
  onDestination,
  onSend,
  onNotice,
}: ScreenProps) {
  const actor = partner ? "Kagiso" : "Lerato";
  const [voice, setVoice] = useState<VoiceNote>({
    ...sampleVoice,
    status:
      state === "transcribing"
        ? "transcribing"
        : state === "transcription-failed"
          ? "failed"
          : "ready",
    transcript:
      state === "long-transcript"
        ? sampleVoice.transcript +
          " Let's show why linen works for Johannesburg spring days. Can Naledi use the warmer background, bring the green dress into slide three, and keep the caption short? Please show me the posts before anything goes out."
        : sampleVoice.transcript,
    fixedBy: state === "transcript-fixed" ? actor : undefined,
  });
  const sent = [
    "sent",
    "transcribing",
    "transcript-ready",
    "transcription-failed",
    "transcript-fixed",
    "long-transcript",
    "offline",
  ].includes(state);
  const initial: VoiceStage | undefined =
    state === "first-use"
      ? "permission"
      : state === "permission-denied"
        ? "denied"
        : state === "no-microphone"
          ? "no-mic"
          : state === "preparing"
            ? "preparing"
            : ["recording", "locked", "near-limit"].includes(state)
              ? "recording"
              : ["review", "at-limit"].includes(state)
                ? "review"
                : undefined;
  const [typeInstead, setTypeInstead] = useState(false);
  return (
    <div className="media-page">
      <MediaHeader title="Voice note" onBack={() => onDestination("T-03")} />
      <CommonContent state={state} onRetry={() => onDestination("T-07")}>
        <div className="media-example">
          <Avatar name="Scout" size="large" />
          <p>Hold to record. Let go to send.</p>
          {sent && !typeInstead && (
            <article className="media-sent-example">
              <PersonInitials partner={partner} />
              <div>
                <div className="message-meta">
                  <strong>{actor}</strong>
                  <time>10:42</time>
                </div>
                <VoiceBubble
                  voice={voice}
                  sender={actor}
                  actor={actor}
                  onUpdate={(next) => {
                    setVoice(next);
                    onNotice(
                      next.fixedBy
                        ? "Transcript fixed by " + actor
                        : "Written down.",
                    );
                  }}
                  onType={() => setTypeInstead(true)}
                />
                {state === "offline" && <small>Waiting to send</small>}
              </div>
            </article>
          )}
          {state === "too-short" && (
            <p className="media-feedback" role="status">
              Hold to record.
            </p>
          )}
        </div>
        <div className="media-composer">
          <Composer
            key={String(typeInstead)}
            initialVoice={typeInstead ? undefined : initial}
            initialLocked={state === "locked"}
            voiceSeconds={
              state === "near-limit" ? 270 : state === "at-limit" ? 300 : 42
            }
            onSend={onSend}
            offline={state === "offline"}
          />
        </div>
        <p className="review-fixture-note" data-review-ui>
          Design fixture: bundled audio and transcript. This prototype does not
          request microphone access or transcribe recordings.
        </p>
      </CommonContent>
    </div>
  );
}
export function Attachments({
  state,
  partner,
  onDestination,
  onSend,
  onNotice,
}: ScreenProps) {
  const actor = partner ? "Kagiso" : "Lerato";
  const baseFiles =
    state === "customer-screenshot"
      ? [sampleScreenshot]
      : [samplePhoto, sampleDocument];
  const initialFiles: Attachment[] =
    state === "uploading"
      ? Array.from({ length: 6 }, (_, i) => ({
          ...samplePhoto,
          id: "upload-" + i,
          name: "Spring-background-" + (i + 1) + ".png",
          status: "uploading" as const,
        }))
      : baseFiles.map((f, i) => ({
          ...f,
          status:
            state === "upload-failed" && i === 0
              ? "failed"
              : state === "offline"
                ? "waiting"
                : "ready",
        }));
  const [message, setMessage] = useState<Message>({
    id: "media-demo",
    from: actor,
    time: "10:42",
    text:
      state === "customer-screenshot"
        ? "Can Grace help with this customer's message?"
        : "The spring launch photos and notes.",
    attachments: initialFiles,
    photoLibraryChoice: state === "library-added" ? "added" : undefined,
  });
  const [viewer, setViewer] = useState(
    state === "photo-viewer" || state === "document-viewer",
  );
  const sent = [
    "sent",
    "library-offer",
    "library-added",
    "customer-screenshot",
    "upload-failed",
    "uploading",
    "offline",
  ].includes(state);
  const error =
    state === "too-big"
      ? "This video is 620 MB. The limit is 500 MB. Trim it or share a link instead."
      : state === "not-allowed"
        ? "Colony can't take .exe files. Photos, videos, PDFs and documents work."
        : state === "too-many"
          ? "You can add up to 10 files at a time."
          : state === "rate-limited"
            ? "This takes a minute."
            : "";
  return (
    <div className="media-page">
      <MediaHeader
        title="Photos and files"
        onBack={() => onDestination("T-03")}
      />
      <CommonContent state={state} onRetry={() => onDestination("T-08")}>
        {viewer ? (
          <FileViewer
            inline
            files={baseFiles}
            initial={state === "document-viewer" ? 1 : 0}
            onClose={() => setViewer(false)}
            onLibrary={(file) => {
              mockStore.addToLibrary([file.id]);
              onNotice("Added 1 photo to your library.");
            }}
          />
        ) : (
          <>
            <div className="media-example files-example">
              {sent ? (
                <article className="media-sent-example">
                  <PersonInitials partner={partner} />
                  <div>
                    <div className="message-meta">
                      <strong>{actor}</strong>
                      <time>10:42</time>
                    </div>
                    <p>{message.text}</p>
                    <MessageMedia
                      message={message}
                      actor={actor}
                      onVoice={() => {}}
                      onType={() => {}}
                      onFiles={(files) =>
                        setMessage({ ...message, attachments: files })
                      }
                      onLibrary={(files) => {
                        mockStore.addToLibrary(files.map((f) => f.id));
                        setMessage({ ...message, photoLibraryChoice: "added" });
                        onNotice(
                          "Added " + files.length + " photos to your library.",
                        );
                      }}
                      onDeclineLibrary={() =>
                        setMessage({
                          ...message,
                          photoLibraryChoice: "declined",
                        })
                      }
                    />
                  </div>
                </article>
              ) : (
                <>
                  <Avatar name="Scout" size="large" />
                  <h2>Add photos or files</h2>
                </>
              )}
              {state === "customer-screenshot" && (
                <div className="customer-screenshot-example">
                  <p>Thabo Nkosi</p>
                  <p>Hi Lerato, can you check where my order is?</p>
                  <div>
                    <Avatar name="Scout" size="small" />
                    <span>Grace will draft an answer.</span>
                  </div>
                </div>
              )}
            </div>
            <div className="media-composer">
              <Composer
                onSend={onSend}
                initialFiles={sent || state === "empty" ? [] : baseFiles}
                fileError={error}
                offline={state === "offline"}
              />
            </div>
          </>
        )}
        <p className="review-fixture-note" data-review-ui>
          Design fixture: local previews and simulated upload states. No file is
          uploaded. The photo library is a local mock list.
        </p>
      </CommonContent>
    </div>
  );
}
