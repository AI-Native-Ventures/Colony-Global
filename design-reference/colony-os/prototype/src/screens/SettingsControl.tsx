import { useState } from "react";
import { Button } from "../components/primitives";
import { saveFirstRun } from "../data/first-run-actions";
import { mockStore, useMock } from "../data/mock-store";
import type { Person } from "../data/types";
import { ConfirmAction, SettingField, SettingRow, SettingSection, SettingSwitch, savePart, type SettingsProps, updateSettings } from "./settings-shared";

export function Running(props: SettingsProps) {
  const data = useMock();
  const { running } = data.settings;
  const [confirmMove, setConfirmMove] = useState(false);
  const offline = props.state === "offline";
  const other = running.computer === "elsewhere" || props.state === "computer-off";
  const paused = data.paused || props.state === "paused-person";
  const status = props.state === "paused-credits" ? "Paused: out of credits" : props.state === "plan-limit" ? "Waiting for your Claude plan to reset at 14:00" : props.state === "stopped" ? "Stopped" : other ? "Off: Lerato's MacBook Air has been asleep since 22:10" : paused ? "Paused by " + (running.pausedBy || "Kagiso") + " at 14:02" : "Your team is working";
  const pause = () => {
    const before = data.paused;
    const previousActor = running.pausedBy;
    const actor = props.partner ? "Kagiso" : "Lerato";
    mockStore.change(snapshot => ({ ...snapshot, paused: !before, settings: { ...snapshot.settings, running: { ...snapshot.settings.running, pausedBy: before ? undefined : actor } } }));
    props.onNotice(before ? "Your team is back to work." : "Your team is paused.", () => mockStore.change(snapshot => ({ ...snapshot, paused: before, settings: { ...snapshot.settings, running: { ...snapshot.settings.running, pausedBy: previousActor } } })));
  };
  return <div className="settings-content">
    <p className="setting-lead">Your team works on one computer at a time.</p>
    {offline && <p className="setting-callout">You're offline. Moving, pausing and restarting need the internet. This computer's switches still work.</p>}
    <SettingSection title="Team status"><div className="setting-status"><span className="setting-status-dot" /><strong>{status}</strong></div>{props.state === "paused-credits" && (props.partner ? <p>Only Lerato can buy credits.</p> : <Button onClick={() => props.onDestination("S-02", "out")}>Buy credits</Button>)}{props.state === "plan-limit" && <Button onClick={() => props.onDestination("S-03", "limit")}>See your plan</Button>}</SettingSection>
    <SettingSection title="Team computer"><SettingRow label={other ? "Lerato's MacBook Air" : "Lerato's MacBook Air, this computer"} detail={other ? "Last seen 2 minutes ago" : "Running your team now"} action={other && <Button disabled={offline} onClick={() => setConfirmMove(true)}>Move the team here</Button>} /></SettingSection>
    <SettingSection title="On this computer"><SettingSwitch label="Start Colony when this computer starts" checked={running.startWithComputer} onChange={value => savePart(props, "running", { startWithComputer: value })} />{!other && <SettingSwitch label="Keep this computer awake while it's plugged in" detail="On battery, your team works while the computer is awake." checked={running.stayAwake} onChange={value => savePart(props, "running", { stayAwake: value })} />}<p className="setting-help">When the lid closes or the computer sleeps, your team stops and catches up when it wakes.</p></SettingSection>
    <SettingSection title="Team controls"><SettingRow label={paused ? "Resume the team" : "Pause the team"} detail={paused ? "Nothing new starts until someone resumes." : "The team finishes its current work, then waits."} action={<Button disabled={offline || props.state === "paused-credits"} onClick={pause}>{paused ? "Resume team" : "Pause team"}</Button>} /><SettingRow label="Restart the team" detail={other ? "Someone at Lerato's MacBook Air needs to restart the team, or move the team here." : "Use this if your team seems stuck. Work in progress continues after the restart."} action={!other && <Button disabled={offline} onClick={() => { savePart(props, "running", { restarting: true }, "Restarting your team. This takes about a minute in the preview."); setTimeout(() => { if (mockStore.get().settings.running.restarting) updateSettings(s => ({ ...s, running: { ...s.running, restarting: false } })); }, 1200); }}>Restart team</Button>} />{(running.restarting || props.state === "restarting") && <p className="setting-callout">Restarting your team. This takes about a minute.</p>}</SettingSection>
    {confirmMove && <ConfirmAction title="Move the team here?" description="It stops on Lerato's MacBook Air and starts on this computer. If you use your own plan, connect it here too." confirmLabel="Review the move" onClose={() => setConfirmMove(false)} onConfirm={() => { saveFirstRun({ movePower: data.settings.power.choice === "credits" ? "credits" : "plan" }); setConfirmMove(false); props.onDestination("N-02", "confirming"); }} />}
  </div>;
}

