import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AntMark } from "./AntMark";
import {
  type BusinessProfile,
  type Company,
  CompanyError,
  companySlug,
  type ProvisioningConfig,
  type createCompanyClient,
} from "./companyClient";

type Client = ReturnType<typeof createCompanyClient>;
type Draft = {
  step: number;
  ownerName: string;
  name: string;
  slug: string;
  category: string;
  detail: string;
  buyers: string;
  channels: string[];
  links: string[];
  location: string;
  timeZone: string;
  goals: string[];
  goalText: string;
};

const categories = [
  "Clothing and fashion",
  "Food and drinks",
  "Beauty and wellness",
  "Services",
  "Crafts and gifts",
  "Something else",
];
const channels = [
  "Instagram",
  "Facebook",
  "TikTok",
  "My website",
  "WhatsApp",
  "Markets and pop-ups",
  "My own shop",
  "Other online stores",
];
const goals = [
  "More sales",
  "More followers",
  "A better website",
  "Bulk orders and stockists",
  "Less admin",
];

function defaultDraft(): Draft {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const cityFromZone =
    timeZone === "UTC"
      ? ""
      : (timeZone.split("/").at(-1) ?? "").replace(/_/g, " ");
  return {
    step: 0,
    ownerName: "",
    name: "",
    slug: "",
    category: "",
    detail: "",
    buyers: "",
    channels: [],
    links: [],
    location:
      timeZone === "Africa/Johannesburg"
        ? "Johannesburg, South Africa"
        : cityFromZone,
    timeZone,
    goals: [],
    goalText: "",
  };
}

function inputForStep(draft: Draft, step: number): string {
  if (step === 0) return draft.ownerName;
  if (step === 1) return draft.name;
  if (step === 3) return draft.buyers;
  if (step === 6) return draft.location;
  return "";
}

function selectedForStep(draft: Draft, step: number): string[] {
  if (step === 2) return draft.category ? [draft.category] : [];
  if (step === 4) return draft.channels;
  if (step === 7) return draft.goals;
  return [];
}

function readDraft(key: string): Draft | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    const value = parsed as Partial<Draft>;
    if (
      typeof value.step !== "number" ||
      !Number.isInteger(value.step) ||
      value.step < 0 ||
      value.step > 8 ||
      [
        "ownerName",
        "name",
        "slug",
        "category",
        "detail",
        "buyers",
        "location",
        "timeZone",
        "goalText",
      ].some((key) => typeof value[key as keyof Draft] !== "string") ||
      !Array.isArray(value.channels) ||
      !value.channels.every((item) => typeof item === "string") ||
      !Array.isArray(value.links) ||
      !value.links.every((item) => typeof item === "string") ||
      !Array.isArray(value.goals) ||
      !value.goals.every((item) => typeof item === "string")
    )
      return null;
    return value as Draft;
  } catch {
    return null;
  }
}

function profileFrom(draft: Draft): BusinessProfile {
  const [city, ...country] = draft.location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const links = draft.links.map((link) => link.trim()).filter(Boolean);
  return {
    schemaVersion: 1,
    name: draft.name.trim(),
    timeZone: draft.timeZone,
    whatYouSell: [draft.category, draft.detail].filter(Boolean).join(". "),
    whoBuys: draft.buyers.trim() || null,
    whereYouSell: draft.channels,
    city: city || null,
    country: country.join(", ") || null,
    links,
    website: links.find((link) => /^https?:\/\//i.test(link)) ?? null,
    goals: [...draft.goals, draft.goalText.trim()].filter(Boolean),
  };
}

function problemText(error: unknown): string {
  if (!(error instanceof CompanyError))
    return "I couldn't save your business yet. Try again.";
  switch (error.code) {
    case "not_enabled":
      return "Company setup isn't available here yet. Try again when Colony is ready.";
    case "not_allowed":
      return "This account can't set up a company here. Get help from Colony support.";
    case "limit":
      return "You already run the most companies allowed on Colony. Get help to add another.";
    case "rate_limited":
      return "Too many companies were set up recently. Try again later.";
    case "taken":
      return "That company address is already in use. Try again.";
    case "conflict":
      return "This business profile changed on another computer. Reopen Colony to review it.";
    case "network":
      return "Colony isn't answering right now. Check your internet and try again.";
    default:
      return "I couldn't save your business yet. Try again.";
  }
}

function validName(name: string) {
  return (
    name.trim().length > 0 &&
    name.trim().length <= 120 &&
    ![...name].some((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 32 || code === 127;
    })
  );
}

function validPersonName(name: string) {
  const trimmed = name.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 80 &&
    ![...trimmed].some((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 32 || code === 127;
    })
  );
}

