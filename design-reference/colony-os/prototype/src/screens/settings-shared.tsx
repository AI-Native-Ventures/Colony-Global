import { useState, type ReactNode } from "react";
import { Button, Dialog } from "../components/primitives";
import { updateSettings, updateSettingsPart } from "../data/settings-actions";
import { useMock } from "../data/mock-store";
import type { SettingsSnapshot } from "../data/settings-fixtures";
import type { ScreenProps } from "./shared";

export type SettingsProps = ScreenProps & {
  id: string;
  theme: string;
  platform: string;
  onTextSize: (value: "default" | "large" | "larger") => void;
};

export const sections = [
  ["S-01", "Business profile"],
  ["S-02", "Credits and billing"],
  ["S-03", "How your team is powered"],
  ["S-04", "Connections"],
  ["S-05", "People"],
  ["S-06", "Notifications"],
  ["S-07", "Running"],
  ["S-08", "Account"],
  ["S-09", "Help and updates"],
] as const;

export function savePart<K extends Exclude<keyof SettingsSnapshot, "lastSection">>(
  props: SettingsProps,
  part: K,
  patch: Partial<SettingsSnapshot[K]>,
  message = "Saved.",
) {
  props.onNotice(message, updateSettingsPart(part, patch));
}

export function SettingSection({ title, intro, children, action }: { title: string; intro?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="setting-section">
    <div className="setting-section-heading"><div><h2>{title}</h2>{intro && <p>{intro}</p>}</div>{action}</div>
    {children}
  </section>;
}

export function SettingRow({ label, detail, value, action, children }: { label: string; detail?: string; value?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return <div className="setting-row"><div className="setting-row-copy"><strong>{label}</strong>{detail && <small>{detail}</small>}{children}</div>{value && <span className="setting-row-value">{value}</span>}{action && <span className="setting-row-action">{action}</span>}</div>;
}

export function SettingSwitch({ label, detail, checked, disabled, onChange }: { label: string; detail?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className="setting-switch-row"><span><strong>{label}</strong>{detail && <small>{detail}</small>}</span><input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /></label>;
}

export function SettingField({ label, value, onChange, type = "text", placeholder, disabled, required = false, multiline = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; disabled?: boolean; required?: boolean; multiline?: boolean }) {
  return <label className="setting-field"><span>{label}</span>{multiline ? <textarea className="compact" value={value} placeholder={placeholder} disabled={disabled} required={required} onChange={event => onChange(event.target.value)} /> : <input type={type} value={value} placeholder={placeholder} disabled={disabled} required={required} onChange={(event) => onChange(event.target.value)} />}</label>;
}

export function ConfirmAction({ title, description, confirmLabel, onConfirm, onClose, requireName }: { title: string; description: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; requireName?: string }) {
  const [typed, setTyped] = useState("");
  return <Dialog title={title} onClose={onClose} className="settings-confirm"><div className="settings-confirm-body"><h2>{title}</h2><p>{description}</p>{requireName && <SettingField label={"Type " + requireName + " to confirm"} value={typed} onChange={setTyped} />}
    <div className="button-row"><Button autoFocus onClick={onClose}>Keep things as they are</Button><Button tone="danger" disabled={!!requireName && typed !== requireName} onClick={onConfirm}>{confirmLabel}</Button></div>
  </div></Dialog>;
}

export const useSettings = () => useMock().settings;
export { updateSettings, updateSettingsPart };
