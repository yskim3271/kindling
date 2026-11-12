"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/format";
import { STAGES } from "@/lib/preferences";
import type { FundLine, Stage } from "@/lib/types";

/**
 * A project is posted by the person making the game, in their own words.
 * Nothing here drafts, edits or translates the letter; the form only gives the
 * project its parts.
 */
export function WriteForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [stage, setStage] = useState<Stage>("demo");
  const [playUrl, setPlayUrl] = useState("");
  const [body, setBody] = useState("");
  const [lines, setLines] = useState<FundLine[]>([{ item: "", amountUsd: 0 }]);
  const [genres, setGenres] = useState("");
  const [author, setAuthor] = useState("");
  const [location, setLocation] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [openToInvestment, setOpenToInvestment] = useState(false);

  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = lines.filter((line) => line.item.trim() && line.amountUsd > 0);
  const askUsd = filled.reduce((sum, line) => sum + line.amountUsd, 0);
  const ready =
    title.trim().length > 0 &&
    headline.trim().length > 0 &&
    /^https?:\/\/\S+\.\S+/.test(playUrl.trim()) &&
    body.trim().length >= 80 &&
    askUsd >= 1 &&
    author.trim().length > 0 &&
    paypalEmail.trim().length > 0;

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
          title,
          headline,
          stage,
          playUrl: playUrl.trim(),
          body,
          askUsd,
          useOfFunds: filled,
          genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
          author,
          location,
          paypalEmail,
          openToInvestment,
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error ?? "The project could not be posted. Try again.");
      router.push(`/p/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The project could not be posted. Try again.");
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
      <div className="row">
        <div className="field">
          <label htmlFor="title">The game’s title</label>
          <input
            id="title"
            className="input"
            required
            maxLength={80}
            disabled={posting}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="stage">How far along it is</label>
          <select
            id="stage"
            className="select"
            disabled={posting}
            value={stage}
            onChange={(e) => setStage(e.target.value as Stage)}
          >
            {STAGES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="headline">One line about it</label>
        <span className="field__hint">What the player does, in a sentence. This is what a patron sees first.</span>
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
        <label htmlFor="play-url">Where someone can play or watch it</label>
        <span className="field__hint">
          A public page: a store page, a build you host, a video of it running. A patron will open this before they pay,
          so link the thing that shows the most.
        </span>
        <input
          id="play-url"
          type="url"
          className="input"
          inputMode="url"
          required
          maxLength={300}
          placeholder="https://"
          disabled={posting}
          value={playUrl}
          onChange={(e) => setPlayUrl(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="body">Your letter</label>
        <span className="field__hint">
          What the game is, what exists today, and what is missing. Leave a blank line between paragraphs.
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
        <label htmlFor="genres">Genres</label>
        <input
          id="genres"
          className="input"
          placeholder="puzzle, narrative, local multiplayer"
          disabled={posting}
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
        />
        <span className="field__hint">
          Separated by commas. Optional, and only shown as labels: a patron’s agent reads your letter, not these.
        </span>
      </div>

      <h2 className="section-title">Sign it</h2>

      <div className="row">
        <div className="field">
          <label htmlFor="author">Your name or your studio’s</label>
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
          I am open to investment or a publishing deal as well as gifts.
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
          {posting ? "Posting…" : "Post the game"}
        </button>
      </div>
    </form>
  );
}
