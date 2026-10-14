import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccountError,
  type Account,
  TERMS_VERSION_WITHOUT_POLICY,
  type createAccountClient,
} from "./accountClient";
import { AntMark } from "./AntMark";
import { getJoinPolicy, type JoinPolicy } from "./bridge";

type Step = "email" | "code";
type PolicyState = "loading" | "ready" | "error";

function failureText(error: unknown, step: Step): string {
  if (!(error instanceof AccountError)) {
    return "We couldn't finish signing in. Try again.";
  }
  switch (error.code) {
    case "invalid_request":
      return step === "email"
        ? "That email doesn't look right. Check it and try again."
        : "Check the six digits and try again.";
    case "invalid_code":
      return error.remainingAttempts === undefined
        ? "That code didn't work. Check it and try again."
        : `That code didn't work. ${error.remainingAttempts} tries left.`;
    case "code_expired":
      return "That code has expired. Send a new code.";
    case "too_many_attempts":
      return "Too many tries. Wait, then request a new code.";
    case "rate_limited":
    case "resend_cooldown":
      return error.retryAfterSecs
        ? `Please wait ${error.retryAfterSecs} ${error.retryAfterSecs === 1 ? "second" : "seconds"}, then try again.`
        : "Please wait a minute, then try again.";
    case "network_error":
      return "Colony isn't answering right now. Check your internet and try again.";
    case "identity_import_failed":
      return "Your code was accepted, but this computer couldn't save your account. Request a new code and try again.";
    default:
      return "We couldn't finish signing in. Try again.";
  }
}