function normalizeLinks(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((raw) => {
      const link = raw.trim();
      if (!link || link.startsWith("@") || /^https?:\/\//i.test(link))
        return link;
      return `https://${link}`;
    })
    .filter(Boolean);
}

function validLinks(links: string[]): boolean {
  return (
    links.length <= 10 &&
    links.every((link) => {
      if (/^@[A-Za-z0-9_.]{1,100}$/.test(link)) return true;
      try {
        const url = new URL(link);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          url.hostname.includes(".") &&
          !url.username &&
          !url.password &&
          link.length <= 500
        );
      } catch {
        return false;
      }
    })
  );
}

/** The approved Scout-led O-03 questions, backed by a server company and profile. */
export function CompanyEntry({
  accountPubkey,
  client,
  config,
  initialCompany,
  onComplete,
}: {
  accountPubkey: string;
  client: Client;
  config: ProvisioningConfig;
  initialCompany: Company | null;
  onComplete: (company: Company, profile: BusinessProfile) => void;
}) {
  const draftPrefix = `colony-global-business-draft:${accountPubkey}:${config.domain}`;
  const newCompanyKey = `${draftPrefix}:new`;
  const storageKey = initialCompany
    ? `${draftPrefix}:${initialCompany.id}`
    : newCompanyKey;
  const [draft, setDraft] = useState(() => {
    const scoped = readDraft(storageKey);
    if (scoped) return scoped;
    const starting = initialCompany ? readDraft(newCompanyKey) : null;
    return starting && initialCompany && starting.slug === initialCompany.slug
      ? starting
      : defaultDraft();
  });
  const [company, setCompany] = useState<Company | null>(initialCompany);
  const [input, setInput] = useState(() => inputForStep(draft, draft.step));
  const [selected, setSelected] = useState<string[]>(() =>
    selectedForStep(draft, draft.step),
  );
  const [detail, setDetail] = useState(() =>
    draft.step === 2 ? draft.detail : draft.step === 7 ? draft.goalText : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [editing, setEditing] = useState(false);
  const flight = useRef<Promise<Company> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  function remember(next: Draft) {
    setDraft(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorageWarning(true);
    }
  }

  async function ensureCompany(candidate: Draft): Promise<Company> {
    if (company) return company;
    if (flight.current) return flight.current;
    const pending = (async () => {
      const existing = (await client.list(config)).find(
        (item) => item.slug === candidate.slug && item.role === "owner",
      );
      if (existing) return existing;
      try {
        return await client.create(config, candidate.slug);
      } catch (cause) {
        // Creation may have committed before the connection dropped.
        const recovered = await client.list(config).catch(() => []);
        const match = recovered.find(
          (item) => item.slug === candidate.slug && item.role === "owner",
        );
        if (match) return match;
        throw cause;
      }
    })();
    flight.current = pending;
    try {
      const created = await pending;
      setCompany(created);
      return created;
    } finally {
      flight.current = null;
    }
  }

  function advance(next: Draft) {
    const nextStep = editing ? 8 : Math.min(next.step + 1, 8);
    remember({ ...next, step: nextStep });
    setEditing(false);
    setInput(inputForStep(next, nextStep));
    setSelected(selectedForStep(next, nextStep));
    setDetail("");
    setError(null);
  }

  function showStep(nextStep: number, isEdit: boolean) {
    remember({ ...draft, step: nextStep });
    setEditing(isEdit);
    setInput(inputForStep(draft, nextStep));
    setSelected(selectedForStep(draft, nextStep));
    setDetail(
      nextStep === 2 ? draft.detail : nextStep === 7 ? draft.goalText : "",
    );
    setError(null);
  }

  function answer() {
    if (busyRef.current) return;
    const step = draft.step;
    const next = { ...draft };
    if (step === 0) {
      if (!validPersonName(input)) {
        setError("Tell me your name to carry on.");
        return;
      }
      next.ownerName = input.trim();
    } else if (step === 1) {
      if (!validName(input)) {
        setError("Enter your business name, up to 120 characters.");
        return;
      }
      next.name = input.trim();
      next.slug = next.slug || companySlug(next.name);
      if (!company) void ensureCompany(next).catch(() => undefined);
    } else if (step === 2) {
      if (!selected[0]) {
        setError("Choose what you sell to carry on.");
        return;
      }
      next.category = selected[0];
      next.detail = detail.trim();
    } else if (step === 3) next.buyers = input.trim();
    else if (step === 4) next.channels = selected;
    else if (step === 5) {
      const links = [...new Set([...draft.links, ...normalizeLinks(input)])];
      if (!validLinks(links)) {
        setError("Use a website link or an @name, or skip for now.");
        return;
      }
      next.links = links;
    } else if (step === 6) {
      if (!input.trim()) {
        setError("Tell me where you're based to carry on.");
        return;
      }
      next.location = input.trim();
    } else if (step === 7) {
      next.goals = selected;
      next.goalText = detail.trim();
    }
    advance(next);
  }

  function addLinks() {
    const links = [...new Set([...draft.links, ...normalizeLinks(input)])];
    if (!input.trim() || !validLinks(links)) {
      setError("Use a website link or an @name, or skip for now.");
      return;
    }
    remember({ ...draft, links });
    setInput("");
    setError(null);
  }

  function skip() {
    advance({
      ...draft,
      ...(draft.step === 3 ? { buyers: "" } : {}),
      ...(draft.step === 4 ? { channels: [] } : {}),
      ...(draft.step === 5 ? { links: [] } : {}),
      ...(draft.step === 7 ? { goals: [], goalText: "" } : {}),
    });
  }

  async function finish() {
    if (busyRef.current || offline) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const target = await ensureCompany(draft);
      await client.ensurePersonName(target, config, draft.ownerName);
      const saved = await client.saveProfile(
        target,
        config,
        profileFrom(draft),
      );
      try {
        localStorage.removeItem(storageKey);
        if (storageKey !== newCompanyKey)
          localStorage.removeItem(newCompanyKey);
      } catch {
        /* Server copy is authoritative. */
      }
      onComplete(target, saved);
    } catch (cause) {
      setError(problemText(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const questions = [
    "What should I call you?",
    `Hi ${draft.ownerName || "there"}, I'm Scout. I'll run your team for you. First, what's your business called?`,
    "Nice. What do you sell?",
    "Who usually buys from you?",
    "Where do you sell today?",
    "Where can I see your business online? Paste your website, or your Instagram, TikTok or Facebook name.",
    "Where are you based?",
    "Last one. What would make the next 3 months a win?",
  ];
  const step = draft.step;
  const multi = step === 4 || step === 7;
  const options =
    step === 2 ? categories : step === 4 ? channels : step === 7 ? goals : [];
  const summary = step === 8;
  const canSkip = [3, 4, 5, 7].includes(step);
  const answerName =
    step === 0
      ? "Your name"
      : step === 1
        ? "Business name"
        : step === 3
          ? "Your customers"
          : step === 5
            ? "Links or @names"
            : "City and country";
  const displayInput = [0, 1, 3, 5, 6].includes(step);

  return (
    <div
      className="first-run-frame"
      data-product-ui="colony-global"
      data-screen-id="O-03"
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="titlebar">
        <span className="titlebar-company">Colony</span>
      </div>
      <div className="first-run-layout">
        <aside className="first-run-rail">
          <div className="first-run-brand">
            <AntMark />
            <strong>Colony</strong>
          </div>
          <p>
            A few things about your business. Then your team can get to work.
          </p>
          <div className="first-run-scout">
            <span
              className="scout-portrait"
              role="img"
              aria-label="Scout, AI ant"
            />
            <span>Scout will guide you.</span>
          </div>
        </aside>
        <main id="main-content" className="first-run-main" tabIndex={-1}>
          <div className="first-run-inner business-entry">
            {step > 0 && (
              <button
                type="button"
                className="first-run-link back"
                disabled={busy}
                onClick={() => showStep(editing ? 8 : step - 1, false)}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Back
              </button>
            )}
            <span className="first-run-eyebrow">YOUR BUSINESS</span>
            <h1>
              {summary
                ? "Here's what I have"
                : "Tell Scout about your business"}
            </h1>
            <p className="business-progress" aria-live="polite">
              {summary ? "Summary" : `${step + 1} of 8`}
            </p>
            <div className="business-scout-line">
              <span
                className="scout-portrait"
                role="img"
                aria-label="Scout, AI ant"
              />
              <p>
                {summary
                  ? `Thanks, ${draft.ownerName}. That's all I need for now. Here's what I have.`
                  : questions[step]}
              </p>
            </div>
            {storageWarning && (
              <p className="first-run-alert" role="alert">
                This computer can't keep your answers if you close Colony. Keep
                this window open until you finish.
              </p>
            )}
            {offline && (
              <output className="first-run-alert">
                Connect to the internet to carry on. Your answers stay here.
              </output>
            )}
            {error && (
              <p className="first-run-alert" role="alert">
                {error}
              </p>
            )}
            {summary ? (
              <>
                <dl className="business-summary">
                  {[
                    ["Your name", draft.ownerName],
                    ["Business", draft.name],
                    [
                      "What you sell",
                      [draft.category, draft.detail].filter(Boolean).join(". "),
                    ],
                    ["Customers", draft.buyers],
                    ["Where you sell", draft.channels.join(", ")],
                    ["Links", draft.links.join(", ")],
                    ["Based in", draft.location],
                    [
                      "Three-month win",
                      [...draft.goals, draft.goalText]
                        .filter(Boolean)
                        .join(", "),
                    ],
                  ].map(([label, value], index) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "Skipped"}</dd>
                      <button
                        type="button"
                        className="first-run-link"
                        onClick={() => showStep(index, true)}
                      >
                        Change {label.toLowerCase()}
                      </button>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  className="primary-button business-continue"
                  disabled={busy || offline}
                  onClick={() => void finish()}
                >
                  {busy ? "Setting up your business…" : "Continue"}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </>
            ) : (
              <form
                className="business-answer"
                onSubmit={(event) => {
                  event.preventDefault();
                  answer();
                }}
              >
                {displayInput && (
                  <>
                    <label htmlFor="business-answer-input">{answerName}</label>
                    <input
                      id="business-answer-input"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      maxLength={step === 1 ? 120 : step === 0 ? 80 : 500}
                      placeholder={
                        step === 5
                          ? "https://yourbusiness.com or @yourbusiness"
                          : undefined
                      }
                    />
                  </>
                )}
                {step === 5 && (
                  <>
                    <button
                      type="button"
                      className="business-option business-add-link"
                      onClick={addLinks}
                    >
                      Add link
                    </button>
                    {draft.links.length > 0 && (
                      <fieldset className="business-links">
                        <legend>Business links</legend>
                        {draft.links.map((link) => (
                          <span key={link}>
                            {link}
                            <button
                              type="button"
                              aria-label={`Remove ${link}`}
                              onClick={() =>
                                remember({
                                  ...draft,
                                  links: draft.links.filter(
                                    (item) => item !== link,
                                  ),
                                })
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </fieldset>
                    )}
                  </>
                )}
                {options.length > 0 && (
                  <fieldset>
                    <legend>{step === 2 ? "Choose one" : "Choose any"}</legend>
                    <div className="business-options">
                      {options.map((option) => {
                        const active = selected.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={active}
                            className={
                              active
                                ? "business-option selected"
                                : "business-option"
                            }
                            onClick={() =>
                              setSelected(
                                multi
                                  ? active
                                    ? selected.filter((item) => item !== option)
                                    : [...selected, option]
                                  : [option],
                              )
                            }
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                {(step === 2 || step === 7) && (
                  <>
                    <label htmlFor="business-detail">
                      {step === 2
                        ? "Tell me a bit more (optional)"
                        : "Something else (optional)"}
                    </label>
                    <input
                      id="business-detail"
                      value={detail}
                      onChange={(event) => setDetail(event.target.value)}
                      maxLength={step === 2 ? 450 : 500}
                    />
                  </>
                )}
                <div className="business-actions">
                  <button type="submit" className="primary-button">
                    {step === 7 ? "Review answers" : "Continue"}
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                  {canSkip && (
                    <button
                      type="button"
                      className="first-run-link"
                      onClick={skip}
                    >
                      Skip for now
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/** A member of several companies chooses the one to open. */
export function CompanyPicker({
  companies,
  onSelect,
  onRetry,
}: {
  companies: { company: Company; name: string; available: boolean }[];
  onSelect: (company: Company) => void;
  onRetry: () => void;
}) {
  return (
    <main className="startup-state" id="main-content">
      <div className="state-panel company-picker">
        <h1>Choose a company</h1>
        <p>Which company do you want to open?</p>
        <div>
          {companies.map(({ company, name, available }) => (
            <button
              key={company.id}
              type="button"
              className="business-option"
              disabled={!available}
              onClick={() => onSelect(company)}
            >
              {name}
            </button>
          ))}
          {companies.some((item) => !item.available) && (
            <button type="button" className="first-run-link" onClick={onRetry}>
              Try loading again
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
