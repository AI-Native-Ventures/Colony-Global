import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button, CloseButton, Dialog, IconButton } from "./primitives";
import type { Topic } from "../data/types";

export function TopicMenu({
  topic,
  unread,
  onRename,
  onArchive,
  onRead,
}: {
  topic: Topic;
  unread: boolean;
  onRename: (title: string) => void;
  onArchive: (archived: boolean) => void;
  onRead: (read: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(topic.title);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="topic-menu"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
        if (open && ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const buttons = [
            ...ref.current!.querySelectorAll<HTMLButtonElement>(
              '[role="menuitem"]',
            ),
          ];
          const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          buttons[
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (current + (e.key === "ArrowUp" ? -1 : 1) + buttons.length) %
                  buttons.length
          ]?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="icon-button"
        aria-label={"Conversation menu for " + topic.title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={19} />
      </button>
      {open && (
        <div
          className="popover menu"
          role="menu"
          aria-label={topic.title + " actions"}
        >
          <button
            role="menuitem"
            onClick={() => {
              setTitle(topic.title);
              setRenaming(true);
              setOpen(false);
            }}
          >
            Rename
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onArchive(!topic.archived);
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            {topic.archived ? "Bring back" : "Archive"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onRead(unread);
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            {unread ? "Mark as read" : "Mark as unread"}
          </button>
        </div>
      )}
      {renaming && (
        <Dialog
          title="Rename conversation"
          onClose={() => setRenaming(false)}
          className="topic-rename-dialog"
        >
          <CloseButton onClose={() => setRenaming(false)} />
          <h2>Rename conversation</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) {
                onRename(title);
                setRenaming(false);
              }
            }}
          >
            <label htmlFor="topic-name">Conversation name</label>
            <input
              id="topic-name"
              autoFocus
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="button-row">
              <Button type="submit" tone="primary" disabled={!title.trim()}>
                Save
              </Button>
              <Button type="button" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
