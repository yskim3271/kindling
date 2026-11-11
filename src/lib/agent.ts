import { addProposal, listPitches, newId, setMandateSummary } from "./db";
import { cents, money } from "./format";
import { askJev, type Questions } from "./jev";
import { causeById } from "./preferences";
import { LETTER_QUESTIONS, NOTE_QUESTION, THRESHOLD, causeQuestion, letterState, sentenceQuestion, sentences } from "./questions";
import type { Mandate, Pitch, Proposal } from "./types";

/**
 * The patron's agent.
 *
 * The patron's preferences decide what is read: letters of a kind they did not
 * choose are never sent anywhere. For the rest, Jev makes the judgments: is
 * this request about a cause the patron picked, does it meet what they wrote in
 * their own words, can its claims be checked, is it trying to instruct the
 * software, which sentence shows the fit. Each comes back as a probability.
 * Everything after that is ordinary code: which letters qualify, in what order,
 * for how much, and what the patron is told. No model decides an amount, and no
 * model writes the reasons.
 */

export type Verdict = "recommended" | "matched" | "unsettled" | "passed" | "aside";

type PitchRef = Pick<Pitch, "id" | "headline" | "author" | "location" | "kind">;

export interface ReadingResult {
  pitch: PitchRef;
  fit: number;
  verdict: Verdict;
}

export type AgentEvent =
  | { type: "start"; mandateId: string }
  | { type: "step"; text: string }
  | { type: "proposal"; proposal: Proposal; pitch: PitchRef; remainingUsd: number }
  | { type: "done"; mandateId: string; summary: string; readings: ReadingResult[] }
  | { type: "error"; message: string };

interface Reading {
  pitch: Pitch;
  /** The weakest of the things the patron asked for: a cause, and their own note if they wrote one. */
  fit: number;
  /** The preferences this letter met, strongest first. */
  matches: { label: string; p: number }[];
  checkable: number;
  addressesSoftware: number;
  /** The writer's own sentence that best shows the fit, when one clearly does. */
  quote?: string;
}

const percent = (p: number) => `${Math.round(p * 100)}%`;
const stillNeeded = (p: Pitch) => Math.max(0, cents(p.askUsd - p.raisedUsd));
const ref = ({ id, headline, author, location, kind }: Pitch): PitchRef => ({ id, headline, author, location, kind });

