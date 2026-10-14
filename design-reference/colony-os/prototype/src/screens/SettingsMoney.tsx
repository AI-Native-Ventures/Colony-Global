import { useState } from "react";
import { Button } from "../components/primitives";
import { employees } from "../data/fixtures";
import { useMock } from "../data/mock-store";
import { ConfirmAction, SettingRow, SettingSection, SettingSwitch, savePart, type SettingsProps } from "./settings-shared";

export function CreditsBilling(props: SettingsProps) {
  const data = useMock();
  const { billing, power } = data.settings;
  const team = data.team;
  const owner = !props.partner;
  const offline = props.state === "offline";
  const [confirmOff, setConfirmOff] = useState(false);
  const [waiting, setWaiting] = useState(props.state === "waiting-payment" || billing.checkout !== null);
  const balance = props.state === "out" ? 0 : props.state === "low" ? 2.4 : props.state === "paid" ? 33.4 : billing.balance;
  const status = props.state === "out" ? "Out of credits. Your team is paused." : props.state === "low" ? "Low: about 2 days left." : "About 14 days at this week's pace.";
  const buy = (pack: number) => {
    if (!owner || offline) return;
    savePart(props, "billing", { checkout: pack }, "Finish paying in your browser.");
    setWaiting(true);
  };
  return <div className="settings-content">
    {props.partner && <p className="setting-callout">Only Lerato can buy credits or change billing.</p>}
    {offline && <p className="setting-callout">You're offline. Buying credits needs the internet.</p>}
    {props.state === "auto-top-up-failed" && <p className="setting-error">Auto top-up didn't go through: your card was declined. Update your card or buy credits.</p>}
    {props.state === "monthly-limit" && <p className="setting-callout">Auto top-up has bought credits 4 times this month. Buy more yourself or raise the limit.</p>}
    {props.state === "payment-failed" && <p className="setting-error">Payment cancelled. Nothing was charged. <Button onClick={() => buy(15)} disabled={!owner || offline}>Try again</Button></p>}
    <div className="setting-balance"><span className="eyebrow">Available to the team</span>{power.choice !== "credits" && <p>Your team runs on your {power.choice === "claude" ? "Claude" : "ChatGPT"} plan. Credits pay for AI-made images.</p>}<strong>${balance.toFixed(2)}</strong><span>in credits</span><p>{status}</p></div>
    {waiting && <div className="setting-callout"><strong>Finish paying in your browser.</strong><p>This updates when you're done.</p><div className="button-row"><Button disabled={!owner || offline} onClick={() => props.onDestination("W-05")}>Open the payment page again</Button><Button onClick={() => { savePart(props, "billing", { checkout: null }, "Payment wait stopped."); setWaiting(false); }}>Stop waiting</Button></div></div>}
    <SettingSection title="Buy credits" intro="Charged in US dollars. Your bank may convert it to your currency."><div className="setting-packs">{[5, 15, 50, 120].map(pack => <Button key={pack} disabled={!owner || offline} onClick={() => buy(pack)}>${pack}</Button>)}</div></SettingSection>
    <SettingSection title="This week" intro="Monday to Sunday, in your company's time zone."><SettingRow label="Total used" value="$9.10" />{employees.map(employee => <SettingRow key={employee.name} label={employee.name} detail={`$${employee.used.toFixed(2)} of a $${team.profiles[employee.name].budget.toFixed(2)} weekly budget`} action={<Button tone="quiet" onClick={() => props.onDestination("M-06", undefined, { employee: employee.name })}>Change budget</Button>} />)}</SettingSection>
    <SettingSection title="Auto top-up" intro="When credits drop below $5, buy $15 automatically. At most 4 times a month."><SettingSwitch label="Auto top-up" checked={billing.autoTopUp} disabled={!owner || offline} onChange={value => { if (!value) setConfirmOff(true); else if (!billing.cardSaved) { props.onNotice("Buy a pack first to save a payment card."); } else savePart(props, "billing", { autoTopUp: true }, "Auto top-up on."); }} /><div className="setting-select-grid"><label>Buy when below<select value={billing.threshold} disabled={!owner || offline} onChange={event => savePart(props, "billing", { threshold: Number(event.target.value) })}><option value="5">$5</option><option value="10">$10</option><option value="20">$20</option></select></label><label>Buy this pack<select value={billing.pack} disabled={!owner || offline} onChange={event => savePart(props, "billing", { pack: Number(event.target.value) })}>{[5,15,50,120].map(v => <option key={v} value={v}>${v}</option>)}</select></label><label>At most each month<select value={billing.monthlyLimit} disabled={!owner || offline} onChange={event => savePart(props, "billing", { monthlyLimit: Number(event.target.value) })}>{[1,2,4,6].map(v => <option key={v} value={v}>{v} times</option>)}</select></label></div></SettingSection>
    <SettingSection title="Website hosting"><SettingRow label="Hosting" detail={props.state === "hosting-problem" ? "Payment problem: update your card by 8 November or your website pauses." : "Active: $10 a month, renews 1 November."} action={<Button tone="quiet" disabled={!owner || offline} onClick={() => props.onDestination("W-05")}>Manage hosting payment</Button>} /><Button tone="quiet" onClick={() => props.onDestination("D-05")}>Open Leo's desk</Button></SettingSection>
    <SettingSection title="Payment history"><SettingRow label="Credits, 2 October" detail="Visa ending 4242" value="$15.00" action={<Button tone="quiet" onClick={() => props.onDestination("W-05")}>Receipt</Button>} />{props.state === "auto-top-up-ran" && <SettingRow label="Auto top-up, today" detail="Visa ending 4242" value="$15.00" />}{props.state === "no-payments" && <p className="setting-help">No payments yet.</p>}<div className="setting-actions"><Button tone="quiet" onClick={() => props.onNotice("Showing the last 12 months of payments.")}>Show more</Button><Button tone="quiet" disabled={!owner || offline} onClick={() => props.onDestination("W-05")}>Manage payment cards</Button></div></SettingSection>
    <p className="setting-footnote">Credits pay for your team's work. AI-made images always use credits, even when your team runs on your own plan. Website hosting is a separate monthly payment.</p>
    {confirmOff && <ConfirmAction title="Turn off auto top-up?" description="Your team may pause when credits run out." confirmLabel="Turn off" onClose={() => setConfirmOff(false)} onConfirm={() => { savePart(props, "billing", { autoTopUp: false }, "Auto top-up off."); setConfirmOff(false); }} />}
  </div>;
}

export function TeamPower(props: SettingsProps) {
  const settings = useMock().settings;
  const { power, billing } = settings;
  const [candidate, setCandidate] = useState<"credits" | "claude" | "chatgpt">(power.choice);
  const [connecting, setConnecting] = useState<"claude" | "chatgpt" | null>(props.state === "setting-up" ? "claude" : null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const other = props.state === "other-computer";
  const disabled = props.partner || props.state === "offline" || other;
  const choices = [
    { id: "credits", title: "Colony credits", detail: "Pay as you go. Nothing to set up." },
    { id: "claude", title: "Your Claude plan", detail: "Use the paid Claude plan you already have. Your team shares its limits with you." },
    { id: "chatgpt", title: "Your ChatGPT plan", detail: "Use the paid ChatGPT plan you already have. Your team shares its limits with you." },
  ] as const;
  const activate = () => {
    if (disabled) return;
    if (candidate === power.choice) return;
    if (candidate === "credits") {
      if (billing.balance <= 0) props.onDestination("S-02", "out");
      else if (power.choice !== "credits") setConfirmDisconnect(true);
      else savePart(props, "power", { choice: "credits", connected: false }, "Your team now runs on Colony credits.");
    } else setConnecting(candidate);
  };
  return <div className="settings-content">
    <p className="setting-lead">Choose what pays for your team's thinking.</p>
    {props.partner && <p className="setting-callout">Only Lerato can change how the team is powered.</p>}
    {props.state === "offline" && <p className="setting-callout">You're offline. Changing this needs the internet.</p>}
    {other && <p className="setting-callout">Connect your plan on Lerato's MacBook Air, the computer that runs your team. <Button onClick={() => props.onDestination("S-07", "computer-off")}>Move the team here first</Button></p>}
    {props.state === "limit" && <p className="setting-callout">Your Claude plan hit its limit. It resets at 14:00, and your team waits until then.</p>}
    {props.state === "signed-out" && <p className="setting-error">Your plan is signed out. <Button disabled={disabled} onClick={() => setConnecting("claude")}>Sign in again</Button></p>}
    {props.state === "setup-failed" && <p className="setting-error">Couldn't connect your plan. Try again or use credits instead.</p>}
    <SettingSection title="Current choice"><SettingRow label={power.choice === "credits" ? "Colony credits" : power.choice === "claude" ? "Your Claude plan" : "Your ChatGPT plan"} detail={props.state === "limit" ? "Limit reached until 14:00" : props.state === "signed-out" ? "Signed out" : "Working"} value={power.choice === "credits" ? `$${billing.balance.toFixed(2)} left` : "Connected on Lerato's MacBook Air"} /></SettingSection>
    <SettingSection title="How your team is powered"><div className="setting-choice-group" role="radiogroup" aria-label="Choose how your team is powered">{choices.map(({ id, title, detail }) => <label key={id} className="setting-choice"><input type="radio" name="power" value={id} checked={candidate === id} disabled={disabled} onChange={() => setCandidate(id)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); activate(); } }} /><span><strong>{title}</strong><small>{detail}</small></span></label>)}</div><Button tone="primary" disabled={disabled || candidate === power.choice} onClick={activate}>{candidate === "credits" ? "Use Colony credits" : "Connect " + (candidate === "claude" ? "Claude" : "ChatGPT") + " plan"}</Button></SettingSection>
    {connecting && <div className="setting-callout" role="status"><strong>Setting up {connecting === "claude" ? "Claude" : "ChatGPT"} on this computer.</strong><p>This takes about 2 minutes. Finish signing in in your browser. You can leave this screen while it sets up.</p><div className="button-row"><Button onClick={() => props.onDestination("O-06")}>Open sign-in steps</Button><Button onClick={() => setConnecting(null)}>Use credits instead</Button></div></div>}
    <SettingSection title="When your plan reaches its limit"><SettingSwitch label="Use credits until my plan resets" detail="Off by default. You choose whether to spend credits while your plan waits." checked={power.fallback} disabled={disabled} onChange={value => savePart(props, "power", { fallback: value })} /></SettingSection>
    <p className="setting-footnote">AI-made images always use credits, whichever choice you make. Website hosting is a separate monthly payment. Voice notes work with every choice.</p>
    {confirmDisconnect && <ConfirmAction title="Switch to Colony credits?" description="Your connected plan will stop powering the team. Your credits will pay for its work." confirmLabel="Use credits" onClose={() => setConfirmDisconnect(false)} onConfirm={() => { savePart(props, "power", { choice: "credits", connected: false }, "Your team now runs on Colony credits."); setConfirmDisconnect(false); }} />}
  </div>;
}
