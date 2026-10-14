import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil } from "lucide-react";
import { Avatar, Button } from "../components/primitives";
import { useMock } from "../data/mock-store";
import { chooseEmployee, confirmBusinessProfile, finishMockHire, renameEmployee, saveBusinessAnswers, saveFirstRun } from "../data/first-run-actions";
import { firstRunEmployees } from "../data/first-run-fixtures";
import type { EmployeeId } from "../data/types";
import { RunActions, RunNotice, type FirstRunProps } from "./first-run-shared";

const categories = ["Clothing and fashion", "Food and drinks", "Beauty and wellness", "Services", "Crafts and gifts", "Something else"];
const channels = ["Instagram", "Facebook", "TikTok", "My website", "WhatsApp", "Markets and pop-ups", "My own shop", "Other online stores"];
const questions: Record<number, string> = {
  0: "What should I call you?",
  1: "Hi Lerato, I'm Scout. I'll run your team for you. First, what's your business called?",
  2: "Nice. What do you sell?",
  3: "Who usually buys from you?",
  4: "Where do you sell today?",
  5: "Where can I see your business online? Paste your website, or your Instagram, TikTok or Facebook name.",
  6: "Where are you based?",
  7: "Last one. What would make the next 3 months a win?",
};
const isLink = (value: string) => /^@[a-z0-9._-]{2,}$/i.test(value) || /^(https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i.test(value);

export function YourBusiness(props: FirstRunProps) {
  const { firstRun } = useMock();
  const answers = firstRun.answers;
  const summary = props.state === "summary" || firstRun.question >= 8 || ["company-failed", "rate-limit", "company-limit"].includes(props.state);
  const question = Math.min(firstRun.question, 7);
  const [draft, setDraft] = useState("");
  const [link, setLink] = useState("");
  useEffect(() => {
    setDraft(question === 0 ? answers.owner : question === 1 ? answers.name : question === 2 ? answers.detail : question === 3 ? answers.buyers : question === 6 ? answers.location : question === 7 ? answers.goalText : "");
  }, [question, answers.owner, answers.name, answers.detail, answers.buyers, answers.location, answers.goalText]);
  const next = (patch: Parameters<typeof saveBusinessAnswers>[0] = {}) => {
    if (question === 0 && !draft.trim()) return;
    if (question === 1 && !draft.trim()) return;
    if (question === 2 && !answers.category) return;
    const field = question === 0 ? { owner: draft.trim() } : question === 1 ? { name: draft.trim() } : question === 2 ? { detail: draft.trim() } : question === 3 ? { buyers: draft.trim() } : question === 6 ? { location: draft.trim() } : question === 7 ? { goals: [], goalText: draft.trim() } : {};
    saveBusinessAnswers({ ...field, ...patch }, firstRun.editingFromSummary ? 8 : question + 1, firstRun.editingFromSummary ? false : undefined);
    if (firstRun.editingFromSummary) { props.onDestination("O-03", "summary"); }
    else if (question === 7) props.onDestination("O-03", "summary");
    else props.onDestination("O-03", "asking");
  };
  const addLink = () => {
    const nextLink = link.trim();
    if (!nextLink) return;
    if (!isLink(nextLink)) { props.onDestination("O-03", "bad-link"); return; }
    saveBusinessAnswers({ links: [...new Set([...answers.links, nextLink])] });
    setLink("");
    props.onDestination("O-03", "asking");
  };
  const change = (target: number) => { saveFirstRun({ question: target, editingFromSummary: true }); props.onDestination("O-03", "asking"); };
  const example = !answers.name;
  if (summary) return <div className="run-stack"><div className="run-scout"><Avatar name="Scout" size="small" /><p>Thanks, Lerato. That's all I need for now. Here's what I have.</p></div>
    {example && <RunNotice>Example answers for design review. Your answers will appear here as you go.</RunNotice>}
    {props.state === "company-failed" && <RunNotice kind="warning">I couldn't set up Lerato Designs yet. Try again.</RunNotice>}
    {props.state === "rate-limit" && <RunNotice kind="warning">Too many new companies were set up from this network in the last hour. Try again in 20 minutes.</RunNotice>}
    {props.state === "company-limit" && <RunNotice kind="warning">You already run 5 companies on Colony, which is the most for now.</RunNotice>}
    {props.state === "offline" && <RunNotice kind="warning">Connect to the internet to carry on. Your answers are kept here.</RunNotice>}
    <div className="run-summary">{[
      ["Your name", answers.owner, 0], ["Business", answers.name || "Lerato Designs", 1], ["What you sell", [answers.category, answers.detail].filter(Boolean).join(" · ") || (example ? "Clothing and fashion · Natural linen and cotton clothing" : "Not answered yet"), 2], ["Who buys", answers.buyers || (example ? "Women who like local, made-to-last clothing" : "Skipped"), 3], ["Where you sell", answers.channels.join(", ") || (example ? "Instagram, website and weekend markets" : "Skipped"), 4], ["Online", answers.links.join(", ") || (example ? "@leratodesigns" : "Skipped"), 5], ["Based in", answers.location || "Skipped", 6], ["Your goals", [...answers.goals, answers.goalText].filter(Boolean).join(", ") || (example ? "Launch spring linen" : "Skipped"), 7],
    ].map(([label, value, target]) => <div key={String(label)}><span><small>{label}</small><strong>{value}</strong></span><button onClick={() => change(Number(target))} aria-label={`Change ${label}`}><Pencil size={14} aria-hidden="true" /> Change</button></div>)}</div>
    <RunActions primary={props.state === "company-failed" ? "Try again" : "Continue"} onPrimary={() => props.onDestination(props.state === "company-failed" ? "O-03" : "O-04", props.state === "company-failed" ? "summary" : "normal")} disabled={props.state === "offline" || props.state === "rate-limit" || props.state === "company-limit"} />
  </div>;
  return <div className="run-stack"><div className="run-scout"><Avatar name="Scout" size="small" /><p>{questions[question]}</p></div><p className="run-progress-word">{question} of 7</p>
    {props.state === "bad-link" && <RunNotice kind="warning">That doesn't look like a link or an @name. Try again, or skip it.</RunNotice>}
    {props.state === "offline" && <RunNotice kind="warning">You're offline. Your answers are kept on this computer.</RunNotice>}
    {question === 2 && <div className="run-pills" aria-label="What you sell">{categories.map((item) => <button key={item} className={answers.category === item ? "selected" : ""} aria-pressed={answers.category === item} onClick={() => saveBusinessAnswers({ category: item })}>{item}</button>)}</div>}
    {question === 4 && <div className="run-pills" aria-label="Where you sell">{channels.map((item) => <button key={item} className={answers.channels.includes(item) ? "selected" : ""} aria-pressed={answers.channels.includes(item)} onClick={() => saveBusinessAnswers({ channels: answers.channels.includes(item) ? answers.channels.filter((v) => v !== item) : [...answers.channels, item] })}>{item}</button>)}</div>}
    {question === 5 ? <><form className="run-form" onSubmit={(event) => { event.preventDefault(); addLink(); }}><label htmlFor="business-link">Add a link or @name</label><div className="run-input-action"><input id="business-link" value={link} onChange={(event) => setLink(event.target.value)} placeholder="@leratodesigns or leratodesigns.co.za" /><Button type="submit">Add</Button></div></form>{answers.links.length > 0 && <div className="run-tags">{answers.links.map((item) => <span key={item}>{item}<button aria-label={`Remove ${item}`} onClick={() => saveBusinessAnswers({ links: answers.links.filter((v) => v !== item) })}>×</button></span>)}</div>}</>
      : ![4].includes(question) && <form className="run-form" onSubmit={(event) => { event.preventDefault(); next(); }}><label htmlFor="business-answer">{question === 2 ? "Tell me a bit more (optional)" : question === 7 ? "Your goal (optional)" : "Your answer"}</label><input id="business-answer" autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={question === 1 ? "Lerato Designs" : question === 3 ? "Women in Joburg who like local labels" : question === 6 ? "Johannesburg, South Africa" : question === 7 ? "Launch the spring collection" : "Type your answer"} /></form>}
    <RunActions primary={question === 7 ? "Review answers" : "Continue"} onPrimary={() => next()} disabled={question === 1 && !draft.trim() || question === 2 && !answers.category} secondary={question > 2 ? "Skip for now" : undefined} onSecondary={question > 2 ? () => { const clear: Partial<typeof answers> = question === 3 ? { buyers: "" } : question === 4 ? { channels: [] } : question === 5 ? { links: [] } : question === 6 ? { location: "" } : { goals: [], goalText: "" }; saveBusinessAnswers(clear, firstRun.editingFromSummary || question === 7 ? 8 : question + 1, false); props.onDestination("O-03", firstRun.editingFromSummary || question === 7 ? "summary" : "asking"); } : undefined} shortcut={question === 4 ? "Space or Enter selects; Continue moves on" : "Enter continues"} />
  </div>;
}

export function ScoutProfile(props: FirstRunProps) {
  const { firstRun } = useMock();
  const destination = useRef(props.onDestination);
  destination.current = props.onDestination;
  const a = firstRun.answers;
  const ready = ["profile-ready", "no-links", "link-failed", "partner"].includes(props.state);
  const working = ["reading", "reading-slow", "getting-ready", "slow"].includes(props.state);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  useEffect(() => { if (props.state !== "reading" || props.capture) return; const timer = window.setTimeout(() => destination.current("O-07", "profile-ready"), 1100); return () => window.clearTimeout(timer); }, [props.state, props.capture]);
  useEffect(() => { if (props.state !== "reading") return; const timer = window.setTimeout(() => setShowSkip(true), 60000); return () => window.clearTimeout(timer); }, [props.state]);
  return <div className="run-stack"><div className="run-scout"><Avatar name="Scout" size="small" /><p>{ready ? "Here's Lerato Designs as I understand it. Anything to fix?" : "Thanks, Lerato. I'm reading your Instagram and website now. This takes a minute or two."}</p></div>
    {props.state === "getting-ready" && <RunNotice>Getting Scout ready. The first time takes up to a minute.</RunNotice>}
    {props.state === "reading-slow" && <RunNotice>Reading your links is taking longer than expected. You can carry on with what you told me.</RunNotice>}
    {working && <div className="run-step-list"><div className="current">1 <span>Looking at your last 30 Instagram posts.</span></div><div>2 <span>Reading leratodesigns.co.za</span></div><div>3 <span>Putting your business profile together</span></div></div>}
    {props.state === "link-failed" && <RunNotice kind="warning">I couldn't open your Instagram. It might be private. I'll work with what you told me.</RunNotice>}
    {props.state === "no-links" && <RunNotice>I've filled this in from what you told me.</RunNotice>}
    {props.state === "scout-failed" && <RunNotice kind="warning">Scout couldn't start. Try again, or get help.</RunNotice>}
    {props.state === "credits-out" && <RunNotice kind="warning">Your team needs more credits before Scout can carry on.</RunNotice>}
    {props.state === "plan-limit" && <RunNotice kind="warning">Your plan has reached its limit. Try again later or use credits.</RunNotice>}
    {props.state === "offline" && <RunNotice kind="warning">You're offline. Scout carries on when you're back.</RunNotice>}
    {ready && <div className="run-profile"><div className="run-profile-head"><strong>Business profile</strong><small>Prepared from what you shared</small></div>{[
      ["Business name", "name", a.name || "Lerato Designs"], ["What you sell", "detail", [a.category || "Clothing and fashion", a.detail || "Natural linen and cotton clothing"].join(". ")], ["Best sellers", "bestSellers", a.bestSellers], ["Who buys", "buyers", a.buyers || "Women who like local, made-to-last clothing"], ["Where you sell", "channels", a.channels.join(", ") || "Instagram, website and weekend markets"], ["Price range", "priceRange", a.priceRange], ["How you sound", "tone", a.tone], ["Next 3 months", "goalText", [...a.goals, a.goalText].filter(Boolean).join(", ") || "Launch spring linen"], ["Links", "links", a.links.join(", ") || "@leratodesigns"], ["Based in", "location", a.location],
    ].map(([label, field, value]) => <label key={label}><span>{label}</span><input value={value} onChange={(event) => { if (field === "channels") saveBusinessAnswers({ channels: event.target.value.split(",").map((v) => v.trim()).filter(Boolean) }); else if (field === "links") saveBusinessAnswers({ links: event.target.value.split(",").map((v) => v.trim()).filter(Boolean) }); else saveBusinessAnswers({ [field]: event.target.value }); }} /></label>)}</div>}
    {editing && <form className="run-form" onSubmit={(event) => { event.preventDefault(); saveBusinessAnswers({ detail: [a.detail, note.trim()].filter(Boolean).join(" ") }); setNote(""); setEditing(false); props.onNotice("Change added to the local profile."); }}><label htmlFor="scout-change">Tell Scout what to change</label><textarea id="scout-change" value={note} onChange={(event) => setNote(event.target.value)} placeholder="We also sell to bridesmaids" /><Button type="submit" disabled={!note.trim()}>Send change</Button></form>}
    {ready && <RunActions primary="Looks right" onPrimary={() => { confirmBusinessProfile(); props.onDestination("O-08", "putting-together"); }} secondary="Change something" onSecondary={() => setEditing(!editing)} shortcut="Cmd/Ctrl + Enter" />}
    {working && (showSkip || props.state === "reading-slow") && <Button tone="quiet" onClick={() => props.onDestination("O-07", "no-links")}>Skip reading my links</Button>}
    {props.state === "scout-failed" && <RunActions primary="Try again" onPrimary={() => props.onDestination("O-07", "reading")} secondary="Get help" onSecondary={() => props.onDestination("S-09")} />}
    {props.state === "credits-out" && <RunActions primary="Add credits" onPrimary={() => props.onDestination("O-05")} />}
    {props.state === "plan-limit" && <RunActions primary="Use credits instead" onPrimary={() => props.onDestination("O-05")} />}
  </div>;
}

export function MeetTeam(props: FirstRunProps) {
  const { firstRun, settings } = useMock();
  const destination = useRef(props.onDestination);
  destination.current = props.onDestination;
  const [why, setWhy] = useState<EmployeeId | null>(null);
  const [renaming, setRenaming] = useState<EmployeeId | null>(null);
  const [draftName, setDraftName] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [nameError, setNameError] = useState("");
  const selected = firstRunEmployees.filter((e) => firstRun.teamSelected[e.id]);
  const total = selected.reduce((n, e) => n + e.budget, 0);
  const underWeek = props.state === "low-credits" || settings.billing.balance < total && firstRun.power === "credits";
  useEffect(() => { if (props.state !== "putting-together" || props.capture) return; const timer = window.setTimeout(() => destination.current("O-08", "proposal-ready"), 800); return () => window.clearTimeout(timer); }, [props.state, props.capture]);
  useEffect(() => { if (props.state !== "hiring" || props.capture) return; const timer = window.setTimeout(() => { finishMockHire(); destination.current("O-09"); }, 900); return () => window.clearTimeout(timer); }, [props.state, props.capture]);
  const finishRename = (id: EmployeeId) => { if (!renameEmployee(id, draftName)) { setNameError("Names can use letters, spaces, hyphens and apostrophes, up to 20 characters. Pick a different name if it is already on your team."); props.onDestination("O-08", "name-not-allowed"); return; } setRenaming(null); setNameError(""); };
  return <div className="run-stack"><div className="run-scout"><Avatar name="Scout" size="small" /><p>Here's the team I'd start with for Lerato Designs.</p></div>
    {props.state === "putting-together" && <RunNotice>Putting your team together.</RunNotice>}
    {(props.state === "only-scout" || selected.length === 1) && <RunNotice>Scout can still help on its own, but most work needs the team.</RunNotice>}
    {props.state === "one-hire-failed" && <RunNotice kind="warning">I couldn't hire Sipho yet. The others can carry on. Try again.</RunNotice>}
    {props.state === "offline" && <RunNotice kind="warning">Connect to the internet to hire your team.</RunNotice>}
    {nameError && <RunNotice kind="warning">{nameError}</RunNotice>}
    <div className="run-team-grid">{firstRunEmployees.map((employee) => <div key={employee.id} className={firstRun.teamSelected[employee.id] ? "run-team-card" : "run-team-card unselected"}><div className="run-team-top"><Avatar name={employee.id} size="small" /><div>{renaming === employee.id ? <input aria-label={`New name for ${employee.id}`} value={draftName} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") finishRename(employee.id); }} onBlur={() => finishRename(employee.id)} /> : <strong>{firstRun.teamNames[employee.id]}</strong>}<small>{employee.role}</small></div>{employee.id !== "Scout" && <label className="run-team-check"><input type="checkbox" aria-label={`Include ${employee.id}`} checked={firstRun.teamSelected[employee.id]} onChange={(event) => chooseEmployee(employee.id, event.target.checked)} /></label>}</div><p>Reports to {employee.id === "Naledi" && !firstRun.teamSelected.Maya ? "Scout" : employee.reportsTo}. First week: {employee.week}</p><div className="run-team-foot"><span>${employee.budget} weekly budget</span><button onClick={() => setWhy(why === employee.id ? null : employee.id)} aria-expanded={why === employee.id}>Why this role? <ChevronDown size={14} aria-hidden="true" /></button></div>{why === employee.id && <p className="run-why">{employee.why}</p>}{employee.id !== "Scout" && <button className="run-rename" onClick={() => { setDraftName(firstRun.teamNames[employee.id]); setRenaming(employee.id); }}>Rename</button>}</div>)}</div>
    <div className="run-total"><strong>Up to ${total} a week.</strong><span>You only pay for what they use.</span></div><p>{firstRun.power === "credits" ? firstRun.pack === 50 ? "Your $50 covers at least 2 weeks." : `Your $${firstRun.pack} credits help cover this team.` : `Your ${firstRun.power === "claude" ? "Claude" : "ChatGPT"} plan powers the team. AI-made images use credits.`}</p><RunNotice>Everything public comes to you as a draft first.</RunNotice>
    {underWeek && <RunNotice kind="warning">Your credits cover about 4 days at these budgets. You can add more now or later. <button className="run-text-link" onClick={() => props.onDestination("O-05")}>Add credits</button></RunNotice>}
    {showNote && <form className="run-form" onSubmit={(event) => { event.preventDefault(); const websiteChange = /website|shopify/i.test(changeNote); if (websiteChange) chooseEmployee("Leo", false); setShowNote(false); props.onNotice(websiteChange ? "The local proposal no longer includes Leo. Scout has not responded." : "Scout has not responded in this local preview. Adjust the team directly above."); }}><label htmlFor="team-change">Tell Scout what to change</label><textarea id="team-change" value={changeNote} onChange={(event) => setChangeNote(event.target.value)} placeholder="I don't need a website person, I'm on Shopify" /><Button type="submit" disabled={!changeNote.trim()}>Send to Scout</Button></form>}
    {props.state === "hiring" ? <RunNotice>Hiring your team. Each employee is getting ready.</RunNotice> : <RunActions primary={underWeek ? "Hire anyway" : "Hire team"} onPrimary={() => props.onDestination("O-08", "hiring")} secondary="Tell Scout what to change" onSecondary={() => setShowNote(!showNote)} disabled={props.state === "offline"} shortcut="Cmd/Ctrl + Enter" />}
    {props.state === "one-hire-failed" && <Button onClick={() => props.onDestination("O-08", "hiring")}>Try again</Button>}
  </div>;
}
