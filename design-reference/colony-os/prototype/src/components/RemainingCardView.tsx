import { useLayoutEffect, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { employee, statusWords } from "../data/fixtures";
import type { Card, CardStatus, Destination } from "../data/types";
import { Avatar, Button, CloseButton, Empty, Loading, StatusChip } from "./primitives";
import { RemainingCardContent } from "./RemainingCardContent";

const terminal: CardStatus[] = ["approved", "declined", "posted", "sent", "live", "expired", "withdrawn", "replaced", "hired", "paid", "fixed", "chosen", "skipped", "undone", "cancelled", "accepted", "not-accepted", "not-now", "read", "shown", "replied", "customer-replied"];
const visibleStatuses = new Set(Object.keys(statusWords));
const stateAliases: Record<string, CardStatus> = { urgent: "waiting", "credits-out": "waiting", "hosting-paused": "waiting", "no-domain": "waiting", "owner-only": "waiting", hosting: "waiting", friday: "new", late: "new", grouped: "shown", "computer-off": "open", "two-people": "approved" };
const conversationIds: Record<string, string> = { "Spring launch": "spring", "Website refresh": "website", "New stockists": "stockists", "Getting started": "gettingStarted", "Customer replies": "customerReplies" };

export function remainingStatus(card: Card, state: string): CardStatus {
  if (state === "waiting" || state === "normal" || state === "partner" || state === "offline" || state === "loading" || state === "loading-slow") return card.status;
  if (stateAliases[state]) return stateAliases[state];
  if (visibleStatuses.has(state) && !(state === "paused" && card.id !== "C-18")) return state as CardStatus;
  return card.status;
}

function actionsFor(card: Card, status: CardStatus, state: string): string[] {
  switch (card.id) {
    case "C-06": return status === "waiting" ? ["Approve", "Ask for changes", "Skip"] : status === "to-film" ? ["Mark as filmed", "Copy script"] : status === "to-post" || status === "missed" ? ["Copy caption", "Open Instagram", "Mark as posted", "Skip"] : status === "posted" ? ["Undo the mark"] : [];
    case "C-07": return status === "waiting" ? ["Use this", "More like this", "None of these", "Save image"] : status === "chosen" ? ["Save image"] : status === "replaced" ? ["Open latest version"] : [];
    case "C-08": return status === "waiting" ? ["Approve", "Ask for changes", "Skip"] : status === "ready-send" ? ["Copy message", "Open your email app", "Save attachments", "Mark as sent"] : status === "sent" ? ["Undo the mark", "Add their reply"] : [];
    case "C-09": return status === "waiting" ? ["Approve", "Ask for changes", "Skip"] : status === "ready-send" ? ["Copy reply", "Open your email app", "Mark as sent"] : status === "sent" ? ["Undo the mark"] : [];
    case "C-10": return status === "waiting" ? ["Make it live", "Ask for changes", "Decline"] : status === "scheduled" ? ["Make it live now", "Cancel"] : status === "failed-live" ? ["Try again"] : status === "live" ? ["See it live", "Undo"] : [];
    case "C-11": return status === "waiting" ? ["Approve chosen", "More like this one", "Decline all"] : [];
    case "C-12": return status === "waiting" ? ["Approve", "Ask for changes", "Decline", "Download PDF", "Copy text"] : ["Download PDF", "Copy text"];
    case "C-13": return status === "waiting" ? ["Approve", "Ask for changes", "Decline", "Download PDF"] : status === "ready-send" ? ["Download PDF", "Copy email text", "Open your email app", "Mark as sent"] : status === "sent" || status === "overdue" ? [state === "quote" ? "Accepted" : "Mark as paid", state === "quote" ? "Not accepted" : "Cancel", "Download PDF"] : ["Download PDF"];
    case "C-14": return status === "waiting" ? ["Approve", "Ask for changes", "Add logo"] : ["Add logo"];
    case "C-15": return status === "waiting" ? ["Hire", "Change name", "Ask for changes", "Not now"] : [];
    case "C-16": return status === "waiting" ? state === "hosting" ? ["Fix billing"] : state === "owner-only" || state === "credits-out" ? ["Buy credits"] : ["Approve", "Change amount", "Decline"] : [];
    case "C-17": return status === "waiting" ? ["Skip this week"] : [];
    case "C-18": return status === "open" || status === "still-failing" ? ["Restart", "Pause", "Tell Scout", ...(status === "still-failing" ? ["Get help"] : [])] : status === "paused" ? ["Tell Scout"] : [];
    case "C-19": return status === "new" ? ["Mark as read", "Reply", "Past briefs"] : ["Reply", "Past briefs"];
    case "C-20": return ["Open website change"];
    default: return [];
  }
}

export function RemainingCardView({ card, state = "normal", form = "inline", partner = false, readOnly = false, offlineOverride = false, onOpen, onClose, onAction, onDestination, business }: {
  card: Card;
  state?: string;
  form?: "inline" | "full";
  partner?: boolean;
  readOnly?: boolean;
  offlineOverride?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onAction: (name: string, value?: string) => void;
  onDestination: Destination;
  business: { registeredName: string; vat: string; banking: string };
}) {
  const full = form === "full";
  const personalRead = card.id === "C-19" && card.readBy?.includes(partner ? "Kagiso" : "Lerato");
  const status = personalRead && ["new", "normal", "partner"].includes(state) ? "read" : remainingStatus(card, state);
  const [editing, setEditing] = useState<string | null>(({note:"Ask for changes","decline-note":"Decline","change-name":"Change name","change-amount":"Change amount","post-link":"Mark as posted","undo-confirm":"Undo"} as Record<string,string>)[state] || null);
  const [note, setNote] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<number[]>(card.selectedOptions || []);
  const [selectedLeads, setSelectedLeads] = useState<number[]>(card.selectedLeads || [0, 1]);
  useLayoutEffect(() => setSelectedOptions(card.selectedOptions || []), [card.selectedOptions]);
  useLayoutEffect(() => setSelectedLeads(card.selectedLeads || [0, 1]), [card.selectedLeads]);
  const [device, setDevice] = useState<"computer" | "phone">("computer");
  const [version, setVersion] = useState(card.version);
  const offline = state === "offline" || offlineOverride;
  const ownerOnly = card.id === "C-16" && ["owner-only", "credits-out", "hosting"].includes(state);
  const partnerBlocked = partner && ownerOnly;
  const closed = terminal.includes(status);
  let actions = actionsFor(card, status, state);
  if (partnerBlocked) actions = ["Remind Lerato"];
  const primary = actions.find(a => !["Copy script", "Copy caption", "Copy message", "Copy reply", "Copy text", "Download PDF", "Open Instagram", "See it live", "Open website change"].includes(a)) || actions[0];
  const run = (name: string) => {
    if (["Ask for changes", "Decline", "Decline all", "None of these", "Not now", "Add their reply", "Change name", "Change amount", "Mark as posted", "Undo", "Get help"].includes(name)) {
      setNote("");
      setEditing(name);
      return;
    }
    if (name === "Use this") onAction(name, selectedOptions.join(","));
    else if (name === "Approve chosen") onAction(name, selectedLeads.join(","));
    else if (name === "Save image") onAction(name, String(selectedOptions[0] ?? 0));
    else if (name === "More like this one") onAction(name, String(selectedLeads[0] ?? 0));
    else onAction(name);
  };
  if (state === "loading" || state === "loading-slow") return <article className={"content-card " + form}><Loading slow={state === "loading-slow"}/></article>;
  if (state === "empty") return <article className={"content-card " + form}><Empty text="Nothing needs you right now."/></article>;
  return <article className={"content-card remaining-card " + form} data-card-id={card.id} data-card-status={status} onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (readOnly || partnerBlocked || offline) return;
      if (editing || card.id === "C-17") { event.currentTarget.querySelector("form")?.requestSubmit(); return; }
      if (primary) run(primary);
    }
  }}>
    <header className="card-header"><div className="card-status-line"><StatusChip status={statusWords[status] || status}/><span className="card-time">{card.arrived}</span>{full && onClose && <CloseButton onClose={onClose}/>}</div><span className="card-type">{card.type}{card.ai && " · AI-made"}</span>{full ? <h1>{card.title}</h1> : <button className="card-title-button" onClick={onOpen}><h3>{card.title}</h3><ArrowRight size={16}/></button>}<p className="card-summary">{card.summary}</p></header>
    {state === "problem" ? <p className="card-notice">Couldn't load this card. Your work is safe. <Button onClick={()=>onAction("Try again")}>Try again</Button></p> : <>
      <div className="card-body"><RemainingCardContent card={card} state={state} status={status} inline={!full} selectedOptions={selectedOptions} onSelectOption={index=>setSelectedOptions(current=>current.includes(index) ? current.filter(i=>i!==index) : [...current,index])} selectedLeads={selectedLeads} onSelectLead={index=>setSelectedLeads(current=>current.includes(index) ? current.filter(i=>i!==index) : [...current,index])} device={device} onDevice={setDevice} onAction={(name,value)=>{if(name === "Remove lead") {try {const {index}=JSON.parse(value||"{}");setSelectedLeads(current=>current.filter(i=>i!==index));}catch{}}onAction(name,value);}} onDestination={onDestination} business={business}/></div>
      <div className="card-provenance"><button className="card-author" onClick={()=>onDestination("M-02",undefined,{employee:card.from})}><Avatar name={card.from} size="small"/><span><strong>{card.from}</strong><small>{employee(card.from).role}</small></span></button><span className="muted">In {card.conversation}</span></div>
      {offline && <p className="card-notice">You can decide when you're back online.</p>}
      {partnerBlocked && <p className="card-notice">Only Lerato can approve this.</p>}
      {state === "two-people" && <p className="card-notice">Kagiso already made this decision at 10:42.</p>}
      {state === "paused" && card.id !== "C-18" && <p className="card-notice">The team will act on this when it resumes.</p>}
      {status !== "waiting" && status !== "open" && status !== "shown" && <p className="decided-line"><Check size={14}/>{statusWords[status]}{card.history.at(-1)?.person && " · " + card.history.at(-1)!.person}{card.note && ": " + card.note}</p>}
      {full && <div className="card-details"><div className="conversation-location"><span>In {card.conversation}</span><Button tone="quiet" onClick={()=>onDestination("T-03",undefined,{conversation:conversationIds[card.conversation] || "spring",thread:"card:"+card.id})}>Open conversation <ArrowRight size={14}/></Button></div>{card.id !== "C-19" && card.id !== "C-20" && <details open={state === "versions" || undefined}><summary>Version {version}<ChevronDown size={15}/></summary><p>Latest version of this {card.type.toLowerCase()}.</p>{version > 1 && <Button tone="quiet" onClick={()=>setVersion(version === card.version ? 1 : card.version)}>{version === card.version ? "View version 1" : "View latest version"}</Button>}{version === 1 && <p>Earlier draft. Changes to this card were kept in its history.</p>}</details>}<details open={state === "history" || undefined}><summary>History <ChevronDown size={15}/></summary>{card.history.map((entry,index)=><p key={index}><strong>{entry.person}</strong> · {entry.time}<br/>{entry.text}</p>)}</details></div>}
      {editing && <form className="card-edit-form" onSubmit={event=>{event.preventDefault();onAction(editing,note);setEditing(null);}}><label htmlFor={"remaining-note-"+card.id}>{editing === "Ask for changes" ? "What should change?" : editing === "Change name" ? "Employee name" : editing === "Change amount" ? "New amount" : editing === "Mark as posted" ? "Post link (optional)" : editing === "Undo" ? "Undo this website change?" : editing === "Get help" ? "Open help with this problem?" : editing === "Add their reply" ? "Paste their reply" : "Reason (optional)"}</label>{editing === "Undo" || editing === "Get help" ? <p>{editing === "Undo" ? "Your website will go back to how it was before this change." : "You'll review what happened before anything is sent to the Colony team."}</p> : editing === "Change name" || editing === "Change amount" || editing === "Mark as posted" ? <input id={"remaining-note-"+card.id} type={editing === "Mark as posted" ? "url" : "text"} value={note} onChange={event=>setNote(event.target.value)} placeholder={editing === "Change name" ? "Leo" : editing === "Change amount" ? "$0.50" : "https://"}/> : <textarea id={"remaining-note-"+card.id} value={note} onChange={event=>setNote(event.target.value)} placeholder={editing === "Ask for changes" ? "What would you like changed?" : "Add a note"}/>}<div className="button-row"><Button type="submit" tone="primary" disabled={(["Ask for changes","Change name","Change amount","Add their reply"].includes(editing) && !note.trim())}>{editing === "Undo" ? "Undo change" : editing === "Mark as posted" ? "Mark as posted" : editing === "Ask for changes" ? "Send changes" : editing === "Get help" ? "Open help" : editing}</Button><Button type="button" onClick={()=>setEditing(null)}>Cancel</Button></div></form>}
      {!readOnly && !editing && actions.length > 0 && <footer className="card-actions">{(full ? actions : actions.slice(0,3)).map((name,index)=><Button key={name} tone={index === 0 ? "primary" : index > 1 ? "quiet" : "secondary"} data-main-action={index === 0 ? "true" : undefined} disabled={(offline && !["Copy script","Copy caption","Copy message","Copy reply","Copy text","Copy email text","Download PDF","Save image","Save attachments"].includes(name)) || name === "Use this" && selectedOptions.length === 0 || name === "Approve chosen" && selectedLeads.length === 0 || state === "credits-out" && name === "More like this" || state === "hosting-paused" && name === "Make it live" || state === "computer-off" && name === "Restart"} aria-describedby={offline ? "remaining-offline-"+card.id : undefined} onClick={()=>run(name)}>{name}</Button>)}{offline && <span className="visually-hidden" id={"remaining-offline-"+card.id}>You can decide when you're back online.</span>}</footer>}
    </>}
  </article>;
}
