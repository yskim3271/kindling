"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, ReadingResult } from "@/lib/agent";
import { money } from "@/lib/format";
import {
  CAUSES,
  KINDS,
  STYLE_LABEL,
  causeById,
  parsePreferences,
  type CauseId,
  type GivingStyle,
  type Preferences,
} from "@/lib/preferences";
import type { Gift, Proposal } from "@/lib/types";
import { PayPalButton } from "./PayPalButton";
import { loadPreferences, savePreferences, saveReadings } from "./patronStore";

type ProposalEvent = Extract<AgentEvent, { type: "proposal" }>;

interface Row {
  proposal: Proposal;
  pitch: ProposalEvent["pitch"];
  gift?: Gift;
  problem?: string | null;
}

/** The form's own state: amounts stay text while they are being typed. */
interface Draft {
  causes: CauseId[];
  note: string;
  style: GivingStyle;
  budget: string;
  cap: string;
  patronName: string;
}

const BLANK: Draft = { causes: [], note: "", style: "complete", budget: "500", cap: "200", patronName: "" };

const EXAMPLE: Draft = {
  causes: ["education", "livelihood"],
  note: "One specific purchase away from earning more, with a price on each item.",
  style: "complete",
  budget: "1500",
  cap: "700",
  patronName: "",
};

const toDraft = (p: Preferences): Draft => ({
  causes: p.causes,
  note: p.note,
  style: p.style,
  budget: String(p.budgetUsd),
  cap: String(p.perGiftCapUsd),
  patronName: p.patronName,
});

const fromDraft = (d: Draft) => parsePreferences({ ...d, budgetUsd: d.budget, perGiftCapUsd: d.cap });

const toggle = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
const percent = (p: number) => `${Math.round(p * 100)}%`;
const digits = (text: string) => text.replace(/[^0-9]/g, "");

