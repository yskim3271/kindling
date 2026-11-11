"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { money } from "@/lib/format";
import type { Gift } from "@/lib/types";
import { PayPalButton } from "./PayPalButton";

const PRESETS = [10, 25, 50, 100];

interface Props {
  pitchId: string;
  author: string;
  stillNeededUsd: number;
  /** True when the gift is paid straight into the writer's own PayPal account. */
  direct: boolean;
}

export function GiftPanel({ pitchId, author, stillNeededUsd, direct }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("25");
  const [patronName, setPatronName] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [paid, setPaid] = useState<Gift | null>(null);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= 1 && value <= 10_000;

  const getOrderBody = useCallback(() => {
    if (!valid) return "Enter an amount between $1 and $10,000.";
    return { pitchId, amountUsd: value, patronName, note };
  }, [valid, pitchId, value, patronName, note]);

  const onPaid = useCallback(
    (gift: Gift) => {
      setPaid(gift);
      setProblem(null);
      router.refresh(); // pull the new total and the ledger line into the page
    },
    [router],
  );

  if (paid) {
    return (
      <div className="stack stack--tight" role="status">
        <p className="notice notice--ok">
          {money(paid.amountUsd)} sent to {author}. PayPal capture <span className="figure">{paid.captureId}</span>.
        </p>
        <button type="button" className="linklike small" onClick={() => setPaid(null)}>
          Give again
        </button>
      </div>
    );
  }

  return (
    <div className="stack stack--tight">
      {stillNeededUsd === 0 && (
        <p className="notice notice--ok">This letter has everything it asked for. A further gift still goes to {author}.</p>
      )}
      <div className="field">
        <span className="field__label" id="amount-label">
          Amount
        </span>
        <div className="presets" role="group" aria-labelledby="amount-label">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="preset"
              aria-pressed={value === preset}
              onClick={() => setAmount(String(preset))}
            >
              ${preset}
            </button>
          ))}
        </div>
        <input
          className="input input--figure"
          inputMode="decimal"
          aria-label="Other amount in US dollars"
          aria-invalid={!valid}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        />
        {stillNeededUsd > 0 && value !== stillNeededUsd && (
          <button type="button" className="linklike small" onClick={() => setAmount(String(stillNeededUsd))}>
            Cover the remaining {money(stillNeededUsd)}
          </button>
        )}
      </div>

      <div className="field">
        <label htmlFor="patron-name">Your name, as the ledger will show it</label>
        <input
          id="patron-name"
          className="input"
          autoComplete="name"
          placeholder="Optional"
          value={patronName}
          onChange={(e) => setPatronName(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="patron-note">A line for {author}</label>
        <input
          id="patron-note"
          className="input"
          maxLength={280}
          placeholder="Optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <PayPalButton getOrderBody={getOrderBody} onPaid={onPaid} onProblem={setProblem} />

      {problem && (
        <p className="notice notice--error" role="alert">
          {problem}
        </p>
      )}

      <p className="small quiet">
        {direct
          ? `Paid by PayPal straight to ${author}’s account, less PayPal’s fee. Kindling never holds the money.`
          : "This is a sample letter with no PayPal address, so a gift lands in the demo’s own sandbox account."}
      </p>
    </div>
  );
}