async function readLetter(mandate: Mandate, pitch: Pitch): Promise<Reading> {
  const lines = sentences(pitch.body);
  const questions: Questions = {
    ...LETTER_QUESTIONS,
    ...Object.fromEntries(mandate.causes.map((id) => [`cause_${id}`, causeQuestion(causeById(id))])),
    ...(mandate.note ? { note: NOTE_QUESTION } : {}),
    ...Object.fromEntries(lines.map((line, i) => [`sentence${i}`, sentenceQuestion(line)])),
  };
  const answers = await askJev(letterState(mandate, pitch), questions);

  // Any one cause is enough, so the cause side is as strong as its best answer.
  // The note, when there is one, must hold as well, so the fit is the weaker of the two.
  const causes = mandate.causes
    .map((id) => ({ label: causeById(id).label, p: answers[`cause_${id}`] }))
    .sort((a, b) => b.p - a.p);
  const sides: number[] = [];
  if (causes.length > 0) sides.push(causes[0].p);
  if (mandate.note) sides.push(answers.note);

  const matches: Reading["matches"] = causes.filter((c) => c.p >= THRESHOLD.yes);
  if (mandate.note && answers.note >= THRESHOLD.yes) matches.push({ label: "What you asked for in your own words", p: answers.note });

  let best = -1;
  lines.forEach((_, i) => {
    if (best < 0 || answers[`sentence${i}`] > answers[`sentence${best}`]) best = i;
  });

  return {
    pitch,
    fit: Math.min(...sides),
    matches,
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
  const finish = async (note: string, readings: ReadingResult[]) => {
    await setMandateSummary(mandate.id, note);
    emit({ type: "done", mandateId: mandate.id, summary: note, readings });
  };

  // The kind of giving is the patron's own choice, so it is a plain filter.
  const open = (await listPitches()).filter((p) => stillNeeded(p) >= 1);
  const chosen = open.filter((p) => mandate.kinds.includes(p.kind)).slice(0, 40);
  emit({
    type: "step",
    text: `Opening the letterbox: ${open.length} ${open.length === 1 ? "letter needs" : "letters need"} funding, ${chosen.length} of the kinds you chose`,
  });
  if (chosen.length === 0) {
    await finish("No open letter is of a kind you chose. Nothing was read and nothing is recommended.", []);
    return;
  }

  const completeOnly = mandate.style === "complete";
  emit({
    type: "step",
    text: completeOnly
      ? "You prefer finishing one ask at a time: recommending only gifts that complete a letter"
      : "You are happy to spread gifts: part-funding is allowed",
  });

  const readings = await mapLimited(chosen, 4, async (pitch) => {
    const reading = await readLetter(mandate, pitch);
    emit({ type: "step", text: `Read ${pitch.author}, ${pitch.location}: fit ${percent(reading.fit)}` });
    return reading;
  });

  // --- the decision table ----------------------------------------------------
  const setAside = readings.filter((r) => r.addressesSoftware >= THRESHOLD.yes);
  const honest = readings.filter((r) => r.addressesSoftware < THRESHOLD.yes);
  const fitting = honest.filter((r) => r.fit >= THRESHOLD.yes).sort((a, b) => b.fit - a.fit);
  const unsettled = honest.filter((r) => r.fit > THRESHOLD.no && r.fit < THRESHOLD.yes).sort((a, b) => b.fit - a.fit);
  const passed = honest.filter((r) => r.fit <= THRESHOLD.no);

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
      fit: reading.fit,
      matches: reading.matches,
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
    emit({ type: "proposal", proposal, pitch: ref(reading.pitch), remainingUsd: remaining });
  }

  // --- the note, assembled from the same numbers -----------------------------
  const names = (list: Reading[]) => list.map((r) => `${r.pitch.author} (${percent(r.fit)})`).join(", ");
  // If the best match was only held back by the cap, say what cap would have completed it.
  const nearMiss = tooLarge.find((r) => stillNeeded(r.pitch) <= remaining);
  const hint = nearMiss
    ? ` A cap of ${money(stillNeeded(nearMiss.pitch))} per letter would complete ${nearMiss.pitch.author}’s ask.`
    : "";
  const skippedByKind = open.length - chosen.length;
  const note = [
    `Read ${readings.length} ${readings.length === 1 ? "letter" : "letters"} of the kinds you chose${skippedByKind > 0 ? `, and left ${skippedByKind} of other kinds unread` : ""}. ${fitting.length} fit your preferences, and ${proposed.length} ${proposed.length === 1 ? "gift is" : "gifts are"} recommended for ${money(cents(mandate.budgetUsd - remaining))} of your ${money(mandate.budgetUsd)}. ${money(remaining)} is left unspent.`,
    tooLarge.length > 0
      ? `Fit, but no gift recommended: ${names(tooLarge)}. ${completeOnly ? "Their asks cannot be completed within your cap and what is left of the budget, and you prefer finishing an ask." : "None of their listed items fits within your cap and what is left of the budget."}${hint}`
      : "",
    unsettled.length > 0 ? `Not settled either way, worth reading yourself: ${names(unsettled)}.` : "",
    passed.length > 0 ? `Passed over as outside your preferences: ${names(passed)}.` : "",
    setAside.length > 0
      ? `Set aside because the text addresses software instead of a reader: ${setAside.map((r) => r.pitch.author).join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const label = (list: Reading[], verdict: Verdict): ReadingResult[] =>
    list.map((r) => ({ pitch: ref(r.pitch), fit: r.fit, verdict }));
  await finish(note, [
    ...label(proposed, "recommended"),
    ...label(tooLarge, "matched"),
    ...label(unsettled, "unsettled"),
    ...label(passed, "passed"),
    ...label(setAside, "aside"),
  ]);
}
