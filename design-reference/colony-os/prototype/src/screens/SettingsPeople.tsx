import { useState } from "react";
import { Button } from "../components/primitives";
import { useMock } from "../data/mock-store";
import type { Person } from "../data/types";
import { ConfirmAction, SettingField, SettingRow, SettingSection, SettingSwitch, savePart, type SettingsProps, updateSettings } from "./settings-shared";

export function People(props: SettingsProps) {
  const { people, accounts } = useMock().settings;
  const actor: Person = props.partner ? "Kagiso" : "Lerato";
  const offline = props.state === "offline";
  const [email, setEmail] = useState("");
  const [error, setError] = useState(props.state === "invite-failed" ? "We couldn't send the invite. Check the address and try again." : "");
  const [confirm, setConfirm] = useState<"remove" | string | null>(null);
  const invites = props.state === "invite-pending" || props.state === "invite-expired" ? (people.invites.length ? people.invites : [{ email: "sizwe@leratodesigns.co.za", invitedBy: "Lerato" as Person, expires: "19 October" }]) : people.invites;
  const invite = () => {
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setError("Enter a valid email address."); return; }
    if ([accounts.Lerato.email, accounts.Kagiso.email, ...people.invites.map(item => item.email)].includes(address)) { setError("This person is already a member or invited. Resend the invite?"); return; }
    setError("");
    const next = [...people.invites, { email: address, invitedBy: actor, expires: "19 October" }];
    savePart(props, "people", { invites: next }, "Invite prepared for " + address + ". Email delivery is not connected in this preview.");
    setEmail("");
  };
  const cancel = (address: string) => { savePart(props, "people", { invites: people.invites.filter(item => item.email !== address) }, "Invite cancelled."); setConfirm(null); };
  return <div className="settings-content">
    <p className="setting-lead">The people who can work with your team.</p>
    {offline && <p className="setting-callout">You're offline. Inviting and removing people needs the internet.</p>}
    <SettingSection title="People"><SettingRow label={accounts.Lerato.name} detail={accounts.Lerato.email} value="Owner · runs the team" />{people.kagiso && props.state !== "just-owner" ? <SettingRow label={accounts.Kagiso.name} detail={accounts.Kagiso.email} value="Partner · active 2 hours ago" action={!props.partner && !offline ? <Button tone="quiet" onClick={() => setConfirm("remove")}>Remove</Button> : undefined} /> : <p className="setting-help">Just you for now. Invite a partner to share the work.</p>}{props.partner && <p className="setting-help">Only Lerato can remove people.</p>}</SettingSection>
    <SettingSection title="Invites waiting">{invites.length === 0 ? <p className="setting-help">No invites waiting.</p> : invites.map(item => <SettingRow key={item.email} label={item.email} detail={(props.state === "invite-expired" ? "Stopped working" : "Works until " + item.expires) + " · Invited by " + item.invitedBy} action={<div className="button-row"><Button disabled={offline} tone="quiet" onClick={() => props.onNotice("A new invite is ready. Email delivery is not connected in this preview.")}>Resend</Button><Button disabled={offline} tone="quiet" onClick={() => setConfirm(item.email)}>Cancel</Button></div>} />)}</SettingSection>
    <SettingSection title="Invite a partner" intro="An invite link works once, for 7 days."><form className="setting-inline-form" onSubmit={event => { event.preventDefault(); invite(); }}><SettingField label="Email address" type="email" value={email} onChange={setEmail} placeholder="name@example.com" disabled={offline} required /><Button tone="primary" type="submit" disabled={offline}>Invite</Button><Button type="button" disabled={offline} onClick={async () => { await navigator.clipboard.writeText("https://colony.global/invite/preview"); props.onNotice("Preview invite link copied. It cannot be used to join."); }}>Copy invite link</Button></form>{error && <p className="setting-error" role="alert">{error}</p>}</SettingSection>
    <p className="setting-footnote">Partners see everything and can approve any decision. Only the owner buys credits, changes billing, removes people or closes the company.</p>
    {confirm === "remove" && <ConfirmAction title="Remove Kagiso?" description="Kagiso loses access right away. Decisions Kagiso made keep Kagiso's name." confirmLabel="Remove Kagiso" onClose={() => setConfirm(null)} onConfirm={() => { savePart(props, "people", { kagiso: false }, "Kagiso removed in this local preview."); setConfirm(null); }} />}
    {confirm && confirm !== "remove" && <ConfirmAction title="Cancel invite?" description={confirm + " will no longer be able to use this invite link."} confirmLabel="Cancel invite" onClose={() => setConfirm(null)} onConfirm={() => cancel(confirm)} />}
  </div>;
}

