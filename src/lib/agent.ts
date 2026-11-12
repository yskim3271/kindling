import { addProposal, listPitches, newId, setMandateSummary } from "./db";
import { cents, money } from "./format";
import { askJev, type Questions } from "./jev";
import { needById, tasteById } from "./preferences";
import {
  NOTE_QUESTION,
  PROJECT_QUESTIONS,
  itemQuestion,
  THRESHOLD,
  needQuestion,
  projectState,
  sentenceQuestion,
  sentences,
  tasteQuestion,
} from "./questions";
import type { Mandate, Pitch, Proposal } from "./types";

/**
 * The patron's agent.
 *
 * Every open project is read against the patron's preferences. Jev makes the
 * judgments: is this the kind of game the patron likes, does it ask for the
 * kind of thing they want to pay for, does it meet what they wrote in their own
 * words, has anything been built yet, is the letter trying to instruct the
 * software, which sentence shows the fit. Each comes back as a probability.
 * Everything after that is ordinary code: which projects qualify, in what
 * order, for how much, and what the patron is told. No model decides an amount, and no
 * model writes the reasons.
 */

export type Verdict = "recommended" | "matched" | "unsettled" | "passed" | "aside";

type PitchRef = Pick<Pitch, "id" | "title" | "headline" | "author" | "location" | "stage" | "playUrl">;

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
  /** The weakest side of what the patron asked for: a kind of game, something to pay for, their own note. */
  fit: number;
  /** The preferences this project met, strongest first within each side. */
  matches: { label: string; p: number }[];
  /**
   * For each line of the project's list, whether it is something the patron
   * said they would pay for. Absent when the patron chose nothing to pay for.
   */
  wanted?: boolean[];
  showsProgress: number;
  addressesSoftware: number;
  /** The developer's own sentence that best shows the fit, when one clearly does. */
  quote?: string;
}

const percent = (p: number) => `${Math.round(p * 100)}%`;
const stillNeeded = (p: Pitch) => Math.max(0, cents(p.askUsd - p.raisedUsd));
const ref = ({ id, title, headline, author, location, stage, playUrl }: Pitch): PitchRef => ({
  id,
  title,
  headline,
  author,
  location,
  stage,
  playUrl,
});