/** Approved O-01/O-02 presentation wired to the account relay and native host. */
export function FirstRun({
  client,
  relayWsUrl,
  relayHttpUrl,
  onAuthenticated,
}: {
  client: ReturnType<typeof createAccountClient>;
  relayWsUrl: string;
  relayHttpUrl: string;
  onAuthenticated: (account: Account) => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [policy, setPolicy] = useState<JoinPolicy | null>(null);
  const [policyState, setPolicyState] = useState<PolicyState>("loading");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const inFlight = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const policyGeneration = useRef(0);

  const loadPolicy = useCallback(async () => {
    const generation = ++policyGeneration.current;
    setPolicyState("loading");
    try {
      const loaded = await getJoinPolicy(relayWsUrl);
      if (policyGeneration.current === generation) {
        setPolicy(loaded);
        setPolicyState("ready");
      }
    } catch {
      if (policyGeneration.current === generation) setPolicyState("error");
    }
  }, [relayWsUrl]);

  useEffect(() => {
    void loadPolicy();
    return () => {
      policyGeneration.current += 1;
    };
  }, [loadPolicy]);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  async function sendCode(resend: boolean) {
    if (
      inFlight.current ||
      offline ||
      policyState !== "ready" ||
      (policy?.ageAttestationRequired && !ageConfirmed) ||
      remaining > 0
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const wait = await client.startEmailSignIn(normalizedEmail);
      setEmail(normalizedEmail);
      setCode("");
      setCooldownUntil(Date.now() + wait * 1000);
      setRemaining(wait);
      setStep("code");
      if (resend) setNotice("Check your email for a new code.");
    } catch (cause) {
      if (cause instanceof AccountError && cause.retryAfterSecs) {
        setCooldownUntil(Date.now() + cause.retryAfterSecs * 1000);
        setRemaining(cause.retryAfterSecs);
      }
      setError(failureText(cause, resend ? "code" : "email"));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function verifyCode(candidate: string) {
    if (inFlight.current || offline || !/^\d{6}$/.test(candidate)) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const account = await client.verifyEmailSignIn(
        email,
        candidate,
        policy?.version ?? TERMS_VERSION_WITHOUT_POLICY,
      );
      onAuthenticated(account);
    } catch (cause) {
      setError(failureText(cause, "code"));
      if (!(cause instanceof AccountError) || cause.code !== "network_error") {
        setCode("");
        window.setTimeout(() => codeInput.current?.focus(), 0);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const legalBase = relayHttpUrl.replace(/\/+$/, "");
  const blocked =
    busy ||
    offline ||
    policyState !== "ready" ||
    remaining > 0 ||
    (policy?.ageAttestationRequired && !ageConfirmed);

  return (
    <div
      className="first-run-frame"
      data-product-ui="colony-global"
      data-screen-id={step === "email" ? "O-01" : "O-02"}
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
          <p>Your AI team, running your business with you.</p>
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
          <div className="first-run-inner">
            {step === "code" && (
              <button
                className="first-run-link back"
                type="button"
                disabled={busy}
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
              >
                <ArrowLeft size={16} aria-hidden="true" /> Back
              </button>
            )}
            <span className="first-run-eyebrow">COLONY</span>
            <h1>{step === "email" ? "Welcome and sign in" : "Email code"}</h1>
            {step === "email" ? (
              <>
                <p className="first-run-lede">
                  A small team to help run the business with you.
                </p>
                {policyState === "loading" && (
                  <output className="first-run-note">Checking sign-in…</output>
                )}
                {policyState === "error" && (
                  <div role="alert" className="first-run-alert">
                    Colony couldn't check its sign-in terms.{" "}
                    <button type="button" onClick={() => void loadPolicy()}>
                      Try again
                    </button>
                  </div>
                )}
                {offline && (
                  <output className="first-run-alert">
                    Connect to the internet to sign in.
                  </output>
                )}
                <form
                  className="first-run-form"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendCode(false);
                  }}
                >
                  <label htmlFor="first-run-email">Email address</label>
                  <input
                    id="first-run-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={busy}
                    required
                  />
                  <button
                    className="primary-button first-run-primary"
                    type="submit"
                    disabled={blocked}
                  >
                    {busy
                      ? "Sending code…"
                      : remaining > 0
                        ? `Try again in ${remaining} ${remaining === 1 ? "second" : "seconds"}`
                        : "Continue with email"}
                    {!busy && <ArrowRight size={17} aria-hidden="true" />}
                  </button>
                </form>
                {policy?.ageAttestationRequired && (
                  <label className="first-run-age">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(event) =>
                        setAgeConfirmed(event.target.checked)
                      }
                    />{" "}
                    I am at least 18 years old.
                  </label>
                )}
                {(policy?.hasTerms || policy?.hasPrivacy) && (
                  <p className="first-run-legal">
                    By continuing, you agree to Colony's{" "}
                    {policy.hasTerms && (
                      <a
                        href={`${legalBase}/api/join-policy/terms`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms
                      </a>
                    )}
                    {policy.hasTerms && policy.hasPrivacy && " and "}
                    {policy.hasPrivacy && (
                      <a
                        href={`${legalBase}/api/join-policy/privacy`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </a>
                    )}
                    .
                  </p>
                )}
                <p className="first-run-help">
                  New and returning people use the same email code.
                </p>
              </>
            ) : (
              <>
                <div className="first-run-mail">
                  <Mail size={24} aria-hidden="true" />
                </div>
                <p className="first-run-lede">
                  We sent a 6-digit code to <strong>{email}</strong>.
                </p>
                {offline && (
                  <output className="first-run-alert">
                    Connect to the internet to check your code.
                  </output>
                )}
                <form
                  className="first-run-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void verifyCode(code);
                  }}
                >
                  <label htmlFor="first-run-code">6-digit code</label>
                  <input
                    ref={codeInput}
                    id="first-run-code"
                    className="first-run-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    aria-describedby="first-run-code-help"
                    value={code}
                    onChange={(event) => {
                      setCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                    }}
                    disabled={busy || offline}
                    required
                  />
                  <small id="first-run-code-help">
                    The code works for 15 minutes. Check your spam folder if
                    it's not there.
                  </small>
                  <button
                    className="primary-button first-run-primary"
                    type="submit"
                    disabled={busy || offline || code.length !== 6}
                  >
                    {busy ? "Checking…" : "Continue"}
                  </button>
                </form>
                <div className="first-run-actions">
                  <button
                    type="button"
                    className="first-run-link"
                    disabled={busy || offline || remaining > 0}
                    onClick={() => void sendCode(true)}
                  >
                    Send a new code
                    {remaining > 0
                      ? ` in ${remaining} ${remaining === 1 ? "second" : "seconds"}`
                      : ""}
                  </button>
                  <button
                    type="button"
                    className="first-run-link"
                    disabled={busy}
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError(null);
                    }}
                  >
                    Use a different email
                  </button>
                </div>
              </>
            )}
            {error && (
              <div role="alert" className="first-run-alert">
                {error}
              </div>
            )}
            {notice && <output className="first-run-notice">{notice}</output>}
          </div>
        </main>
      </div>
    </div>
  );
}
