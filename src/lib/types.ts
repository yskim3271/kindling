import type { Preferences } from "./preferences";

/** How far along a game is, as its developer describes it. */
export type Stage = "prototype" | "demo" | "production" | "polish";

export interface FundLine {
  item: string;
  amountUsd: number;
}

/** A game in progress, posted by its developer with the things it still needs. */
export interface Pitch {
  id: string;
  /** The game's title. */
  title: string;
  /** One line that says what the game is. */
  headline: string;
  /** The developer or studio. */
  author: string;
  location: string;
  summary: string;
  /** The developer's letter, in their own words. */
  body: string;
  stage: Stage;
  /** The developer's own genre tags. */
  genres: string[];
  /** A public page where a stranger can play or watch the game. Empty on sample projects. */
  playUrl?: string;
  askUsd: number;
  raisedUsd: number;
  useOfFunds: FundLine[];
  /** PayPal email that receives gifts. Empty on sample projects. */
  paypalEmail?: string;
  openToInvestment: boolean;
  /** Seeded demo content, labelled as such in the UI. */
  sample: boolean;
  createdAt: string;
}

export type GiftStatus = "created" | "captured" | "failed";

export interface Gift {
  id: string;
  pitchId: string;
  amountUsd: number;
  patronName: string;
  note?: string;
  source: "manual" | "agent";
  mandateId?: string;
  proposalId?: string;
  status: GiftStatus;
  orderId?: string;
  captureId?: string;
  payee: "writer" | "platform";
  createdAt: string;
  capturedAt?: string;
}

export interface Proposal {
  id: string;
  pitchId: string;
  amountUsd: number;
  /** What the amount pays for. Assembled by code from the project's own figures. */
  rationale: string;
  /** How well the project fits the patron's preferences, from Jev's probabilities. */
  fit?: number;
  /** Which of the patron's preferences the project met, each with its probability. */
  matches?: { label: string; p: number }[];
  /** The developer's own sentence that best shows the fit. */
  quote?: string;
  /** Shown when the letter describes plans but nothing built yet. */
  verify?: string;
  status: "proposed" | "paid" | "skipped";
}

/** One reading of the open projects against a patron's saved preferences. */
export interface Mandate extends Preferences {
  id: string;
  proposals: Proposal[];
  summary?: string;
  createdAt: string;
}

export interface Interest {
  id: string;
  pitchId: string;
  name: string;
  email: string;
  amountUsd?: number;
  message: string;
  createdAt: string;
}
