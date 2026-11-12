import { seedPitches } from "./seed";
import type { Gift, Interest, Mandate, Pitch, Proposal } from "./types";

/**
 * Storage with two backends behind one small interface:
 *
 *  - Cloudflare D1 when the app runs on Workers (a `DB` binding is present)
 *  - a JSON file in ./data when it runs under plain Node (`npm run dev`)
 *
 * Every record is one row: (kind, id, json). Records that different requests
 * may write at the same moment are separate rows, and the one running total
 * (a project's raised amount) is changed with a single atomic statement.
 */

/**
 * Marks that the sample game projects have been added. Stores that were first
 * filled before Kindling narrowed to games get the samples once, on top of
 * what they hold; nothing already stored is deleted.
 */
const SEED_MARK = "seeded:games";

type Kind = "pitch" | "gift" | "mandate" | "proposal" | "interest" | "counter";

interface Backend {
  list<T>(kind: Kind): Promise<T[]>;
  get<T>(kind: Kind, id: string): Promise<T | undefined>;
  put(kind: Kind, id: string, doc: unknown): Promise<void>;
  /** Add to a numeric field in one step and return the new value. Creates the record if needed. */
  add(kind: Kind, id: string, field: string, amount: number): Promise<number>;
}

// --- Cloudflare D1 -----------------------------------------------------------

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
}

/** The adapter puts the Worker's bindings here for the length of a request. */
function d1Binding(): D1Database | undefined {
  const context = (globalThis as Record<symbol, unknown>)[Symbol.for("__cloudflare-context__")] as
    | { env?: { DB?: D1Database } }
    | undefined;
  return context?.env?.DB;
}

let d1Ready = false;

async function d1Backend(db: D1Database): Promise<Backend> {
  if (!d1Ready) {
    await db
      .prepare(
        "CREATE TABLE IF NOT EXISTS docs (kind TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (kind, id))",
      )
      .run();
    const seeded = await db.prepare("SELECT 1 AS yes FROM docs WHERE kind = 'counter' AND id = ?1").bind(SEED_MARK).first();
    if (!seeded) {
      const insert = "INSERT OR IGNORE INTO docs (kind, id, json) VALUES (?1, ?2, ?3)";
      await db.batch([
        ...seedPitches().map((p) => db.prepare(insert).bind("pitch", p.id, JSON.stringify(p))),
        db.prepare(insert).bind("counter", SEED_MARK, JSON.stringify({ n: 1 })),
      ]);
    }
    d1Ready = true;
  }

  return {
    async list<T>(kind: Kind) {
      const { results } = await db.prepare("SELECT json FROM docs WHERE kind = ?1").bind(kind).all<{ json: string }>();
      return results.map((row) => JSON.parse(row.json) as T);
    },
    async get<T>(kind: Kind, id: string) {
      const row = await db
        .prepare("SELECT json FROM docs WHERE kind = ?1 AND id = ?2")
        .bind(kind, id)
        .first<{ json: string }>();
      return row ? (JSON.parse(row.json) as T) : undefined;
    },
    async put(kind, id, doc) {
      await db
        .prepare(
          "INSERT INTO docs (kind, id, json) VALUES (?1, ?2, ?3) ON CONFLICT (kind, id) DO UPDATE SET json = excluded.json",
        )
        .bind(kind, id, JSON.stringify(doc))
        .run();
    },
    async add(kind, id, field, amount) {
      const row = await db
        .prepare(
          `INSERT INTO docs (kind, id, json) VALUES (?1, ?2, json_object(?3, ?4))
           ON CONFLICT (kind, id) DO UPDATE SET
             json = json_set(json, '$.' || ?3, round(coalesce(json_extract(json, '$.' || ?3), 0) + ?4, 2))
           RETURNING json_extract(json, '$.' || ?3) AS value`,
        )
        .bind(kind, id, field, amount)
        .first<{ value: number }>();
      return row?.value ?? amount;
    },
  };
}

// --- JSON file (local Node) --------------------------------------------------

type FileShape = Partial<Record<Kind, Record<string, unknown>>>;

async function fileBackend(): Promise<Backend> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "db.json");

  const load = (): FileShape => {
    let data: FileShape;
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8")) as FileShape;
    } catch {
      data = {};
    }
    if (!data.counter?.[SEED_MARK]) {
      data.pitch = { ...Object.fromEntries(seedPitches().map((p) => [p.id, p])), ...data.pitch };
      (data.counter ??= {})[SEED_MARK] = { n: 1 };
      save(data);
    }
    return data;
  };
  const save = (data: FileShape) => {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  };

  return {
    async list<T>(kind: Kind) {
      return Object.values(load()[kind] ?? {}) as T[];
    },
    async get<T>(kind: Kind, id: string) {
      return load()[kind]?.[id] as T | undefined;
    },
    async put(kind, id, doc) {
      const data = load();
      (data[kind] ??= {})[id] = doc;
      save(data);
    },
    async add(kind, id, field, amount) {
      const data = load();
      const doc = ((data[kind] ??= {})[id] ??= {}) as Record<string, number>;
      doc[field] = Math.round(((doc[field] ?? 0) + amount) * 100) / 100;
      save(data);
      return doc[field];
    },
  };
}

