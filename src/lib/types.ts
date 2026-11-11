import type { Preferences } from "./preferences";

export type PitchKind = "story" | "project" | "opinion";

export interface FundLine {
  item: string;
  amountUsd: number;
}

export interface Pitch {
  id: string;
  kind: PitchKind;
  author: string;
  location: string;
  headline: string;
  summary: string;
  body: string;
  askUsd: number;
  raisedUsd: number;
  useOfFunds: FundLine[];
  tags: string[];
  /** PayPal email that receives gifts. Empty on sample letters. */
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
  /** What the amount pays for. Assembled by code from the letter's own figures. */
  rationale: string;
  /** How well the letter fits the patron's preferences, from Jev's probabilities. */
  fit?: number;
  /** Which of the patron's preferences the letter met, each with its probability. */
  matches?: { label: string; p: number }[];
  /** The writer's own sentence that best shows the fit. */
  quote?: string;
  /** Shown when the letter names no one who could confirm it. */
  verify?: string;
  status: "proposed" | "paid" | "skipped";
}

/** One reading of the letterbox against a patron's saved preferences. */
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

export interface Database {
  pitches: Pitch[];
  gifts: Gift[];
  mandates: Mandate[];
  interests: Interest[];
}
