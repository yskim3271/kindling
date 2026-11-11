"use client";

import { useState } from "react";

export function InterestForm({ pitchId, author }: { pitchId: string; author: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(form: FormData) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitchId,
          name: form.get("name"),
          email: form.get("email"),
          amountUsd: form.get("amountUsd"),
          message: form.get("message"),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "That did not go through. Try again.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="notice notice--ok" role="status">
        Passed on to {author}. They will reply to your email if they want to talk.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="stack stack--tight">
        <p className="small quiet">
          {author} is open to investment. Kindling does not sell stakes; it introduces you, and the two of you put any
          terms in writing.
        </p>
        <button type="button" className="btn btn--quiet" onClick={() => setOpen(true)}>
          Ask about investing
        </button>
      </div>
    );
  }

  return (
    <form
      className="stack stack--tight"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(new FormData(e.currentTarget));
      }}
    >
      <div className="field">
        <label htmlFor="int-name">Your name</label>
        <input id="int-name" name="name" className="input" autoComplete="name" required disabled={busy} />
      </div>
      <div className="field">
        <label htmlFor="int-email">Email</label>
        <input id="int-email" name="email" type="email" className="input" autoComplete="email" required disabled={busy} />
        <span className="field__hint">Shared with {author} only.</span>
      </div>
      <div className="field">
        <label htmlFor="int-amount">Amount you have in mind, USD</label>
        <input id="int-amount" name="amountUsd" className="input input--figure" inputMode="numeric" placeholder="Optional" disabled={busy} />
      </div>
      <div className="field">
        <label htmlFor="int-message">What you would like to discuss</label>
        <textarea id="int-message" name="message" className="textarea" rows={4} required minLength={10} disabled={busy} />
      </div>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--quiet" disabled={busy} aria-busy={busy}>
        {busy ? "Sending…" : "Send the introduction"}
      </button>
    </form>
  );
}
