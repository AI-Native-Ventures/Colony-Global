import { useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronDown,
  Command,
  Home,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Settings,
  Square,
  Users,
  X,
  ArrowUpRight,
} from "lucide-react";
import { AntMark, Button, IconButton, PersonInitials } from "./primitives";
import { useMock } from "../data/mock-store";
import type { Destination } from "../data/types";
export function AppFrame({
  children,
  id,
  state,
  platform = "mac",
  partner = false,
  count = 2,
  onDestination,
  banner,
}: {
  children: ReactNode;
  id: string;
  state: string;
  platform?: string;
  partner?: boolean;
  count?: number;
  onDestination: Destination;
  banner?: ReactNode;
}) {
  const data = useMock();
  const settings = data.settings;
  const [switcher, setSwitcher] = useState(state === "several-companies");
  const nav = [
    {
      label: "Today",
      icon: Home,
      to: "T-01",
      active: id === "T-01" || id === "G-01",
    },
    {
      label: "Conversations",
      icon: MessageCircle,
      to: "T-02",
      active: ["T-02", "T-03", "T-04", "T-06", "T-07", "T-08"].includes(id),
    },
    {
      label: "Team",
      icon: Users,
      to: "M-01",
      active: id.startsWith("M-") || id.startsWith("D-") || id === "G-07",
    },
    { label: "Settings", icon: Settings, to: settings.lastSection[partner ? "Kagiso" : "Lerato"], active: id.startsWith("S-") },
  ];
  const status =
    state === "offline"
      ? "Offline"
      : data.paused && !state.startsWith("paused")
        ? "Team paused by " + (data.settings.running.pausedBy || "a person")
      : state === "paused-plan"
        ? "Claude plan limit until 14:00"
        : state === "paused-person" || state === "paused"
          ? "Team paused by Kagiso"
          : state.includes("paused")
            ? "Team paused: credits ran out"
            : state === "team-stopped"
              ? "Team stopped"
              : state === "scout-stopped"
                ? "Scout stopped"
                : state === "other-computer"
                  ? "Team runs on Lerato's MacBook Air"
                  : "4 working, 1 waiting on you";
  return (
    <div
      className={"app-frame platform-" + platform}
      data-product-ui
      data-screen-id={id}
      data-state={state}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <div className="titlebar">
        {platform === "mac" ? (
          <div className="traffic-lights">
            <button
              aria-label="Close window"
              onClick={() => onDestination("X-14")}
            />
            <button
              aria-label="Minimise window"
              onClick={() => onDestination("G-02")}
            />
            <button
              aria-label="Full screen"
              onClick={() => document.documentElement.requestFullscreen?.()}
            />
          </div>
        ) : (
          <span className="windows-brand">
            <AntMark />
            Colony
          </span>
        )}
        <span className="titlebar-company">{settings.business.name}</span>
        {platform === "windows" && (
          <div className="window-buttons">
            <IconButton
              label="Minimise window"
              onClick={() => onDestination("G-02")}
            >
              <Minus size={15} />
            </IconButton>
            <IconButton
              label="Maximise window"
              onClick={() => document.documentElement.requestFullscreen?.()}
            >
              <Square size={13} />
            </IconButton>
            <IconButton
              label="Close window"
              onClick={() => onDestination("X-14")}
            >
              <X size={17} />
            </IconButton>
          </div>
        )}
      </div>
      <div className="app-workroom">
        <aside className="sidebar">
          <button
            className="brand"
            aria-label="Colony, Today"
            onClick={() => onDestination("T-01")}
          >
            <AntMark />
            <strong>Colony</strong>
          </button>
          <div className="company-switch">
            <button
              onClick={() =>
                state === "several-companies"
                  ? setSwitcher(!switcher)
                  : onDestination("S-08")
              }
            >
              <span>{settings.business.name}</span>
              {state === "several-companies" && <ChevronDown size={14} />}
            </button>
            {switcher && (
              <div className="company-menu">
                <Button tone="quiet" onClick={() => setSwitcher(false)}>
                  {settings.business.name}
                  <CheckIcon />
                </Button>
                <Button tone="quiet" onClick={() => setSwitcher(false)}>
                  Another company
                  <span className="unread-mark" />
                </Button>
              </div>
            )}
          </div>
          <nav aria-label="Main navigation">
            {nav.map(({ label, icon: Icon, to, active }) => (
              <button
                className={"nav-item " + (active ? "active" : "")}
                key={label}
                aria-current={active ? "page" : undefined}
                title={label}
                onClick={() => onDestination(to)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {active && <i />}
              </button>
            ))}
            <button
              className={
                "nav-item needs-nav " + (id === "T-05" ? "active" : "")
              }
              aria-current={id === "T-05" ? "page" : undefined}
              aria-label={
                count ? "Needs you, " + count + " open decisions" : "Needs you"
              }
              onClick={() => onDestination("T-05")}
            >
              <span className="needs-icon">✓</span>
              <span>Needs you</span>
              {count > 0 && (
                <span
                  className="needs-count"
                  aria-label={
                    state === "offline" ? "Last known: " + count : undefined
                  }
                >
                  {count}
                </span>
              )}
            </button>
          </nav>
          <div className="sidebar-tools">
            <button onClick={() => onDestination("T-04")}>
              <Plus size={17} />
              New conversation
            </button>
            <button onClick={() => onDestination("T-06")}>
              <Search size={17} />
              Search
              <span className="keycap">
                {platform === "mac" ? "⌘" : "Ctrl"} K
              </span>
            </button>
          </div>
          <div className="sidebar-bottom">
            <button
              className="team-status-link"
              onClick={() => onDestination("M-01")}
            >
              <span
                className={
                  "team-orbit " + (state === "offline" ? "offline" : "")
                }
              />
              <span>
                <strong>Team</strong>
                <small>{status}</small>
              </span>
              <ArrowUpRight size={14} />
            </button>
            <button
              className="account-link"
              onClick={() => onDestination("S-08")}
            >
              <PersonInitials partner={partner} />
              <span>
                {partner ? settings.accounts.Kagiso.name : settings.accounts.Lerato.name}
                <small>{partner ? "Partner" : "Owner"}</small>
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </aside>
        <div className="content-frame">
          {banner}
          <main id="main-content" className="main-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
function CheckIcon() {
  return <span aria-hidden="true">✓</span>;
}
