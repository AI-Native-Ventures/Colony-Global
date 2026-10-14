import { useEffect, useRef, useState } from "react";
import { Check, Mail, Monitor, MoveRight } from "lucide-react";
import { Button } from "../components/primitives";
import { useMock } from "../data/mock-store";
import { moveTeamHere, saveFirstRun } from "../data/first-run-actions";
import { RunActions, RunNotice, type FirstRunProps } from "./first-run-shared";

function intentFor(props: FirstRunProps) {
  if (props.state === "invite" || props.params.get("intent") === "invite") return "invite";
  if (props.params.get("intent") === "other-computer") return "other-computer";
  if (props.state === "returning" || props.params.get("intent") === "returning") return "returning";
  return "new";
}

function afterSignIn(props: FirstRunProps, intent: string, teamReady: boolean) {
  if (intent === "invite") props.onDestination("P-01");
  else if (intent === "other-computer") props.onDestination("N-01");
  else if (intent === "returning" && teamReady) props.onDestination("T-01");
  else props.onDestination("O-03");
}

export function Welcome(props: FirstRunProps) {
  const { firstRun } = useMock();
  const [email, setEmail] = useState(firstRun.email || (props.state === "returning" ? firstRun.lastEmail : ""));
  const [help, setHelp] = useState(false);
  const waiting = props.state === "waiting-google";
  const blocked = props.state === "offline" || props.state === "too-many-tries";
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      props.onDestination("O-01", "email-wrong", { intent: intentFor(props) });
      return;
    }
    saveFirstRun({ email: email.trim(), lastEmail: email.trim(), intent: intentFor(props), termsAccepted: true });
    props.onDestination("O-02");
  };
  if (waiting) return <><RunNotice>Finish signing in in your browser. We'll bring you back here.</RunNotice><RunActions primary="Open the browser again" onPrimary={() => props.onNotice("The browser sign-in is outside this local design preview.")} secondary="Cancel" onSecondary={() => props.onDestination("O-01", "google-cancelled")} /></>;
  return <div className="run-stack">
    {props.state === "invite" && <RunNotice>Lerato invited you to join Lerato Designs. Sign in to accept.</RunNotice>}
    {props.state === "google-cancelled" && <RunNotice kind="warning">You closed Google sign-in. Try again, or use your email instead.</RunNotice>}
    {props.state === "email-wrong" && <RunNotice kind="warning">That email doesn't look right. Check it and try again.</RunNotice>}
    {props.state === "too-many-tries" && <RunNotice kind="warning">Too many tries. Wait a minute, then try again.</RunNotice>}
    {props.state === "offline" && <RunNotice kind="warning">Connect to the internet to sign in.</RunNotice>}
    {props.state === "unreachable" && <RunNotice kind="warning">Colony isn't answering right now. Try again in a minute.</RunNotice>}
    <Button tone="secondary" className="run-wide-action" disabled={blocked} onClick={() => { saveFirstRun({ intent: intentFor(props), termsAccepted: true }); props.onDestination("O-01", "waiting-google", { intent: intentFor(props) }); }}>Continue with Google <MoveRight size={17} aria-hidden="true" /></Button>
    <div className="run-divider"><span>or</span></div>
    <form noValidate onSubmit={submit} className="run-form"><label htmlFor="run-email">Email address</label><input id="run-email" type="email" autoComplete="email" placeholder="you@yourbusiness.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={blocked} /><Button type="submit" tone="primary" disabled={blocked}>Continue with email <MoveRight size={17} aria-hidden="true" /></Button></form>
    <p className="run-fine">By continuing, you agree to Colony's <button onClick={() => props.onDestination("W-04")}>Terms</button> and <button onClick={() => props.onDestination("W-04")}>Privacy Policy</button>.</p>
    <button className="run-text-link" onClick={() => setHelp(!help)}>Trouble signing in?</button>
    {help && <RunNotice>Check your email address, try the other sign-in option, or contact support at help@colony.global.</RunNotice>}
  </div>;
}

export function EmailCode(props: FirstRunProps) {
  const { firstRun } = useMock();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(props.state === "cooling-down" ? 24 : 30);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (props.state === "wrong" || props.state === "waiting") input.current?.focus(); }, [props.state]);
  useEffect(() => { if (cooldown <= 0) return; const timer = window.setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000); return () => window.clearInterval(timer); }, [cooldown]);
  const submit = (value: string) => {
    if (value.length !== 6 || props.state === "offline") return;
    if (value === "000000") { setCode(""); props.onDestination("O-02", "wrong"); requestAnimationFrame(() => input.current?.focus()); return; }
    saveFirstRun({ lastEmail: firstRun.email, ...(firstRun.intent === "new" && !firstRun.answers.name ? { question: 0 } : {}) });
    afterSignIn(props, firstRun.intent, firstRun.teamReady);
  };
  return <div className="run-stack"><div className="run-icon"><Mail size={24} aria-hidden="true" /></div><p>We sent a 6-digit code to <strong>{firstRun.email || "lerato@leratodesigns.co.za"}</strong>.</p>
    {props.state === "wrong" && <RunNotice kind="warning">That code didn't work. Check it and try again.</RunNotice>}
    {props.state === "expired" && <RunNotice kind="warning">That code has expired.</RunNotice>}
    {props.state === "too-many" && <RunNotice kind="warning">Too many tries. Wait 15 minutes, or continue with Google.</RunNotice>}
    {props.state === "no-email" && <RunNotice>Still nothing? Check your spam folder, or use Google.</RunNotice>}
    {props.state === "offline" && <RunNotice kind="warning">Connect to the internet to check your code.</RunNotice>}
    {props.state === "unreachable" && <RunNotice kind="warning">Colony isn't answering right now. Try again in a minute.</RunNotice>}
    <form onSubmit={(event) => { event.preventDefault(); submit(code); }} className="run-form"><label htmlFor="run-code">6-digit code</label><input ref={input} id="run-code" className="run-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => { const next = event.target.value.replace(/\D/g, "").slice(0, 6); setCode(next); if (next.length === 6) submit(next); }} aria-describedby="run-code-help" /><small id="run-code-help">The code works for 10 minutes. Check your spam folder if it's not there.</small><Button type="submit" tone="primary" disabled={code.length !== 6 || props.state === "offline"}>Continue</Button></form>
    <div className="run-link-row"><button className="run-text-link" disabled={cooldown > 0 && props.state !== "expired"} onClick={() => { setCooldown(30); setCode(""); props.onDestination("O-02", "waiting"); props.onNotice("New code requested in this local preview. No email was sent."); }}>Send a new code{cooldown > 0 && props.state !== "expired" ? ` in ${cooldown} seconds` : ""}</button><button className="run-text-link" onClick={() => props.onDestination("O-01", "returning", { intent: firstRun.intent })}>Use a different email</button></div>
  </div>;
}

export function PartnerJoin(props: FirstRunProps) {
  const { firstRun } = useMock();
  const [later, setLater] = useState(false);
  const emailMismatch = firstRun.intent === "invite" && firstRun.email !== "" && firstRun.email.toLowerCase() !== "kagiso@leratodesigns.co.za";
  const state = emailMismatch ? "wrong-email" : props.state;
  const valid = ["valid", "normal", "partner"].includes(state);
  const issue: Record<string, string> = {
    "wrong-email": "This invite is for kagiso@leratodesigns.co.za. Sign in with that email to join.",
    expired: "This invite has expired. Ask Lerato to send a new one.",
    cancelled: "This invite was cancelled or already used. Ask Lerato for a new one.",
    "already-member": "You're already part of Lerato Designs.",
    closed: "Lerato Designs is no longer on Colony.",
    failed: "That didn't work. Try again.",
    offline: "Connect to the internet to join.",
  };
  return <div className="run-stack"><p className="run-feature-line">Lerato invited you to join Lerato Designs as a partner.</p><RunNotice>See everything, talk to Scout and the team, and approve decisions. Billing stays with Lerato.</RunNotice><p className="run-fine">You're signed in as {firstRun.email || "kagiso@leratodesigns.co.za"}.</p>
    {issue[state] && <RunNotice kind="warning">{issue[state]}</RunNotice>}
    {later ? <div className="run-panel"><p>The invite is saved until it expires.</p><RunActions primary="Start my own business" onPrimary={() => props.onDestination("O-03")} secondary="I'll use the invite later" onSecondary={() => props.onDestination("O-01", "invite")} /></div>
      : valid ? <RunActions primary="Accept" onPrimary={() => { saveFirstRun({ partnerJoined: true }); props.onDestination("P-01a"); }} secondary="Not now" onSecondary={() => setLater(true)} shortcut="Enter to join" />
      : <RunActions primary={state === "already-member" ? "Open" : state === "wrong-email" ? "Use invite email" : "Try again"} onPrimary={() => props.onDestination(state === "already-member" ? "T-01" : state === "wrong-email" ? "O-01" : "P-01", state === "already-member" ? "partner" : state === "wrong-email" ? "invite" : "valid", state === "already-member" ? { person: "partner" } : state === "wrong-email" ? { intent: "invite" } : {})} />}
    <button className="run-text-link" onClick={() => props.onDestination("O-01", "invite", { intent: "invite" })}>Use a different account</button>
  </div>;
}

export function PartnerLoop(props: FirstRunProps) {
  const { firstRun } = useMock();
  const [opening, setOpening] = useState(firstRun.partnerStartWithComputer);
  const [notifications, setNotifications] = useState(props.state === "refused" ? false : firstRun.partnerNotificationPermission);
  const change = (key: "opening" | "notifications", value: boolean) => {
    if (key === "opening") { setOpening(value); saveFirstRun({ partnerStartWithComputer: value }); props.onNotice("Saved for this computer."); }
    else { setNotifications(value); saveFirstRun({ partnerNotificationPermission: value }); props.onNotice(value ? "Notification choice saved for this preview." : "Notifications are off."); }
  };
  return <div className="run-stack"><p>You'll get decisions as notifications while Colony is running. Lerato's team runs on Lerato's MacBook Air.</p>{props.state === "team-not-running" && <RunNotice>Lerato's team isn't running yet. You'll see it here once it is.</RunNotice>}{props.state === "refused" && <RunNotice kind="warning">Notifications are off. You'll only see decisions while Colony is open. You can turn them on later in your computer's settings.</RunNotice>}
    <label className="run-choice-switch"><span><strong>Open Colony when this computer starts</strong></span><input type="checkbox" checked={opening} onChange={(event) => change("opening", event.target.checked)} /></label>
    <label className="run-choice-switch"><span><strong>Let Colony send notifications</strong></span><input type="checkbox" checked={notifications} onChange={(event) => change("notifications", event.target.checked)} /></label>
    <RunActions primary="Continue" onPrimary={() => props.onDestination("T-01", "partner", { person: "partner" })} />
  </div>;
}

