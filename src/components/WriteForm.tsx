"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KIND_LABEL, money } from "@/lib/format";
import type { FundLine, PitchKind } from "@/lib/types";

/**
 * A letter is written by the person asking. Nothing here drafts, edits or
 * translates it; the form only gives the letter its parts.
 */
export function WriteForm() {
  const router = useRouter();

  const [kind, setKind] = useState<PitchKind>("story");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [lines, setLines] = useState<FundLine[]>([{ item: "", amountUsd: 0 }]);
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("");
  const [location, setLocation] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [openToInvestment, setOpenToInvestment] = useState(false);

  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = lines.filter((line) => line.item.trim() && line.amountUsd > 0);
  const askUsd = filled.reduce((sum, line) => sum + line.amountUsd, 0);
  const ready =
    headline.trim().length > 0 && body.trim().length >= 80 && askUsd >= 1 && author.trim().length > 0 && paypalEmail.trim().length > 0;

  const setLine = (index: number, change: Partial<FundLine>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...change } : line)));

  async function publish() {
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          headline,
          body,
          askUsd,
          useOfFunds: filled,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          author,
          location,
          paypalEmail,
          openToInvestment,
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error ?? "The letter could not be posted. Try again.");
      router.push(`/p/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The letter could not be posted. Try again.");
      setPosting(false);
    }
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void publish();
      }}
    >
      <div className="field">
        <label htmlFor="kind">Kind of letter</label>
        <select
          id="kind"
          className="select"
          style={{ maxWidth: "16rem" }}
          disabled={posting}
          value={kind}
          onChange={(e) => setKind(e.target.value as PitchKind)}
        >
          {(Object.keys(KIND_LABEL) as PitchKind[]).map((option) => (
            <option key={option} value={option}>
              {KIND_LABEL[option]}
            </option>
          ))}
        </select>
        <span className="field__hint">
          A story is your own situation. A project is something you are building. An argument is a case you want funded.
        </span>
      </div>

      <div className="field">
        <label htmlFor="headline">Headline</label>
        <span className="field__hint">One plain sentence. What a reader will see first.</span>
        <textarea
          id="headline"
          className="textarea"
          rows={2}
          style={{ minHeight: "3.25rem" }}
          required
          maxLength={140}
          disabled={posting}
          value={headline}
          onChange={(e) => setHeadline(e.target.value.replace(/\n/g, " "))}
        />
      </div>

      <div className="field">
        <label htmlFor="body">The letter</label>
        <span className="field__hint">
          Who you are, what you need, and how someone could check. Leave a blank line between paragraphs.
        </span>
        <textarea
          id="body"
          className="textarea"
          rows={14}
          style={{ minHeight: "20rem" }}
          required
          minLength={80}
          disabled={posting}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="field">
        <span className="field__label">What the money buys</span>
        <span className="field__hint">One line per thing, with its price in US dollars. The total is what you are asking for.</span>
        <div className="fund-lines">
          {lines.map((line, index) => (
            <div className="fund-line" key={index}>
              <input
                className="input"
                aria-label={`Item ${index + 1}`}
                placeholder="Item"
                disabled={posting}
                value={line.item}
                onChange={(e) => setLine(index, { item: e.target.value })}
              />
              <input
                className="input input--figure"
                inputMode="numeric"
                aria-label={`Price of item ${index + 1} in US dollars`}
                placeholder="USD"
                disabled={posting}
                value={line.amountUsd || ""}
                onChange={(e) => setLine(index, { amountUsd: Number(e.target.value.replace(/[^0-9]/g, "")) })}
              />
              <button
                type="button"
                className="linklike small"
                disabled={posting || lines.length === 1}
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="amounts small">
          <button
            type="button"
            className="linklike"
            disabled={posting || lines.length >= 12}
            onClick={() => setLines((prev) => [...prev, { item: "", amountUsd: 0 }])}
          >
            Add a line
          </button>
          <span className="figure">Asking for {money(askUsd)}</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input
          id="tags"
          className="input"
          placeholder="education, hardware, west-africa"
          disabled={posting}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <span className="field__hint">Separated by commas. Optional.</span>
      </div>

      <h2 className="section-title">Sign it</h2>

      <div className="row">
        <div className="field">
          <label htmlFor="author">Your name</label>
          <input
            id="author"
            className="input"
            autoComplete="name"
            required
            disabled={posting}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="location">Where you are</label>
          <input
            id="location"
            className="input"
            placeholder="City, country"
            disabled={posting}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="paypal-email">PayPal email that receives gifts</label>
        <input
          id="paypal-email"
          type="email"
          className="input"
          autoComplete="email"
          required
          disabled={posting}
          value={paypalEmail}
          onChange={(e) => setPaypalEmail(e.target.value)}
        />
        <span className="field__hint">
          Gifts are paid to this account directly. In the sandbox, use a sandbox Business account address.
        </span>
      </div>

      <label className="check">
        <input
          type="checkbox"
          disabled={posting}
          checked={openToInvestment}
          onChange={(e) => setOpenToInvestment(e.target.checked)}
        />
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

      <div>
        <button type="submit" className="btn" disabled={posting || !ready} aria-busy={posting}>
          {posting ? "Posting…" : "Post the letter"}
        </button>
      </div>
    </form>
  );
}
