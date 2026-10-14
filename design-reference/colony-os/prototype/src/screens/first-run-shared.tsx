import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Info, TriangleAlert } from "lucide-react";
import { AntMark, Avatar, Button } from "../components/primitives";
import type { Destination } from "../data/types";

export type FirstRunProps = {
  id: string;
  state: string;
  partner: boolean;
  platform: string;
  capture: boolean;
  params: URLSearchParams;
  onDestination: Destination;
  onNotice: (text: string) => void;
};

export const firstRunSteps: [string, string][] = [
  ["O-01", "Welcome and sign in"],
  ["O-02", "Email code"],
  ["O-03", "Your business"],
  ["O-04", "Power your team"],
  ["O-05", "Buy credits"],
  ["O-06", "Connect your plan"],
  ["O-07", "Scout gets to know you"],
  ["O-08", "Meet your team"],
  ["O-09", "Keep your team running"],
  ["O-10", "Team starting"],
  ["P-01", "Join a company"],
  ["P-01a", "Stay in the loop"],
  ["N-01", "Welcome back"],
  ["N-02", "Moving your team"],
];

export function RunFrame({ id, title, description, back, children, platform }: {
  id: string;
  title: string;
  description?: string;
  back?: () => void;
  children: ReactNode;
  platform: string;
}) {
  const step = Number(id.match(/^O-(\d{2})$/)?.[1]);
  const showProgress = step >= 3 && step <= 10;
  return <div className="run-window" data-product-ui data-screen-id={id}>
    <div className="run-titlebar" aria-hidden="true"><span className={platform === "windows" ? "run-win-controls" : "run-mac-controls"}><i /><i /><i /></span><span>Colony</span></div>
    <div className="run-layout">
      <aside className="run-rail"><div className="run-brand"><AntMark /><strong>Colony</strong></div><p>Your AI team, running your business with you.</p>{showProgress && <div className="run-progress"><span>Getting started</span><strong>Step {step - 2} of 8</strong><div className="run-progress-track"><span style={{ width: `${((step - 2) / 8) * 100}%` }} /></div></div>}<div className="run-rail-foot"><Avatar name="Scout" size="small" /><span>Scout will guide you.</span></div></aside>
      <main id="main-content" className="run-main"><div className="run-main-inner">{back && <button className="run-back" onClick={back}><ArrowLeft size={16} aria-hidden="true" /> Back</button>}<span className="eyebrow">{id} · {showProgress ? "GETTING STARTED" : "COLONY"}</span><h1>{title}</h1>{description && <p className="run-lede">{description}</p>}{children}</div></main>
    </div>
  </div>;
}

export function RunNotice({ children, kind = "info" }: { children: ReactNode; kind?: "info" | "warning" | "success" }) {
  const Icon = kind === "warning" ? TriangleAlert : Info;
  return <div className={`run-notice ${kind}`} role="status"><Icon size={17} aria-hidden="true" /><div>{children}</div></div>;
}

export function RunActions({ primary, onPrimary, secondary, onSecondary, disabled = false, shortcut }: {
  primary: string;
  onPrimary: () => void;
  secondary?: string;
  onSecondary?: () => void;
  disabled?: boolean;
  shortcut?: string;
}) {
  return <div className="run-actions"><Button tone="primary" onClick={onPrimary} disabled={disabled}>{primary}<ArrowRight size={16} aria-hidden="true" /></Button>{secondary && onSecondary && <Button tone="quiet" onClick={onSecondary}>{secondary}</Button>}{shortcut && <small>{shortcut}</small>}</div>;
}

export function RunLoading({ slow = false }: { slow?: boolean }) {
  return <div className="run-loading" role="status"><div className="run-skeleton wide" /><div className="run-skeleton" /><div className="run-skeleton short" />{slow && <p>Still loading. Check your internet if this keeps going.</p>}</div>;
}

export function CommonRunState({ props, children }: { props: FirstRunProps; children: ReactNode }) {
  if (props.state === "loading" || props.state === "loading-slow") return <RunLoading slow={props.state === "loading-slow"} />;
  if (props.state === "problem") return <><RunNotice kind="warning">Colony isn't answering right now. Try again in a minute.</RunNotice><RunActions primary="Try again" onPrimary={() => props.onDestination(props.id)} /></>;
  if (props.state === "empty") return <RunNotice>There is nothing to show here yet. You can continue when this step is ready.</RunNotice>;
  return <>{props.state === "paused" && <RunNotice kind="warning">Your team is paused. You can still review this step and carry on when it resumes.</RunNotice>}{children}</>;
}
