import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { Avatar, Button } from "../../components/primitives";
import { EmployeeShell } from "../../components/EmployeeShell";
import { useMock } from "../../data/mock-store";
import { displayName } from "../../data/team-actions";
import { decideDraft } from "../../data/desk-actions";
import type { DeskDraft } from "../../data/desk-types";
import type { EmployeeId } from "../../data/types";
import { CommonContent, type ScreenProps } from "../shared";
export type DeskProps = ScreenProps & { embedded?: boolean; readOnly?: boolean };
export function useDesk(name:EmployeeId,props:DeskProps){
  const data=useMock(),gone=props.readOnly||data.team.profiles[name].retired||props.state==="let-go";
  return{data,actor:props.partner?"Kagiso" as const:"Lerato" as const,offline:props.state==="offline",gone,canChange:!gone&&props.state!=="offline"};
}
export function DeskPage({name,children,...props}:DeskProps&{name:EmployeeId;children:ReactNode}){
  return props.embedded?<div className="simple-desk">{children}</div>:<EmployeeShell {...props} name={name}><div className="simple-desk">{children}</div></EmployeeShell>;
}
export function DetailPage({name,title,back,onBack,children,...props}:DeskProps&{name:EmployeeId;title:string;back:string;onBack:()=>void;children:ReactNode}){
  return <div className="desk-detail"><Button tone="quiet" className="back-link" onClick={onBack}><ArrowLeft size={15}/>{back}</Button><header className="desk-detail-heading"><Avatar name={name}/><div><span className="eyebrow">{displayName(name)+"'s desk"}</span><h1>{title}</h1></div></header><CommonContent state={props.state} onRetry={()=>props.onDestination(location.hash.slice(2).split("?")[0])}>{children}</CommonContent></div>;
}
export function DeskSection({title,aside,children}: {title:string;aside?:ReactNode;children:ReactNode}){
  return <section className="desk-section"><div className="desk-section-title"><h2>{title}</h2>{aside}</div>{children}</section>;
}
export function Choices({label,options,value,onChange}: {label:string;options:string[];value:string;onChange:(v:string)=>void}){
  return <div className="desk-choices" role="group" aria-label={label}>{options.map((option,i)=><button key={option} aria-pressed={value===option} onClick={()=>onChange(option)} onKeyDown={e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();const next=e.key==="Home"?0:e.key==="End"?options.length-1:(i+(e.key==="ArrowLeft"?-1:1)+options.length)%options.length;onChange(options[next]);e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();}}>{option}</button>)}</div>;
}
export function DeskLink({title,detail,onClick}: {title:string;detail?:string;onClick:()=>void}){
  return <button className="desk-link" onClick={onClick}><span><strong>{title}</strong>{detail&&<small>{detail}</small>}</span><ArrowUpRight size={16} aria-hidden="true"/></button>;
}
export function DraftBlock({draft,props,primary,onPrimary,sendActions}: {draft:DeskDraft;props:DeskProps;primary?:string;onPrimary?:()=>void;sendActions?:ReactNode}){
  const {actor,canChange,gone}=useDesk(draft.employee,props),[editing,setEditing]=useState(false),[note,setNote]=useState("");
  const pending=["waiting","changes"].includes(draft.status),id="draft-note-"+draft.id;
  return <article className="desk-draft" data-desk-draft={draft.id}><div className="desk-draft-label"><span>{draft.kind}</span><span>{displayName(draft.employee)}</span></div><h3>{draft.title}</h3><p className="draft-body">{draft.text}</p>{draft.policy&&<Button tone="quiet" onClick={()=>props.onDestination("D-06b",undefined,{policy:draft.policy!.includes("Returns")?"returns":"delivery"})}>Based on: {draft.policy}</Button>}
    {draft.note&&<p className="desk-meta">Changes asked by {draft.actor}: {draft.note}</p>}
    {!pending&&<p className="desk-result"><Check size={13} aria-hidden="true"/>{draft.pendingSent?"Marked as sent. Waiting to send.":draft.status==="approved"?"Approved by "+(draft.actor||"Lerato")+", 10:42":draft.status==="live"?"Live. Approved by "+draft.actor+", 09:12":draft.status==="sent"?"Sent by "+draft.actor+", 10:02":"Declined by "+draft.actor}</p>}
    {editing?<form className="desk-inline-form" onSubmit={e=>{e.preventDefault();if(!canChange||!note.trim())return;decideDraft(draft.id,"changes",actor,note.trim());setEditing(false);props.onNotice("Changes asked.");}}><label htmlFor={id}>Ask for changes on {draft.title}</label><textarea id={id} autoFocus required value={note} onChange={e=>setNote(e.target.value)}/><div className="desk-actions"><Button type="submit" disabled={!canChange}>Send changes</Button><Button tone="quiet" onClick={()=>setEditing(false)}>Cancel</Button></div></form>:pending&&!gone&&<div className="desk-actions"><Button disabled={!canChange} onClick={()=>{if(onPrimary)onPrimary();else{decideDraft(draft.id,"approved",actor);props.onNotice("Approved.");}}}>{primary||"Approve reply"}</Button><Button tone="quiet" disabled={!canChange} onClick={()=>setEditing(true)}>Ask for changes</Button>{draft.employee==="Leo"&&<Button tone="quiet" disabled={!canChange} onClick={()=>{decideDraft(draft.id,"declined",actor);props.onNotice("Declined.");}}>Decline</Button>}</div>}
    {!gone&&draft.status==="approved"&&sendActions}
    {props.state==="offline"&&!gone&&<p className="desk-meta">You can approve when you're back online. Saved text is still available.</p>}
  </article>;
}
export async function copyText(text:string,onNotice:(s:string)=>void,notice="Copied."){
  try{await navigator.clipboard.writeText(text);onNotice(notice);}catch{onNotice("Couldn't copy. Select the text and copy it.");}
}