export function Account(props: SettingsProps) {
  const all = useMock().settings;
  const company = all.business.name;
  const actor: Person = props.partner ? "Kagiso" : "Lerato";
  const account = all.accounts[actor];
  const [name, setName] = useState(account.name);
  const [photo, setPhoto] = useState<string | null>(account.photo || null);
  const [confirm, setConfirm] = useState<"signout" | "close" | "leave" | null>(null);
  const [failed, setFailed] = useState(props.state === "save-failed");
  const offline = props.state === "offline";
  const saveName = () => {
    if (!name.trim()) { setFailed(true); return; }
    props.onNotice("Saved.", updateSettings(settings => ({ ...settings, accounts: { ...settings.accounts, [actor]: { ...settings.accounts[actor], name: name.trim(), ...(photo ? { photo } : {}) } } })));
    setFailed(false);
  };
  const appearance = (patch: Partial<typeof account>) => {
    props.onNotice("Appearance saved.", updateSettings(settings => ({ ...settings, accounts: { ...settings.accounts, [actor]: { ...settings.accounts[actor], ...patch } } })));
  };
  return <div className="settings-content">
    <p className="setting-lead">Your profile and preferences.</p>
    <SettingSection title="Profile"><div className="setting-profile"><div className="setting-profile-avatar">{photo ? <img src={photo} alt="Your chosen profile" /> : account.name.split(" ").map(part => part[0]).join("")}</div><div><strong>{account.name}</strong><small>{props.partner ? "Partner" : "Owner"} · Signs in with Google</small></div></div><form onSubmit={event => { event.preventDefault(); saveName(); }} className="setting-form"><SettingField label="Name" value={name} onChange={setName} required disabled={offline} /><SettingRow label="Email" value={account.email} /><label className="setting-field"><span>Photo</span><input type="file" disabled={offline} accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2_000_000) { setFailed(true); return; } const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result)); reader.readAsDataURL(file); }} /></label><Button tone="primary" type="submit" disabled={offline}>Save profile</Button></form>{failed && <p className="setting-error" role="alert">Couldn't save. Check your internet and try again. Your edits are still here. <Button onClick={saveName}>Try again</Button></p>}</SettingSection>
    <SettingSection title="Appearance"><label className="setting-field">Theme<select value={props.theme} onChange={event => { const theme = event.target.value as "system" | "light" | "dark"; appearance({ theme }); props.onDestination("S-08", undefined, { theme }); }}><option value="system">Match this computer</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="setting-field">Text size<select value={account.textSize} onChange={event => { const textSize = event.target.value as "default" | "large" | "larger"; appearance({ textSize }); props.onTextSize(textSize); }}><option value="default">Default</option><option value="large">Large</option><option value="larger">Larger</option></select></label></SettingSection>
    <SettingSection title="Your account"><SettingRow label="Sign out" detail="You can sign in again at any time." action={<Button onClick={() => setConfirm("signout")}>Sign out</Button>} />{props.partner ? <SettingRow label={"Leave " + company} detail="You lose access right away. Your past decisions keep your name." action={<Button tone="danger" disabled={offline} onClick={() => setConfirm("leave")}>Leave company</Button>} /> : <SettingRow label={"Close " + company} detail="Your team stops now. Conversations, desks, drafts, documents and photos are deleted 30 days after closing." action={<Button tone="danger" disabled={offline} onClick={() => setConfirm("close")}>Close company</Button>} />}</SettingSection>
    {confirm === "signout" && <ConfirmAction title="Sign out here?" description="Signing out here stops your team on this computer. Move the team first, or it waits until someone signs in here again." confirmLabel="Sign out" onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); props.onDestination("O-01"); }} />}
    {confirm === "leave" && <ConfirmAction title={"Leave " + company + "?"} description="You'll lose access right away. Decisions you made keep your name." confirmLabel="Leave company" onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); props.onNotice("Leaving a company is not connected in this preview."); }} />}
    {confirm === "close" && <ConfirmAction title={"Close " + company + "?"} description="All six employees stop now. Everything in Colony is deleted after 30 days. Partners lose access, the Colony website goes offline, and unused credits cannot be refunded in the app. Payment records are kept as required. Ask the Colony team for a copy before closing. This can't be undone." requireName={company} confirmLabel="Close company" onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); props.onNotice("Company closure is not connected in this preview."); }} />}
  </div>;
}

