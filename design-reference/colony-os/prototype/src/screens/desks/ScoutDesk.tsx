import { useState } from "react";
import { Button } from "../../components/primitives";
import { briefs,scoutCalls } from "../../data/desk-fixtures";
import { employeeIds } from "../../data/team-fixtures";
import { displayName } from "../../data/team-actions";
import { Choices,DeskLink,DeskPage,DeskSection,useDesk,type DeskProps } from "./DeskUI";
import { employeeWithState } from "../../components/primitives";
import { openDeskCount } from "../../data/desk-actions";
export function ScoutDesk(props:DeskProps){
  const {state,onDestination,renderCard}=props,{data,gone}=useDesk("Scout",props),[filter,setFilter]=useState("All"),[brief,setBrief]=useState("");
  const first=state==="first-day"||state==="empty";
  return <DeskPage {...props} name="Scout">
    <DeskSection title="Your company plan" aside={<Button tone="quiet" onClick={()=>onDestination("C-03")}>Open plan</Button>}>
      <p className="desk-lead">Launch the spring linen collection and reach 40 orders in October.</p>
      {state==="plan-waiting"?renderCard("C-03","waiting"):<p className="desk-meta">13 to 26 October · Approved by Lerato, 10:42</p>}
      <div className="desk-plan-lines">{employeeIds.filter(n=>n!=="Scout"&&!data.team.profiles[n].retired).map((name,i)=><DeskLink key={name} title={displayName(name)+": "+["spring launch, 2 of 3 ready","3 posts a week, 5 of 6 done","10 boutiques, 6 contacted","spring page, ready for your OK","sale FAQ, done"][i]} onClick={()=>onDestination("M-03",undefined,{employee:name})}/>)}</div>
    </DeskSection>
    <DeskSection title="Decisions to review">
      <DeskLink title="Hire Leo as Website Builder?" detail={"Hire proposal · " + data.cards["C-15"].status} onClick={()=>onDestination("C-15")}/>
      <DeskLink title="Raise Naledi's weekly budget" detail={"Money request · " + data.cards["C-16"].status} onClick={()=>onDestination("C-16")}/>
    </DeskSection>
    <DeskSection title="What Scout handled on its own">
      {first?<p className="desk-meta">When Scout answers something for the team without you, it shows here so you can check.</p>:scoutCalls.map(call=><article className="scout-call" key={call.id}><time>{call.date}</time><h3>{call.question}</h3><p>{call.decision}.</p><p className="desk-meta">{call.why}.</p><div className="desk-actions"><Button tone="quiet" onClick={()=>onDestination("T-03",undefined,{conversation:call.conversation})}>See where it happened</Button>{!gone&&<Button tone="quiet" onClick={()=>onDestination("T-04",undefined,{quote:call.question+". "+call.decision+". "+call.why+".",prefill:"I'd handle this differently. ",scoutCorrection:call.id})}>Not what I'd do</Button>}</div>{data.desks.corrections[call.id]&&<p className="desk-result">Corrected by {data.desks.corrections[call.id].actor}, 11:02</p>}</article>)}
      {!first&&<p className="desk-meta">Not what you'd do? Tell me and I'll remember.</p>}
    </DeskSection>
    <DeskSection title="Brief history" aside={<Choices label="Brief history filter" options={["All","Morning briefs","Friday wraps"]} value={filter} onChange={setFilter}/>}>{first?<p className="desk-meta">Your first morning brief arrives tomorrow at 08:30.</p>:briefs.filter(b=>filter==="All"||b.kind===filter).map(b=><article className="brief-row" key={b.id}><time>{b.date}</time><h3>{b.kind==="Friday wraps"?"Friday wrap":"Morning brief"}</h3><p>{b.text}</p><Button tone="quiet" onClick={()=>setBrief(brief===b.id?"":b.id)}>{brief===b.id?"Close brief":"Open brief"}</Button>{brief===b.id&&<div className="brief-open"><p>{b.text}</p><DeskLink title="Spring launch" detail="See the work mentioned in this brief" onClick={()=>onDestination("T-03",undefined,{conversation:"spring"})}/><Button tone="quiet" onClick={()=>onDestination("C-19")}>Open full brief</Button></div>}</article>)}</DeskSection>
    <DeskSection title="Scout's routines">{data.team.routines.Scout.filter(r=>r.id!=="plan").map(r=><DeskLink key={r.id} title={r.name+", "+r.days.toLowerCase()+" "+r.time} detail={r.on?"On":"Off"} onClick={()=>onDestination("M-04",undefined,{employee:"Scout"})}/>)}</DeskSection>
    <DeskSection title="Team health"><p>{employeeIds.filter(n=>!data.team.profiles[n].retired&&employeeWithState(n,"normal").status==="Working").length} working. {openDeskCount(data)+Object.values(data.team.plans).filter(p=>p.status==="waiting"||p.status==="changes").length+["C-05","C-01"].filter(id=>["waiting","changes","ready"].includes(data.cards[id].status)).length} decisions are waiting on you.</p><div className="desk-actions"><Button tone="quiet" onClick={()=>onDestination("M-01")}>See the team</Button><Button tone="quiet" onClick={()=>onDestination("T-05")}>Needs you</Button></div></DeskSection>
  </DeskPage>;
}
