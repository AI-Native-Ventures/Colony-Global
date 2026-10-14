import type { Card, MockSnapshot } from "./types";

const needsOwner = new Set<Card["status"]>([
  "waiting",
  "changes",
  "ready",
  "ready-send",
  "open",
  "to-film",
  "to-post",
  "missed",
  "failed-live",
  "still-failing",
  "overdue",
  "paused",
]);

export function openDecisionCards(snapshot: MockSnapshot): Card[] {
  return Object.values(snapshot.cards).filter(
    (card) => card.id !== "C-00" && needsOwner.has(card.status),
  );
}
