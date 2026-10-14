import { useState } from "react";
import { CircleCheck, CreditCard, ExternalLink } from "lucide-react";
import { Button } from "../components/primitives";
import { useMock } from "../data/mock-store";
import { saveFirstRun } from "../data/first-run-actions";
import { RunActions, RunNotice, type FirstRunProps } from "./first-run-shared";
import type { PowerChoice } from "../data/first-run-fixtures";

export function PowerTeam(props: FirstRunProps) {
  const { firstRun } = useMock();
  const [choice, setChoice] = useState<"credits" | "plan">(firstRun.power === "credits" ? "credits" : "plan");
  const [explain, setExplain] = useState(false);
  const offline = props.state === "offline";
  return <div className="run-stack"><p className="run-feature-line">Your team needs AI to think and work. Choose how to power it.</p>
    {offline && <RunNotice kind="warning">Connect to the internet to carry on.</RunNotice>}
    {props.state === "credits-already" && <RunNotice kind="success">You have $50.00 in credits.</RunNotice>}
    {props.state === "plan-already" && <RunNotice kind="success">Your Claude plan is already set up on this computer.</RunNotice>}
    <fieldset className="run-options"><legend className="sr-only">How to power your team</legend><label className={choice === "credits" ? "run-option selected" : "run-option"}><input type="radio" name="power" checked={choice === "credits"} onChange={() => setChoice("credits")} disabled={offline} /><span><strong>Colony credits <em>Recommended</em></strong><small>Buy credits once and you're done. Nothing else to set up. You set a weekly budget for each employee, and most weeks cost less than the budget.</small><b>Up to $19 a week</b></span></label><label className={choice === "plan" ? "run-option selected" : "run-option"}><input type="radio" name="power" checked={choice === "plan"} onChange={() => setChoice("plan")} disabled={offline} /><span><strong>Use my ChatGPT or Claude plan</strong><small>If you already pay for ChatGPT or Claude, your team can use your plan. Setting it up takes a few minutes. AI-made images still use credits.</small></span></label></fieldset>
    <button className="run-text-link" onClick={() => setExplain(!explain)}>What are credits?</button>
    {explain && <RunNotice>Credits are paid in advance. Employees use them as they work. Colony adds its fee to what the AI costs, and each employee has a weekly budget.</RunNotice>}
    <p className="run-fine">You can change this later in Settings.</p>
    <RunActions primary={props.state === "credits-already" ? "Continue" : props.state === "plan-already" ? "Use it" : "Continue"} onPrimary={() => { const next = props.state === "credits-already" ? "O-07" : props.state === "plan-already" ? "O-06" : choice === "credits" ? "O-05" : "O-06"; saveFirstRun({ power: choice === "credits" ? "credits" : "claude" }); props.onDestination(next); }} disabled={offline} />
  </div>;
}

