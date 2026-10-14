import { useState } from "react";
import { AttachmentList, FileViewer } from "./Attachments";
import { VoiceBubble } from "./VoiceNote";
import { Button } from "./primitives";
import type { Attachment, Message, Person, VoiceNote } from "../data/types";

export function MessageMedia({
  message,
  actor,
  onVoice,
  onFiles,
  onLibrary,
  onDeclineLibrary,
  onType,
}: {
  message: Message;
  actor: Person;
  onVoice: (voice: VoiceNote) => void;
  onFiles: (files: Attachment[]) => void;
  onLibrary: (files: Attachment[]) => void;
  onDeclineLibrary: () => void;
  onType: () => void;
}) {
  const [viewer, setViewer] = useState<number | null>(null);
  const files = message.attachments || [];
  const photos = files.filter(
    (f) => f.kind === "image" && !/message|screenshot/i.test(f.name),
  );
  return (
    <>
      {message.voice && (
        <VoiceBubble
          voice={message.voice}
          sender={message.from}
          actor={actor}
          onUpdate={onVoice}
          onType={onType}
        />
      )}
      {!!files.length && (
        <AttachmentList
          files={files}
          onOpen={setViewer}
          onRetry={(id) =>
            onFiles(
              files.map((f) => (f.id === id ? { ...f, status: "ready" } : f)),
            )
          }
          onRemove={
            files.some((f) => f.status === "failed" || f.status === "waiting")
              ? (id) => onFiles(files.filter((f) => f.id !== id))
              : undefined
          }
        />
      )}
      {!!photos.length && !message.photoLibraryChoice && (
        <div className="photo-library-offer">
          <p>
            Are these product photos? Add them to your photo library so Naledi
            and Leo can use them.
          </p>
          <div className="button-row">
            <Button onClick={() => onLibrary(photos)}>Add to library</Button>
            <Button tone="quiet" onClick={onDeclineLibrary}>
              Not these
            </Button>
          </div>
        </div>
      )}
      {message.photoLibraryChoice === "added" && (
        <p className="media-confirmation">
          Added {photos.length} {photos.length === 1 ? "photo" : "photos"} to
          your library.
        </p>
      )}
      {viewer !== null && (
        <FileViewer
          files={files}
          initial={viewer}
          onClose={() => setViewer(null)}
          onLibrary={(file) => onLibrary([file])}
        />
      )}
    </>
  );
}
