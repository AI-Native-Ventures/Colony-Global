import { employees } from "../data/fixtures";
import {
  Avatar,
  Button,
  Empty,
  Identity,
  StatusChip,
  employeeWithState,
} from "../components/primitives";
import { CommonContent, type ScreenProps } from "./shared";
import { useMock } from "../data/mock-store";
export function IdentityGallery({ state, onDestination }: ScreenProps) {
  const companyName = useMock().settings.business.name;
  return (
    <div className="identity-screen">
      <header className="page-heading">
        <span className="eyebrow">{companyName}</span>
        <h1>Meet your team.</h1>
        <p>A familiar face for every part of the work.</p>
      </header>
      <CommonContent state={state} onRetry={() => onDestination("G-07")}>
        {state === "empty" ? (
          <Empty text="Your team is getting ready." />
        ) : (
          <div className="identity-gallery">
            {employees.map((e) => {
              const p = employeeWithState(
                e.name,
                state === "working" ? "normal" : state,
              );
              return (
                <section key={e.name}>
                  <button
                    className="portrait-link"
                    onClick={() =>
                      onDestination(
                        "M-02",
                        state === "working" ? "working" : state,
                        { employee: e.name },
                      )
                    }
                  >
                    <Avatar name={e.name} size="hero" />
                    <h2>{e.name}</h2>
                    <p>{e.role}</p>
                  </button>
                  <StatusChip status={p.status} />
                  <p>{p.task}</p>
                  {state === "waiting" && (
                    <Button
                      tone="quiet"
                      onClick={() =>
                        onDestination("T-05", "employee", { employee: e.name })
                      }
                    >
                      {p.waiting} decisions<small>→</small>
                    </Button>
                  )}
                  {state === "stopped" && (
                    <Button
                      onClick={() =>
                        onDestination("M-02", "starting", { employee: e.name })
                      }
                    >
                      Restart
                    </Button>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </CommonContent>
    </div>
  );
}