async function store(): Promise<Backend> {
  const d1 = d1Binding();
  return d1 ? d1Backend(d1) : fileBackend();
}

const newestFirst = <T extends { createdAt: string }>(items: T[]) =>
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

// --- projects ----------------------------------------------------------------

/**
 * Records posted before Kindling narrowed to games have no title or stage.
 * They stay in storage, so old ledger lines keep their history, but they are
 * no longer listed, opened or funded.
 */
const isGame = (pitch: Pitch | undefined): pitch is Pitch =>
  typeof pitch?.title === "string" && typeof pitch.stage === "string";

export async function listPitches(): Promise<Pitch[]> {
  return newestFirst((await (await store()).list<Pitch>("pitch")).filter(isGame));
}

export async function getPitch(id: string): Promise<Pitch | undefined> {
  const pitch = await (await store()).get<Pitch>("pitch", id);
  return isGame(pitch) ? pitch : undefined;
}

export async function addPitch(pitch: Pitch): Promise<void> {
  await (await store()).put("pitch", pitch.id, pitch);
}

// --- gifts -------------------------------------------------------------------

export async function listGifts(): Promise<Gift[]> {
  return newestFirst(await (await store()).list<Gift>("gift"));
}

export async function addGift(gift: Gift): Promise<void> {
  await (await store()).put("gift", gift.id, gift);
}

export async function getGiftByOrder(orderId: string): Promise<Gift | undefined> {
  return (await (await store()).list<Gift>("gift")).find((g) => g.orderId === orderId);
}

export async function patchGift(id: string, patch: Partial<Gift>): Promise<Gift | undefined> {
  const db = await store();
  const gift = await db.get<Gift>("gift", id);
  if (!gift) return undefined;
  const next = { ...gift, ...patch };
  await db.put("gift", id, next);
  return next;
}

/**
 * Mark a gift captured, credit the project, and settle the agent proposal it
 * came from. A second call for an already-captured gift changes nothing.
 */
export async function settleGift(id: string, captureId: string): Promise<Gift | undefined> {
  const db = await store();
  const gift = await db.get<Gift>("gift", id);
  if (!gift || gift.status === "captured") return gift;

  const settled: Gift = { ...gift, status: "captured", captureId, capturedAt: new Date().toISOString() };
  await db.put("gift", id, settled);
  await db.add("pitch", gift.pitchId, "raisedUsd", gift.amountUsd);

  if (gift.proposalId) {
    const proposal = await db.get<StoredProposal>("proposal", gift.proposalId);
    if (proposal) await db.put("proposal", proposal.id, { ...proposal, status: "paid" });
  }
  return settled;
}

// --- mandates and the agent's proposals --------------------------------------

type StoredProposal = Proposal & { mandateId: string; at: number };

export async function addMandate(mandate: Mandate): Promise<void> {
  const { proposals: _unused, ...record } = mandate;
  await (await store()).put("mandate", mandate.id, record);
}

export async function getMandate(id: string): Promise<Mandate | undefined> {
  const db = await store();
  const record = await db.get<Omit<Mandate, "proposals">>("mandate", id);
  if (!record) return undefined;
  const proposals = (await db.list<StoredProposal>("proposal"))
    .filter((p) => p.mandateId === id)
    .sort((a, b) => a.at - b.at)
    .map(({ mandateId: _m, at: _a, ...proposal }): Proposal => proposal);
  return { ...record, proposals };
}

export async function addProposal(mandateId: string, proposal: Proposal): Promise<void> {
  const stored: StoredProposal = { ...proposal, mandateId, at: Date.now() };
  await (await store()).put("proposal", proposal.id, stored);
}

export async function setMandateSummary(id: string, summary: string): Promise<void> {
  const db = await store();
  const record = await db.get<Omit<Mandate, "proposals">>("mandate", id);
  if (record) await db.put("mandate", id, { ...record, summary });
}

// --- investment interest -----------------------------------------------------

export async function addInterest(interest: Interest): Promise<void> {
  await (await store()).put("interest", interest.id, interest);
}

export async function countInterest(pitchId: string): Promise<number> {
  return (await (await store()).list<Interest>("interest")).filter((i) => i.pitchId === pitchId).length;
}

// --- daily allowances --------------------------------------------------------

/**
 * Count one use against a per-day allowance and say whether it is still within
 * the limit. Keeps a public demo from running up an unbounded model bill.
 */
export async function withinDailyLimit(name: string, fallback: number): Promise<boolean> {
  // Override per deployment with DAILY_LIMIT_AGENT, DAILY_LIMIT_EDITOR or DAILY_LIMIT_LETTERS.
  const configured = Number(process.env[`DAILY_LIMIT_${name.toUpperCase()}`]);
  const limit = Number.isFinite(configured) && configured > 0 ? configured : fallback;
  const day = new Date().toISOString().slice(0, 10);
  const used = await (await store()).add("counter", `${name}:${day}`, "n", 1);
  return used <= limit;
}
