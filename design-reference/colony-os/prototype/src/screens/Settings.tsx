import { useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { CommonContent } from "./shared";
import { BusinessProfile, Connections } from "./SettingsBusiness";
import { CreditsBilling, TeamPower } from "./SettingsMoney";
import { Notifications, People } from "./SettingsPeople";
import { Account, HelpUpdates, Running } from "./SettingsControl";
import { sections, type SettingsProps } from "./settings-shared";
import { useMock } from "../data/mock-store";
import { rememberSettingsSection } from "../data/settings-actions";

const stateWords: Record<string, string> = {
  "S-01:changed-by-someone": "Kagiso changed this a moment ago. Choose which version to keep.",
  "S-02:paid": "Paid. $15 added to your credits.",
  "S-02:auto-top-up-ran": "Auto top-up bought $15 in credits.",
  "S-03:setting-up": "Setting up on this computer. You can leave this screen while it continues.",
  "S-03:setup-failed": "Couldn't connect your plan. Try again or use credits instead.",
  "S-04:test-sent": "Test sent. Waiting for the first email.",
  "S-04:test-arrived": "Test arrived. Grace can see your forwarded emails.",
  "S-04:test-failed": "The test didn't arrive. Check the address and try again.",
  "S-05:invite-failed": "We couldn't send the invite. Check the address and try again.",
  "S-05:already-invited": "Sizwe is already invited. Resend the invite?",
  "S-06:quiet-now": "Quiet until 07:00. Everything waits in Needs you.",
  "S-07:moving": "Moving your team to this computer.",
  "S-08:closing": "Closing Lerato Designs. This takes a minute.",
  "S-08:close-failed": "Couldn't close Lerato Designs. Try again or get help.",
  "S-09:send-failed": "Couldn't send. Your message is kept here for another try.",
  "S-09:sent": "Sent. We'll reply by email to lerato@leratodesigns.co.za.",
};

const sectionContent = (props: SettingsProps) => {
  switch (props.id) {
    case "S-01": return <BusinessProfile {...props} />;
    case "S-02": return <CreditsBilling {...props} />;
    case "S-03": return <TeamPower {...props} />;
    case "S-04": return <Connections {...props} />;
    case "S-05": return <People {...props} />;
    case "S-06": return <Notifications {...props} />;
    case "S-07": return <Running {...props} />;
    case "S-08": return <Account {...props} />;
    default: return <HelpUpdates {...props} />;
  }
};

export function Settings(props: SettingsProps) {
  const data = useMock();
  useEffect(() => {
    rememberSettingsSection(props.id, props.partner ? "Kagiso" : "Lerato");
  }, [props.id, props.partner]);
  const title = sections.find(([id]) => id === props.id)?.[1] || "Settings";
  const attention: Record<string, string> = {
    "S-02": props.state === "low" || props.state === "out" ? "Credits low" : "",
    "S-03": props.state === "signed-out" ? "Plan signed out" : "",
    "S-04": props.state === "forwarding-not-set" ? "Forwarding not set up" : "",
    "S-09": props.state === "update-ready" ? "Update ready" : "",
  };
  const notice = stateWords[props.id + ":" + props.state];
  return <div className="settings-screen">
    <header className="page-heading"><span className="eyebrow">{data.settings.business.name}</span><h1>Settings.</h1><p>Keep the details your team needs close at hand.</p></header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">{sections.map(([id, name]) => <button key={id} className={id === props.id ? "active" : ""} aria-current={id === props.id ? "page" : undefined} onClick={() => props.onDestination(id)}><span>{name}</span>{attention[id] && <small>{attention[id]}</small>}<ChevronRight size={14} aria-hidden="true" /></button>)}</nav>
      <div className="settings-main"><div className="settings-title"><span className="eyebrow">{props.id}</span><h2>{title}</h2></div>{notice && <p className="setting-callout" role="status">{notice}</p>}<CommonContent state={props.state} onRetry={() => props.onDestination(props.id)}>{props.state === "empty" ? <p className="setting-empty">Nothing to show here yet.</p> : sectionContent(props)}</CommonContent></div>
    </div>
  </div>;
}
