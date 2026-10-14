import { mockStore } from "./mock-store";
import type { MockSnapshot, Person, EmployeeId, Attachment } from "./types";
import type { DeskSnapshot, DraftStatus, LeadStage, Knowledge, Photo } from "./desk-types";
export const deskRoutes: Record<EmployeeId,string> = {Scout:"D-01",Maya:"D-02",Naledi:"D-03",Sipho:"D-04",Leo:"D-05",Grace:"D-06"};
export const deskEmployee = (id: string): EmployeeId => ({"D-01":"Scout","D-02":"Maya","D-03":"Naledi","D-04":"Sipho","D-05":"Leo","D-06":"Grace"}[id.slice(0,4)] || "Naledi") as EmployeeId;
export const openDeskDrafts = (s: MockSnapshot) => Object.values(s.desks.drafts).filter(d=>["waiting","changes"].includes(d.status) && !s.team.profiles[d.employee].retired && !Object.values(s.desks.customers).some(c=>c.draft===d.id&&c.decision==="waiting"));
export const openDeskCount = (s:MockSnapshot) => openDeskDrafts(s).length + Object.values(s.desks.customers).filter(c=>c.decision==="waiting"&&!s.team.profiles.Grace.retired).length;
const change = (fn:(d:DeskSnapshot)=>DeskSnapshot) => mockStore.change(s=>({...s,desks:fn(s.desks)}));
export function decideDraft(id: string,status:DraftStatus,actor:Person,note?:string) {
  const s=mockStore.get(),old=s.desks.drafts[id];
  if (!old || s.team.profiles[old.employee].retired || !["waiting","changes","approved"].includes(old.status)) return false;
  change(d=>({...d,drafts:{...d.drafts,[id]:{...d.drafts[id],status,actor,note}}}));
  return true;
}
export function markDraftSent(id:string,actor:Person,offline=false,ownReply?:string) {
  const s=mockStore.get(),draft=s.desks.drafts[id];
  if(!draft || draft.status!=="approved" || draft.pendingSent || s.team.profiles[draft.employee].retired) return false;
  change(d=>{
    const lead=Object.values(d.leads).find(l=>l.draft===id),customer=Object.values(d.customers).find(c=>c.draft===id);
    const line={id:crypto.randomUUID(),text:ownReply || draft.text,actor,time:"10:02",waiting:offline};
    return {...d,drafts:{...d.drafts,[id]:{...d.drafts[id],status:offline?"approved":"sent",actor,pendingSent:offline,text:ownReply||draft.text}},
      leads:lead?{...d.leads,[lead.id]:{...lead,stage:offline?lead.stage:lead.stage==="New"?"Contacted":lead.stage,next:offline?"Marked as sent. Waiting to send.":"Follow-up planned for Thursday.",due:"Thursday",history:[...lead.history,line]}}:d.leads,
      customers:customer?{...d.customers,[customer.id]:{...customer,status:offline?customer.status:customer.expectsReply?"Waiting on the customer":"Done",waiting:offline,ownReply,history:[...customer.history,line]}}:d.customers};
  });return true;
}
export function setCampaign(id:string,status:DeskSnapshot["campaigns"][string]["status"],actor:Person){
  const old=mockStore.get().desks.campaigns[id];
  if(!old||old.status==="done"||mockStore.get().team.profiles.Maya.retired)return;
  change(d=>({...d,campaigns:{...d.campaigns,[id]:{...d.campaigns[id],status,actor}}}));
}
export function setIdea(id:string,status:"new"|"approved"|"parked",actor:Person){
  change(d=>({...d,ideas:{...d.ideas,[id]:{status,actor}}}));
}
export function saveNumbers(index:number,orders:number,money:number|null,followers:number|null,actor:Person){
  if(!Number.isInteger(orders)||orders<0||[money,followers].some(n=>n!==null&&(!Number.isFinite(n)||n<0))||followers!==null&&!Number.isInteger(followers))return false;
  change(d=>({...d,numbers:d.numbers.map((w,i)=>i===index?{...w,orders,money,followers,actor}:w)}));return true;
}
export function correctScout(id:string,actor:Person,conversation:string,text:string){
  change(d=>({...d,corrections:{...d.corrections,[id]:{actor,conversation,text}}}));
}
export function patchPhoto(id:string,patch:Partial<Photo>){
  const old=mockStore.get().desks.photos.find(p=>p.id===id);
  if(!old||old.ai&&patch.tags?.some(t=>/product/i.test(t)))return false;
  change(d=>({...d,photos:d.photos.map(p=>p.id===id?{...p,...patch}:p)}));return true;
}
export function photoAttachment(p:Photo):Attachment{return{id:p.id,name:p.name,type:p.type,size:0,url:p.url,kind:"image",ai:p.ai};}
export function removePhoto(id:string){
  const photo=mockStore.get().desks.photos.find(p=>p.id===id);if(!photo)return()=>{};
  change(d=>({...d,photos:d.photos.filter(p=>p.id!==id)}));
  return()=>change(d=>({...d,photos:d.photos.some(p=>p.id===id)?d.photos:[photo,...d.photos]}));
}
export function patchLead(id:string,patch:Partial<DeskSnapshot["leads"][string]>){
  change(d=>({...d,leads:{...d.leads,[id]:{...d.leads[id],...patch}}}));
}
export function stageLead(id:string,stage:LeadStage,actor:Person,reason=""){
  change(d=>{const lead=d.leads[id];return{...d,leads:{...d.leads,[id]:{...lead,stage,reason,next:stage==="Won"?"Sipho and Grace are preparing a quote.":stage==="Lost"?"Search adjusted using your reason.":lead.next,history:[...lead.history,{id:crypto.randomUUID(),text:"Moved to "+stage+(reason?": "+reason:""),actor,time:"10:42"}]}}};});
}
export function leadReply(id:string,text:string,actor:Person,image?:string,unreadable=false){
  change(d=>{const lead=d.leads[id],draft=d.drafts[lead.draft];return{...d,
    leads:{...d.leads,[id]:{...lead,stage:unreadable?lead.stage:"Talking",next:unreadable?"Paste the text instead?":"Sipho is drafting the next step.",history:[...lead.history,{id:crypto.randomUUID(),text,actor,time:"10:42",image}]}},
    drafts:unreadable?d.drafts:{...d.drafts,[lead.draft]:{...draft,status:"waiting",text:"Thanks for getting back to us. I can send our spring line sheet and answer your questions.",actor:undefined,note:undefined}}};});
}
export function startWebsite(){change(d=>({...d,website:{...d.website,mode:"building"}}));}
export function publishWebsite(id:string,actor:Person,fail=false){
  const s=mockStore.get(),draft=s.desks.drafts[id];
  if(!draft||s.team.profiles.Leo.retired||s.desks.website.status==="publishing"||!["waiting","changes","approved"].includes(draft.status))return;
  const token=crypto.randomUUID();
  change(d=>({...d,website:{...d.website,status:"publishing",token}}));
  setTimeout(()=>change(d=>{
    if(d.website.token!==token||d.website.status!=="publishing"||mockStore.get().team.profiles.Leo.retired)return d;
    if(fail)return{...d,website:{...d.website,status:"failed"}};
    const old=d.website,version=old.version+1;
    return{...d,drafts:{...d.drafts,[id]:{...d.drafts[id],status:"live",actor}},website:{...old,mode:"live",status:"idle",version,previousVersion:old.version,banner:id==="site-banner"?"Meet your spring linen collection.":old.banner,history:[{id:crypto.randomUUID(),title:d.drafts[id].title,actor,version,previous:old.version,banner:old.banner},...old.history]}};
  }),600);
}
export function undoWebsite(id:string){
  change(d=>{const entry=d.website.history.find(h=>h.id===id);if(!entry||entry.undone||entry.version!==d.website.version)return d;
    return{...d,website:{...d.website,version:entry.previous,banner:entry.banner,status:"idle",token:undefined,history:d.website.history.map(h=>h.id===id?{...h,undone:true}:h)}};
  });
}
export function saveDomain(patch:Partial<DeskSnapshot["website"]["domain"]>){change(d=>({...d,website:{...d.website,domain:{...d.website.domain,...patch}}}));}
export function checkDomain(){
  const token=crypto.randomUUID();saveDomain({phase:"waiting",token});
  setTimeout(()=>change(d=>d.website.domain.token!==token||d.website.domain.phase!=="waiting"?d:{...d,website:{...d.website,domain:{...d.website.domain,phase:"securing"}}}),600);
  setTimeout(()=>change(d=>d.website.domain.token!==token||d.website.domain.phase!=="securing"?d:{...d,website:{...d.website,domain:{...d.website.domain,phase:"connected"}}}),1200);
}
export function patchCustomer(id:string,patch:Partial<DeskSnapshot["customers"][string]>){change(d=>({...d,customers:{...d.customers,[id]:{...d.customers[id],...patch}}}));}
export function setCustomerStatus(id:string,status:DeskSnapshot["customers"][string]["status"]){
  change(d=>{
    const customer=d.customers[id];if(!customer)return d;
    const draft=d.drafts[customer.draft];
    const nextDraft=draft&&status==="Done"&&["waiting","changes","approved"].includes(draft.status)?{...draft,status:"withdrawn" as const}:draft&&status==="To reply"&&draft.status==="withdrawn"?{...draft,status:"waiting" as const,actor:undefined}:draft;
    return {...d,customers:{...d.customers,[id]:{...customer,status}},drafts:nextDraft?{...d.drafts,[customer.draft]:nextDraft}:d.drafts};
  });
}
export function saveKnowledge(item:Knowledge){
  change(d=>({...d,knowledge:d.knowledge.some(k=>k.id===item.id)?d.knowledge.map(k=>k.id===item.id?item:k):[...d.knowledge,item],drafts:{...d.drafts,"site-policy":{...d.drafts["site-policy"],text:"FAQ: "+item.title+". "+item.text,status:"waiting",actor:undefined,note:undefined}}}));
}
export function removeKnowledge(id:string){
  const old=mockStore.get().desks.knowledge.find(k=>k.id===id);if(!old)return()=>{};
  change(d=>({...d,knowledge:d.knowledge.filter(k=>k.id!==id)}));
  return()=>change(d=>({...d,knowledge:d.knowledge.some(k=>k.id===id)?d.knowledge:[...d.knowledge,old]}));
}
