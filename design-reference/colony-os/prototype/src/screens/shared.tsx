import type { ReactNode } from "react";
import { Button, Empty, Loading } from "../components/primitives";
import type { Destination, MessagePayload } from "../data/types";
export interface ScreenProps {
  state: string;
  partner: boolean;
  onDestination: Destination;
  renderCard: (
    id: string,
    state?: string,
    form?: "inline" | "full",
  ) => ReactNode;
  onSend: (text: string, payload?: MessagePayload) => void;
  onNotice: (text: string, undo?: () => void) => void;
}
export function CommonContent({
  state,
  children,
  onRetry,
}: {
  state: string;
  children: ReactNode;
  onRetry: () => void;
}) {
  if (state === "loading" || state === "loading-slow")
    return <Loading slow={state === "loading-slow"} />;
  if (state === "problem")
    return (
      <div className="screen-problem">
        <Empty
          text="Colony isn't answering right now. Your work is safe, and we'll keep trying."
          action="Try again"
          onAction={onRetry}
        />
      </div>
    );
  return <>{children}</>;
}
export const isPaused = (state: string) => state.startsWith("paused");
export const isOffline = (state: string) =>
  state === "offline" || state === "waiting-send";
