import { CardView } from "./CardView";
import { mockStore, useMock } from "../data/mock-store";
import { seedCards } from "../data/fixtures";
import { decidePlan, displayName } from "../data/team-actions";
import type { EmployeeId } from "../data/types";
import type { ScreenProps } from "../screens/shared";
export function EmployeePlanCard({
  name,
  form = "inline",
  readOnly = false,
  onClose,
  ...props
}: ScreenProps & {
  name: EmployeeId;
  form?: "inline" | "full";
  readOnly?: boolean;
  onClose?: () => void;
}) {
  const { team } = useMock(),
    p = team.plans[name];
  const { state, partner, onDestination, onNotice } = props;
  const card = {
    ...seedCards["C-03"],
    id: "C-03",
    employeePlan: name,
    employeeBudget: team.profiles[name].budget,
    employeeCredits: name === "Naledi" ? 14 : team.profiles[name].budget * 2,
    title: displayName(name) + "'s plan for 13 to 26 October",
    summary: "More customers and sales each month.",
    from: name,
    status:
      !p.reviewed && state === "waiting"
        ? ("waiting" as const)
        : p.status === "not-ready"
          ? ("waiting" as const)
          : p.status,
    history: [
      {
        text:
          p.status === "approved"
            ? "Plan approved"
            : p.status === "changes"
              ? "Changes requested"
              : "Plan ready",
        person: p.actor,
        time: "10:42",
      },
    ],
    note: p.note,
  };
  const forced =
    ["waiting", "changes"].includes(state) && !p.reviewed ? state : "normal";
  return (
    <CardView
      card={card}
      state={state === "offline" ? "offline" : forced}
      form={form}
      noteTarget={displayName(name) + "'s plan"}
      partner={partner}
      readOnly={readOnly || p.status === "not-ready"}
      onClose={onClose}
      onOpen={() =>
        onDestination("C-03", undefined, {
          form: "full",
          planEmployee: name,
          employee: name,
          readOnly: readOnly ? "1" : "0",
        })
      }
      onDestination={onDestination}
      onApproveOne={() => {}}
      onBatch={() => {}}
      onAction={(action, note) => {
        if (readOnly || state === "offline") return;
        if (
          action === "Approve" ||
          action === "Approve all" ||
          action === "Send changes"
        ) {
          const before = structuredClone(mockStore.get().team.plans[name]);
          if (
            !decidePlan(
              name,
              action === "Send changes" ? "changes" : "approved",
              partner ? "Kagiso" : "Lerato",
              note || "",
            )
          ) {
            onNotice("This plan was already decided.");
            return;
          }
          onNotice(
            action === "Send changes" ? "Changes asked." : "Plan approved.",
            () =>
              mockStore.change((s) => ({
                ...s,
                team: { ...s.team, plans: { ...s.team.plans, [name]: before } },
              })),
          );
        } else if (action === "Ask Scout")
          onDestination("M-07", undefined, {
            employee: name,
            quote: card.title,
          });
      }}
    />
  );
}
