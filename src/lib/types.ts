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
  /** Present when the writer drafted in a language other than English. */
  originalBody?: string;
  language?: string;
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
  rationale: string;
  /** Something the agent could not confirm from the letter alone. */
  verify?: string;
  status: "proposed" | "paid" | "skipped";
}

export interface Mandate {
  id: string;
  patronName: string;
  thesis: string;
  budgetUsd: number;
  perGiftCapUsd: number;
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
