import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageCircle,
  Monitor,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { displayName } from "../data/team-actions";
import { mockStore, useMock } from "../data/mock-store";
import type { Attachment, EmployeeId, Message, Person, WorkspaceReference } from "../data/types";
import { Avatar, Button, IconButton, PersonInitials } from "./primitives";
import { Composer } from "./Composer";
import { FileViewer } from "./Attachments";
import { MessageMedia } from "./MessageMedia";
import { LinkedText, messageLinks } from "./LinkedText";

type WorkspaceSection = "Media" | "Files" | "Links" | "Browser";

function SourceAuthor({ name }: { name: Message["from"] }) {
  return name === "Lerato" || name === "Kagiso" ? (
    <PersonInitials partner={name === "Kagiso"} />
  ) : (
    <Avatar name={name as EmployeeId} size="small" />
  );
}

function ThreadPanel({
  conversationId,
  root,
  actor,
  offline,
  paused,
  onSource,
  onCard,
  onNotice,
}: {
  conversationId: string;
  root: string;
  actor: Person;
  offline: boolean;
  paused: boolean;
  onSource: (key: string) => void;
  onCard: (id: string) => void;
  onNotice: (text: string) => void;
}) {
  const snapshot = useMock();
  const cardId = root.startsWith("card:") ? root.slice(5) : "";
  const card = cardId ? snapshot.cards[cardId] : undefined;
  const source = root.startsWith("message:")
    ? snapshot.messages.find((m) => m.id === root.slice(8))
    : undefined;
  const replies = snapshot.messages.filter(
    (m) => (m.conversationId || "spring") === conversationId && m.threadRoot === root,
  );
  return (
    <>
      <div className="side-panel-scroll thread-panel-scroll">
        <div className="thread-source">
          {card ? (
            <>
              <div className="thread-source-by">
                <Avatar name={card.from} size="small" />
                <span>{displayName(card.from)} · {card.type}</span>
              </div>
              <h3>{card.title}</h3>
              <p>{card.summary}</p>
              <div className="thread-source-actions">
                <Button tone="quiet" onClick={() => onSource(root)}>Find in conversation</Button>
                <Button tone="quiet" onClick={() => onCard(card.id)}>Open card</Button>
              </div>
            </>
          ) : source ? (
            <>
              <div className="thread-source-by">
                <SourceAuthor name={source.from} />
                <span>{source.from === "Lerato" || source.from === "Kagiso" ? source.from : displayName(source.from)} · {source.time}</span>
              </div>
              <p><LinkedText text={source.text} /></p>
              {!!source.attachments?.length && (
                <small>{source.attachments.map((file) => file.name).join(" · ")}</small>
              )}
              <Button tone="quiet" onClick={() => onSource(root)}>Find in conversation</Button>
            </>
          ) : (
            <p>This item is no longer in the conversation.</p>
          )}
        </div>
        <div className="thread-reply-heading">
          <span>{replies.length ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}` : "Start the discussion"}</span>
        </div>
        {replies.map((reply) => (
          <article className="thread-reply" key={reply.id}>
            <SourceAuthor name={reply.from} />
            <div>
              <div className="message-meta">
                <strong>{reply.from === "Lerato" || reply.from === "Kagiso" ? reply.from : displayName(reply.from)}</strong>
                <time>{reply.time}</time>
              </div>
              <p><LinkedText text={reply.text} /></p>
              <MessageMedia
                message={reply}
                actor={actor}
                onVoice={(voice) => mockStore.updateMessage(reply.id, { voice, text: voice.transcript })}
                onFiles={(attachments) => mockStore.updateMessage(reply.id, { attachments })}
                onLibrary={(files) => {
                  mockStore.addToLibrary(files.map((file) => file.id), reply.id, actor);
                  onNotice("Added to your photo library.");
                }}
                onDeclineLibrary={() => mockStore.updateMessage(reply.id, { photoLibraryChoice: "declined" })}
                onType={() => mockStore.updateMessage(reply.id, { voice: undefined, text: "Message deleted" })}
              />
              {reply.status && <small className="thread-delivery">{reply.status}</small>}
            </div>
          </article>
        ))}
      </div>
      {(card || source) && <div className="side-panel-composer">
        <Composer
          key={root}
          compact
          placeholder="Reply in thread"
          offline={offline}
          paused={paused}
          onSend={(text, payload) => {
            const id = mockStore.sendThreadReply(conversationId, root, text, actor, payload, offline);
            if (id && !offline) window.setTimeout(() => mockStore.deliver(id), 350);
          }}
        />
      </div>}
    </>
  );
}

function WorkspacePanel({
  conversationId,
  onSource,
  onCard,
  onThread,
  onAddFiles,
  onNotice,
}: {
  conversationId: string;
  onSource: (key: string) => void;
  onCard: (id: string) => void;
  onThread: (key: string) => void;
  onAddFiles: () => void;
  onNotice: (text: string) => void;
}) {
  const snapshot = useMock();
  const topic = snapshot.topics[conversationId];
  const [section, setSection] = useState<WorkspaceSection>("Media");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<number | null>(null);
  const messages = snapshot.messages.filter((m) => (m.conversationId || "spring") === conversationId);
  const sourcedFiles = messages.flatMap((message) =>
    (message.attachments || []).map((file) => ({ file, message })),
  );
  const allFiles = sourcedFiles.map(({ file }) => file);
  const media = sourcedFiles.filter(({ file }) => file.kind === "image" || file.kind === "video");
  const documents = sourcedFiles.filter(({ file }) => file.kind === "pdf" || file.kind === "document");
  const mediaCards = (topic?.mediaCardIds || []).map((id) => snapshot.cards[id]).filter(Boolean);
  const references = snapshot.workspaceReferences.filter(
    (ref) => ref.conversationId === conversationId && ref.kind === (section === "Browser" ? "browser" : "link"),
  );
  const sharedLinks = messages.flatMap((message) =>
    messageLinks(message.text).map((url) => ({ url, message })),
  );
  const publishedLinks = (topic?.mediaCardIds || [])
    .map((id) => snapshot.cards[id])
    .filter((card) => card?.postLink && /^https?:\/\//i.test(card.postLink));
  const openFile = (file: Attachment) => setViewer(allFiles.findIndex((item) => item.id === file.id));
  const sections: WorkspaceSection[] = ["Media", "Files", "Links", "Browser"];
  return (
    <>
      <div className="workspace-sections" aria-label="Workspace sections">
        {sections.map((item) => (
          <button
            key={item}
            type="button"
            className={section === item ? "active" : ""}
            aria-pressed={section === item}
            onClick={() => { setSection(item); setAdding(false); setError(""); }}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="side-panel-scroll workspace-scroll">
        {section === "Media" && (
          <>
            <p className="workspace-intro">Images, videos and post drafts shared in this conversation.</p>
            {mediaCards.map((card) => (
              <div className="workspace-media-card" key={card.id}>
                <button type="button" className="workspace-media-preview" onClick={() => onCard(card.id)} aria-label={`Open ${card.type.toLowerCase()} ${card.title}`}>
                  <img src={card.type === "Carousel" ? "./assets/carousel-01.png" : "./assets/social-post.png"} alt="" />
                  <span>{card.type === "Carousel" ? "Carousel · 6 slides" : "Single post"}</span>
                </button>
                <div className="workspace-item-copy">
                  <strong>{card.title}</strong>
                  <small>{displayName(card.from)} · {card.status === "waiting" ? "Waiting for you" : card.status}</small>
                  <div className="workspace-item-actions">
                    <button type="button" onClick={() => onCard(card.id)}>Open draft</button>
                    <button type="button" onClick={() => onThread(`card:${card.id}`)}>Discuss</button>
                  </div>
                </div>
              </div>
            ))}
            {media.map(({ file, message }) => (
              <div className="workspace-item" key={`${message.id}-${file.id}`}>
                <span className="workspace-file-icon">
                  {file.kind === "image" ? <ImageIcon size={19} /> : <Play size={19} />}
                </span>
                <div className="workspace-item-copy">
                  <strong>{file.name}</strong>
                  <small>{file.kind === "video" ? "Video" : "Image"} · {message.from}</small>
                  <div className="workspace-item-actions">
                    <button type="button" onClick={() => openFile(file)}>Preview</button>
                    <button type="button" onClick={() => onSource(message.threadRoot || `message:${message.id}`)}>Find source</button>
                  </div>
                </div>
              </div>
            ))}
            {!mediaCards.length && !media.length && <p className="workspace-empty">Images and videos sent here will appear here.</p>}
            <Button tone="quiet" className="workspace-add" onClick={onAddFiles}>Add photos or files</Button>
          </>
        )}
        {section === "Files" && (
          <>
            <p className="workspace-intro">Documents shared in this conversation.</p>
            {documents.map(({ file, message }) => (
              <div className="workspace-item" key={`${message.id}-${file.id}`}>
                <span className="workspace-file-icon"><FileText size={19} /></span>
                <div className="workspace-item-copy">
                  <strong>{file.name}</strong>
                  <small>{message.from}</small>
                  <div className="workspace-item-actions">
                    <button type="button" onClick={() => openFile(file)}>Open file</button>
                    <button type="button" onClick={() => onSource(message.threadRoot || `message:${message.id}`)}>Find source</button>
                  </div>
                </div>
              </div>
            ))}
            {!documents.length && <p className="workspace-empty">Files sent here will appear here.</p>}
            <Button tone="quiet" className="workspace-add" onClick={onAddFiles}>Add photos or files</Button>
          </>
        )}
        {(section === "Links" || section === "Browser") && (
          <>
            <p className="workspace-intro">
              {section === "Links" ? "Save useful links for everyone in this conversation." : "Keep the pages you want to return to while working on this conversation."}
            </p>
            {references.map((ref: WorkspaceReference) => (
              <div className="workspace-item" key={ref.id}>
                <span className="workspace-file-icon">{ref.kind === "browser" ? <Monitor size={19} /> : <LinkIcon size={19} />}</span>
                <div className="workspace-item-copy">
                  <strong>{ref.title}</strong>
                  <small>{new URL(ref.url).hostname}</small>
                  <div className="workspace-item-actions">
                    <button type="button" onClick={() => window.open(ref.url, "_blank", "noopener,noreferrer")}>Open in browser <ExternalLink size={13} /></button>
                    <button type="button" onClick={() => { mockStore.removeWorkspaceReference(ref.id); onNotice("Removed from workspace."); }} aria-label={`Remove ${ref.title}`}><Trash2 size={13} /> Remove</button>
                  </div>
                </div>
              </div>
            ))}
            {section === "Links" && sharedLinks.map(({ url: sharedUrl, message }) => (
              <div className="workspace-item" key={`${message.id}-${sharedUrl}`}>
                <span className="workspace-file-icon"><LinkIcon size={19} /></span>
                <div className="workspace-item-copy">
                  <strong>{new URL(sharedUrl).hostname}</strong>
                  <small>Shared by {message.from}</small>
                  <div className="workspace-item-actions">
                    <button type="button" onClick={() => window.open(sharedUrl, "_blank", "noopener,noreferrer")}>Open in browser <ExternalLink size={13} /></button>
                    <button type="button" onClick={() => onSource(message.threadRoot || `message:${message.id}`)}>Find source</button>
                  </div>
                </div>
              </div>
            ))}
            {section === "Links" && publishedLinks.map((card) => (
              <div className="workspace-item" key={`published-${card.id}`}>
                <span className="workspace-file-icon"><LinkIcon size={19} /></span>
                <div className="workspace-item-copy">
                  <strong>{card.title}</strong>
                  <small>Post link</small>
                  <div className="workspace-item-actions">
                    <button type="button" onClick={() => window.open(card.postLink, "_blank", "noopener,noreferrer")}>Open in browser <ExternalLink size={13} /></button>
                    <button type="button" onClick={() => onCard(card.id)}>Open card</button>
                  </div>
                </div>
              </div>
            ))}
            {!references.length && (section === "Browser" || (!sharedLinks.length && !publishedLinks.length)) && <p className="workspace-empty">Nothing saved here yet.</p>}
            {!adding ? (
              <Button tone="quiet" className="workspace-add" onClick={() => setAdding(true)}>
                Add {section === "Links" ? "link" : "page"}
              </Button>
            ) : (
              <form className="workspace-add-form" onSubmit={(event) => {
                event.preventDefault();
                if (!mockStore.addWorkspaceReference(conversationId, section === "Browser" ? "browser" : "link", title, url)) {
                  setError("Enter a new http or https address.");
                  return;
                }
                setTitle(""); setUrl(""); setError(""); setAdding(false);
                onNotice("Saved to workspace.");
              }}>
                <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="A helpful name" /></label>
                <label>Web address<input value={url} onChange={(event) => setUrl(event.target.value)} type="url" required placeholder="https://" /></label>
                {error && <p role="alert">{error}</p>}
                <div className="button-row"><Button type="submit" tone="primary">Save</Button><Button type="button" tone="quiet" onClick={() => { setAdding(false); setError(""); }}>Cancel</Button></div>
              </form>
            )}
          </>
        )}
      </div>
      {viewer !== null && viewer >= 0 && <FileViewer files={allFiles} initial={viewer} onClose={() => setViewer(null)} onLibrary={(file) => { mockStore.addToLibrary([file.id]); onNotice("Added to your photo library."); }} />}
    </>
  );
}

export function ConversationSidePanel({
  conversationId,
  panel,
  actor,
  offline,
  paused,
  onClose,
  onSource,
  onCard,
  onThread,
  onAddFiles,
  onNotice,
}: {
  conversationId: string;
  panel: { kind: "thread"; root: string } | { kind: "workspace" };
  actor: Person;
  offline: boolean;
  paused: boolean;
  onClose: () => void;
  onSource: (key: string) => void;
  onCard: (id: string) => void;
  onThread: (key: string) => void;
  onAddFiles: () => void;
  onNotice: (text: string) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [panel.kind, panel.kind === "thread" ? panel.root : "workspace"]);
  return (
    <aside className="conversation-side-panel" aria-label={panel.kind === "thread" ? "Discussion thread" : "Conversation workspace"} onKeyDown={(event) => {
      if (event.key === "Escape" && !event.defaultPrevented) { event.stopPropagation(); onClose(); }
    }}>
      <div className="side-panel-heading">
        {panel.kind === "thread" ? <MessageCircle size={18} /> : <FolderOpen size={18} />}
        <h2 ref={heading} tabIndex={-1}>{panel.kind === "thread" ? "Thread" : "Workspace"}</h2>
        <IconButton label={`Close ${panel.kind}`} onClick={onClose}><X size={18} /></IconButton>
      </div>
      {panel.kind === "thread" ? (
        <ThreadPanel conversationId={conversationId} root={panel.root} actor={actor} offline={offline} paused={paused} onSource={onSource} onCard={onCard} onNotice={onNotice} />
      ) : (
        <WorkspacePanel conversationId={conversationId} onSource={onSource} onCard={onCard} onThread={onThread} onAddFiles={onAddFiles} onNotice={onNotice} />
      )}
    </aside>
  );
}
