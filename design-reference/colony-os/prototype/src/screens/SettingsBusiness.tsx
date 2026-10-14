import { useState } from "react";
import { Button } from "../components/primitives";
import { useMock } from "../data/mock-store";
import type { SettingsSnapshot } from "../data/settings-fixtures";
import { SettingField, SettingRow, SettingSection, savePart, type SettingsProps, useSettings } from "./settings-shared";

type Business = SettingsSnapshot["business"];
const businessGroups: { title: string; fields: [keyof Business, string][] }[] = [
  { title: "Your business", fields: [["name", "Business name"], ["sells", "What you sell"], ["buyers", "Who buys from you"], ["where", "Where you sell"], ["city", "City"], ["country", "Country"]] },
  { title: "Online and contact", fields: [["website", "Website"], ["shop", "Where customers buy"], ["email", "Customer email"], ["phone", "Phone"], ["whatsapp", "WhatsApp number, optional"], ["address", "Address, optional"]] },
  { title: "Invoice details", fields: [["registeredName", "Registered business name"], ["registration", "Registration number, optional"], ["vat", "VAT number, optional"], ["banking", "Banking details for invoices, optional"]] },
];

export function BusinessProfile(props: SettingsProps) {
  const current = useSettings();
  const [draft, setDraft] = useState<Business>(current.business);
  const [failed, setFailed] = useState(props.state === "save-failed");
  const [conflict, setConflict] = useState(props.state === "changed-by-someone");
  const offline = props.state === "offline";
  const save = () => {
    if (offline) return;
    if (!draft.name.trim()) { setFailed(true); return; }
    const next = { ...draft, name: draft.name.trim() };
    savePart(props, "business", next, "Saved. Scout will let the team know.");
    setFailed(false);
    setConflict(false);
    if (current.business.timeZone !== next.timeZone) props.onNotice("Your morning brief will now arrive at 08:30, " + (next.timeZone === "Africa/Johannesburg" ? "Johannesburg" : next.timeZone) + " time.");
  };
  return <div className="settings-content">
    <p className="setting-lead">The facts your team works from, in one place.</p>
    {props.state === "missing-facts" && <p className="setting-callout">Grace needs your banking details to put them on invoices.</p>}
    {conflict && <div className="setting-callout"><p>Kagiso changed this a moment ago. Keep Kagiso's version or use yours?</p><div className="button-row"><Button onClick={() => { setDraft(current.business); setConflict(false); }}>Keep Kagiso's version</Button><Button onClick={save}>Use mine</Button></div></div>}
    {props.state === "follow-up" && <p className="setting-callout">Leo will update your website's contact page after you approve the change.</p>}
    {offline && <p className="setting-callout">You're offline. This needs the internet. Your facts stay readable.</p>}
    <form onSubmit={event => { event.preventDefault(); save(); }}>
      <fieldset disabled={offline} className="settings-fieldset">
        {businessGroups.map(group => <SettingSection key={group.title} title={group.title}><div className="setting-field-grid">{group.fields.map(([key, label]) => <SettingField key={key} label={label} value={draft[key]} onChange={value => setDraft(old => ({ ...old, [key]: value }))} required={key === "name"} multiline={["sells", "buyers", "banking"].includes(key)} />)}</div></SettingSection>)}
        <SettingSection title="Brand and policies"><SettingRow label="Brand kit" detail="Linen white and deep green, warm and confident" action={<Button tone="quiet" type="button" onClick={() => props.onDestination("D-03")}>Open brand kit</Button>} /><SettingRow label="Policies" detail="Delivery, returns, sizes and payment are set" action={<Button tone="quiet" type="button" onClick={() => props.onDestination("D-06b")}>Open policies</Button>} /></SettingSection>
        <SettingSection title="Time and connections"><label className="setting-field"><span>Time zone</span><select value={draft.timeZone} onChange={event => setDraft(old => ({ ...old, timeZone: event.target.value }))}><option value="Africa/Johannesburg">Johannesburg, South Africa</option><option value="Europe/London">London, United Kingdom</option><option value="America/New_York">New York, United States</option></select></label><p className="setting-help">Your morning brief and routines follow this time zone.</p><SettingRow label="Social accounts" detail={[current.connections.instagram ? "Instagram " + current.connections.instagram : "", current.connections.tiktok ? "TikTok " + current.connections.tiktok : ""].filter(Boolean).join(", ") || "No accounts added yet"} action={<Button tone="quiet" type="button" onClick={() => props.onDestination("S-04")}>Change in Connections</Button>} /></SettingSection>
        <div className="setting-save"><Button tone="primary" type="submit">{props.state === "saving" ? "Saving…" : "Save changes"}</Button><Button tone="quiet" type="button" onClick={() => props.onNotice("Scout will suggest updates for you to approve.")}>Update from my links</Button></div>
      </fieldset>
      {failed && <p className="setting-error" role="alert">Couldn't save. Check your internet and try again. Your edits are still here. <Button type="button" onClick={save}>Try again</Button></p>}
    </form>
  </div>;
}

export function Connections(props: SettingsProps) {
  const all = useMock();
  const settings = all.settings;
  const [draft, setDraft] = useState(settings.connections);
  const [guide, setGuide] = useState<"Gmail" | "Outlook" | "Other">("Gmail");
  const [showGuide, setShowGuide] = useState(false);
  const [test, setTest] = useState(props.state === "test-failed" ? "The test didn't arrive. Check the address and try again." : "");
  const offline = props.state === "offline";
  const domain = all.desks.website.domain;
  const domainText = props.state === "domain-broken" ? "Your domain settings changed and your site can't be reached there." : domain.phase === "connected" || props.state === "domain-connected" ? "Connected: " + (domain.address || "leratodesigns.co.za") : domain.phase === "checking" || props.state === "domain-connecting" ? "Connecting " + (domain.address || "leratodesigns.co.za") + ": waiting for your domain settings." : "Your site is at leratodesigns.colony.site.";
  const forwarding = props.state === "working" ? "Working. Last email arrived at 10:12." : props.state === "confirmation-needed" ? "Confirmation needed. Open the link from Gmail to finish." : props.state === "waiting-first-email" ? "Waiting for the first email." : props.state === "no-emails" ? "No forwarded emails for 2 weeks. Is forwarding still on in Gmail?" : settings.connections.forwarding === "working" ? "Working. Last email arrived at 10:12." : "Not set up yet.";
  const social = [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["linkedin", "LinkedIn"], ["x", "X"]] as const;
  return <div className="settings-content">
    <p className="setting-lead">A few connections help your team do the work.</p>
    {offline && <p className="setting-callout">You're offline. Copy still works; setting up needs the internet.</p>}
    <SettingSection title="Customer email for Grace" intro="Forward your customer emails here, and Grace drafts every reply.">
      <SettingRow label="Forwarding address" detail="leratodesigns@inbox.colony.global" value={forwarding} action={<Button onClick={async () => { await navigator.clipboard.writeText("leratodesigns@inbox.colony.global"); props.onNotice("Copied."); }}>Copy</Button>} />
      <div className="button-row setting-actions"><Button onClick={() => setShowGuide(!showGuide)}>Show me how</Button><Button disabled={offline} onClick={() => setTest("Test requested. Email delivery is not connected in this preview.")}>Send a test</Button>{props.state === "confirmation-needed" && <Button disabled={offline} onClick={() => props.onNotice("Open the confirmation email to finish forwarding.")}>Open confirmation</Button>}</div>
      {showGuide && <div className="setting-guide"><div className="setting-tabs" role="group" aria-label="Email service">{(["Gmail", "Outlook", "Other"] as const).map(name => <Button key={name} aria-pressed={guide === name} onClick={() => setGuide(name)}>{name}</Button>)}</div><ol><li>Open {guide} and find Forwarding in its settings.</li><li>Add leratodesigns@inbox.colony.global.</li><li>Confirm the address if {guide} asks you, then send a test.</li></ol></div>}
      {test && <p className="setting-callout" role="status">{test}</p>}
    </SettingSection>
    <SettingSection title="Website domain"><SettingRow label="Your website" detail={domainText} action={<Button tone="quiet" onClick={() => props.onDestination("D-05a")}>Connect your domain</Button>} /><Button tone="quiet" onClick={() => props.onDestination("D-05")}>Open Leo's desk</Button></SettingSection>
    <SettingSection title="Social accounts" intro="Naledi prepares each post. You post it yourself."><div className="setting-field-grid">{social.map(([key, label]) => <SettingField key={key} label={label} value={draft[key]} disabled={offline} onChange={value => setDraft(old => ({ ...old, [key]: value }))} placeholder="Account name or link" />)}</div>{props.state === "no-social" && <p className="setting-help">Add your Instagram so Naledi can open it for you at posting time.</p>}<Button tone="primary" disabled={offline} onClick={() => savePart(props, "connections", draft, "Social accounts saved.")}>Save accounts</Button></SettingSection>
  </div>;
}
