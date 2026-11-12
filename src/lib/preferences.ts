import type { Stage } from "./types";

/**
 * What a patron says once, ahead of time, about the games they want to help.
 * Shared by the form in the browser and the agent on the server, so both read
 * the same lists and apply the same checks.
 */

export const STAGES: { id: Stage; label: string }[] = [
  { id: "prototype", label: "Prototype" },
  { id: "demo", label: "Playable demo" },
  { id: "production", label: "In production" },
  { id: "polish", label: "Nearly done" },
];

export const stageLabel = (stage: Stage): string => STAGES.find((s) => s.id === stage)?.label ?? "In progress";

/**
 * Kinds of game a patron can say they like. `about` completes the sentence
 * "the game is …" and is what Jev is asked about, one question per choice.
 * Developers do not pick from this list; the agent reads what they wrote.
 */
export const TASTES = [
  { id: "story", label: "Story and characters", about: "built around its story, its characters or its writing" },
  { id: "puzzle", label: "Puzzles", about: "a puzzle game, or mostly about working things out" },
  { id: "action", label: "Action and platformers", about: "about reflexes, movement or combat" },
  { id: "strategy", label: "Strategy and simulation", about: "a strategy, tactics, management or simulation game" },
  { id: "cozy", label: "Calm and gentle", about: "a calm, low-pressure game meant to be relaxing" },
  { id: "together", label: "Played together", about: "made to be played with other people, in the same room or online" },
  { id: "strange", label: "Experimental", about: "an unusual game that tries an idea few games have tried" },
] as const;

/**
 * Things a patron's money can pay for. `about` completes the sentence "a
 * request for money toward …".
 */
export const NEEDS = [
  { id: "art", label: "Art and animation", about: "art, animation or other visual work for the game" },
  { id: "audio", label: "Music, sound and voice", about: "music, sound design or voice acting" },
  { id: "release", label: "Release costs", about: "store fees, licences, software or other costs of putting the game on sale" },
  { id: "hardware", label: "Hardware", about: "a computer, a console, a development kit, controllers or other equipment" },
  { id: "reach", label: "Translation, access and testing", about: "translation, accessibility work or testing with players" },
  { id: "time", label: "Time to finish", about: "living costs or wages so that someone can keep working on the game" },
] as const;

export type Taste = (typeof TASTES)[number];
export type TasteId = Taste["id"];
export type Need = (typeof NEEDS)[number];
export type NeedId = Need["id"];

/** `complete`: only gifts that finish what a project still needs. `spread`: part-funding is fine. */
export type GivingStyle = "complete" | "spread";

export const STYLE_LABEL: Record<GivingStyle, string> = {
  complete: "Finish one ask at a time",
  spread: "Spread across several games",
};

export interface Preferences {
  tastes: TasteId[];
  needs: NeedId[];
  /** Optional, in the patron's own words: what else should be true of a project. */
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

  const wantedTastes = strings(body.tastes);
  const wantedNeeds = strings(body.needs);
  const tastes = TASTES.map((t) => t.id).filter((id) => wantedTastes.includes(id));
  const needs = NEEDS.map((n) => n.id).filter((id) => wantedNeeds.includes(id));
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 600) : "";
  const style: GivingStyle = body.style === "spread" ? "spread" : "complete";
  const budgetUsd = amount(body.budgetUsd);
  const perGiftCapUsd = amount(body.perGiftCapUsd);
  const patronName = typeof body.patronName === "string" ? body.patronName.trim().slice(0, 80) : "";

  if (tastes.length === 0 && needs.length === 0 && note.length < 12) {
    return "Choose a kind of game or something to pay for, or say in a sentence what you look for.";
  }
  if (!(budgetUsd >= 5 && budgetUsd <= 100_000)) return "Set a budget between $5 and $100,000.";
  if (!(perGiftCapUsd >= 1 && perGiftCapUsd <= budgetUsd)) {
    return "The most for one game must be at least $1 and no more than the budget.";
  }

  return { tastes, needs, note, style, budgetUsd, perGiftCapUsd, patronName };
}

export const tasteById = (id: TasteId): Taste => TASTES.find((t) => t.id === id)!;
export const needById = (id: NeedId): Need => NEEDS.find((n) => n.id === id)!;