export function PatronDesk() {
  const [mode, setMode] = useState<"loading" | "edit" | "saved">("loading");
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [saved, setSaved] = useState<Preferences | null>(null);

  const [running, setRunning] = useState(false);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [readings, setReadings] = useState<ReadingResult[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const handle = useCallback((event: AgentEvent) => {
    if (event.type === "start") setMandateId(event.mandateId);
    if (event.type === "step") setSteps((prev) => [...prev, event.text]);
    if (event.type === "proposal") {
      setSteps((prev) => [...prev, `Recommended ${money(event.proposal.amountUsd)} to ${event.pitch.author}`]);
      setRows((prev) => [...prev, { proposal: event.proposal, pitch: event.pitch }]);
    }
    if (event.type === "done") {
      setSummary(event.summary);
      setReadings(event.readings);
      saveReadings(event.readings);
    }
    if (event.type === "error") setError(event.message);
  }, []);

  const run = useCallback(
    async (preferences: Preferences) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      setRunning(true);
      setError(null);
      setSummary(null);
      setReadings(null);
      setSteps([]);
      setRows([]);
      setMandateId(null);

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error ?? "The agent could not start.");
        }

        // One JSON event per line.
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.trim()) handle(JSON.parse(line) as AgentEvent);
          }
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "The agent stopped unexpectedly.");
        }
      } finally {
        if (abort.current === controller) setRunning(false);
      }
    },
    [handle],
  );

  // A returning patron's preferences are already here: read the letterbox for them straight away.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const stored = loadPreferences();
    if (stored) {
      setSaved(stored);
      setDraft(toDraft(stored));
      setMode("saved");
      void run(stored);
    } else {
      setMode("edit");
    }
  }, [run]);

  const parsed = fromDraft(draft);
  const missing = typeof parsed === "string" ? parsed : null;

  function save() {
    if (typeof parsed === "string") return;
    savePreferences(parsed);
    setSaved(parsed);
    setMode("saved");
    window.scrollTo({ top: 0 });
    void run(parsed);
  }

  function edit() {
    abort.current?.abort();
    setRunning(false);
    setMode("edit");
    window.scrollTo({ top: 0 });
  }

  const update = (proposalId: string, change: Partial<Row> | ((row: Row) => Row)) =>
    setRows((prev) =>
      prev.map((row) =>
        row.proposal.id === proposalId ? (typeof change === "function" ? change(row) : { ...row, ...change }) : row,
      ),
    );

  if (mode === "loading") {
    return (
      <div className="desk wrap" aria-busy="true">
        <p className="quiet">Looking for your preferences…</p>
      </div>
    );
  }

  // --- setting preferences ----------------------------------------------------
  if (mode === "edit" || !saved) {
    return (
      <div className="desk desk--write wrap">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <h1>Say once what you want to back</h1>
            <p className="desk__deck">
              Set your preferences here and they stay in this browser. Each time you come back, an agent reads the open
              letters against them and recommends gifts. It cannot pay; only you can, one PayPal approval at a time.
            </p>
            {draft.causes.length === 0 && !draft.note && (
              <button type="button" className="linklike small" onClick={() => setDraft(EXAMPLE)}>
                Fill in an example
              </button>
            )}
          </div>

          <fieldset className="fieldset">
            <legend>Which causes?</legend>
            <div className="chips">
              {CAUSES.map((cause) => (
                <label className="chip" key={cause.id}>
                  <input
                    type="checkbox"
                    checked={draft.causes.includes(cause.id)}
                    onChange={() => setDraft((d) => ({ ...d, causes: toggle(d.causes, cause.id) }))}
                  />
                  {cause.label}
                </label>
              ))}
            </div>
            <span className="field__hint">
              A letter fits when its request is about any one of these. Writers do not tag their letters; the agent
              reads each one.
            </span>
          </fieldset>

          <div className="field">
            <label htmlFor="note">What else should be true of a letter you back?</label>
            <span className="field__hint">
              Optional, in your own words. If you write something here, a letter has to meet it as well as a cause.
            </span>
            <textarea
              id="note"
              className="textarea"
              rows={3}
              style={{ minHeight: "5rem" }}
              maxLength={600}
              placeholder={EXAMPLE.note}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </div>

          <fieldset className="fieldset">
            <legend>How do you give?</legend>
            {(Object.keys(STYLE_LABEL) as GivingStyle[]).map((style) => (
              <label className="check" key={style}>
                <input
                  type="radio"
                  name="style"
                  checked={draft.style === style}
                  onChange={() => setDraft((d) => ({ ...d, style }))}
                />
                <span>
                  {STYLE_LABEL[style]}
                  <span className="field__hint" style={{ display: "block" }}>
                    {style === "complete"
                      ? "Only gifts that cover everything a letter still needs."
                      : "Part of an ask is fine: whole items from the writer’s list, in their order."}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="row">
            <div className="field">
              <label htmlFor="budget">Budget for one round, USD</label>
              <input
                id="budget"
                className="input input--figure"
                inputMode="numeric"
                required
                value={draft.budget}
                onChange={(e) => setDraft((d) => ({ ...d, budget: digits(e.target.value) }))}
              />
            </div>
            <div className="field">
              <label htmlFor="cap">Most for one letter</label>
              <input
                id="cap"
                className="input input--figure"
                inputMode="numeric"
                required
                value={draft.cap}
                onChange={(e) => setDraft((d) => ({ ...d, cap: digits(e.target.value) }))}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="desk-name">Your name, as the ledger will show it</label>
            <input
              id="desk-name"
              className="input"
              autoComplete="name"
              placeholder="Optional"
              maxLength={80}
              value={draft.patronName}
              onChange={(e) => setDraft((d) => ({ ...d, patronName: e.target.value }))}
            />
          </div>

          <div className="stack stack--tight">
            <div className="lede__actions" style={{ marginTop: 0 }}>
              <button type="submit" className="btn" disabled={missing !== null}>
                Save and see recommendations
              </button>
              {saved && (
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => {
                    setDraft(toDraft(saved));
                    setMode("saved");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
            {missing && <p className="small quiet">{missing}</p>}
          </div>
        </form>

        <aside className="desk__aside">
          <h2>What happens with these</h2>
          <ol>
            <li>They are kept in this browser. Kindling has no accounts, so there is nothing to sign up for.</li>
            <li>
              Every open letter is read, whatever its writer filed it under. For each one Jev answers one yes-or-no
              question per cause with a probability. It writes nothing and
              chooses no amounts.
            </li>
            <li>
              Rules you can read in the source turn those numbers into recommended gifts inside your budget. Each one
              waits for your own PayPal approval.
            </li>
          </ol>
        </aside>
      </div>
    );
  }

  // --- recommendations ----------------------------------------------------------
  const recommended = rows.reduce((sum, row) => sum + row.proposal.amountUsd, 0);
  const paid = rows.reduce((sum, row) => sum + (row.gift ? row.gift.amountUsd : 0), 0);
  const done = readings !== null;
  const toRead = (readings ?? []).filter((r) => r.verdict === "matched" || r.verdict === "unsettled");

  return (
    <div className="desk wrap">
      <div className="stack">
        <div>
          <h1>Recommended for you</h1>
          <p className="desk__deck">
            An agent read the open letters against the preferences you saved. Approve the gifts you agree with; nothing
            is paid until you do.
          </p>
        </div>

        <div className="till">
          <span className="label">Your standing preferences</span>
          <dl className="prefs">
            {saved.causes.length > 0 && (
              <div>
                <dt>Causes</dt>
                <dd>{saved.causes.map((id) => causeById(id).label).join(", ")}</dd>
              </div>
            )}
            {saved.note && (
              <div>
                <dt>Also</dt>
                <dd>“{saved.note}”</dd>
              </div>
            )}
            <div>
              <dt>How</dt>
              <dd>{STYLE_LABEL[saved.style]}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd className="figure">
                {money(saved.budgetUsd)} a round, {money(saved.perGiftCapUsd)} at most for one letter
              </dd>
            </div>
          </dl>
        </div>

        <div className="lede__actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn" disabled={running} aria-busy={running} onClick={() => void run(saved)}>
            {running ? "Reading the letterbox…" : "Read again"}
          </button>
          <button type="button" className="btn btn--quiet" onClick={edit}>
            Edit preferences
          </button>
        </div>

        <p className="small quiet">
          The budget and the cap are enforced on the server. The amount and the recipient of each gift come from the
          stored recommendation, not from this page.
        </p>
      </div>

      <section className="stack" aria-live="polite" aria-busy={running}>
        <div className="till">
          <span className="label">This round</span>
          <dl>
            <div>
              <dt>Budget</dt>
              <dd className="figure">{money(saved.budgetUsd)}</dd>
            </div>
            <div>
              <dt>Recommended</dt>
              <dd className="figure">{money(recommended)}</dd>
            </div>
            <div>
              <dt>Approved and paid</dt>
              <dd className="figure">{money(paid)}</dd>
            </div>
          </dl>
        </div>

        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}

        {!done && !error && (
          <ul className="log" aria-label="Agent activity">
            {steps.map((step, index) => (
              <li key={index} data-live={running && index === steps.length - 1}>
                {step}
              </li>
            ))}
            {running && steps.length === 0 && <li data-live="true">Briefing the agent</li>}
          </ul>
        )}

        {done && rows.length === 0 && !error && <p className="quiet">Nothing is recommended this round.</p>}

        {KINDS.map((kind) => {
          const group = rows.filter((row) => row.pitch.kind === kind.id);
          if (group.length === 0) return null;
          return (
            <div key={kind.id}>
              <h2 className="section-title section-title--count">
                {kind.plural}
                <span>
                  {group.length} recommended
                </span>
              </h2>
              <ol className="proposals">
                  {group.map((row) => {
                    const status = row.gift ? "paid" : row.proposal.status;
                    return (
                      <li className="proposal" key={row.proposal.id} data-status={status}>
                        <div>
                          <span className="label">
                            {row.pitch.author}, {row.pitch.location}
                          </span>
                          <h3>
                            <Link href={`/p/${row.pitch.id}`} target="_blank">
                              {row.pitch.headline}
                            </Link>
                          </h3>
                          {row.proposal.matches && row.proposal.matches.length > 0 && (
                            <ul className="matches" aria-label="Preferences this letter met">
                              {row.proposal.matches.map((match) => (
                                <li key={match.label}>
                                  {match.label} {percent(match.p)}
                                </li>
                              ))}
                            </ul>
                          )}
                          {row.proposal.quote && <p className="proposal__quote">“{row.proposal.quote}”</p>}
                          <p className="proposal__why">{row.proposal.rationale}</p>
                          {row.proposal.verify && <p className="proposal__verify">Check first: {row.proposal.verify}</p>}
                        </div>

                        <div className="proposal__act">
                          <span className="proposal__amount">{money(row.proposal.amountUsd)}</span>
                          {row.proposal.fit !== undefined && (
                            <span className="small quiet figure">Fit {percent(row.proposal.fit)}</span>
                          )}
                          {status === "paid" && row.gift && (
                            <p className="notice notice--ok" role="status">
                              Paid. Capture <span className="figure">{row.gift.captureId}</span>
                            </p>
                          )}
                          {status === "skipped" && (
                            <button
                              type="button"
                              className="linklike small"
                              onClick={() => update(row.proposal.id, (r) => ({ ...r, proposal: { ...r.proposal, status: "proposed" } }))}
                            >
                              Skipped. Undo
                            </button>
                          )}
                          {status === "proposed" && (
                            <>
                              {mandateId ? (
                                <PayPalButton
                                  getOrderBody={() => ({ mandateId, proposalId: row.proposal.id })}
                                  onPaid={(gift) => update(row.proposal.id, { gift, problem: null })}
                                  onProblem={(problem) => update(row.proposal.id, { problem })}
                                />
                              ) : (
                                <p className="small quiet">Waiting for the round to be recorded.</p>
                              )}
                              {row.problem && (
                                <p className="notice notice--error" role="alert">
                                  {row.problem}
                                </p>
                              )}
                              <button
                                type="button"
                                className="linklike small"
                                onClick={() => update(row.proposal.id, (r) => ({ ...r, proposal: { ...r.proposal, status: "skipped" } }))}
                              >
                                Skip this one
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ol>
            </div>
          );
        })}

        {toRead.length > 0 && (
          <div>
            <h2 className="section-title">Worth reading yourself</h2>
            <ul className="reads">
              {toRead.map((reading) => (
                <li key={reading.pitch.id}>
                  <Link href={`/p/${reading.pitch.id}`} target="_blank">
                    {reading.pitch.headline}
                  </Link>
                  <span className="small quiet">
                    {reading.pitch.author} · fit {percent(reading.fit)} ·{" "}
                    {reading.verdict === "matched" ? "fits, but no gift sits inside your limits" : "not settled either way"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary && (
          <div>
            <span className="label">The agent’s note</span>
            <p className="agent-note">{summary}</p>
          </div>
        )}

        {done && steps.length > 0 && (
          <details className="small">
            <summary>How the reading went</summary>
            <ul className="log" style={{ marginTop: "var(--space-sm)" }}>
              {steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
