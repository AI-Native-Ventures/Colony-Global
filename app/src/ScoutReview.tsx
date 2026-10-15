import { ArrowRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AntMark } from "./AntMark";
import {
  type BusinessProfile,
  type Company,
  type ProfileProposalHead,
  type ProvisioningConfig,
  type createCompanyClient,
  sameFullProfile,
} from "./companyClient";
import type {
  ConversationMessage,
  createConversationClient,
} from "./conversationClient";
import {
  scoutSetupChannelId,
  ScoutStartupError,
  startScoutFirstTurn,
} from "./scoutStartup";

type CompanyClient = ReturnType<typeof createCompanyClient>;
type ConversationClient = ReturnType<typeof createConversationClient>;
type Ready = {
  channelId: string;
  scoutPubkey: string;
  messages: ConversationMessage[];
  proposal: ProfileProposalHead | null;
  kickoffAt: number | null;
};

function journalKey(companyId: string, accountPubkey: string, askId: string) {
  return `colony-global-profile-confirm:${companyId}:${accountPubkey}:${askId}`;
}

function recoveredDraft(key: string, proposal: ProfileProposalHead) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 16_384) return null;
    const journal: unknown = JSON.parse(raw);
    if (!journal || typeof journal !== "object" || Array.isArray(journal))
      return null;
    const entry = journal as Record<string, unknown>;
    if (entry.proposalEventId !== proposal.eventId) return null;
    const profile = entry.profile;
    if (!profile || typeof profile !== "object" || Array.isArray(profile))
      return null;
    const draft = profile as Record<string, unknown>;
    if (
      draft.schemaVersion !== 1 ||
      typeof draft.name !== "string" ||
      !draft.name.trim() ||
      typeof draft.timeZone !== "string" ||
      !draft.timeZone.trim()
    )
      return null;
    const strings = [
      "whatYouSell",
      "whoBuys",
      "city",
      "country",
      "website",
      "priceRange",
      "buyLink",
    ];
    const lists = [
      "whereYouSell",
      "links",
      "goals",
      "bestSellers",
      "voiceWords",
    ];
    const objects = {
      contact: ["email", "phone", "whatsapp", "address"],
      invoice: [
        "registeredName",
        "registrationNumber",
        "vatNumber",
        "bankDetails",
      ],
      socialAccounts: ["instagram", "facebook", "tiktok", "linkedin", "x"],
    };
    if (
      Object.keys(draft).some(
        (name) =>
          ![
            "schemaVersion",
            "name",
            "timeZone",
            ...strings,
            ...lists,
            ...Object.keys(objects),
          ].includes(name),
      ) ||
      strings.some(
        (name) => draft[name] != null && typeof draft[name] !== "string",
      ) ||
      lists.some(
        (name) =>
          draft[name] !== undefined &&
          (!Array.isArray(draft[name]) ||
            !(draft[name] as unknown[]).every(
              (item) => typeof item === "string",
            )),
      ) ||
      Object.entries(objects).some(([name, fields]) => {
        const value = draft[name];
        if (value === undefined) return false;
        if (!value || typeof value !== "object" || Array.isArray(value))
          return true;
        const details = value as Record<string, unknown>;
        return (
          Object.keys(details).some((field) => !fields.includes(field)) ||
          fields.some(
            (field) =>
              details[field] != null && typeof details[field] !== "string",
          )
        );
      })
    )
      return null;
    new Intl.DateTimeFormat("en", { timeZone: draft.timeZone });
    return draft as BusinessProfile;
  } catch {
    return null;
  }
}

function listInput(values: string[] | undefined) {
  return (values ?? []).join("\n");
}

function parseList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function ProfileField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <label className="scout-profile-field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={Math.max(2, Math.min(4, value.split("\n").length))}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

