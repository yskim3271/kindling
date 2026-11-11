"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KIND_LABEL, money } from "@/lib/format";
import type { FundLine, PitchKind } from "@/lib/types";

interface Shaped {
  kind: PitchKind;
  headline: string;
  summary: string;
  body: string;
  language: string;
  askUsd: number;
  useOfFunds: FundLine[];
  tags: string[];
  missing: string[];
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "That did not go through. Try again.");
  return json;
}

export function WriteForm() {
  const router = useRouter();

  // step one: the raw draft
  const [draft, setDraft] = useState("");
  const [ask, setAsk] = useState("");
  const [shaping, setShaping] = useState(false);

  // step two: the edited letter, all fields the writer can still change
  const [letter, setLetter] = useState<Shaped | null>(null);
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("");
  const [location, setLocation] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [openToInvestment, setOpenToInvestment] = useState(false);
  const [posting, setPosting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function shape() {
    setShaping(true);
    setError(null);
    try {
      const { shaped } = await post<{ shaped: Shaped }>("/api/pitches/shape", { draft, askUsd: ask });
      setLetter({ ...shaped, askUsd: shaped.askUsd || Number(ask) || 0 });
      setTags(shaped.tags.join(", "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The editor could not be reached.");
    } finally {
      setShaping(false);
    }
  }

  async function publish() {
    if (!letter) return;
    setPosting(true);
    setError(null);
    try {
      const { id } = await post<{ id: string }>("/api/pitches", {
        ...letter,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        originalBody: draft,
        author,
        location,
        paypalEmail,
        openToInvestment,
      });
      router.push(`/p/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The letter could not be posted.");
      setPosting(false);
    }
  }

  const patch = (change: Partial<Shaped>) => setLetter((prev) => (prev ? { ...prev, ...change } : prev));
  const setLine = (index: number, change: Partial<FundLine>) =>
    patch({ useOfFunds: letter!.useOfFunds.map((line, i) => (i === index ? { ...line, ...change } : line)) });

  if (!letter) {
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void shape();
        }}
      >
        <div className="field">
          <label htmlFor="draft">Your draft</label>
          <span className="field__hint">
            Any language, any order. Say who you are, what you need, what the money would buy, and how someone could
            check.
          </span>
          <textarea
            id="draft"
            className="textarea"
            rows={14}
            style={{ minHeight: "20rem" }}
            required
            minLength={80}
            disabled={shaping}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ask">How much are you asking for, in US dollars?</label>
          <span className="field__hint">Leave it blank if the amount is already in your draft.</span>
          <input
            id="ask"
            className="input input--figure"
            inputMode="numeric"
            style={{ maxWidth: "12rem" }}
            disabled={shaping}
            value={ask}
            onChange={(e) => setAsk(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button type="submit" className="btn" disabled={shaping || draft.trim().length < 80} aria-busy={shaping}>
            {shaping ? "The editor is reading…" : "Hand it to the editor"}
          </button>
        </div>
      </form>
    );
  }

  const linesTotal = letter.useOfFunds.reduce((sum, line) => sum + (Number(line.amountUsd) || 0), 0);
  const ready = author.trim() && paypalEmail.trim() && letter.headline.trim() && letter.body.trim() && letter.askUsd >= 1;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void publish();
      }}
    >
      {letter.missing.length > 0 && (
        <div className="notice">
          <strong>The editor’s questions.</strong> A patron will wonder about these. Answer them in the letter below, or
          post as it stands.
          <ul className="questions">
            {letter.missing.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}

      {letter.language.toLowerCase() !== "english" && (
        <p className="small quiet">
          Translated from {letter.language}. Your original is kept and shown under the English text.
        </p>
      )}

      <div className="row">
        <div className="field">
          <label htmlFor="kind">Kind of letter</label>
          <select id="kind" className="select" value={letter.kind} onChange={(e) => patch({ kind: e.target.value as PitchKind })}>
            {(Object.keys(KIND_LABEL) as PitchKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ask-final">Asking for, USD</label>
          <input
            id="ask-final"
            className="input input--figure"
            inputMode="numeric"
            required
            value={letter.askUsd || ""}
            onChange={(e) => patch({ askUsd: Number(e.target.value.replace(/[^0-9]/g, "")) })}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="headline">Headline</label>
        <textarea id="headline" className="textarea" rows={2} style={{ minHeight: "3.25rem" }} required maxLength={140} value={letter.headline} onChange={(e) => patch({ headline: e.target.value.replace(/\n/g, " ") })} />
      </div>

      <div className="field">
        <label htmlFor="summary">Summary</label>
        <textarea id="summary" className="textarea" rows={4} style={{ minHeight: "5rem" }} value={letter.summary} onChange={(e) => patch({ summary: e.target.value })} />
      </div>

      <div className="field">
        <label htmlFor="body">The letter</label>
        <textarea id="body" className="textarea" rows={14} style={{ minHeight: "16rem" }} required value={letter.body} onChange={(e) => patch({ body: e.target.value })} />
      </div>

      <div className="field">
        <span className="field__label">What the money buys</span>
        <div className="fund-lines">
          {letter.useOfFunds.map((line, index) => (
            <div className="fund-line" key={index}>
              <input className="input" aria-label={`Item ${index + 1}`} value={line.item} onChange={(e) => setLine(index, { item: e.target.value })} />
              <input
                className="input input--figure"
                inputMode="numeric"
                aria-label={`Amount for item ${index + 1}, US dollars`}
                value={line.amountUsd || ""}
                onChange={(e) => setLine(index, { amountUsd: Number(e.target.value.replace(/[^0-9]/g, "")) })}
              />
              <button
                type="button"
                className="linklike small"
                onClick={() => patch({ useOfFunds: letter.useOfFunds.filter((_, i) => i !== index) })}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="amounts small">
          <button type="button" className="linklike" onClick={() => patch({ useOfFunds: [...letter.useOfFunds, { item: "", amountUsd: 0 }] })}>
            Add a line
          </button>
          {letter.useOfFunds.length > 0 && (
            <span className={linesTotal === letter.askUsd ? "quiet figure" : "figure"}>
              Lines total {money(linesTotal)}
              {linesTotal !== letter.askUsd && ` · ask is ${money(letter.askUsd)}`}
            </span>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input id="tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        <span className="field__hint">Separated by commas. Patrons and their agents search on these.</span>
      </div>

      <h2 className="section-title">Sign it</h2>

      <div className="row">
        <div className="field">
          <label htmlFor="author">Your name</label>
          <input id="author" className="input" autoComplete="name" required value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="location">Where you are</label>
          <input id="location" className="input" placeholder="City, country" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="paypal-email">PayPal email that receives gifts</label>
        <input id="paypal-email" type="email" className="input" autoComplete="email" required value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} />
        <span className="field__hint">
          Gifts are paid to this account directly. In the sandbox, use a sandbox Business account address.
        </span>
      </div>

      <label className="check">
        <input type="checkbox" checked={openToInvestment} onChange={(e) => setOpenToInvestment(e.target.checked)} />
        <span>
          I am open to investment as well as gifts.
          <span className="field__hint"> Patrons can then ask for a conversation. No money moves until you both agree terms.</span>
        </span>
      </label>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      <div className="lede__actions" style={{ marginTop: 0 }}>
        <button type="submit" className="btn" disabled={posting || !ready} aria-busy={posting}>
          {posting ? "Posting…" : "Post the letter"}
        </button>
        <button type="button" className="btn btn--quiet" disabled={posting} onClick={() => setLetter(null)}>
          Back to my draft
        </button>
      </div>
    </form>
  );
}
