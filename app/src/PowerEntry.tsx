import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AntMark } from "./AntMark";
import { copyStripeCheckout, nativeInvoke, openStripeCheckout } from "./bridge";
import {
  type CreditCatalog,
  type CreditCheckout,
  type CreditIntent,
  type CreditSnapshot,
  CreditsError,
  createCreditsClient,
  openCreditIntent,
} from "./creditsClient";

type Stage = "checking" | "choice" | "packs" | "waiting" | "ready";
type CheckoutAttempt = { key: string; packId: string };

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function problem(cause: unknown) {
  if (cause instanceof CreditsError) {
    if (cause.code === "email_unverified") return "Confirm your email first.";
    if (cause.code === "not_allowed")
      return "This account can't buy credits here. Try signing in again.";
    if (cause.code === "invalid_response")
      return "Colony couldn't verify the payment details. Try again later.";
    if (cause.code === "pending")
      return "A payment is still open. Check it before starting another.";
    if (cause.code === "closed")
      return "That checkout has ended. Check again before starting another.";
  }
  return "Colony isn't answering right now. Check your connection and try again.";
}

function latestIntent(snapshot: CreditSnapshot): CreditIntent | null {
  return (
    [...snapshot.intents].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )[0] ?? null
  );
}

function checkoutStorageKey(
  relayHttpUrl: string,
  accountPubkey: string,
): string {
  return `colony-global-credit-checkout:${new URL(relayHttpUrl).origin}:${accountPubkey}`;
}

function storedCheckoutAttempt(storageKey: string): CheckoutAttempt | null {
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return null;
    const attempt: unknown = JSON.parse(value);
    if (
      typeof attempt !== "object" ||
      attempt === null ||
      !("key" in attempt) ||
      !("packId" in attempt) ||
      typeof attempt.key !== "string" ||
      typeof attempt.packId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(attempt.key) ||
      !/^[a-z0-9-]{1,100}$/.test(attempt.packId)
    )
      return null;
    return { key: attempt.key, packId: attempt.packId };
  } catch {
    return null;
  }
}