/** Owner review of signed Scout output. This screen never authors Scout copy. */
export function ScoutReview({
  company,
  accountPubkey,
  accountRelayHttpUrl,
  profile,
  config,
  companyClient,
  conversations,
  onOpenConversation,
  onProfileSaved,
  onSetupPower,
}: {
  company: Company;
  accountPubkey: string;
  accountRelayHttpUrl: string;
  profile: BusinessProfile;
  config: ProvisioningConfig;
  companyClient: CompanyClient;
  conversations: ConversationClient;
  onOpenConversation: (channelId: string, threadRootId?: string) => void;
  onProfileSaved: (profile: BusinessProfile) => void;
  onSetupPower: () => void;
}) {
  const [ready, setReady] = useState<Ready | null>(null);
  const [draft, setDraft] = useState<BusinessProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "ready" | "error">(
    "loading",
  );
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startNotice, setStartNotice] = useState("");
  const generation = useRef(0);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const channels = await conversations.list();
      const canonicalId = await scoutSetupChannelId(company.id);
      const named = channels.filter((item) => item.name === "Getting started");
      const channel =
        channels.find((item) => item.id === canonicalId) ??
        (named.length === 1 ? named[0] : null);
      if (named.length > 1 && !channels.some((item) => item.id === canonicalId))
        throw new Error("Ambiguous Getting started conversations");
      if (!channel) {
        if (generation.current === request) setStatus("empty");
        return;
      }
      const [members, messages, proposals] = await Promise.all([
        conversations.members(channel.id),
        conversations.timeline(channel.id),
        companyClient.proposalHeads(company, config, channel.id),
      ]);
      if (generation.current !== request) return;
      const scout = members.find(
        (member) => member.isAgent && member.name === "Scout",
      );
      if (!scout) {
        setStatus("empty");
        return;
      }
      const open = proposals.filter(
        (proposal) =>
          proposal.askerPubkey === scout.pubkey && proposal.status === "open",
      );
      if (open.length > 1) throw new Error("More than one profile proposal");
      const kickoff = messages.find(
        (message) =>
          message.pubkey === accountPubkey &&
          message.tags.some(
            (tag) => tag[0] === "colony:setup" && tag[1] === "first-turn",
          ) &&
          message.tags.some(
            (tag) =>
              tag[0] === "client" &&
              tag[1] === `colony-global-scout-first-turn:${company.id}`,
          ) &&
          message.tags.some((tag) => tag[0] === "p" && tag[1] === scout.pubkey),
      );
      const rootId = kickoff?.id ?? open[0]?.threadRootId;
      const replies = rootId
        ? await conversations.replies(channel.id, rootId)
        : [];
      if (generation.current !== request) return;
      const signedMessages = [...messages, ...replies]
        .filter((message) => message.pubkey === scout.pubkey)
        .filter(
          (message, index, all) =>
            all.findIndex((item) => item.id === message.id) === index,
        )
        .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
      const next = {
        channelId: channel.id,
        scoutPubkey: scout.pubkey,
        messages: signedMessages,
        proposal: open[0] ?? null,
        kickoffAt: kickoff?.createdAt ?? null,
      };
      setReady(next);
      if (next.proposal && ready?.proposal?.eventId !== next.proposal.eventId) {
        const saved = recoveredDraft(
          journalKey(company.id, accountPubkey, next.proposal.askId),
          next.proposal,
        );
        setDraft(saved ?? next.proposal.profile);
        setRecovered(saved !== null);
        if (saved)
          setNotice(
            "Your edits were recovered. Review them before finishing confirmation.",
          );
      } else if (!next.proposal) {
        setDraft(null);
        setRecovered(false);
      }
      setStatus("ready");
    } catch {
      if (generation.current === request) setStatus("error");
    }
  }, [
    accountPubkey,
    company,
    companyClient,
    config,
    conversations,
    ready?.proposal?.eventId,
  ]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12_000);
    return () => {
      generation.current++;
      window.clearInterval(timer);
    };
  }, [refresh]);

  function field(key: keyof BusinessProfile, value: string | string[]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function startScout() {
    if (starting || company.role !== "owner") return;
    setStarting(true);
    setStartNotice("");
    try {
      await startScoutFirstTurn({
        company,
        profile,
        accountPubkey,
        accountRelayHttpUrl,
        conversations,
      });
      await refresh();
    } catch (error) {
      setStartNotice(
        error instanceof ScoutStartupError && error.code === "power"
          ? "Scout needs available Colony credits before starting. Add credits, then try again."
          : error instanceof ScoutStartupError && error.code === "connection"
            ? "This computer uses another AI connection. Colony couldn't switch the rest of your team automatically."
            : error instanceof ScoutStartupError && error.code === "scope"
              ? "Your company changed while Scout was starting. Reopen it and try again."
              : "Scout couldn't start. Check the connection and try again.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function confirm() {
    const proposal = ready?.proposal;
    if (
      !proposal ||
      !draft ||
      busyRef.current ||
      !["owner", "admin"].includes(company.role)
    )
      return;
    busyRef.current = true;
    setBusy(true);
    setNotice("");
    const key = journalKey(company.id, accountPubkey, proposal.askId);
    try {
      const current = await companyClient.currentProfile(company, config);
      if (!current) throw new Error("Missing current profile");
      if (
        !sameFullProfile(current.profile, profile) &&
        !sameFullProfile(current.profile, draft)
      )
        throw new Error("The business profile changed during review");
      const journal = JSON.stringify({
        proposalEventId: proposal.eventId,
        profile: draft,
      });
      localStorage.setItem(key, journal);
      const saved = sameFullProfile(current.profile, draft)
        ? current
        : await companyClient.replaceProfile(
            company,
            config,
            draft,
            current.revision,
          );
      if (!sameFullProfile(saved.profile, draft))
        throw new Error("Saved profile differs from the reviewed card");
      await companyClient.resolveProfileProposal(
        company,
        config,
        proposal,
        "approved",
      );
      localStorage.removeItem(key);
      setRecovered(false);
      onProfileSaved(saved.profile);
      setNotice("Your business profile is confirmed.");
      await refresh();
    } catch {
      setNotice(
        "Colony couldn't finish confirming this profile. Your edits are still here. Check the current profile before trying again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function requestChanges() {
    const proposal = ready?.proposal;
    if (
      !proposal ||
      busyRef.current ||
      !["owner", "admin"].includes(company.role)
    )
      return;
    busyRef.current = true;
    setBusy(true);
    setNotice("");
    try {
      await companyClient.resolveProfileProposal(
        company,
        config,
        proposal,
        "rejected",
      );
      localStorage.removeItem(
        journalKey(company.id, accountPubkey, proposal.askId),
      );
      onOpenConversation(ready.channelId, proposal.threadRootId);
    } catch {
      setNotice(
        "Colony couldn't mark this proposal for changes. Try again before continuing the discussion.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const proposal = ready?.proposal;
  return (
    <div className="screen-content scout-review" data-screen-id="O-07">
      <div className="scout-review-heading">
        <div>
          <span className="eyebrow">YOUR COMPANY</span>
          <h1>Today</h1>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Refresh Scout's progress"
          onClick={() => void refresh()}
        >
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>
      {status === "loading" && (
        <output className="quiet-state">Checking Scout's work…</output>
      )}
      {status === "error" && (
        <div className="quiet-state" role="alert">
          <p>Colony couldn't load Scout's work.</p>
          <button
            className="text-button"
            type="button"
            onClick={() => void refresh()}
          >
            Try again
          </button>
        </div>
      )}
      {status === "empty" && (
        <div className="empty-state">
          <span
            className="scout-portrait"
            role="img"
            aria-label="Scout, AI ant"
            data-ant-portrait="Scout"
          />
          <div>
            <h2>Scout has not started here yet</h2>
            <p>
              Colony is still connecting the first employee to this company.
            </p>
            {company.role === "owner" && (
              <div className="scout-start-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={starting}
                  onClick={() => void startScout()}
                >
                  {starting
                    ? "Starting Scout…"
                    : "Start Scout with Colony credits"}
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={onSetupPower}
                >
                  Power your team
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {status === "ready" && ready && (
        <>
          <div
            className="scout-live-messages"
            role="log"
            aria-label="Scout's messages"
          >
            {ready.messages.length === 0 ? (
              <output>
                {ready.kickoffAt
                  ? Date.now() / 1_000 - ready.kickoffAt >= 90
                    ? "Scout is taking longer than expected. Check the connection and retry."
                    : "Waiting for Scout's first reply."
                  : "Scout is ready for the first conversation."}
              </output>
            ) : (
              ready.messages.map((message) => (
                <article key={message.id} className="scout-live-message">
                  <span className="scout-live-ant" aria-hidden="true">
                    <AntMark />
                  </span>
                  <div>
                    <strong>Scout</strong>
                    <p>{message.content}</p>
                  </div>
                </article>
              ))
            )}
          </div>
          {!ready.kickoffAt &&
            ready.messages.length === 0 &&
            company.role === "owner" && (
              <button
                className="primary-button"
                type="button"
                disabled={starting}
                onClick={() => void startScout()}
              >
                {starting
                  ? "Starting Scout…"
                  : "Start Scout with Colony credits"}
              </button>
            )}
          {ready.kickoffAt &&
            ready.messages.length === 0 &&
            Date.now() / 1_000 - ready.kickoffAt >= 90 &&
            company.role === "owner" && (
              <button
                className="text-button"
                type="button"
                disabled={starting}
                onClick={() => void startScout()}
              >
                {starting ? "Checking Scout…" : "Try again"}
              </button>
            )}
          {proposal && draft ? (
            <section
              className="scout-profile-card"
              aria-label="Business profile for review"
            >
              <span className="eyebrow">SCOUT'S PROPOSAL</span>
              <h2>Here's your business as Scout understands it.</h2>
              <p>{proposal.summary}</p>
              <div className="scout-profile-grid">
                <ProfileField
                  label="Business name"
                  value={draft.name}
                  onChange={(value) => field("name", value)}
                />
                <ProfileField
                  label="What you sell"
                  value={draft.whatYouSell ?? ""}
                  onChange={(value) => field("whatYouSell", value)}
                />
                <ProfileField
                  label="Best sellers"
                  multiline
                  value={listInput(draft.bestSellers)}
                  onChange={(value) => field("bestSellers", parseList(value))}
                />
                <ProfileField
                  label="Who buys"
                  value={draft.whoBuys ?? ""}
                  onChange={(value) => field("whoBuys", value)}
                />
                <ProfileField
                  label="Where you sell"
                  multiline
                  value={listInput(draft.whereYouSell)}
                  onChange={(value) => field("whereYouSell", parseList(value))}
                />
                <ProfileField
                  label="Price range"
                  value={draft.priceRange ?? ""}
                  onChange={(value) => field("priceRange", value)}
                />
                <ProfileField
                  label="How you sound"
                  multiline
                  value={listInput(draft.voiceWords)}
                  onChange={(value) => field("voiceWords", parseList(value))}
                />
                <ProfileField
                  label="Goals"
                  multiline
                  value={listInput(draft.goals)}
                  onChange={(value) => field("goals", parseList(value))}
                />
                <ProfileField
                  label="Links"
                  multiline
                  value={listInput(draft.links)}
                  onChange={(value) => field("links", parseList(value))}
                />
                <ProfileField
                  label="City"
                  value={draft.city ?? ""}
                  onChange={(value) => field("city", value)}
                />
                <ProfileField
                  label="Country"
                  value={draft.country ?? ""}
                  onChange={(value) => field("country", value)}
                />
                <ProfileField
                  label="Time zone"
                  value={draft.timeZone}
                  onChange={(value) => field("timeZone", value)}
                />
              </div>
              <div className="scout-profile-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={busy || !["owner", "admin"].includes(company.role)}
                  onClick={() => void confirm()}
                >
                  {busy
                    ? "Confirming…"
                    : recovered
                      ? "Finish confirmation"
                      : "Looks right"}
                </button>
                <button
                  className="text-button"
                  type="button"
                  disabled={busy || !["owner", "admin"].includes(company.role)}
                  onClick={() => void requestChanges()}
                >
                  Change something <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </section>
          ) : (
            <div className="scout-waiting-proposal">
              <output>Scout is working on a profile for you to review.</output>
              <button
                className="text-button"
                type="button"
                onClick={() => onOpenConversation(ready.channelId)}
              >
                Open the conversation{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
      {notice && (
        <p className="conversation-notice" role="alert">
          {notice}
        </p>
      )}
      {startNotice && (
        <p className="conversation-notice" role="alert">
          {startNotice}
        </p>
      )}
    </div>
  );
}
