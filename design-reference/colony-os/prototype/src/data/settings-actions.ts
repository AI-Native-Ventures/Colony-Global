import { mockStore } from "./mock-store";
import type { SettingsSnapshot } from "./settings-fixtures";
import type { Person } from "./types";

export function updateSettings(change: (settings: SettingsSnapshot) => SettingsSnapshot) {
  const before = structuredClone(mockStore.get().settings);
  mockStore.change((snapshot) => ({ ...snapshot, settings: change(snapshot.settings) }));
  return () => mockStore.change((snapshot) => ({ ...snapshot, settings: before }));
}

export function updateSettingsPart<K extends Exclude<keyof SettingsSnapshot, "lastSection">>(
  key: K,
  patch: Partial<SettingsSnapshot[K]>,
) {
  return updateSettings((settings) => ({
    ...settings,
    [key]: { ...settings[key], ...patch },
  }));
}

export function rememberSettingsSection(id: string, person: Person) {
  mockStore.change((snapshot) => snapshot.settings.lastSection[person] === id ? snapshot : ({
    ...snapshot,
    settings: { ...snapshot.settings, lastSection: { ...snapshot.settings.lastSection, [person]: id } },
  }));
}
