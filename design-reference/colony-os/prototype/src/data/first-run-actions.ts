import { mockStore } from "./mock-store";
import type { EmployeeId } from "./types";
import type { BusinessAnswers, FirstRunSnapshot } from "./first-run-fixtures";

export function saveFirstRun(patch: Partial<FirstRunSnapshot>) {
  mockStore.change((current) => ({ ...current, firstRun: { ...current.firstRun, ...patch } }));
}

export function saveBusinessAnswers(patch: Partial<BusinessAnswers>, question?: number, editingFromSummary?: boolean) {
  mockStore.change((current) => ({
    ...current,
    firstRun: {
      ...current.firstRun,
      ...(question === undefined ? {} : { question }),
      ...(editingFromSummary === undefined ? {} : { editingFromSummary }),
      answers: { ...current.firstRun.answers, ...patch },
    },
  }));
}

export function chooseEmployee(id: EmployeeId, selected: boolean) {
  if (id === "Scout") return;
  mockStore.change((current) => ({
    ...current,
    firstRun: {
      ...current.firstRun,
      teamSelected: { ...current.firstRun.teamSelected, [id]: selected },
    },
  }));
}

export function renameEmployee(id: EmployeeId, name: string) {
  if (id === "Scout") return false;
  const trimmed = name.trim();
  if (!/^[\p{L} '-]{1,20}$/u.test(trimmed)) return false;
  const names = mockStore.get().firstRun.teamNames;
  if (Object.entries(names).some(([otherId, otherName]) => otherId !== id && otherName.toLowerCase() === trimmed.toLowerCase())) return false;
  saveFirstRun({ teamNames: { ...names, [id]: trimmed } });
  return true;
}

export function confirmBusinessProfile() {
  mockStore.change((current) => {
    const a = current.firstRun.answers;
    const link = a.links.find((value) => !value.startsWith("@")) || "";
    return {
      ...current,
      firstRun: { ...current.firstRun, profileConfirmed: true },
      settings: {
        ...current.settings,
        business: {
          ...current.settings.business,
          name: a.name || current.settings.business.name,
          sells: [a.category, a.detail].filter(Boolean).join(". ") || current.settings.business.sells,
          buyers: a.buyers || current.settings.business.buyers,
          where: a.channels.join(", ") || current.settings.business.where,
          website: link || current.settings.business.website,
          city: a.location.split(",")[0] || current.settings.business.city,
          country: a.location.split(",")[1]?.trim() || current.settings.business.country,
        },
      },
    };
  });
}

export function completeMockPayment() {
  mockStore.change((current) => ({
    ...current,
    firstRun: { ...current.firstRun, checkout: "paid", power: "credits" },
    settings: {
      ...current.settings,
      billing: { ...current.settings.billing, balance: current.settings.billing.balance + current.firstRun.pack },
      power: { ...current.settings.power, choice: "credits" },
    },
  }));
}

export function completeMockPlan() {
  mockStore.change((current) => ({
    ...current,
    firstRun: { ...current.firstRun, connectedPlan: true },
    settings: {
      ...current.settings,
      power: { ...current.settings.power, choice: current.firstRun.power, connected: true },
    },
  }));
}

export function finishMockHire() {
  mockStore.change((current) => ({
    ...current,
    firstRun: { ...current.firstRun, teamHired: true },
    team: {
      ...current.team,
      profiles: Object.fromEntries(
        Object.entries(current.team.profiles).map(([id, profile]) => [id, {
          ...profile,
          displayName: current.firstRun.teamNames[id as EmployeeId],
          ...(current.firstRun.teamSelected[id as EmployeeId] ? {} : { lifecycle: "not-hired" }),
        }]),
      ) as typeof current.team.profiles,
    },
  }));
}

export function moveTeamHere() {
  mockStore.change((current) => ({
    ...current,
    firstRun: { ...current.firstRun, movedHere: true },
    settings: {
      ...current.settings,
      running: { ...current.settings.running, computer: "here" },
    },
  }));
}