export function HelpUpdates(props: SettingsProps) {
  const all = useMock().settings;
  const actor: Person = props.partner ? "Kagiso" : "Lerato";
  const [kind, setKind] = useState(all.help.kind);
  const [draft, setDraft] = useState(all.help.draft);
  const [includeDetails, setIncludeDetails] = useState(all.help.includeDetails);
  const [screenshot, setScreenshot] = useState("");
  const [status, setStatus] = useState(props.state === "send-failed" ? "Couldn't send. Your message is kept here for another try." : "");
  const [update, setUpdate] = useState(props.state);
  const offline = props.state === "offline";
  const send = () => {
    if (!draft.trim()) { setStatus("Write a message first."); return; }
    savePart(props, "help", { kind, draft, includeDetails }, "Message saved in this preview. It has not been sent to Colony.");
    setStatus("Message saved in this preview. It has not been sent to Colony.");
  };
  return <div className="settings-content">
    <p className="setting-lead">Get help and keep Colony up to date.</p>
    {offline && <p className="setting-callout">You're offline. Checking for updates and sending need the internet. Your message stays here.</p>}
    <SettingSection title="Version and updates"><SettingRow label="Colony 2.0.3" detail={update === "update-ready" ? "An update is ready. Restart Colony to finish." : update === "checking" ? "Checking for updates" : update === "downloading" ? "Downloading an update" : update === "update-failed" ? "Couldn't update. We'll try again later." : "You're up to date."} action={<Button disabled={offline} onClick={() => { setUpdate("checking"); setTimeout(() => setUpdate("normal"), 700); }}>Check for updates</Button>} />{update === "update-ready" && <Button onClick={() => props.onDestination("X-11")}>Restart to update</Button>}{update === "update-failed" && <Button onClick={() => props.onDestination("W-02")}>Download the latest version</Button>}</SettingSection>
    <SettingSection title="What's new"><SettingRow label="A clearer home for your team" detail="Today, conversations and desks are easier to read." /><SettingRow label="More visible decisions" detail="See who approved work and when." /><SettingRow label="Quieter updates" detail="Only the things that need you interrupt you." /></SettingSection>
    <SettingSection title="Message the Colony team" intro="We reply by email."><div className="setting-tabs" role="group" aria-label="Message type">{(["help", "problem", "feedback"] as const).map(option => <Button key={option} aria-pressed={kind === option} onClick={() => { setKind(option); updateSettings(settings => ({ ...settings, help: { ...settings.help, kind: option } })); }}>{option === "help" ? "Get help" : option === "problem" ? "Report a problem" : "Send feedback"}</Button>)}</div><label className="setting-field">What happened?<textarea value={draft} onChange={event => { setDraft(event.target.value); updateSettings(settings => ({ ...settings, help: { ...settings.help, draft: event.target.value } })); }} placeholder="Tell us in your own words" /></label><SettingRow label="Reply to" value={all.accounts[actor].email} />{kind === "problem" && <><label className="setting-field">Screenshot, optional<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setScreenshot(event.target.files?.[0]?.name || "")} /></label>{screenshot && <p className="setting-help">{screenshot} selected.</p>}<SettingSwitch label="Include details from this computer" detail="App version, computer type and recent problem messages. Conversations are never included unless you paste them in." checked={includeDetails} onChange={value => { setIncludeDetails(value); updateSettings(settings => ({ ...settings, help: { ...settings.help, includeDetails: value } })); }} /></>}<Button tone="primary" disabled={offline} onClick={send}>Send {kind === "help" ? "help message" : kind === "problem" ? "report" : "feedback"}</Button>{status && <p className={status.startsWith("Write") ? "setting-error" : "setting-callout"} role="status">{status}</p>}</SettingSection>
    <SettingSection title="Other ways to get help"><SettingRow label="Ask Scout" detail="Scout can explain how Colony works." action={<Button tone="quiet" onClick={() => props.onDestination("T-04", undefined, { prefill: "How does Colony work?" })}>Ask in a conversation</Button>} /><SettingRow label="Terms and privacy" detail="Read how Colony works with your information." action={<Button tone="quiet" onClick={() => props.onDestination("W-04")}>Open pages</Button>} /></SettingSection>
  </div>;
}