async function readProject(mandate: Mandate, pitch: Pitch): Promise<Reading> {
  const lines = sentences(pitch.body);
  const questions: Questions = {
    ...PROJECT_QUESTIONS,
    ...Object.fromEntries(mandate.tastes.map((id) => [`taste_${id}`, tasteQuestion(tasteById(id))])),
    ...Object.fromEntries(mandate.needs.map((id) => [`need_${id}`, needQuestion(needById(id))])),
    ...(mandate.note ? { note: NOTE_QUESTION } : {}),
    ...Object.fromEntries(
      pitch.useOfFunds.flatMap((line, i) =>
        mandate.needs.map((id) => [`item${i}_${id}`, itemQuestion(line.item, needById(id))] as const),
      ),
    ),
    ...Object.fromEntries(lines.map((line, i) => [`sentence${i}`, sentenceQuestion(line)])),
  };
  const answers = await askJev(projectState(mandate, pitch), questions);

  // Within a list any one choice is enough, so each side is as strong as its
  // best answer. Every side the patron filled in must hold, so the fit is the
  // weakest of them.
  const strongestFirst = (list: { label: string; p: number }[]) => list.sort((a, b) => b.p - a.p);
  const tastes = strongestFirst(mandate.tastes.map((id) => ({ label: tasteById(id).label, p: answers[`taste_${id}`] })));
  const needs = strongestFirst(mandate.needs.map((id) => ({ label: needById(id).label, p: answers[`need_${id}`] })));
  const sides: number[] = [];
  if (tastes.length > 0) sides.push(tastes[0].p);
  if (needs.length > 0) sides.push(needs[0].p);
  if (mandate.note) sides.push(answers.note);

  const matches = [...tastes, ...needs].filter((m) => m.p >= THRESHOLD.yes);
  if (mandate.note && answers.note >= THRESHOLD.yes) matches.push({ label: "What you asked for in your own words", p: answers.note });

  let best = -1;
  lines.forEach((_, i) => {
    if (best < 0 || answers[`sentence${i}`] > answers[`sentence${best}`]) best = i;
  });

  return {
    pitch,
    fit: Math.min(...sides),
    matches,
    wanted:
      mandate.needs.length > 0
        ? pitch.useOfFunds.map((_, i) => mandate.needs.some((id) => answers[`item${i}_${id}`] >= THRESHOLD.yes))
        : undefined,
    showsProgress: answers.showsProgress,
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
 * How much to give one project out of `available`, and what that buys.
 * Returns nothing when no sensible gift exists.
 */
function sizeGift(
  pitch: Pitch,
  available: number,
  completeOnly: boolean,
  wanted?: boolean[],
): { amount: number; covers: string } | undefined {
  const need = stillNeeded(pitch);
  if (available < 1 || need < 1) return undefined;

  const listed = (lines: Pitch["useOfFunds"]) => lines.map((l) => `${l.item} (${money(l.amountUsd)})`).join(", ");

  // A patron who spreads gifts and named what they pay for gets those items, not the whole ask.
  const chosen = !completeOnly && wanted?.some(Boolean) ? pitch.useOfFunds.filter((_, i) => wanted[i]) : undefined;

  if (need <= available && (!chosen || chosen.length === pitch.useOfFunds.length)) {
    const fresh = pitch.raisedUsd === 0 && pitch.useOfFunds.length > 0;
    return {
      amount: need,
      covers: fresh ? `Covers the whole ask: ${listed(pitch.useOfFunds)}.` : "Covers everything the project still needs.",
    };
  }
  if (completeOnly) return undefined;

  // Part-funding: pay for whole items, in the order the developer listed them.
  const limit = Math.min(available, need);
  const affordable: Pitch["useOfFunds"] = [];
  let total = 0;
  for (const line of chosen ?? pitch.useOfFunds) {
    if (total + line.amountUsd <= limit) {
      affordable.push(line);
      total += line.amountUsd;
    }
  }
  if (affordable.length === 0) return undefined;
  const rest = cents(need - total);
  return {
    amount: cents(total),
    covers: `Pays for ${listed(affordable)}${chosen ? ", the part of the ask you said you would pay for" : ""}. ${
      rest > 0 ? `The project would still need ${money(rest)}.` : "That completes the ask."
    }`,
  };
}

export async function runPatronAgent(mandate: Mandate, emit: (event: AgentEvent) => void): Promise<void> {
  const finish = async (note: string, readings: ReadingResult[]) => {
    await setMandateSummary(mandate.id, note);
    emit({ type: "done", mandateId: mandate.id, summary: note, readings });
  };

  const open = (await listPitches()).filter((p) => stillNeeded(p) >= 1).slice(0, 40);
  emit({
    type: "step",
    text: `Opening the board: ${open.length} ${open.length === 1 ? "game needs" : "games need"} funding`,
  });
  if (open.length === 0) {
    await finish("No game needs funding right now. Nothing was read and nothing is recommended.", []);
    return;
  }

  const completeOnly = mandate.style === "complete";
  emit({
    type: "step",
    text: completeOnly
      ? "You prefer finishing one ask at a time: recommending only gifts that complete a project"
      : "You are happy to spread gifts: part-funding is allowed",
  });

  const readings = await mapLimited(open, 4, async (pitch) => {
    const reading = await readProject(mandate, pitch);
    emit({ type: "step", text: `Read ${pitch.title}, by ${pitch.author}: fit ${percent(reading.fit)}` });
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
    const gift = sizeGift(reading.pitch, Math.min(mandate.perGiftCapUsd, remaining), completeOnly, reading.wanted);
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
        reading.showsProgress <= THRESHOLD.no
          ? "The letter describes plans more than anything built so far. Ask the developer for a build before you pay."
          : undefined,
      status: "proposed",
    };
    await addProposal(mandate.id, proposal);
    remaining = cents(remaining - gift.amount);
    proposed.push(reading);
    emit({ type: "proposal", proposal, pitch: ref(reading.pitch), remainingUsd: remaining });
  }

  // --- the note, assembled from the same numbers -----------------------------
  const names = (list: Reading[]) => list.map((r) => `${r.pitch.title} (${percent(r.fit)})`).join(", ");
  // If the best match was only held back by the cap, say what cap would have completed it.
  const nearMiss = tooLarge.find((r) => stillNeeded(r.pitch) <= remaining);
  const hint = nearMiss
    ? ` A cap of ${money(stillNeeded(nearMiss.pitch))} per game would complete what ${nearMiss.pitch.title} asks for.`
    : "";
  const note = [
    `Read ${readings.length} ${readings.length === 1 ? "project" : "projects"}. ${fitting.length} fit your preferences, and ${proposed.length} ${proposed.length === 1 ? "gift is" : "gifts are"} recommended for ${money(cents(mandate.budgetUsd - remaining))} of your ${money(mandate.budgetUsd)}. ${money(remaining)} is left unspent.`,
    tooLarge.length > 0
      ? `Fit, but no gift recommended: ${names(tooLarge)}. ${completeOnly ? "Their asks cannot be completed within your cap and what is left of the budget, and you prefer finishing an ask." : "None of the items you would pay for fits within your cap and what is left of the budget."}${hint}`
      : "",
    unsettled.length > 0 ? `Not settled either way, worth reading yourself: ${names(unsettled)}.` : "",
    passed.length > 0 ? `Passed over as outside your preferences: ${names(passed)}.` : "",
    setAside.length > 0
      ? `Set aside because the letter addresses software instead of a reader: ${setAside.map((r) => r.pitch.title).join(", ")}.`
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
