import { mockStore } from "./mock-store";
import type {
  EmployeeId,
  EmployeeProfile,
  Person,
  Routine,
  TeamEvent,
} from "./types";
export const displayName = (id: EmployeeId) =>
  mockStore.get().team.profiles[id]?.displayName || id;
const event = (
  employee: EmployeeId,
  text: string,
  actor: Person,
): TeamEvent => ({
  id: crypto.randomUUID(),
  employee,
  text,
  actor,
  category: "Decisions",
});
export function saveProfile(
  id: EmployeeId,
  patch: Partial<EmployeeProfile>,
  actor: Person,
) {
  const before = structuredClone(mockStore.get().team.profiles[id]);
  mockStore.change((s) => ({
    ...s,
    team: {
      ...s.team,
      profiles: {
        ...s.team.profiles,
        [id]: { ...s.team.profiles[id], ...patch, changedBy: actor },
      },
      events: [
        event(id, "Settings updated by " + actor + ".", actor),
        ...s.team.events,
      ].slice(0, 200),
    },
  }));
  return () =>
    mockStore.change((s) => ({
      ...s,
      team: { ...s.team, profiles: { ...s.team.profiles, [id]: before } },
    }));
}
export function rememberTab(id: EmployeeId, tab: string) {
  mockStore.change((s) => ({
    ...s,
    team: {
      ...s.team,
      profiles: { ...s.team.profiles, [id]: { ...s.team.profiles[id], tab } },
    },
  }));
}
export function restartEmployee(
  id: EmployeeId,
  actor: Person,
  computerOff = false,
) {
  const token = crypto.randomUUID();
  saveProfile(
    id,
    {
      lifecycle: computerOff ? "restart-waiting" : "starting",
      restartToken: token,
    },
    actor,
  );
  if (computerOff) return;
  setTimeout(() => {
    const p = mockStore.get().team.profiles[id];
    if (p.restartToken === token && p.lifecycle === "starting" && !p.retired)
      saveProfile(id, { lifecycle: "working" }, actor);
  }, 1800);
}
export function saveRoutine(
  id: EmployeeId,
  routineId: string,
  patch: Partial<Routine>,
  actor: Person,
) {
  const before = structuredClone(
    mockStore.get().team.routines[id].find((r) => r.id === routineId)!,
  );
  mockStore.change((s) => ({
    ...s,
    team: {
      ...s.team,
      routines: {
        ...s.team.routines,
        [id]: s.team.routines[id].map((r) =>
          r.id === routineId ? { ...r, ...patch, changedBy: actor } : r,
        ),
      },
      events: [
        event(id, before.name + " changed by " + actor + ".", actor),
        ...s.team.events,
      ].slice(0, 200),
    },
  }));
  return () =>
    mockStore.change((s) => ({
      ...s,
      team: {
        ...s.team,
        routines: {
          ...s.team.routines,
          [id]: s.team.routines[id].map((r) =>
            r.id === routineId ? before : r,
          ),
        },
      },
    }));
}
export function decidePlan(
  id: EmployeeId,
  status: "approved" | "changes",
  actor: Person,
  note = "",
) {
  const old = mockStore.get().team.plans[id];
  if (old.reviewed || old.status === "withdrawn") return false;
  mockStore.change((s) => ({
    ...s,
    team: {
      ...s.team,
      plans: { ...s.team.plans, [id]: { status, actor, note, reviewed: true } },
      events: [
        event(
          id,
          status === "approved"
            ? "Plan approved by " + actor + "."
            : "Changes requested by " + actor + ": " + note,
          actor,
        ),
        ...s.team.events,
      ].slice(0, 200),
    },
  }));
  return true;
}
export function letGo(id: EmployeeId, actor: Person, cancelHire = false) {
  const before = structuredClone(mockStore.get());
  const affected = Object.entries(before.cards)
    .filter(
      ([, c]) =>
        c.from === id &&
        ["waiting", "changes", "ready", "ready-send"].includes(c.status),
    )
    .map(([key]) => key);
  mockStore.change((s) => ({
    ...s,
    desks: {
      ...s.desks,
      drafts: Object.fromEntries(Object.entries(s.desks.drafts).map(([key,d])=>[key,d.employee===id&&["waiting","changes","approved"].includes(d.status)?{...d,status:"withdrawn" as const,actor}:d])),
      website: id==="Leo"&&s.desks.website.status==="publishing"?{...s.desks.website,status:"idle",token:undefined}:s.desks.website,
    },
    cards: Object.fromEntries(
      Object.entries(s.cards).map(([key, c]) => [
        key,
        affected.includes(key)
          ? {
              ...c,
              status: "withdrawn" as const,
              history: [
                ...c.history,
                {
                  text: "Withdrawn: " + displayName(id) + " left the team",
                  person: actor,
                  time: "10:42",
                },
              ],
            }
          : c,
      ]),
    ),
    team: {
      ...s.team,
      profiles: {
        ...s.team.profiles,
        [id]: {
          ...s.team.profiles[id],
          retired: true,
          lifecycle: "let-go",
          changedBy: actor,
          setup: cancelHire ? "cancelled" : s.team.profiles[id].setup,
        },
      },
      plans: {
        ...s.team.plans,
        [id]: {
          ...s.team.plans[id],
          status: "withdrawn" as const,
          actor,
          reviewed: true,
        },
      },
      routines: {
        ...s.team.routines,
        [id]: s.team.routines[id].map((r) => ({
          ...r,
          on: false,
          changedBy: actor,
        })),
      },
      events: [
        event(
          id,
          (cancelHire ? "Hire cancelled" : "Let go") + " by " + actor + ".",
          actor,
        ),
        ...s.team.events,
      ].slice(0, 200),
    },
  }));
  return () =>
    mockStore.change((s) => ({
      ...s,
      desks: {
        ...s.desks,
        drafts: Object.fromEntries(Object.entries(s.desks.drafts).map(([key,d])=>[key,d.employee===id&&before.desks.drafts[key]?before.desks.drafts[key]:d])),
      },
      cards: {
        ...s.cards,
        ...Object.fromEntries(affected.map((key) => [key, before.cards[key]])),
      },
      team: {
        ...s.team,
        profiles: { ...s.team.profiles, [id]: before.team.profiles[id] },
        plans: { ...s.team.plans, [id]: before.team.plans[id] },
        routines: { ...s.team.routines, [id]: before.team.routines[id] },
      },
    }));
}
