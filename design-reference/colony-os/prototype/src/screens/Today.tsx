import { useState } from "react";
import { ArrowRight, Check, Clock3, X } from "lucide-react";
import { employees } from "../data/fixtures";
import { displayName } from "../data/team-actions";
import { openDeskCount,openDeskDrafts } from "../data/desk-actions";
import { useMock } from "../data/mock-store";
import { openDecisionCards } from "../data/card-queries";
import {
  Avatar,
  Button,
  Empty,
  IconButton,
  SectionHeading,
  StatusChip,
  employeeWithState,
} from "../components/primitives";
import { Composer } from "../components/Composer";
import { CommonContent, isOffline, isPaused, type ScreenProps } from "./shared";
export function Today({
  state,
  partner,
  onDestination,
  renderCard,
  onSend,
}: ScreenProps) {
  const data = useMock();
  const [awayDismissed, setAwayDismissed] = useState(false);
  const first = state === "first-day" || state === "first-open";
  const stopped = state === "scout-stopped" || state === "team-stopped";
  const priority = ["C-09", "C-05", "C-01"];
  const open = openDecisionCards(data)
    .map((card) => card.id)
    .sort((a, b) => {
      const aRank = priority.indexOf(a);
      const bRank = priority.indexOf(b);
      return (aRank < 0 ? priority.length : aRank) - (bRank < 0 ? priority.length : bRank);
    });
  const deskOpen=openDeskDrafts(data),deskCount=openDeskCount(data);
  const planCount = Object.values(data.team.plans).filter((plan) => ["waiting", "changes"].includes(plan.status)).length;
  const decisionCount = open.length + deskCount + planCount;
  const empty = state === "empty" || decisionCount === 0;
  return (
    <div className="today-screen">
      <header className="page-heading">
        <span className="eyebrow">
          {state === "weekend" ? "Sunday, 11 October" : "Monday, 12 October"}
        </span>
        <h1>Good morning, {partner ? "Kagiso" : "Lerato"}.</h1>
      </header>
      <CommonContent state={state} onRetry={() => onDestination("T-01")}>
        <section
          className={"scout-brief " + (stopped ? "stopped" : "")}
          aria-label="Scout's latest brief"
        >
          <Avatar name="Scout" size="large" />
          <div>
            <div className="brief-meta">
              <strong>
                {state === "friday" || state === "weekend"
                  ? "Friday wrap"
                  : state === "before-brief"
                    ? "Thursday's brief"
                    : first
                      ? "Scout"
                      : "Scout · Morning brief"}
              </strong>
              <span>
                {state === "friday" || state === "weekend"
                  ? "Friday, 16:00"
                  : "08:30"}
              </span>
              <Button tone="quiet" onClick={() => onDestination("D-01")}>
                Past briefs
                <ArrowRight size={13} />
              </Button>
              <Button tone="quiet" onClick={() => onDestination("C-19", state === "friday" || state === "weekend" ? "friday" : "new")}>
                Open brief
              </Button>
            </div>
            {stopped ? (
              <>
                <p>
                  {state === "scout-stopped"
                    ? "Scout has stopped. Restart Scout to keep things moving."
                    : "Your team has stopped. Restart it to carry on."}
                </p>
                <Button onClick={() => onDestination("T-01")}>Restart</Button>
              </>
            ) : (
              <p>
                {first ? (
                  `Welcome, Lerato. The team is reading up on ${data.settings.business.name}. Plans usually arrive within the hour.`
                ) : state === "friday" || state === "weekend" ? (
                  "This week: brand kit approved, 5 posts out, 3 boutiques contacted. Next week: carousel and the pop-up flyer. Credits: $9.10 of $19."
                ) : (
                  <>
                    <button
                      className="inline-link"
                      onClick={() => onDestination("C-05")}
                    >
                      Naledi has next week's 5 posts ready
                    </button>
                    , <button className="inline-link" onClick={() => onDestination("C-11")}>Sipho found 12 boutiques</button>, and <button className="inline-link" onClick={() => onDestination("C-09")}>Thabo is still waiting about his order</button>.
                  </>
                )}
              </p>
            )}
          </div>
        </section>
        <SectionHeading
          title="Needs you"
          count={empty || first ? undefined : decisionCount}
          action="See all"
          onAction={() => onDestination("T-05")}
        />
        {isPaused(state) && state.includes("credits") && (
          <div className="inline-warning">
            {partner
              ? "Only Lerato can buy credits"
              : "The team is paused because credits ran out. Buy credits to carry on."}
            <Button onClick={() => onDestination(partner ? "T-01" : "S-02")}>
              {partner ? "Remind Lerato" : "Buy credits"}
            </Button>
          </div>
        )}
        {empty || first ? (
          <div className="quiet-empty">
            <Check size={20} />
            <span>
              {first
                ? "Your first brief arrives tomorrow at 08:30."
                : "Nothing needs you right now."}
            </span>
          </div>
        ) : (
          <div
            className={"today-decisions " + (state === "many" ? "many" : "")}
          >
            {open.slice(0, state === "many" ? 5 : 2).map((id) => (
              <div key={id}>
                {renderCard(
                  id,
                  state === "offline"
                    ? "offline"
                    : isPaused(state)
                      ? "paused"
                      : undefined,
                )}
              </div>
            ))}
            {deskOpen.slice(0,3).map(d=><button className="desk-decision-link" key={d.id} onClick={()=>onDestination(d.route,undefined,{draft:d.id,...(d.target?{[d.route==="D-04a"?"lead":d.route==="D-06a"?"customer":"draft"]:d.target}:{})})}><strong>{d.title}</strong><span>{d.text}</span><small>{displayName(d.employee)} · Waiting on you</small></button>)}
            {data.desks.customers.aisha.decision==="waiting"&&<button className="desk-decision-link" onClick={()=>onDestination("D-06a","needs-decision",{customer:"aisha"})}><strong>Aisha's return</strong><span>Make an exception?</span><small>Grace · Waiting on you</small></button>}
            {open.length === 0 && deskCount === 0 && planCount > 0 && <button className="desk-decision-link" onClick={() => onDestination("T-05", "plans")}><strong>Team plans are ready</strong><span>Review the plans your team is waiting on.</span><small>{planCount} {planCount === 1 ? "plan" : "plans"} · Waiting on you</small></button>}
          </div>
        )}
        {state === "away" && !awayDismissed && (
          <section className="away-note">
            <Clock3 size={20} />
            <div>
              <strong>While you were away</strong>
              <p>
                Your computer was asleep from 21:40 to 07:05. The team has
                caught up.
              </p>
              <Button tone="quiet" onClick={() => onDestination("X-03")}>
                See what caught up
                <ArrowRight size={13} />
              </Button>
            </div>
            <IconButton
              label="Dismiss While you were away"
              onClick={() => setAwayDismissed(true)}
            >
              <X size={15} />
            </IconButton>
          </section>
        )}
        {state === "computer-off" && (
          <p className="inline-warning">
            The team runs on Lerato's MacBook, which is off or asleep.
            Everything waits until it's back on.
          </p>
        )}
        <SectionHeading
          title="Your team"
          action="See the team"
          onAction={() => onDestination("M-01")}
        />
        <div className="today-team">
          {employees
            .filter((e) => !data.team.profiles[e.name].retired)
            .map((e) => {
              const p = employeeWithState(
                e.name,
                isPaused(state)
                  ? state
                  : first
                    ? "first-day"
                    : state === "computer-off"
                      ? "away"
                      : state === "team-stopped"
                        ? "team-stopped"
                        : state === "scout-stopped" && e.name === "Scout"
                          ? "stopped"
                          : "normal",
              );
              return (
                <button
                  className="team-line"
                  key={e.name}
                  onClick={() =>
                    onDestination("M-02", undefined, { employee: e.name })
                  }
                >
                  <Avatar name={e.name} />
                  <span>
                    <strong>
                      {displayName(e.name)}
                      <StatusChip status={p.status} />
                    </strong>
                    <small>
                      {first ? "Getting to know your business" : p.task}
                    </small>
                  </span>
                </button>
              );
            })}
        </div>
        <Composer
          onSend={onSend}
          offline={isOffline(state)}
          paused={isPaused(state)}
        />
      </CommonContent>
    </div>
  );
}
