import { displayName } from "../data/team-actions";
import { openDeskDrafts } from "../data/desk-actions";
import type { EmployeeId } from "../data/types";
import { useState } from "react";
import { Check, ChevronDown, Clock3 } from "lucide-react";
import { useMock } from "../data/mock-store";
import { openDecisionCards } from "../data/card-queries";
import { Button, Empty } from "../components/primitives";
import { CommonContent, isPaused, type ScreenProps } from "./shared";
const filters = [
  "All",
  "Urgent",
  "To post or send",
  "Plans",
  "Money and hiring",
  "From one employee",
];
export function NeedsYou({
  state,
  partner,
  onDestination,
  renderCard,
}: ScreenProps) {
  const initial =
    state === "urgent"
      ? "Urgent"
      : state === "to-post"
        ? "To post or send"
        : state === "plans"
          ? "Plans"
          : state === "money"
            ? "Money and hiring"
            : state === "employee"
              ? "From one employee"
              : "All";
  const [filter, setFilter] = useState(initial);
  const [history, setHistory] = useState(
    state === "history" || state === "history-empty",
  );
  const [person, setPerson] = useState("Everyone");
  const data = useMock();
  const openCards = openDecisionCards(data);
  const openIds = new Set(openCards.map((card) => card.id));
  const selectedEmployee = new URLSearchParams(location.hash.split("?")[1]).get("employee") || "Naledi";
  const deskOpen = openDeskDrafts(data).filter(d=>filter==="All"||filter==="To post or send"&&["Customer reply","Message draft","Website change"].includes(d.kind)||filter==="Urgent"&&d.id==="nomsa-reply"||filter==="From one employee"&&d.employee===selectedEmployee);
  const exceptions = data.desks.customers.aisha.decision==="waiting" && !data.team.profiles.Grace.retired && (filter==="All"||filter==="Urgent"||filter==="From one employee"&&selectedEmployee==="Grace") ? 1 : 0;
  const liveHistory = Object.values(data.cards)
    .filter((card) => !openIds.has(card.id) && !["C-00", "C-19", "C-20"].includes(card.id))
    .map((card) => {
      const last = card.history.at(-1)!;
      return {
        id: card.id,
        state: card.status,
        title: card.title,
        person: last.person,
        text:
          (card.status === "ready" ? "Approved" : last.text) +
          " by " +
          last.person +
          ", " +
          last.time +
          (card.note ? ": " + card.note : ""),
      };
    });
  const decisionHistory = [
    ...Object.values(data.desks.drafts).filter(d=>d.actor && !["waiting","changes"].includes(d.status)).map(d=>({id:"desk/"+d.id,state:d.status,title:d.title,person:d.actor!,text:(d.status==="live"?"Made live":d.status==="sent"?"Marked as sent":d.status==="approved"?"Approved":"Declined")+" by "+d.actor+", 10:42"})),
    ...Object.entries(data.team.plans)
      .filter(([, p]) => p.reviewed)
      .map(([employee, p]) => ({
        id: "plan/" + employee,
        state: p.status,
        title: displayName(employee as EmployeeId) + "'s plan",
        person: p.actor,
        text:
          (p.status === "approved"
            ? "Approved"
            : p.status === "withdrawn"
              ? "Withdrawn"
              : "Changes requested") +
          " by " +
          p.actor +
          (p.note ? ": " + p.note : ""),
      })),
    ...liveHistory,
    ...data.cards["C-05"].history
      .filter((entry) => ["Lerato", "Kagiso"].includes(entry.person) && (entry.text.startsWith("Changes asked") || entry.text === "Use the green dress instead."))
      .map((entry) => ({
        id: "C-05",
        state: "history",
        title: data.cards["C-05"].title,
        person: entry.person,
        text: `Changes asked by ${entry.person}, ${entry.time}: ${entry.text}`,
      })),
  ];
  let ids =
    filter === "Plans"
      ? ["C-03"]
      : filter === "From one employee"
        ? openCards.filter((card) => card.from === selectedEmployee).map((card) => card.id)
        : filter === "Money and hiring"
          ? ["C-15", "C-16"]
          : filter === "Urgent"
            ? ["C-09", "C-18", "C-01"]
            : filter === "To post or send"
              ? openCards.filter((card) => ["ready", "ready-send", "to-post"].includes(card.status)).map((card) => card.id)
              : openCards.map((card) => card.id);
  ids = ids.filter((id) => openIds.has(id));
  if (filter === "All") {
    const priority = ["C-09", "C-18", "C-05", "C-01"];
    ids.sort((a, b) => {
      const aRank = priority.indexOf(a);
      const bRank = priority.indexOf(b);
      return (aRank < 0 ? priority.length : aRank) - (bRank < 0 ? priority.length : bRank);
    });
  }
  const extraPlans = Object.entries(data.team.plans)
    .filter(
      ([employee, p]) =>
        ["waiting", "changes"].includes(p.status) &&
        (["All", "Plans"].includes(filter) ||
          (filter === "From one employee" &&
            employee ===
              (new URLSearchParams(location.hash.split("?")[1]).get(
                "employee",
              ) || "Naledi"))),
    )
    .map(([employee]) => "plan/" + employee);
  ids = [...extraPlans, ...ids];
  const actionable = (id: string) => openIds.has(id);
  const counts = [
    openCards.length + openDeskDrafts(data).length + (data.desks.customers.aisha.decision === "waiting" ? 1 : 0) + Object.values(data.team.plans).filter(p => ["waiting", "changes"].includes(p.status)).length,
    ["C-09", "C-18", "C-01"].filter(actionable).length + (data.desks.customers.aisha.decision === "waiting" ? 1 : 0),
    openCards.filter(card => ["ready", "ready-send", "to-post"].includes(card.status)).length + openDeskDrafts(data).filter(d => ["Customer reply", "Message draft", "Website change"].includes(d.kind)).length,
    Number(actionable("C-03")) + Object.values(data.team.plans).filter(p => ["waiting", "changes"].includes(p.status)).length,
    ["C-15", "C-16"].filter(actionable).length,
    openCards.filter(c => c.from === selectedEmployee).length,
  ];
  const empty = state === "empty" || (!ids.length && !deskOpen.length && !exceptions && !partner);
  return (
    <div className="needs-screen">
      <header className="page-heading needs-heading">
        <span className="eyebrow">{data.settings.business.name}</span>
        <div>
          <h1>Needs you</h1>
          <div className="segmented">
            <button
              className={!history ? "selected" : ""}
              aria-pressed={!history}
              onClick={() => setHistory(false)}
            >
              Open
            </button>
            <button
              className={history ? "selected" : ""}
              aria-pressed={history}
              onClick={() => setHistory(true)}
            >
              History
            </button>
          </div>
        </div>
      </header>
      <CommonContent state={state} onRetry={() => onDestination("T-05")}>
        {history ? (
          <>
            <label className="history-filter">
              Decided by
              <select
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              >
                <option>Everyone</option>
                <option>Lerato</option>
                <option>Kagiso</option>
              </select>
            </label>
            {state === "history-empty" ? (
              <Empty text="Decisions you make show up here." />
            ) : (
              <div className="history-list">
                {decisionHistory
                  .filter(
                    (item) => person === "Everyone" || item.person === person,
                  )
                  .map((item, i) => (
                    <button
                      key={item.id + i}
                      onClick={() =>
                        item.id.startsWith("plan/")
                          ? onDestination("M-03", undefined, {
                              employee: item.id.slice(5),
                            })
                          : item.id.startsWith("desk/") ? (()=>{const d=data.desks.drafts[item.id.slice(5)];onDestination(d.route,undefined,{draft:d.id,...(d.target?{[d.route==="D-04a"?"lead":d.route==="D-06a"?"customer":"draft"]:d.target}:{})});})() : onDestination(item.id, item.state)
                      }
                    >
                      <Check size={18} />
                      <span>
                        <strong>{item.text}</strong>
                        <small>{item.title} · Spring launch</small>
                      </span>
                      <span>12 October</span>
                    </button>
                  ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className="filter-list"
              role="tablist"
              aria-label="Filter decisions"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const index = filters.indexOf(filter);
                  const next =
                    filters[
                      (index +
                        (e.key === "ArrowRight" ? 1 : -1) +
                        filters.length) %
                        filters.length
                    ];
                  setFilter(next);
                  (
                    e.currentTarget.querySelectorAll("button")[
                      filters.indexOf(next)
                    ] as HTMLButtonElement
                  )?.focus();
                }
              }}
            >
              {filters.map((f, i) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={f === filter}
                  tabIndex={f === filter ? 0 : -1}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  <span>
                    {filter === f ? ids.length + deskOpen.length + exceptions : counts[i]}
                  </span>
                </button>
              ))}
            </div>
            {empty ? (
              <Empty text="Nothing needs you right now." />
            ) : (
              <div className="needs-list">
                {ids.map((id, i) => (
                  <div className="needs-list-item" key={id}>
                    {filter === "Urgent" && (
                      <div className="urgency">
                        <Clock3 size={14} />
                        Urgent · Decide by Friday 12:00
                      </div>
                    )}
                    {renderCard(
                      id,
                      state === "two-people"
                        ? "two-people"
                        : state === "offline"
                          ? "offline"
                          : isPaused(state)
                            ? "paused"
                        : undefined,
                    )}
                    <button className="conversation-tag" onClick={() => onDestination("T-03", undefined, { conversation: Object.values(data.topics).find((topic) => topic.title === data.cards[id]?.conversation)?.id || "spring", thread: "card:" + id })}>
                      In {data.cards[id]?.conversation || "Spring launch"} · Open conversation
                    </button>
                  </div>
                ))}
                {!!exceptions&&<button className="desk-decision-link" onClick={()=>onDestination("D-06a","needs-decision",{customer:"aisha"})}><strong>Aisha's return</strong><span>Aisha wants to return a dress she wore once. Your policy says unworn only. Make an exception?</span><small>Grace · Decision waiting on you</small></button>}
                {deskOpen.map(d=><button className="desk-decision-link" key={d.id} onClick={()=>onDestination(d.route,undefined,{draft:d.id,...(d.target?{[d.route==="D-04a"?"lead":d.route==="D-06a"?"customer":"draft"]:d.target}:{})})}><strong>{d.title}</strong><span>{d.text}</span><small>{displayName(d.employee)} · {d.kind} waiting on you</small></button>)}
              </div>
            )}
            {partner && (
              <section className="owner-waiting">
                <h2>Waiting on Lerato</h2>
                {renderCard("C-00", "owner-only")}
              </section>
            )}
          </>
        )}
      </CommonContent>
    </div>
  );
}
