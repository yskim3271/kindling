import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { seedPitches } from "./seed";
import type { Database, Gift, Interest, Mandate, Pitch } from "./types";

/**
 * A single JSON file on local disk. Enough for a demo and for judges to run
 * locally; swap for Postgres before real money moves.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function load(): Database {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Database;
  } catch {
    const fresh: Database = { pitches: seedPitches(), gifts: [], mandates: [], interests: [] };
    save(fresh);
    return fresh;
  }
}

function save(db: Database) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

/** Read, mutate and persist in one synchronous step. */
function update<T>(fn: (db: Database) => T): T {
  const db = load();
  const result = fn(db);
  save(db);
  return result;
}

export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

// --- pitches ---------------------------------------------------------------

export function listPitches(): Pitch[] {
  return load().pitches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPitch(id: string): Pitch | undefined {
  return load().pitches.find((p) => p.id === id);
}

export function addPitch(pitch: Pitch): Pitch {
  return update((db) => {
    db.pitches.push(pitch);
    return pitch;
  });
}

// --- gifts -----------------------------------------------------------------

export function listGifts(): Gift[] {
  return load().gifts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addGift(gift: Gift): Gift {
  return update((db) => {
    db.gifts.push(gift);
    return gift;
  });
}

export function getGiftByOrder(orderId: string): Gift | undefined {
  return load().gifts.find((g) => g.orderId === orderId);
}

export function patchGift(id: string, patch: Partial<Gift>): Gift | undefined {
  return update((db) => {
    const gift = db.gifts.find((g) => g.id === id);
    if (gift) Object.assign(gift, patch);
    return gift;
  });
}

/**
 * Mark a gift captured, credit the letter, and settle the agent proposal it
 * came from. Idempotent: a second call for an already-captured gift is a no-op.
 */
export function settleGift(id: string, captureId: string): Gift | undefined {
  return update((db) => {
    const gift = db.gifts.find((g) => g.id === id);
    if (!gift || gift.status === "captured") return gift;
    gift.status = "captured";
    gift.captureId = captureId;
    gift.capturedAt = new Date().toISOString();
    const pitch = db.pitches.find((p) => p.id === gift.pitchId);
    if (pitch) pitch.raisedUsd = Math.round((pitch.raisedUsd + gift.amountUsd) * 100) / 100;
    if (gift.mandateId && gift.proposalId) {
      const proposal = db.mandates
        .find((m) => m.id === gift.mandateId)
        ?.proposals.find((p) => p.id === gift.proposalId);
      if (proposal) proposal.status = "paid";
    }
    return gift;
  });
}

// --- mandates --------------------------------------------------------------

export function addMandate(mandate: Mandate): Mandate {
  return update((db) => {
    db.mandates.push(mandate);
    return mandate;
  });
}

export function getMandate(id: string): Mandate | undefined {
  return load().mandates.find((m) => m.id === id);
}

export function patchMandate(id: string, fn: (mandate: Mandate) => void): Mandate | undefined {
  return update((db) => {
    const mandate = db.mandates.find((m) => m.id === id);
    if (mandate) fn(mandate);
    return mandate;
  });
}

// --- investment interest ---------------------------------------------------

export function addInterest(interest: Interest): Interest {
  return update((db) => {
    db.interests.push(interest);
    return interest;
  });
}

export function countInterest(pitchId: string): number {
  return load().interests.filter((i) => i.pitchId === pitchId).length;
}
