import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  Check,
  Circle,
  Clock3,
  LoaderCircle,
  Pause,
  TriangleAlert,
  X,
  Sparkles,
} from "lucide-react";
import { employee } from "../data/fixtures";
import { mockStore, useMock } from "../data/mock-store";
import { displayName } from "../data/team-actions";
import { openDeskDrafts } from "../data/desk-actions";
import type { Employee, EmployeeId, EmployeeStatus } from "../data/types";
export const asset = (file: string) =>
  new URL("../../public/assets/" + file, import.meta.url).href;
export function Button({
  tone = "secondary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "quiet" | "danger";
  children?: ReactNode;
}) {
  return (
    <button {...props} className={"button " + tone + " " + className}>
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      className={"icon-button " + (props.className || "")}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
export function AntMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={"ant-mark " + className}
      viewBox="0 0 466 309"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="14" strokeLinecap="round">
        <path d="M198 201Q176 230 163 265 M229 211Q226 243 232 274 M259 190Q281 221 296 252 M327 114Q340 82 371 74 M343 126Q367 106 395 105" />
      </g>
      <g fill="currentColor">
        <circle cx="104" cy="172" r="80" />
        <circle cx="226" cy="164" r="52" />
        <circle cx="313" cy="148" r="46" />
      </g>
    </svg>
  );
}
export function Avatar({
  name,
  size = "normal",
  label = true,
  variant,
}: {
  name: EmployeeId;
  variant?: EmployeeId;
  size?: "small" | "normal" | "large" | "hero";
  label?: boolean;
}) {
  const { team } = useMock();
  const n = ["Scout", "Maya", "Naledi", "Sipho", "Leo", "Grace"].indexOf(
    variant || team.profiles[name]?.avatar || name,
  );
  return (
    <span className={"portrait " + size} data-ant-portrait={name}>
      <span
        className="avatar"
        role="img"
        aria-label={displayName(name) + ", AI-made ant portrait"}
        style={
          {
            backgroundImage: "url('./assets/ant-portraits.png')",
            backgroundSize: "300% 200%",
            backgroundPosition:
              (n % 3) * 50 + "% " + Math.floor(n / 3) * 100 + "%",
          } as CSSProperties
        }
      />
      {label && <span className="portrait-label">AI-made</span>}
    </span>
  );
}
const statusIcon: Record<EmployeeStatus, typeof Check> = {
  Starting: LoaderCircle,
  Working: Circle,
  Free: Check,
  "Waiting on you": Clock3,
  Paused: Pause,
  Stopped: TriangleAlert,
  Away: Clock3,
  Hiring: LoaderCircle,
};
export function StatusChip({
  status,
  children,
}: {
  status: EmployeeStatus | string;
  children?: ReactNode;
}) {
  const Icon = statusIcon[status as EmployeeStatus] || Check;
  return (
    <span
      className={
        "status-chip status-" + status.toLowerCase().replaceAll(" ", "-")
      }
    >
      <Icon size={12} aria-hidden="true" />
      {children || status}
    </span>
  );
}
export function Identity({
  person,
  size = "normal",
  onOpen,
  extra,
  showStatus = true,
}: {
  person: Employee;
  size?: "small" | "normal" | "large" | "hero";
  onOpen?: () => void;
  extra?: string;
  showStatus?: boolean;
}) {
  const content = (
    <>
      <Avatar name={person.name} size={size} />
      <span className="identity-copy">
        <span className="identity-name">
          {displayName(person.name)}
          {showStatus && <StatusChip status={person.status} />}
        </span>
        <span className="role">{person.role}</span>
        {extra && <span className="identity-extra">{extra}</span>}
      </span>
    </>
  );
  return onOpen ? (
    <button
      className={"identity identity-button " + size}
      onClick={onOpen}
      aria-label={
        displayName(person.name) + ", " + person.role + ", " + person.status
      }
    >
      {content}
    </button>
  ) : (
    <div className={"identity " + size}>{content}</div>
  );
}
export function Banner({
  text,
  action,
  onAction,
  tone = "warning",
}: {
  text: string;
  action?: string;
  onAction?: () => void;
  tone?: string;
}) {
  return (
    <div className={"banner " + tone} role="status">
      <TriangleAlert size={17} aria-hidden="true" />
      <span>{text}</span>
      {action && (
        <Button tone="quiet" onClick={onAction}>
          {action}
          <ArrowRight size={14} />
        </Button>
      )}
    </div>
  );
}
export function Empty({
  text,
  action,
  onAction,
}: {
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-pattern">
      <span className="empty-emblem">
        <AntMark />
      </span>
      <p>{text}</p>
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  );
}
export function Loading({ slow = false }: { slow?: boolean }) {
  return (
    <section className="loading-pattern" aria-label="Loading" aria-busy="true">
      <div className="skeleton short" />
      <div className="skeleton text" />
      <div className="skeleton text half" />
      <div className="skeleton block" />
      <div className="skeleton text" />
      {slow && <p>Still loading. Check your internet if this keeps going.</p>}
    </section>
  );
}
export function SectionHeading({
  title,
  action,
  onAction,
  count,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  count?: number;
}) {
  return (
    <div className="section-heading">
      <h2>
        {title}
        {!!count && <span className="soft-count">{count}</span>}
      </h2>
      {action && (
        <Button tone="quiet" onClick={onAction}>
          {action}
          <ArrowRight size={14} />
        </Button>
      )}
    </div>
  );
}
export function Dialog({
  open = true,
  title,
  children,
  onClose,
  className = "",
  labelledBy,
}: {
  open?: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && !ref.current?.open) {
      previous.current = document.activeElement as HTMLElement;
      ref.current?.showModal();
    }
    return () => {
      ref.current?.close();
      previous.current?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (
      open &&
      ref.current?.open &&
      !ref.current.contains(document.activeElement)
    )
      ref.current
        .querySelector<HTMLElement>(
          'button,input,textarea,select,[tabindex="0"]',
        )
        ?.focus();
  });
  return (
    <dialog
      ref={ref}
      className={"dialog " + className}
      aria-label={labelledBy ? undefined : title}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const focusable = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        } else if (!e.currentTarget.contains(document.activeElement)) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
