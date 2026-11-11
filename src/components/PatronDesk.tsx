"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { AgentEvent } from "@/lib/agent";
import { KIND_LABEL, money } from "@/lib/format";
import type { Gift, Proposal } from "@/lib/types";
import { PayPalButton } from "./PayPalButton";

type ProposalEvent = Extract<AgentEvent, { type: "proposal" }>;

interface Row {
  proposal: Proposal;
  pitch: ProposalEvent["pitch"];
  gift?: Gift;
  problem?: string | null;
}

const EXAMPLE =
  "People one specific purchase away from earning more: a tool, a licence, a certificate. I care more about a clear plan than a moving story, and I would rather finish one person's ask than sprinkle ten.";

export function PatronDesk() {
  const [patronName, setPatronName] = useState("");
  const [thesis, setThesis] = useState("");
  const [budget, setBudget] = useState("500");
  const [cap, setCap] = useState("200");

  const [running, setRunning] = useState(false);
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const budgetUsd = Number(budget);
  const capUsd = Number(cap);
  const formOk = thesis.trim().length >= 20 && budgetUsd >= 5 && capUsd >= 1 && capUsd <= budgetUsd;

  const handle = useCallback((event: AgentEvent) => {
    if (event.type === "start") setMandateId(event.mandateId);
    if (event.type === "step") setSteps((prev) => [...prev, event.text]);
    if (event.type === "proposal") {
      setSteps((prev) => [...prev, `Proposed ${money(event.proposal.amountUsd)} to ${event.pitch.author}`]);
      setRows((prev) => [...prev, { proposal: event.proposal, pitch: event.pitch }]);
    }
    if (event.type === "done") setSummary(event.summary);
    if (event.type === "error") setError(event.message);
  }, []);

  async function run() {
    setRunning(true);
    setError(null);
    setSummary(null);
    setSteps([]);
    setRows([]);
    setMandateId(null);
    abort.current = new AbortController();

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patronName, thesis, budgetUsd, perGiftCapUsd: capUsd }),
        signal: abort.current.signal,
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
      setRunning(false);
    }
  }

  const update = (proposalId: string, change: Partial<Row> | ((row: Row) => Row)) =>
    setRows((prev) =>
      prev.map((row) =>
        row.proposal.id === proposalId ? (typeof change === "function" ? change(row) : { ...row, ...change }) : row,
      ),
    );

  const proposed = rows.reduce((sum, row) => sum + row.proposal.amountUsd, 0);
  const paid = rows.reduce((sum, row) => sum + (row.gift ? row.gift.amountUsd : 0), 0);
  const started = running || steps.length > 0 || error !== null;

  return (
    <div className="desk wrap">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <div>
          <h1>Send a reader with a budget</h1>
          <p className="desk__deck">
            Say what you want to back and how much. An agent reads every open letter and comes back with gifts to sign.
            It cannot pay; only you can, one PayPal approval at a time.
          </p>
          <p className="desk__deck small">
            The reading is done by Jev, a model that answers yes-or-no questions with a probability and writes
            nothing. Which letters qualify and for how much is decided by plain rules you can read in the source.
          </p>
        </div>

        <div className="field">
          <label htmlFor="thesis">What do you want to back?</label>
          <textarea
            id="thesis"
            className="textarea"
            rows={6}
            style={{ minHeight: "10rem" }}
            required
            minLength={20}
            disabled={running}
            placeholder={EXAMPLE}
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
          />
          {!thesis && (
            <button type="button" className="linklike small" onClick={() => setThesis(EXAMPLE)} disabled={running}>
              Use the example
            </button>
          )}
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="budget">Total budget, USD</label>
            <input
              id="budget"
              className="input input--figure"
              inputMode="numeric"
              required
              disabled={running}
              aria-invalid={!(budgetUsd >= 5)}
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
          <div className="field">
            <label htmlFor="cap">Most for one letter</label>
            <input
              id="cap"
              className="input input--figure"
              inputMode="numeric"
              required
              disabled={running}
              aria-invalid={!(capUsd >= 1 && capUsd <= budgetUsd)}
              value={cap}
              onChange={(e) => setCap(e.target.value.replace(/[^0-9]/g, ""))}
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
            disabled={running}
            value={patronName}
            onChange={(e) => setPatronName(e.target.value)}
          />
        </div>

        <div className="lede__actions" style={{ marginTop: 0 }}>
          <button type="submit" className="btn" disabled={running || !formOk} aria-busy={running}>
            {running ? "Reading the letterbox…" : rows.length > 0 ? "Read again" : "Send the agent"}
          </button>
          {running && (
            <button type="button" className="btn btn--quiet" onClick={() => abort.current?.abort()}>
              Stop
            </button>
          )}
        </div>

        <p className="small quiet">
          Both limits are enforced on the server. A proposal over the cap, over the budget, or over what a letter still
          needs is refused before you ever see it.
        </p>
      </form>

      <section className="stack" aria-live="polite" aria-busy={running}>
        {!started && (
          <div className="desk__aside">
            <h2>What comes back</h2>
            <ol>
              <li>A running log of each letter read, with the probability that it fits what you asked for.</li>
              <li>Proposed gifts, each with the writer’s own sentence that shows the fit, and what the amount pays for.</li>
              <li>A PayPal button on every proposal. Sign the ones you agree with; skip the rest.</li>
            </ol>
          </div>
        )}

        {started && (
          <>
            <div className="till">
              <span className="label">This mandate</span>
              <dl>
                <div>
                  <dt>Budget</dt>
                  <dd className="figure">{money(budgetUsd)}</dd>
                </div>
                <div>
                  <dt>Proposed</dt>
                  <dd className="figure">{money(proposed)}</dd>
                </div>
                <div>
                  <dt>Signed and paid</dt>
                  <dd className="figure">{money(paid)}</dd>
                </div>
              </dl>
            </div>

            <ul className="log" aria-label="Agent activity">
              {steps.map((step, index) => (
                <li key={index} data-live={running && index === steps.length - 1}>
                  {step}
                </li>
              ))}
              {running && steps.length === 0 && <li data-live="true">Briefing the agent</li>}
            </ul>

            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}

            {rows.length > 0 && (
              <ol className="proposals">
                {rows.map((row) => {
                  const status = row.gift ? "paid" : row.proposal.status;
                  return (
                    <li className="proposal" key={row.proposal.id} data-status={status}>
                      <div>
                        <span className="label">
                          {KIND_LABEL[row.pitch.kind]} · {row.pitch.author}, {row.pitch.location}
                        </span>
                        <h3>
                          <Link href={`/p/${row.pitch.id}`} target="_blank">
                            {row.pitch.headline}
                          </Link>
                        </h3>
                        {row.proposal.quote && <p className="proposal__quote">“{row.proposal.quote}”</p>}
                        <p className="proposal__why">{row.proposal.rationale}</p>
                        {row.proposal.verify && <p className="proposal__verify">Check first: {row.proposal.verify}</p>}
                      </div>

                      <div className="proposal__act">
                        <span className="proposal__amount">{money(row.proposal.amountUsd)}</span>
                        {row.proposal.fit !== undefined && (
                          <span className="small quiet figure">Fit with your mandate {Math.round(row.proposal.fit * 100)}%</span>
                        )}
                        {status === "paid" && row.gift && (
                          <p className="notice notice--ok" role="status">
                            Paid. Capture <span className="figure">{row.gift.captureId}</span>
                          </p>
                        )}
                        {status === "skipped" && (
                          <button type="button" className="linklike small" onClick={() => update(row.proposal.id, (r) => ({ ...r, proposal: { ...r.proposal, status: "proposed" } }))}>
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
                              <p className="small quiet">Waiting for the mandate to be recorded.</p>
                            )}
                            {row.problem && (
                              <p className="notice notice--error" role="alert">
                                {row.problem}
                              </p>
                            )}
                            <button type="button" className="linklike small" onClick={() => update(row.proposal.id, (r) => ({ ...r, proposal: { ...r.proposal, status: "skipped" } }))}>
                              Skip this one
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {summary && (
              <div>
                <span className="label">The agent’s note</span>
                <p className="agent-note">{summary}</p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
