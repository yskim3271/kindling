import { addProposal, listPitches, newId, setMandateSummary } from "./db";
import { cents, money } from "./format";
import { askJev } from "./jev";
import { LETTER_QUESTIONS, MANDATE_QUESTIONS, THRESHOLD, letterState, sentenceQuestion, sentences } from "./questions";
import type { Mandate, Pitch, Proposal } from "./types";

/**
 * The patron's agent.
 *
 * Jev makes the judgments: does this letter fit the mandate, can its claims be
 * checked, is it trying to instruct the software, which sentence shows the fit.
 * Each comes back as a probability. Everything after that is ordinary code:
 * which letters qualify, in what order, for how much, and what the patron is
 * told. No model decides an amount, and no model writes the reasons.
 */

export type AgentEvent =
  | { type: "start"; mandateId: string }
  | { type: "step"; text: string }
  | {
      type: "proposal";
      proposal: Proposal;
      pitch: Pick<Pitch, "id" | "headline" | "author" | "location" | "kind">;
      remainingUsd: number;
    }
  | { type: "done"; mandateId: string; summary: string }
  | { type: "error"; message: string };

interface Reading {
  pitch: Pitch;
  fits: number;
  checkable: number;
  addressesSoftware: number;
  /** The writer's own sentence that best shows the fit, when one clearly does. */
  quote?: string;
}

const percent = (p: number) => `${Math.round(p * 100)}%`;
const stillNeeded = (p: Pitch) => Math.max(0, cents(p.askUsd - p.raisedUsd));

async function readLetter(mandate: string, pitch: Pitch): Promise<Reading> {
  const lines = sentences(pitch.body);
  const answers: Record<string, number> = await askJev(letterState(mandate, pitch), {
    ...LETTER_QUESTIONS,
    ...Object.fromEntries(lines.map((line, i) => [`sentence${i}`, sentenceQuestion(line)])),
  });

  let best = -1;
  lines.forEach((_, i) => {
    if (best < 0 || answers[`sentence${i}`] > answers[`sentence${best}`]) best = i;
  });

  return {
    pitch,
    fits: answers.fits,
    checkable: answers.checkable,
    addressesSoftware: answers.addressesSoftware,
    quote: best >= 0 && answers[`sentence${best}`] >= THRESHOLD.yes ? lines[best] : undefined,
  };
}

/** Run `task` over `items`, a few at a time, keeping the order of results. */
async function mapLimited<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * How much to give one letter out of `available`, and what that buys.
 * Returns nothing when no sensible gift exists.
 */
function sizeGift(pitch: Pitch, available: number, completeOnly: boolean): { amount: number; covers: string } | undefined {
  const need = stillNeeded(pitch);
  if (available < 1 || need < 1) return undefined;

  const listed = (lines: Pitch["useOfFunds"]) => lines.map((l) => `${l.item} (${money(l.amountUsd)})`).join(", ");

  if (need <= available) {
    const fresh = pitch.raisedUsd === 0 && pitch.useOfFunds.length > 0;
    return {
      amount: need,
      covers: fresh ? `Covers the whole ask: ${listed(pitch.useOfFunds)}.` : "Covers everything the letter still needs.",
    };
  }
  if (completeOnly) return undefined;

  // Part-funding: pay for whole items, in the order the writer listed them.
  const affordable: Pitch["useOfFunds"] = [];
  let total = 0;
  for (const line of pitch.useOfFunds) {
    if (total + line.amountUsd <= available) {
      affordable.push(line);
      total += line.amountUsd;
    }
  }
  if (affordable.length === 0) return undefined;
  return {
    amount: cents(total),
    covers: `Pays for ${listed(affordable)}. The letter would still need ${money(cents(need - total))}.`,
  };
}

