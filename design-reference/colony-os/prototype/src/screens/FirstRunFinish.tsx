import { useEffect, useRef, useState } from "react";
import { Avatar, Button, StatusChip } from "../components/primitives";
import { firstRunEmployees } from "../data/first-run-fixtures";
import { mockStore, useMock } from "../data/mock-store";
import { saveFirstRun } from "../data/first-run-actions";
import { RunActions, RunNotice, type FirstRunProps } from "./first-run-shared";

export function KeepRunning(props: FirstRunProps) {
  const { settings, firstRun } = useMock();
  const [start, setStart] = useState(settings.running.startWithComputer);
  const [awake, setAwake] = useState(settings.running.stayAwake);
  const [notifications, setNotifications] = useState(props.state === "notifications-refused" ? false : firstRun.ownerNotificationPermission);
  const change = (key: "start" | "awake" | "notifications", checked: boolean) => {
    if (key === "start") setStart(checked);
    else if (key === "awake") setAwake(checked);
    else setNotifications(checked);
    if (key === "notifications") saveFirstRun({ ownerNotificationPermission: checked });
    else mockStore.change((current) => ({
      ...current,
      settings: {
        ...current.settings,
        running: { ...current.settings.running, startWithComputer: key === "start" ? checked : current.settings.running.startWithComputer, stayAwake: key === "awake" ? checked : current.settings.running.stayAwake },
      },
    }));
    props.onNotice("Saved for this computer in the local preview.");
  };
  const desktop = props.state === "desktop-computer";
  return <div className="run-stack"><p className="run-feature-line">Your team works on this computer. When it's off or asleep, they pause and catch up when it's back.</p>
    {props.state === "notifications-allowed" && <RunNotice kind="success">Notifications are on.</RunNotice>}
    {props.state === "notifications-refused" && <RunNotice kind="warning">Notifications are off. You'll only see decisions while Colony is open. You can turn them on later in your computer's settings. <button className="run-text-link" onClick={() => props.onDestination("X-20")}>Open settings</button></RunNotice>}
    {props.state === "computer-message" && <RunNotice>Your Mac may tell you Colony will open when it starts. That's this setting.</RunNotice>}
    <div className="run-switches"><label className="run-choice-switch"><span><strong>Open Colony when this computer starts</strong><small>So your team is ready when you are.</small></span><input type="checkbox" checked={start} onChange={(event) => change("start", event.target.checked)} /></label><label className="run-choice-switch"><span><strong>Keep this computer awake{desktop ? "" : " while it's plugged in"}</strong><small>Your team can work while Colony is open.</small></span><input type="checkbox" checked={awake} onChange={(event) => change("awake", event.target.checked)} /></label><label className="run-choice-switch"><span><strong>Let Colony send notifications</strong><small>Decisions find you without filling your day.</small></span><input type="checkbox" checked={notifications} onChange={(event) => change("notifications", event.target.checked)} /></label></div>
    <RunNotice>Closing the window keeps your team working. Colony stays in the {props.platform === "windows" ? "tray near the clock" : "menu bar"}; quit it there to stop your team.</RunNotice>
    <RunActions primary="Continue" onPrimary={() => { if (props.params.get("returnTo") === "T-01") props.onDestination("T-01", props.partner ? "partner" : "normal", props.partner ? { person: "partner" } : {}); else props.onDestination("O-10", "starting"); }} />
  </div>;
}

export function TeamStarting(props: FirstRunProps) {
  const { firstRun, settings } = useMock();
  const destination = useRef(props.onDestination);
  destination.current = props.onDestination;
  const [scoutReady, setScoutReady] = useState(props.state === "ready" || firstRun.teamReady);
  const [allReady, setAllReady] = useState(props.state === "ready" || firstRun.teamReady);
  useEffect(() => {
    if (props.state !== "starting" || props.capture) return;
    const first = window.setTimeout(() => setScoutReady(true), 700);
    const rest = window.setTimeout(() => { setAllReady(true); saveFirstRun({ teamReady: true }); }, 1600);
    return () => { window.clearTimeout(first); window.clearTimeout(rest); };
  }, [props.state, props.capture]);
  useEffect(() => {
    if (!allReady || props.state !== "starting" || props.capture) return;
    const timer = window.setTimeout(() => destination.current("T-01", "first-day"), 1800);
    return () => window.clearTimeout(timer);
  }, [allReady, props.state, props.capture]);
  const team = firstRunEmployees.filter((employee) => firstRun.teamSelected[employee.id]);
  const scoutFailed = props.state === "scout-failed";
  const oneFailed = props.state === "one-failed";
  const blocked = scoutFailed || props.state === "offline" || props.state === "credits-out" || props.state === "plan-limit";
  return <div className="run-stack"><p className="run-feature-line">Your team is getting ready. This takes about a minute.</p>
    {props.state === "slow" && <RunNotice>Taking longer than usual. Your team will keep getting ready while you look around.</RunNotice>}
    {oneFailed && <RunNotice kind="warning">Leo couldn't start. You can try again while the others carry on.</RunNotice>}
    {scoutFailed && <RunNotice kind="warning">Scout couldn't start. Try again, or get help.</RunNotice>}
    {props.state === "credits-out" && <RunNotice kind="warning">Your team is paused because credits ran out. Add credits to carry on.</RunNotice>}
    {props.state === "plan-limit" && <RunNotice kind="warning">Your plan has reached its limit. Use credits or try again later.</RunNotice>}
    {props.state === "offline" && <RunNotice kind="warning">You're offline. Your team starts when you're back.</RunNotice>}
    <div className="run-start-list">{team.map((employee, index) => { const failed = (oneFailed && employee.id === "Leo") || (scoutFailed && employee.id === "Scout"); const ready = !failed && (allReady || index === 0 && scoutReady); return <div key={employee.id}><Avatar name={employee.id} size="small" /><span><strong>{firstRun.teamNames[employee.id]}</strong><small>{employee.id === "Scout" ? "Getting your team ready" : `Reading up on ${settings.business.name}`}</small></span><StatusChip status={failed ? "Stopped" : ready ? "Free" : "Starting"}>{failed ? "Couldn't start" : ready ? "Free" : "Starting"}</StatusChip>{failed && <Button tone="quiet" onClick={() => props.onDestination("O-10", "starting")}>Try again</Button>}</div>; })}</div>
    {scoutFailed && <Button tone="quiet" onClick={() => props.onDestination("S-09")}>Get help</Button>}
    {props.state === "credits-out" && <Button onClick={() => props.onDestination("O-05")}>Add credits</Button>}
    {props.state === "plan-limit" && <Button onClick={() => props.onDestination("O-05")}>Use credits</Button>}
    <RunActions primary="Go to Today" onPrimary={() => { saveFirstRun({ teamReady: true }); props.onDestination("T-01", "first-day"); }} disabled={blocked || !scoutReady && props.state === "starting"} />
  </div>;
}
