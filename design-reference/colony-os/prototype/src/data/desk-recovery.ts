import type { DeskSnapshot } from "./desk-types";
export function reconnectDesks(d:DeskSnapshot):DeskSnapshot {
  const readyIds=new Set(Object.values(d.drafts).filter(x=>x.pendingSent).map(x=>x.id));
  return{...d,drafts:Object.fromEntries(Object.entries(d.drafts).map(([id,x])=>[id,readyIds.has(id)?{...x,pendingSent:false,status:"sent" as const}:x])),
    leads:Object.fromEntries(Object.entries(d.leads).map(([id,l])=>[id,readyIds.has(l.draft)?{...l,stage:l.stage==="New"?"Contacted" as const:l.stage,next:"Follow-up planned for Thursday.",history:l.history.map(h=>({...h,waiting:false}))}:l])),
    customers:Object.fromEntries(Object.entries(d.customers).map(([id,c])=>[id,{...c,waiting:false,status:readyIds.has(c.draft)?c.expectsReply?"Waiting on the customer" as const:"Done" as const:c.status,history:c.history.map(h=>({...h,waiting:false}))}])),
    photos:d.photos.map(p=>({...p,waiting:false}))};
}