export async function runPatronAgent(mandate: Mandate, emit: (event: AgentEvent) => void): Promise<void> {
  const open = (await listPitches()).filter((p) => stillNeeded(p) >= 1).slice(0, 40);
  emit({ type: "step", text: `Opening the letterbox: ${open.length} ${open.length === 1 ? "letter needs" : "letters need"} funding` });

  // One judgment about the mandate itself, then one request per letter.
  const { prefersCompleting } = await askJev({ patron_mandate: mandate.thesis }, MANDATE_QUESTIONS);
  const completeOnly = prefersCompleting >= THRESHOLD.yes;
  emit({
    type: "step",
    text: completeOnly
      ? `Your mandate prefers finishing one ask over spreading gifts (${percent(prefersCompleting)}): proposing only gifts that complete a letter`
      : `Your mandate does not ask for complete funding only (${percent(prefersCompleting)}): part-funding is allowed`,
  });

  const readings = await mapLimited(open, 4, async (pitch) => {
    const reading = await readLetter(mandate.thesis, pitch);
    emit({ type: "step", text: `Read ${pitch.author}, ${pitch.location}: fit ${percent(reading.fits)}` });
    return reading;
  });

  // --- the decision table ----------------------------------------------------
  const setAside = readings.filter((r) => r.addressesSoftware >= THRESHOLD.yes);
  const honest = readings.filter((r) => r.addressesSoftware < THRESHOLD.yes);
  const fitting = honest.filter((r) => r.fits >= THRESHOLD.yes).sort((a, b) => b.fits - a.fits);
  const unsettled = honest.filter((r) => r.fits > THRESHOLD.no && r.fits < THRESHOLD.yes);
  const passed = honest.filter((r) => r.fits <= THRESHOLD.no);

  let remaining = mandate.budgetUsd;
  const proposed: Reading[] = [];
  const tooLarge: Reading[] = [];

  for (const reading of fitting) {
    const gift = sizeGift(reading.pitch, Math.min(mandate.perGiftCapUsd, remaining), completeOnly);
    if (!gift) {
      tooLarge.push(reading);
      continue;
    }

    const proposal: Proposal = {
      id: newId("prop"),
      pitchId: reading.pitch.id,
      amountUsd: gift.amount,
      rationale: gift.covers,
      fit: reading.fits,
      quote: reading.quote,
      verify:
        reading.checkable <= THRESHOLD.no
          ? "The letter names no one who could confirm it. Ask the writer for something you can check before you pay."
          : undefined,
      status: "proposed",
    };
    await addProposal(mandate.id, proposal);
    remaining = cents(remaining - gift.amount);
    proposed.push(reading);
    const { id, headline, author, location, kind } = reading.pitch;
    emit({ type: "proposal", proposal, pitch: { id, headline, author, location, kind }, remainingUsd: remaining });
  }

  // --- the note, assembled from the same numbers -----------------------------
  const names = (list: Reading[]) => list.map((r) => `${r.pitch.author} (${percent(r.fits)})`).join(", ");
  // If the best match was only held back by the cap, say what cap would have completed it.
  const nearMiss = tooLarge.find((r) => stillNeeded(r.pitch) <= remaining);
  const hint = nearMiss
    ? ` A cap of ${money(stillNeeded(nearMiss.pitch))} per letter would complete ${nearMiss.pitch.author}’s ask.`
    : "";
  const note = [
    `Read ${readings.length} ${readings.length === 1 ? "letter" : "letters"}. ${fitting.length} matched your mandate, and ${proposed.length} ${proposed.length === 1 ? "gift is" : "gifts are"} proposed for ${money(cents(mandate.budgetUsd - remaining))} of your ${money(mandate.budgetUsd)}. ${money(remaining)} is left unspent.`,
    tooLarge.length > 0
      ? `Matched but not proposed: ${names(tooLarge)}. ${completeOnly ? "Their asks cannot be completed within your cap and what is left of the budget, and your mandate prefers finishing an ask." : "None of their listed items fits within your cap and what is left of the budget."}${hint}`
      : "",
    unsettled.length > 0 ? `Not settled either way, worth reading yourself: ${names(unsettled)}.` : "",
    passed.length > 0 ? `Passed over as outside your mandate: ${names(passed)}.` : "",
    setAside.length > 0
      ? `Set aside because the text addresses software instead of a reader: ${setAside.map((r) => r.pitch.author).join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  await setMandateSummary(mandate.id, note);
  emit({ type: "done", mandateId: mandate.id, summary: note });
}
