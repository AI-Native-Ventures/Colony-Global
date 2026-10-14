import { useState } from "react";
import { ArrowLeft, ArrowUp, Check, Mic, Plus } from "lucide-react";
import { employees } from "../data/fixtures";
import {
  AntMark,
  Avatar,
  Banner,
  Button,
  Empty,
  Identity,
  Loading,
  StatusChip,
} from "../components/primitives";
import { Composer } from "../components/Composer";
import type { ScreenProps } from "./shared";
export function Foundations({
  onDestination,
  renderCard,
  onNotice,
}: ScreenProps) {
  const [voice, setVoice] = useState(false);
  return (
    <div className="foundations-page" data-review-ui>
      <Button tone="quiet" onClick={() => onDestination("review")}>
        <ArrowLeft size={16} />
        Design review
      </Button>
      <header>
        <AntMark />
        <span className="eyebrow">Colony · Foundations</span>
        <h1>
          Warm by nature.
          <br />
          Clear by design.
        </h1>
        <p>
          Manrope, gentle neutrals, deep green and the Colony ant. Generous
          space around the decision, with quiet detail close at hand.
        </p>
      </header>
      <section>
        <h2>Colour, light and dark</h2>
        <div className="token-grid">
          {[
            "canvas",
            "surface",
            "sidebar",
            "ink",
            "muted",
            "line",
            "control-line",
            "accent",
            "accent-soft",
            "warning",
            "warning-ink",
            "danger",
            "focus",
          ].map((token) => (
            <div key={token}>
              <i style={{ background: "var(--" + token + ")" }} />
              <strong>{token}</strong>
              <code>--{token}</code>
            </div>
          ))}
        </div>
        <p>
          Text and controls meet WCAG AA in both themes. Status uses a word and
          a symbol together.
        </p>
      </section>
      <section>
        <h2>Type</h2>
        <div className="type-samples">
          <h1>Good morning, Lerato.</h1>
          <h2>Next week's posts.</h2>
          <h3>One clear decision at a time.</h3>
          <p>Naledi is drafting 3 posts for the spring launch.</p>
          <small>Approved by Lerato, 10:42.</small>
        </div>
        <p>
          Manrope variable, bundled locally. Display 36, heading 32, section 19,
          title 16, body 14, detail 12 pixels at default text size. All text
          uses rem.
        </p>
      </section>
      <section>
        <h2>Space and shape</h2>
        <div className="spacing-scale">
          {[4, 8, 12, 16, 24, 32, 48, 64].map((n) => (
            <div key={n}>
              <i style={{ width: n, height: n }} />
              <span>{n}</span>
            </div>
          ))}
        </div>
        <div className="radius-samples">
          <span>6 / controls</span>
          <span>12 / cards</span>
          <span>18 / composer</span>
          <span>24 / portraits</span>
        </div>
        <p>
          One hairline separates work. Elevation is reserved for menus, dialogs
          and the undo toast.
        </p>
      </section>
      <section>
        <h2>Ant identity</h2>
        <div className="foundation-identities">
          {employees.map((e) => (
            <Identity
              key={e.name}
              person={e}
              size="large"
              onOpen={() =>
                onDestination("M-02", undefined, { employee: e.name })
              }
            />
          ))}
        </div>
        <div className="status-samples">
          {[
            "Starting",
            "Working",
            "Free",
            "Waiting on you",
            "Paused",
            "Stopped",
            "Away",
            "Hiring",
          ].map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </div>
        <p>
          Employees are always ants, including Scout. AI-made labels remain
          visible. People use their own photo or initials and have no status
          chip.
        </p>
      </section>
      <section>
        <h2>Buttons and inputs</h2>
        <div className="button-row">
          <Button tone="primary" onClick={() => onNotice("Approved.")}>
            Approve
          </Button>
          <Button onClick={() => onNotice("Changes asked.")}>
            Ask for changes
          </Button>
          <Button tone="quiet" onClick={() => onNotice("Skipped.")}>
            Skip
          </Button>
          <Button disabled title="You can decide when you're back online.">
            Approve
          </Button>
          <Button tone="danger" onClick={() => onNotice("Declined.")}>
            Decline
          </Button>
        </div>
        <div className="foundation-fields">
          <label>
            Reason (optional)
            <input placeholder="Not before the launch." />
          </label>
          <label>
            Ask for changes
            <textarea placeholder="Slide 3: use the green dress." />
          </label>
          <label>
            Appearance
            <select>
              <option>Match this computer</option>
              <option>Light</option>
              <option>Dark</option>
            </select>
          </label>
        </div>
      </section>
      <section>
        <h2>Message composer and voice note</h2>
        <Composer
          onSend={() => onNotice("Sent.")}
          initial="Can we do something for the spring launch?"
        />
        <p>
          Enter sends. Shift+Enter adds a line. @ names an employee. The
          microphone opens recording, review and transcript states using mock
          input.
        </p>
        <Button onClick={() => setVoice(!voice)}>
          <Mic size={16} />
          {voice ? "Hide" : "Show"} voice note review
        </Button>
        {voice && (
          <div className="foundation-voice">
            <Button
              aria-label="Play voice note"
              onClick={() => void new Audio("./assets/voice-note.wav").play()}
            >
              ▷
            </Button>
            <span className="waveform">▏▎▍▎▏▍▌▎▏▎▍▎▏▍</span>
            <span>0:12</span>
            <p>Can we do something for the spring launch?</p>
          </div>
        )}
      </section>
      <section>
        <h2>Banner and toast</h2>
        <Banner text="You're offline. Your team waits until you're back." />
        <div className="foundation-toast" role="status">
          <Check size={16} />
          Approved.<Button onClick={() => onNotice("Undone.")}>Undo</Button>
          <span>10 seconds</span>
        </div>
        <p>
          One banner at a time. Undo lasts 10 seconds and pauses while hovered
          or focused.
        </p>
      </section>
      <section>
        <h2>Cards</h2>
        <div className="foundation-card">
          {renderCard("C-05", undefined, "inline")}
        </div>
        <Button onClick={() => onDestination("C-05")}>
          Open full viewer
          <ArrowUp size={15} />
        </Button>
        <p>
          The same record, actions and history in both forms. The full viewer
          contains the complete preview, versions and decision history.
        </p>
      </section>
      <section className="foundation-patterns">
        <div>
          <h2>Empty</h2>
          <Empty text="Nothing needs you right now." />
        </div>
        <div>
          <h2>Loading</h2>
          <Loading slow />
        </div>
      </section>
      <section>
        <h2>App frame</h2>
        <p>
          Four areas, one Needs you entry, one line of team status and your own
          identity. Mac traffic lights and Windows window controls use their
          familiar positions.
        </p>
        <Button onClick={() => onDestination("G-01")}>
          Open the app frame
          <ArrowUp size={15} />
        </Button>
      </section>
      <footer>
        Milestone 1. All screens have light and dark variants, responsive checks
        and a visible keyboard focus ring.
      </footer>
    </div>
  );
}
