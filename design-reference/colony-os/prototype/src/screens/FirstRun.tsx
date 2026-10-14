import { CommonRunState, firstRunSteps, RunActions, RunFrame, RunNotice, type FirstRunProps } from "./first-run-shared";
import { Welcome, EmailCode, PartnerJoin, PartnerLoop, WelcomeBack, MovingTeam } from "./FirstRunAccess";
import { YourBusiness, ScoutProfile, MeetTeam } from "./FirstRunBusiness";
import { PowerTeam, BuyCredits, ConnectPlan } from "./FirstRunPower";
import { KeepRunning, TeamStarting } from "./FirstRunFinish";

const descriptions: Record<string, string> = {
  "O-01": "A small team to help run the business with you.",
  "O-03": "Scout will ask a few short questions, one at a time.",
  "O-04": "Choose the way your team will work.",
  "O-08": "You decide who joins your team.",
  "P-01": "Join Lerato Designs and stay close to the work.",
  "N-02": "Move your whole team safely to this computer.",
};

export function FirstRun(props: FirstRunProps) {
  const { id } = props;
  const ownerOnly = /^O-0[3-8]$/.test(id) || id === "O-10" || id === "O-09" && props.params.get("returnTo") !== "T-01";
  const content = props.partner && ownerOnly ? <><RunNotice kind="warning">Lerato is setting up the team. Partners can join once the company is ready.</RunNotice><RunActions primary="See your invite" onPrimary={() => props.onDestination("P-01")} /></>
    : id === "O-01" ? <Welcome {...props} />
    : id === "O-02" ? <EmailCode {...props} />
    : id === "O-03" ? <YourBusiness {...props} />
    : id === "O-04" ? <PowerTeam {...props} />
    : id === "O-05" ? <BuyCredits {...props} />
    : id === "O-06" ? <ConnectPlan {...props} />
    : id === "O-07" ? <ScoutProfile {...props} />
    : id === "O-08" ? <MeetTeam {...props} />
    : id === "O-09" ? <KeepRunning {...props} />
    : id === "O-10" ? <TeamStarting {...props} />
    : id === "P-01" ? <PartnerJoin {...props} />
    : id === "P-01a" ? <PartnerLoop {...props} />
    : id === "N-01" ? <WelcomeBack {...props} />
    : <MovingTeam {...props} />;
  const back = id === "O-02" ? () => props.onDestination("O-01")
    : id === "O-04" ? () => props.onDestination("O-03", "summary")
    : id === "O-05" || id === "O-06" ? () => props.onDestination("O-04")
    : id === "O-08" ? () => props.onDestination("O-07", "profile-ready")
    : id === "N-02" ? () => props.onDestination("N-01")
    : undefined;
  return <RunFrame id={id} title={firstRunSteps.find(([key]) => key === id)?.[1] || "Getting started"} description={descriptions[id]} back={back} platform={props.platform}>
    <CommonRunState props={props}>{content}</CommonRunState>
  </RunFrame>;
}