export function WelcomeBack(props: FirstRunProps) {
  const { firstRun, settings } = useMock();
  const [company, setCompany] = useState("Lerato Designs");
  const move = () => { saveFirstRun({ movePower: settings.power.choice === "credits" ? "credits" : "plan" }); props.onDestination("N-02", "confirming"); };
  return <div className="run-stack"><p className="run-feature-line">Welcome back, {props.partner ? "Kagiso" : "Lerato"}.</p>{props.state === "several-companies" && <label className="run-form">Company<select value={company} onChange={(event) => setCompany(event.target.value)}><option>Lerato Designs</option><option>Another company</option></select></label>}
    {props.state === "off" ? <RunNotice kind="warning">Your team ran on Lerato's MacBook Air until 09:12 on Thursday. Move it here so they can keep working?</RunNotice> : <RunNotice><Monitor size={18} aria-hidden="true" /> Your team runs on Lerato's MacBook Air. Last seen 2 minutes ago.</RunNotice>}
    <p>Your team can only run on one computer at a time.</p>
    {props.state === "offline" && <RunNotice kind="warning">Connect to the internet to see your team.</RunNotice>}
    {props.state === "never-started" ? <RunActions primary="Finish setting up" onPrimary={() => props.onDestination("O-03")} /> : <RunActions primary={props.state === "off" ? "Move it here" : "Keep it there"} onPrimary={() => props.state === "off" ? move() : props.onDestination("T-01", props.partner ? "partner" : "other-computer", props.partner ? { person: "partner" } : {})} secondary={props.state === "off" ? "Keep it there" : "Move it here"} onSecondary={() => props.state === "off" ? props.onDestination("T-01", props.partner ? "partner" : "other-computer", props.partner ? { person: "partner" } : {}) : move()} />}
    {firstRun.movedHere && <p className="run-fine">This preview last showed your team on this computer.</p>}
  </div>;
}