export function AIChip() {
  return (
    <span className="ai-chip">
      <Sparkles size={11} aria-hidden="true" />
      AI-made
    </span>
  );
}
export function PersonInitials({ partner = false }: { partner?: boolean }) {
  return (
    <span
      className="person-initials"
      aria-label={partner ? "Kagiso Dlamini" : "Lerato Mokoena"}
    >
      {partner ? "KD" : "LM"}
    </span>
  );
}
export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <IconButton label="Close (Esc)" onClick={onClose}>
      <X size={18} />
    </IconButton>
  );
}
export function employeeWithState(name: EmployeeId, state: string): Employee {
  const p = { ...employee(name) };
  const profile = mockStore.get().team.profiles[name];
  p.displayName = profile?.displayName || name;
  p.budget = profile?.budget ?? p.budget;
  const snapshot = mockStore.get();
  p.waiting =
    ["C-05", "C-01"].filter(
      (id) =>
        snapshot.cards[id].from === name &&
        ["waiting", "changes", "ready"].includes(snapshot.cards[id].status),
    ).length +
    (["waiting", "changes"].includes(snapshot.team.plans[name].status) ? 1 : 0) +
    openDeskDrafts(snapshot).filter(d=>d.employee===name).length +
    (name==="Grace" ? Object.values(snapshot.desks.customers).filter(c=>c.decision==="waiting").length : 0);
  if (p.status === "Waiting on you" && !p.waiting) {
    p.status = "Free";
    p.task = "Nothing to do right now. Next: plan check, Monday 09:00.";
  }
  if (profile?.retired) p.waiting = 0;
  if (
    profile?.lifecycle &&
    ([
      "normal",
      "working",
      "partner",
      "offline",
      "other-computer",
      "approved",
    ].includes(state) ||
      (state === "computer-off" && profile.lifecycle === "restart-waiting"))
  )
    state = profile.lifecycle;
  if (state === "starting" || state === "hiring") {
    p.status = state === "hiring" ? "Hiring" : "Starting";
    p.task =
      state === "hiring"
        ? "Hiring " + name
        : "Getting ready. This takes about a minute.";
  } else if (state === "first-week" || state === "first-day") {
    p.status = "Working";
    p.task = "Getting to know your business. First plan coming for your OK.";
  } else if (state === "waiting") {
    p.status = "Waiting on you";
    p.task = "Waiting on you: approve the brand kit.";
    p.waiting = 2;
  } else if (state === "free") {
    p.status = "Free";
    p.task = "Nothing to do right now. Next: plan check, Monday 09:00.";
  } else if (state === "away" || state === "computer-off") {
    p.status = "Away";
    p.task =
      "Lerato's MacBook Air is off. " + name + " carries on when it's back.";
  } else if (state.startsWith("paused") || state === "paused") {
    p.status = "Paused";
    p.task =
      state === "paused-budget"
        ? "Reached her $5.00 weekly budget. Scout asked you about it."
        : state === "paused-plan"
          ? "Your Claude plan limit is reached until 14:00."
          : state === "paused-credits"
            ? "Out of credits. " + name + " continues when credits are added."
            : "Paused by Kagiso at 14:05.";
  } else if (
    state === "stopped" ||
    state === "team-stopped" ||
    state === "failing"
  ) {
    p.status = "Stopped";
    p.task =
      state === "failing"
        ? "Ran into a problem: couldn't open Instagram. Scout is on it."
        : "Stopped. Restart to continue.";
  }
  if (profile?.changedBy && state === "paused-person")
    p.task = "Paused by " + profile.changedBy + " at 10:42.";
  if (state === "restart-waiting") {
    p.status = "Away";
    p.task = "Restarts when Lerato's MacBook is back on.";
  }
  if (state === "let-go")
    p.task = "Let go by " + (profile?.changedBy || "Lerato") + " on 3 Nov.";
  p.task = p.task.replaceAll(name, displayName(name));
  return p;
}
