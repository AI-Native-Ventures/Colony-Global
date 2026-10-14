import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FileImage,
  Film,
  X,
} from "lucide-react";
import { Button, CloseButton, Dialog, IconButton } from "./primitives";
import type { Attachment } from "../data/types";

export const fileSize = (size: number) =>
  size >= 1000000
    ? (size / 1000000).toFixed(size % 1000000 === 0 ? 0 : 1) + " MB"
    : Math.max(1, Math.round(size / 1000)) + " KB";
export async function prepareFiles(
  incoming: File[],
  existing: number,
): Promise<{ files: Attachment[]; error?: string }> {
  if (incoming.length + existing > 10)
    return { files: [], error: "You can add up to 10 files at a time." };
  const files: Attachment[] = [];
  let error = "";
  for (const file of incoming) {
    const ext = file.name.split(".").at(-1)?.toLowerCase() || "";
    const kind = ["jpg", "jpeg", "png", "heic", "webp"].includes(ext)
      ? "image"
      : ["mp4", "mov"].includes(ext)
        ? "video"
        : ext === "pdf"
          ? "pdf"
          : [
                "doc",
                "docx",
                "xls",
                "xlsx",
                "ppt",
                "pptx",
                "txt",
                "csv",
              ].includes(ext)
            ? "document"
            : null;
    if (!kind) {
      error ||=
        "Colony can't take ." +
        ext +
        " files. Photos, videos, PDFs and documents work.";
      continue;
    }
    const limit = kind === "image" ? 50 : kind === "video" ? 500 : 100;
    if (file.size > limit * 1000000) {
      error ||=
        "This " +
        (kind === "image" ? "photo" : kind === "video" ? "video" : "file") +
        " is " +
        fileSize(file.size) +
        ". The limit is " +
        limit +
        " MB. " +
        (kind === "video"
          ? "Trim it or share a link instead."
          : "Share a smaller file instead.");
      continue;
    }
    const type =
      file.type ||
      (kind === "image"
        ? "image/" + ext
        : kind === "video"
          ? "video/" + ext
          : kind === "pdf"
            ? "application/pdf"
            : "application/octet-stream");
    files.push({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type,
      kind,
      url: URL.createObjectURL(file),
      text:
        ["txt", "csv"].includes(ext) && file.size < 1000000
          ? (await file.text()).slice(0, 6000)
          : undefined,
    });
  }
  return { files, error: error || undefined };
}
export function AttachmentList({
  files,
  onRemove,
  onOpen,
  onRetry,
}: {
  files: Attachment[];
  onRemove?: (id: string) => void;
  onOpen?: (index: number) => void;
  onRetry?: (id: string) => void;
}) {
  return (
    <div className="file-list" aria-label="Photos and files">
      {files.map((file, i) => (
        <div
          className={"file-preview " + (file.status || "ready")}
          key={file.id}
          tabIndex={onRemove ? 0 : undefined}
          onKeyDown={(e) => {
            if (onRemove && ["Backspace", "Delete"].includes(e.key)) {
              e.preventDefault();
              onRemove(file.id);
            }
          }}
        >
          <button
            className="file-preview-open"
            onClick={() => onOpen?.(i)}
            disabled={!onOpen}
            aria-label={"Open " + file.name}
          >
            {file.kind === "image" && !/heic/i.test(file.type) ? (
              <img src={file.url} alt={file.name} />
            ) : (
              <span className="file-kind">
                {file.kind === "image" ? (
                  <FileImage size={25} />
                ) : file.kind === "video" ? (
                  <Film size={25} />
                ) : (
                  <FileText size={25} />
                )}
              </span>
            )}
            <span>
              <strong>{file.name}</strong>
              <small>
                {file.status === "failed"
                  ? "Couldn't upload " + file.name + "."
                  : file.status === "uploading"
                    ? "Uploading " + (i + 1) + " of " + files.length
                    : file.status === "waiting"
                      ? "Waiting to send"
                      : fileSize(file.size)}
              </small>
              {file.ai && <small>AI-made image</small>}
            </span>
          </button>
          {file.status === "uploading" && (
            <progress
              aria-label={"Upload progress for " + file.name}
              value={i === 0 ? 70 : 35}
              max={100}
            />
          )}
          {file.status === "failed" && onRetry && (
            <Button tone="quiet" onClick={() => onRetry(file.id)}>
              Try again
            </Button>
          )}
          {onRemove && (
            <IconButton
              label={"Remove " + file.name}
              onClick={() => onRemove(file.id)}
            >
              <X size={14} />
            </IconButton>
          )}
        </div>
      ))}
    </div>
  );
}
export function FileViewer({
  files,
  initial = 0,
  onClose,
  onLibrary,
  inline = false,
}: {
  files: Attachment[];
  initial?: number;
  onClose: () => void;
  onLibrary?: (file: Attachment) => void;
  inline?: boolean;
}) {
  const [index, setIndex] = useState(initial);
  const [added, setAdded] = useState(false);
  const file = files[index];
  if (!file) return null;
  const content = (
    <div
      className="file-viewer-content"
      onKeyDown={(e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          setIndex(
            (index + (e.key === "ArrowLeft" ? -1 : 1) + files.length) %
              files.length,
          );
          setAdded(false);
        }
      }}
    >
      <header>
        <div>
          <h2>{file.name}</h2>
          <p>
            {fileSize(file.size)}
            {file.ai ? " · AI-made image" : ""}
          </p>
        </div>
        <CloseButton onClose={onClose} />
      </header>
      <div className={"file-viewer-stage " + file.kind}>
        {file.kind === "image" && !/heic/i.test(file.type) ? (
          <img src={file.url} alt={file.name} />
        ) : file.kind === "video" ? (
          <video src={file.url} controls aria-label={file.name} />
        ) : file.kind === "pdf" ? (
          <iframe title={file.name} src={file.url} />
        ) : file.text ? (
          <pre>{file.text}</pre>
        ) : (
          <div className="file-no-preview">
            <FileText size={36} />
            <p>Open this file in your computer's app.</p>
          </div>
        )}
      </div>
      <footer>
        <div className="button-row">
          {files.length > 1 && (
            <>
              <IconButton
                label="Previous file"
                onClick={() => {
                  setIndex((index - 1 + files.length) % files.length);
                  setAdded(false);
                }}
              >
                <ChevronLeft size={19} />
              </IconButton>
              <span>
                {index + 1} of {files.length}
              </span>
              <IconButton
                label="Next file"
                onClick={() => {
                  setIndex((index + 1) % files.length);
                  setAdded(false);
                }}
              >
                <ChevronRight size={19} />
              </IconButton>
            </>
          )}
        </div>
        <div className="button-row">
          {file.kind === "image" && onLibrary && (
            <Button
              onClick={() => {
                onLibrary(file);
                setAdded(true);
              }}
            >
              {added ? "Added to library" : "Add to photo library"}
            </Button>
          )}
          <a className="button primary" href={file.url} download={file.name}>
            <Download size={16} />
            {file.kind === "document" && !file.text
              ? "Open in computer's app"
              : "Save"}
          </a>
        </div>
      </footer>
    </div>
  );
  return inline ? (
    <div className="file-viewer inline">{content}</div>
  ) : (
    <Dialog title={file.name} onClose={onClose} className="file-viewer">
      {content}
    </Dialog>
  );
}