/** Approved O-04/O-05 first-run screens backed by the account payment service. */
export function PowerEntry({
  accountPubkey,
  companyName,
  relayHttpUrl,
  onBack,
  storageWarning,
}: {
  accountPubkey: string;
  companyName: string;
  relayHttpUrl: string;
  onBack: () => void;
  storageWarning: boolean;
}) {
  const client = useMemo(
    () => createCreditsClient(relayHttpUrl, accountPubkey),
    [relayHttpUrl, accountPubkey],
  );
  const [stage, setStage] = useState<Stage>("checking");
  const [catalog, setCatalog] = useState<CreditCatalog | null>(null);
  const [snapshot, setSnapshot] = useState<CreditSnapshot | null>(null);
  const [choice, setChoice] = useState<"credits" | "plan">("credits");
  const [selectedPack, setSelectedPack] = useState("");
  const [checkout, setCheckout] = useState<CreditCheckout | null>(null);
  const [explain, setExplain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const storageKey = checkoutStorageKey(relayHttpUrl, accountPubkey);
  const checkoutAttempt = useRef(storedCheckoutAttempt(storageKey));

  const rememberCheckoutAttempt = useCallback(
    (key: string, packId: string) => {
      const attempt = { key, packId };
      checkoutAttempt.current = attempt;
      try {
        localStorage.setItem(storageKey, JSON.stringify(attempt));
      } catch {
        // The server intent history remains the authoritative recovery path.
      }
    },
    [storageKey],
  );

  const forgetCheckoutAttempt = useCallback(() => {
    checkoutAttempt.current = null;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // A stale key cannot cause a charge without a new explicit Pay action.
    }
  }, [storageKey]);

  function showPaymentSnapshot(next: CreditSnapshot) {
    setSnapshot(next);
    const active = openCreditIntent(next);
    if (active) {
      rememberCheckoutAttempt(active.idempotencyKey, active.packId);
      setStage("waiting");
      return;
    }
    const latest = latestIntent(next);
    if (
      latest?.status === "paid" &&
      latest.idempotencyKey === checkoutAttempt.current?.key &&
      next.balanceUsdCents > 0
    ) {
      forgetCheckoutAttempt();
      setStage("ready");
    } else if (
      latest?.status === "paid" &&
      latest.idempotencyKey === checkoutAttempt.current?.key
    ) {
      setStage("waiting");
      setNotice("Payment received. Adding your credits.");
    } else if (
      latest &&
      latest.idempotencyKey === checkoutAttempt.current?.key &&
      ["failed", "cancelled"].includes(latest.status)
    ) {
      forgetCheckoutAttempt();
      setStage("packs");
      setNotice(
        latest?.status === "cancelled"
          ? "You cancelled the payment. Choose a pack to try again."
          : "Payment wasn't finished. Choose a pack to try again.",
      );
      setCheckout(null);
    } else if (checkoutAttempt.current) {
      setStage("waiting");
      setNotice("Checking your earlier checkout. You can retry it safely.");
    } else {
      setStage("packs");
    }
  }

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setError(null);
    setStage("checking");
    try {
      const available = await client.capability();
      if (generation.current !== request) return;
      setCatalog(available);
      if (!available) {
        setSnapshot(null);
        setStage("choice");
        return;
      }
      const current = await client.snapshot();
      if (generation.current !== request) return;
      setSnapshot(current);
      const active = openCreditIntent(current);
      if (active) rememberCheckoutAttempt(active.idempotencyKey, active.packId);
      const latest = latestIntent(current);
      if (
        !active &&
        latest?.status === "paid" &&
        latest.idempotencyKey === checkoutAttempt.current?.key &&
        current.balanceUsdCents === 0
      )
        setNotice("Payment received. Adding your credits.");
      if (
        !active &&
        latest &&
        latest.idempotencyKey === checkoutAttempt.current?.key &&
        ["paid", "failed", "cancelled"].includes(latest.status) &&
        (latest.status !== "paid" || current.balanceUsdCents > 0)
      )
        forgetCheckoutAttempt();
      setSelectedPack(
        (previous) =>
          checkoutAttempt.current?.packId ||
          previous ||
          available.packs.find((pack) => pack.grantUsdCents === 5000)?.id ||
          available.packs[0]?.id ||
          "",
      );
      setStage(active || checkoutAttempt.current ? "waiting" : "choice");
    } catch (cause) {
      if (generation.current !== request) return;
      setCatalog(null);
      setSnapshot(null);
      setError(problem(cause));
      setStage("choice");
    }
  }, [client, forgetCheckoutAttempt, rememberCheckoutAttempt]);

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);

  const pending = snapshot ? openCreditIntent(snapshot) : null;

  async function refreshPayment() {
    if (busyRef.current || offline) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      if (pending) await client.intent(pending.reference);
      const next = await client.snapshot();
      showPaymentSnapshot(next);
    } catch (cause) {
      setError(problem(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (stage !== "waiting" || offline) return;
    let current = true;
    let attempts = 0;
    let timer: number | undefined;
    const poll = async () => {
      if (!current || attempts >= 60) return;
      attempts += 1;
      try {
        const next = await client.snapshot();
        if (!current) return;
        setSnapshot(next);
        const latest = latestIntent(next);
        if (
          !openCreditIntent(next) &&
          latest?.status === "paid" &&
          latest.idempotencyKey === checkoutAttempt.current?.key &&
          next.balanceUsdCents > 0
        ) {
          forgetCheckoutAttempt();
          setStage("ready");
          return;
        }
        if (
          !openCreditIntent(next) &&
          latest &&
          latest.idempotencyKey === checkoutAttempt.current?.key &&
          ["failed", "cancelled"].includes(latest.status)
        ) {
          forgetCheckoutAttempt();
          setStage("packs");
          setCheckout(null);
          setNotice("Payment wasn't finished. Choose a pack to try again.");
          return;
        }
      } catch {
        // The visible manual retry remains available; a bounded later poll can recover.
      }
      if (current && attempts < 60) timer = window.setTimeout(poll, 5_000);
      else if (current)
        setNotice(
          "This is taking longer than usual. Check again when you're ready.",
        );
    };
    timer = window.setTimeout(poll, 5_000);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [stage, offline, client, forgetCheckoutAttempt]);

  async function launch(url: string) {
    try {
      await openStripeCheckout(url);
      setError(null);
    } catch {
      setError("The payment page didn't open. Open it again or copy the link.");
    }
  }

  async function buy() {
    if (busyRef.current || offline || !catalog) return;
    const pack = catalog.packs.find((item) => item.id === selectedPack);
    if (!pack) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const active = snapshot ? openCreditIntent(snapshot) : null;
      const key =
        active?.idempotencyKey ??
        checkoutAttempt.current?.key ??
        crypto.randomUUID();
      const packId =
        active?.packId ?? checkoutAttempt.current?.packId ?? pack.id;
      rememberCheckoutAttempt(key, packId);
      const result = await client.checkout(packId, key);
      const expected = catalog.packs.find((item) => item.id === packId);
      if (
        !expected ||
        result.chargeMinorUnits !== expected.chargeMinorUnits ||
        result.grantUsdCents !== expected.grantUsdCents
      )
        throw new CreditsError("invalid_response");
      setCheckout(result);
      setStage("waiting");
      if (result.authorizationUrl) await launch(result.authorizationUrl);
      const next = await client.snapshot();
      showPaymentSnapshot(next);
    } catch (cause) {
      const recovered = await client.snapshot().catch(() => null);
      if (recovered) showPaymentSnapshot(recovered);
      setError(problem(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function reopen() {
    if (busyRef.current || offline) return;
    const active = pending;
    if (!active && checkout?.authorizationUrl) {
      await launch(checkout.authorizationUrl);
      return;
    }
    const attempt = checkoutAttempt.current;
    if (!active && !attempt) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await client.checkout(
        active?.packId ?? attempt?.packId ?? "",
        active?.idempotencyKey ?? attempt?.key ?? "",
      );
      const expected = catalog?.packs.find(
        (item) => item.id === (active?.packId ?? attempt?.packId),
      );
      if (
        !expected ||
        result.chargeMinorUnits !== expected.chargeMinorUnits ||
        result.grantUsdCents !== expected.grantUsdCents
      )
        throw new CreditsError("invalid_response");
      setCheckout(result);
      if (result.authorizationUrl) await launch(result.authorizationUrl);
      else showPaymentSnapshot(await client.snapshot());
    } catch (cause) {
      const recovered = await client.snapshot().catch(() => null);
      if (recovered) showPaymentSnapshot(recovered);
      setError(problem(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!checkout?.authorizationUrl) return;
    try {
      await copyStripeCheckout(checkout.authorizationUrl);
      setNotice("Copied.");
      setError(null);
    } catch {
      setError("The payment link couldn't be copied. Try opening it again.");
    }
  }

  async function openPolicy(url: string) {
    try {
      await nativeInvoke("plugin:opener|open_url", { url });
    } catch {
      setError("The policy page didn't open. Try again.");
    }
  }

  const screenId = stage === "choice" || stage === "checking" ? "O-04" : "O-05";
  return (
    <div
      className="first-run-frame"
      data-product-ui="colony-global"
      data-screen-id={screenId}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="titlebar">
        <span className="titlebar-company">{companyName} · Colony</span>
      </div>
      <div className="first-run-layout">
        <aside className="first-run-rail">
          <div className="first-run-brand">
            <AntMark />
            <strong>Colony</strong>
          </div>
          <p>Your business is here. Now choose how your team can work.</p>
          <div className="first-run-scout">
            <span
              className="scout-portrait"
              role="img"
              aria-label="Scout, AI ant"
              data-ant-portrait="Scout"
            />
            <span>Scout will guide you.</span>
          </div>
        </aside>
        <main id="main-content" className="first-run-main" tabIndex={-1}>
          <div className="first-run-inner power-entry">
            {stage !== "checking" && stage !== "ready" && (
              <button
                type="button"
                className="first-run-link back"
                disabled={busy}
                onClick={() => {
                  if (stage === "choice") onBack();
                  else if (stage === "packs") setStage("choice");
                  else setStage("choice");
                }}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Back
              </button>
            )}
            <span className="first-run-eyebrow">YOUR TEAM</span>
            <h1>
              {stage === "checking" || stage === "choice"
                ? "Power your team"
                : stage === "ready"
                  ? "Credits are ready"
                  : "Choose your credits"}
            </h1>
            {storageWarning && (
              <p className="first-run-alert" role="alert">
                This computer can't remember this setup step. Keep Colony open
                until you're done.
              </p>
            )}
            {offline && (
              <output className="first-run-alert">
                Connect to the internet to carry on.
              </output>
            )}
            {error && (
              <p className="first-run-alert" role="alert">
                {error}{" "}
                <button type="button" onClick={() => void load()}>
                  Try again
                </button>
              </p>
            )}
            {notice && <output className="first-run-notice">{notice}</output>}
            {stage === "checking" && (
              <output>Checking how your team can be powered.</output>
            )}
            {stage === "choice" && (
              <>
                <p className="first-run-lede">
                  Your team needs AI to think and work. Choose how to power it.
                </p>
                {snapshot && snapshot.balanceUsdCents > 0 && (
                  <output className="first-run-notice">
                    You have {money(snapshot.balanceUsdCents)} in credits.
                  </output>
                )}
                {!catalog && (
                  <output className="first-run-notice">
                    Colony credits aren't ready here yet. Try again later.
                  </output>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!offline && catalog && choice === "credits")
                      setStage(
                        snapshot && snapshot.balanceUsdCents > 0
                          ? "ready"
                          : snapshot && openCreditIntent(snapshot)
                            ? "waiting"
                            : "packs",
                      );
                  }}
                >
                  <fieldset className="power-options">
                    <legend className="sr-only">How to power your team</legend>
                    <label
                      className={`power-option${choice === "credits" ? " selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="power"
                        value="credits"
                        checked={choice === "credits"}
                        onChange={() => setChoice("credits")}
                        disabled={offline || !catalog}
                      />
                      <span>
                        <strong>
                          Colony credits <em>Recommended</em>
                        </strong>
                        <small>
                          Buy credits once and you're done. Nothing else to set
                          up here. You'll choose weekly budgets when team setup
                          is ready.
                        </small>
                        <b>Pay as your team works</b>
                      </span>
                    </label>
                    <label className="power-option disabled">
                      <input
                        type="radio"
                        name="power"
                        value="plan"
                        checked={choice === "plan"}
                        onChange={() => setChoice("plan")}
                        disabled
                      />
                      <span>
                        <strong>Use my ChatGPT or Claude plan</strong>
                        <small>
                          If you already pay for ChatGPT or Claude, your team
                          can use your plan. This connection is being rebuilt.
                          AI-made images still use credits.
                        </small>
                      </span>
                    </label>
                  </fieldset>
                  <button
                    type="button"
                    className="first-run-link power-explain"
                    aria-expanded={explain}
                    onClick={() => setExplain(!explain)}
                  >
                    What are credits?
                  </button>
                  {explain && (
                    <p className="first-run-note">
                      Credits are paid in advance. Employees use them as they
                      work. Colony adds its fee to what the AI costs. Weekly
                      budgets will be part of team setup.
                    </p>
                  )}
                  <p className="first-run-help">
                    You can change this later in Settings.
                  </p>
                  <button
                    type="submit"
                    className="primary-button power-primary"
                    disabled={offline || !catalog}
                  >
                    {snapshot && snapshot.balanceUsdCents > 0
                      ? "Continue"
                      : "Continue to credits"}
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </form>
                {!catalog && (
                  <button
                    type="button"
                    className="first-run-link power-retry"
                    onClick={() => void load()}
                  >
                    Check again
                  </button>
                )}
              </>
            )}
            {stage === "packs" && catalog && (
              <>
                <p className="first-run-lede">
                  Your employees' work and AI-made images use credits.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void buy();
                  }}
                >
                  <fieldset className="power-options">
                    <legend className="sr-only">Choose a credit pack</legend>
                    {catalog.packs.map((pack) => (
                      <label
                        className={`power-option${selectedPack === pack.id ? " selected" : ""}`}
                        key={pack.id}
                      >
                        <input
                          type="radio"
                          name="pack"
                          checked={selectedPack === pack.id}
                          onChange={() => setSelectedPack(pack.id)}
                          disabled={offline || busy}
                        />
                        <span>
                          <strong>
                            {money(pack.chargeMinorUnits)}{" "}
                            {pack.grantUsdCents === 5000 && (
                              <em>Recommended</em>
                            )}
                          </strong>
                          <small>
                            {money(pack.grantUsdCents)} in prepaid credits
                          </small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="first-run-note">
                    You'll pay in your browser. Payments are handled by Stripe;
                    Colony never sees your card.
                  </p>
                  <p className="first-run-note">
                    Credits are currently held in your owner account while
                    company billing is being connected.
                  </p>
                  <p className="first-run-help">
                    Before paying, read the{" "}
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => void openPolicy(catalog.policyUrls.terms)}
                    >
                      credit terms
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() =>
                        void openPolicy(catalog.policyUrls.acceptableUse)
                      }
                    >
                      acceptable use policy
                    </button>
                    .
                  </p>
                  <button
                    type="submit"
                    className="primary-button power-primary"
                    disabled={offline || busy || !selectedPack}
                  >
                    {busy ? "Opening checkout…" : "Pay in browser"}
                    <ExternalLink size={17} aria-hidden="true" />
                  </button>
                </form>
              </>
            )}
            {stage === "waiting" && (
              <>
                <p className="first-run-lede">
                  Finish paying in your browser. We'll bring you back here.
                </p>
                {pending?.status === "uncertain" && (
                  <output className="first-run-notice">
                    We're checking that payment. You won't be charged twice by
                    checking again.
                  </output>
                )}
                <div className="power-link-row">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      offline ||
                      busy ||
                      (!pending &&
                        !checkout?.authorizationUrl &&
                        !checkoutAttempt.current)
                    }
                    onClick={() => void reopen()}
                  >
                    Open the payment page again
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!checkout?.authorizationUrl}
                    onClick={() => void copyLink()}
                  >
                    Copy the payment link
                  </button>
                </div>
                <button
                  type="button"
                  className="primary-button power-primary"
                  disabled={offline || busy}
                  onClick={() => void refreshPayment()}
                >
                  {busy ? "Checking…" : "Check again"}
                </button>
                <button
                  type="button"
                  className="first-run-link power-retry"
                  onClick={() => {
                    setNotice(
                      "Your payment can still finish. Return here to check it.",
                    );
                    setStage("choice");
                  }}
                >
                  Back to choices
                </button>
              </>
            )}
            {stage === "ready" && (
              <>
                <output className="first-run-notice">
                  Your confirmed balance is{" "}
                  {money(snapshot?.balanceUsdCents ?? 0)}.
                </output>
                <p className="first-run-lede">
                  Scout's first setup is still being connected to your team.
                  Your credits will be here when that step is ready.
                </p>
                <button
                  type="button"
                  className="primary-button power-primary"
                  onClick={onBack}
                >
                  View your company <ArrowRight size={17} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