export function MovingTeam(props: FirstRunProps) {
  const { firstRun, settings } = useMock();
  const destination = useRef(props.onDestination);
  destination.current = props.onDestination;
  const moveUsesPlan = props.state === "power-needed" || firstRun.movePower === "plan";
  const powerNeeded = moveUsesPlan && !firstRun.connectedPlan;
  useEffect(() => {
    if (props.state !== "moving" || props.capture) return;
    const timer = window.setTimeout(() => { moveTeamHere(); destination.current("N-02", "done"); }, 1000);
    return () => window.clearTimeout(timer);
  }, [props.state, props.capture]);
  const retry = () => props.onDestination("N-02", "moving");
  return <div className="run-stack">
    {props.state === "done" ? <><RunNotice kind="success"><Check size={18} aria-hidden="true" /> Your team now runs on this computer.</RunNotice><p>Choose how Colony runs on this computer before opening Today.</p><RunActions primary="Set up this computer" onPrimary={() => props.onDestination("O-09", "normal", { returnTo: "T-01" })} /></>
      : props.state === "moving" ? <><RunNotice>Moving your team to this computer. Their work and schedules move together.</RunNotice><div className="run-move-list">{["Scout", "Maya", "Naledi", "Sipho", "Leo", "Grace"].map((name, i) => <div key={name}><span>{i < 2 ? "Free" : "Starting"}</span>Moving {name}</div>)}</div></>
      : <><p className="run-feature-line">Move your team to this computer? On Lerato's MacBook Air, your team will stop.</p><p>All employees, their work in progress and their schedules move together.</p>
        {!moveUsesPlan ? <RunNotice>Credits work on any computer.</RunNotice> : <RunNotice kind="warning">Your team uses Lerato's Claude plan. Connect a plan on this computer or use credits.</RunNotice>}
        {props.state === "old-off" && <RunNotice>Lerato's MacBook Air is off. Your team moves here now. When that computer comes back, it will see that the team moved and won't start it.</RunNotice>}
        {props.state === "one-failed" && <RunNotice kind="warning">Sipho didn't move yet. The others are running here.</RunNotice>}
        {props.state === "move-failed" && <RunNotice kind="warning">Your team is still on Lerato's MacBook Air. Try again.</RunNotice>}
        {props.state === "offline" && <RunNotice kind="warning">Connect to the internet to move your team.</RunNotice>}
        {powerNeeded && <div className="run-link-row"><Button onClick={() => { saveFirstRun({ returnTo: "N-02", power: "claude" }); props.onDestination("O-06"); }}>Connect a plan</Button><Button disabled={props.partner && settings.billing.balance <= 0} onClick={() => { saveFirstRun({ movePower: "credits" }); props.onDestination("N-02", "confirming"); }}>Use credits</Button></div>}
        {props.state === "one-failed" || props.state === "move-failed" ? <RunActions primary="Try again" onPrimary={retry} secondary="Cancel" onSecondary={() => props.onDestination("N-01")} /> : <RunActions primary="Move team" onPrimary={() => { if (props.state !== "offline") props.onDestination("N-02", powerNeeded ? "power-needed" : "moving"); }} secondary="Cancel" onSecondary={() => props.onDestination("N-01")} disabled={powerNeeded || props.state === "offline"} shortcut="Cmd/Ctrl + Enter" />}
      </>}
  </div>;
}