const packs: (5 | 15 | 50 | 120)[] = [5, 15, 50, 120];
const duration: Record<number, string> = { 5: "about 2 days", 15: "about 5 days", 50: "at least 2 weeks", 120: "at least 6 weeks" };
export function BuyCredits(props: FirstRunProps) {
  const { firstRun } = useMock();
  const [pack, setPack] = useState(firstRun.pack);
  const state = props.state;
  const waiting = ["waiting-payment", "credits-coming", "credits-slow"].includes(state);
  const paid = state === "paid";
  const blocked = state === "offline" || state === "unreachable";
  const next = () => props.onDestination(firstRun.returnTo === "N-02" ? "N-02" : "O-07", firstRun.returnTo === "N-02" ? "confirming" : "reading");
  return <div className="run-stack"><p className="run-feature-line">Choose your credits</p>
    {state === "cancelled" && <RunNotice kind="warning">You cancelled the payment. Choose a pack to try again.</RunNotice>}
    {state === "not-finished" && <RunNotice kind="warning">Payment wasn't finished. Choose a pack to try again.</RunNotice>}
    {state === "email-unconfirmed" && <RunNotice kind="warning">Confirm your email first.</RunNotice>}
    {state === "offline" && <RunNotice kind="warning">Connect to the internet to buy credits.</RunNotice>}
    {state === "unreachable" && <RunNotice kind="warning">Colony isn't answering right now. Try again in a minute.</RunNotice>}
    {paid && <RunNotice kind="success"><CircleCheck size={17} aria-hidden="true" /> Paid. ${firstRun.pack}.00 in credits added.</RunNotice>}
    {waiting && <RunNotice>{state === "waiting-payment" ? "Finish paying in your browser. We'll bring you back here." : state === "credits-coming" ? "Payment received. Adding your credits." : "This is taking longer than usual. Your credits will appear as soon as Stripe confirms."}</RunNotice>}
    {!waiting && !paid && <fieldset className="run-packs"><legend className="sr-only">Choose a credit pack</legend>{packs.map((amount) => <label key={amount} className={pack === amount ? "run-pack selected" : "run-pack"}><input type="radio" name="pack" checked={pack === amount} onChange={() => { setPack(amount); saveFirstRun({ pack: amount }); }} disabled={blocked} /><span><strong>${amount}</strong><small>{amount === 50 ? "$50: at least 2 weeks for your team" : `${duration[amount]} for your team`}</small></span>{amount === 50 && <em>Recommended</em>}</label>)}</fieldset>}
    {!waiting && !paid && <><p>Your employees' work and AI-made images use credits.</p><RunNotice>You'll pay in your browser. Payments are handled by Stripe; Colony never sees your card.</RunNotice><RunActions primary="Pay" onPrimary={() => { saveFirstRun({ pack, checkout: "waiting" }); props.onDestination("O-05", "waiting-payment"); }} disabled={blocked} secondary={state === "email-unconfirmed" ? "Confirm email" : undefined} onSecondary={state === "email-unconfirmed" ? () => props.onDestination("O-02") : undefined} /></>}
    {waiting && <div className="run-stack"><div className="run-link-row"><Button onClick={() => props.onDestination("W-05", "credits", { from: "O-05" })}><ExternalLink size={16} aria-hidden="true" /> Open the payment page again</Button><Button onClick={() => props.onNotice("A payment link is only available from a live checkout. This preview cannot copy one.")}>Copy the payment link</Button></div><RunActions primary="Check again" onPrimary={() => props.onNotice("This preview cannot check a payment. Use the design review control to show a browser return.")} secondary="Cancel" onSecondary={() => { saveFirstRun({ checkout: "none" }); props.onDestination("O-05", "cancelled"); }} /></div>}
    {paid && <RunActions primary="Continue" onPrimary={next} />}
  </div>;
}

export function ConnectPlan(props: FirstRunProps) {
  const { firstRun } = useMock();
  const [choice, setChoice] = useState<Exclude<PowerChoice, "credits">>(firstRun.power === "chatgpt" ? "chatgpt" : "claude");
  const state = props.state;
  const starting = ["normal", "choice", "partner"].includes(state);
  const waiting = state === "waiting-browser";
  const connected = state === "connected";
  const blocked = state === "offline";
  const provider = choice === "claude" ? "Claude" : "ChatGPT";
  const callouts: Record<string, string> = {
    "getting-ready": `Getting ${provider} ready on this computer. This takes 2 to 5 minutes.`,
    slow: "Still working. A slow internet connection can make this take longer.",
    "not-enough-space": "There isn't enough free space on this computer. Free up 2 GB and try again.",
    "setup-failed": `Something stopped ${provider} from getting ready. Try again, or use credits instead.`,
    "waiting-browser": `Sign in to ${provider} in your browser. We'll bring you back here.`,
    "sign-in-cancelled": "You closed the sign-in. Try again, or use credits instead.",
    "free-plan": `Your ${provider} account is on the free plan. Your team needs ${provider === "Claude" ? "Claude Pro or Max" : "a paid ChatGPT plan"}.`,
    checking: "Checking that your plan answers.",
    "check-failed": "Your plan is connected but didn't answer. Try again in a minute, or use credits instead.",
    connected: `Connected: ${provider} Pro.`,
    "already-set-up": "Your plan is already on this computer. Checking that it works.",
    offline: "Connect to the internet to carry on.",
  };
  const continueTo = firstRun.returnTo === "N-02" ? "N-02" : "O-07";
  return <div className="run-stack"><p className="run-feature-line">Which plan do you have?</p>
    {starting && <fieldset className="run-options"><legend className="sr-only">Choose your plan</legend><label className={choice === "claude" ? "run-option selected" : "run-option"}><input type="radio" name="plan" checked={choice === "claude"} onChange={() => setChoice("claude")} /><span><strong>Claude (Pro or Max)</strong></span></label><label className={choice === "chatgpt" ? "run-option selected" : "run-option"}><input type="radio" name="plan" checked={choice === "chatgpt"} onChange={() => setChoice("chatgpt")} /><span><strong>ChatGPT (Plus, Pro or Business)</strong></span></label></fieldset>}
    {!starting && <div className="run-step-list"><div className="current">1 <span>Get {provider} ready on this computer</span></div><div className={waiting || connected ? "current" : ""}>2 <span>Sign in to {provider} in your browser</span></div><div className={connected ? "current" : ""}>3 <span>Check that it works</span></div></div>}
    {callouts[state] && <RunNotice kind={["setup-failed", "not-enough-space", "sign-in-cancelled", "free-plan", "check-failed", "offline"].includes(state) ? "warning" : connected ? "success" : "info"}>{callouts[state]}</RunNotice>}
    {starting ? <RunActions primary="Continue" onPrimary={() => { saveFirstRun({ power: choice }); props.onDestination("O-06", "getting-ready"); }} secondary="Use credits instead" onSecondary={() => props.onDestination("O-05")} />
      : connected ? <RunActions primary="Continue" onPrimary={() => props.onDestination(continueTo, continueTo === "N-02" ? "confirming" : "reading")} />
      : waiting ? <RunActions primary="Open the browser again" onPrimary={() => props.onNotice("Plan sign-in opens in your browser outside this design preview.")} secondary="Cancel" onSecondary={() => props.onDestination("O-06", "choice")} />
      : <RunActions primary={state === "getting-ready" || state === "slow" || state === "already-set-up" ? "Sign in" : "Try again"} onPrimary={() => props.onDestination("O-06", state === "getting-ready" || state === "slow" ? "waiting-browser" : "getting-ready")} secondary="Use credits instead" onSecondary={() => props.onDestination("O-05")} disabled={blocked} />}
    {!starting && !connected && <button className="run-text-link" onClick={() => props.onDestination("O-06", "choice")}>Cancel setup</button>}
  </div>;
}
