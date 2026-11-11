import type { PitchKind } from "./types";

/**
 * What a patron says once, ahead of time, about the giving they want to do.
 * Shared by the form in the browser and the agent on the server, so both read
 * the same lists and apply the same checks.
 */

/**
 * The headings recommendations are grouped under. A letter's kind is chosen by
 * its writer and never decides whether the letter is read.
 */
export const KINDS: { id: PitchKind; plural: string }[] = [
  { id: "story", plural: "People" },
  { id: "project", plural: "Projects" },
  { id: "opinion", plural: "Arguments" },
];

/**
 * Causes a patron can pick. `about` completes the sentence "a request for
 * money toward …" and is what Jev is asked about, one question per cause.
 */
export const CAUSES = [
  {
    id: "education",
    label: "Education and training",
    about: "school, a course, a certificate or exam, or teaching and learning materials",
  },
  {
    id: "health",
    label: "Health and care",
    about: "medical treatment, the care of a sick, elderly or disabled person, or access for disabled people",
  },
  {
    id: "livelihood",
    label: "Tools for earning a living",
    about: "equipment, a licence or another purchase that lets the writer work or earn more",
  },
  {
    id: "technology",
    label: "Technology and making",
    about: "building or improving hardware, software or another invention",
  },
  {
    id: "knowledge",
    label: "Open knowledge",
    about: "journalism, research, public data or free material that anyone may use",
  },
  {
    id: "community",
    label: "Community and small business",
    about: "a local service, a market, a neighbourhood group or a small enterprise",
  },
] as const;

export type Cause = (typeof CAUSES)[number];
export type CauseId = Cause["id"];

/** `complete`: only gifts that finish a letter's ask. `spread`: part-funding is fine. */
export type GivingStyle = "complete" | "spread";

export const STYLE_LABEL: Record<GivingStyle, string> = {
  complete: "Finish one ask at a time",
  spread: "Spread across several letters",
};

export interface Preferences {
  causes: CauseId[];
  /** Optional, in the patron's own words: what else should be true of a letter. */
  note: string;
  style: GivingStyle;
  budgetUsd: number;
  perGiftCapUsd: number;
  patronName: string;
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const amount = (value: unknown): number => Math.round(Number(value) * 100) / 100;

/** Returns clean preferences, or a sentence saying what is missing. */
export function parsePreferences(raw: unknown): Preferences | string {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const wantedCauses = strings(body.causes);
  const causes = CAUSES.map((c) => c.id).filter((id) => wantedCauses.includes(id));
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 600) : "";
  const style: GivingStyle = body.style === "spread" ? "spread" : "complete";
  const budgetUsd = amount(body.budgetUsd);
  const perGiftCapUsd = amount(body.perGiftCapUsd);
  const patronName = typeof body.patronName === "string" ? body.patronName.trim().slice(0, 80) : "";

  if (causes.length === 0 && note.length < 12) {
    return "Choose at least one cause, or say in a sentence what you look for.";
  }
  if (!(budgetUsd >= 5 && budgetUsd <= 100_000)) return "Set a budget between $5 and $100,000.";
  if (!(perGiftCapUsd >= 1 && perGiftCapUsd <= budgetUsd)) {
    return "The most for one letter must be at least $1 and no more than the budget.";
  }

  return { causes, note, style, budgetUsd, perGiftCapUsd, patronName };
}

export const causeById = (id: CauseId): Cause => CAUSES.find((c) => c.id === id)!;
