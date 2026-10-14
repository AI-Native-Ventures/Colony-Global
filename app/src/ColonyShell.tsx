import { Home, MessageCircle, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";
import { AntMark } from "./AntMark";

export type Destination =
  | "today"
  | "conversations"
  | "team"
  | "settings"
  | "needs";

const destinations = [
  { id: "today", label: "Today", icon: Home },
  { id: "conversations", label: "Conversations", icon: MessageCircle },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export function ColonyShell({
  active,
  onNavigate,
  hostReady,
  companyName,
  children,
}: {
  active: Destination;
  onNavigate: (destination: Destination) => void;
  hostReady: boolean;
  companyName: string;
  children: ReactNode;
}) {
  return (
    <div className="app-frame" data-product-ui="colony-global">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="titlebar">
        <span className="titlebar-company">{companyName} · Colony</span>
      </header>
      <div className="app-workroom">
        <aside className="sidebar">
          <button
            type="button"
            className="brand"
            aria-label="Colony, Today"
            onClick={() => onNavigate("today")}
          >
            <AntMark />
            <strong>Colony</strong>
          </button>
          <nav aria-label="Main navigation">
            {destinations.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                className={`nav-item${active === id ? " active" : ""}`}
                key={id}
                aria-current={active === id ? "page" : undefined}
                onClick={() => onNavigate(id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
            <button
              type="button"
              className={`nav-item needs-nav${active === "needs" ? " active" : ""}`}
              aria-current={active === "needs" ? "page" : undefined}
              onClick={() => onNavigate("needs")}
            >
              <span className="needs-icon" aria-hidden="true">
                ✓
              </span>
              <span>Needs you</span>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div className="team-status">
              <span className="team-orbit" aria-hidden="true" />
              <span>
                <strong>Team</strong>
                <small>
                  {hostReady
                    ? "Desktop host ready"
                    : "Desktop host unavailable"}
                </small>
              </span>
            </div>
          </div>
        </aside>
        <div className="content-frame">
          <main id="main-content" className="main-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