export function Notifications(props: SettingsProps) {
  const all = useMock().settings;
  const actor: Person = props.partner ? "Kagiso" : "Lerato";
  const choices = all.notifications[actor];
  const [test, setTest] = useState(false);
  const change = (patch: Partial<typeof choices>) => props.onNotice("Notification choices saved.", updateSettings(settings => ({ ...settings, notifications: { ...settings.notifications, [actor]: { ...settings.notifications[actor], ...patch } } })));
  const rows = [["morning", "Morning brief ready"], ["friday", "Friday wrap ready"], ["posts", "Time to post"], ["customers", "A customer waiting more than a day"]] as const;
  return <div className="settings-content">
    <p className="setting-lead">Choose what reaches you on this computer.</p>
    <SettingSection title="On this computer"><SettingRow label="Notification permission" detail={props.state === "permission-off" ? "Notifications are off for Colony on this computer." : props.state === "not-asked" ? "Colony hasn't asked yet." : "Colony can show notifications on this computer."} action={(props.state === "permission-off" || props.state === "not-asked") && <Button onClick={() => props.onDestination("X-20")}>{props.state === "not-asked" ? "Allow notifications" : "Open notification settings"}</Button>} /></SettingSection>
    <SettingSection title="What notifies you" intro="Decisions and urgent problems always reach you. You can quiet everything else."><SettingSwitch label="Decisions waiting for you" checked disabled onChange={() => {}} /><SettingSwitch label="Urgent problems" detail="An employee stuck, the team stopped or credits out" checked disabled onChange={() => {}} />{rows.map(([key, label]) => <SettingSwitch key={key} label={label} checked={choices[key]} onChange={value => change({ [key]: value })} />)}</SettingSection>
    <SettingSection title="Quiet hours" intro="Everything waits in Needs you while you're quiet."><SettingSwitch label="Quiet hours" checked={choices.quiet} onChange={value => change({ quiet: value })} /><div className="setting-select-grid"><label>From<input type="time" value={choices.from} disabled={!choices.quiet} onChange={event => change({ from: event.target.value })} /></label><label>Until<input type="time" value={choices.to} disabled={!choices.quiet} onChange={event => change({ to: event.target.value })} /></label></div><SettingSwitch label="Let urgent problems through" checked={choices.urgentThrough} disabled={!choices.quiet} onChange={value => change({ urgentThrough: value })} />{props.state === "quiet-now" && <p className="setting-help">Quiet until 07:00.</p>}</SettingSection>
    <SettingSection title="Sound and test"><SettingSwitch label="Sound" checked={choices.sound} onChange={value => change({ sound: value })} /><Button onClick={() => setTest(true)}>Send a test notification</Button>{test && <p className="setting-callout" role="status">Test prepared in this preview. Native notification delivery is not connected. Did you see it?</p>}</SettingSection>
    <p className="setting-footnote">Notifications reach you on computers where Colony is open or in the {props.platform === "windows" ? "tray" : "menu bar"}. Colony doesn't have a phone app.{!props.partner && " Lerato also gets an email when credits are low or out and when a website payment fails."}</p>
  </div>;
}
