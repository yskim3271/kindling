/**
 * Minimal client for TypeSafe's System One API (the Jev model).
 * Docs: https://docs.typesafe.ai/api/system-one.md
 *
 * Jev does not write text. You send it state and typed questions, and it sends
 * back probabilities. Everything this app does with those numbers is in code.
 */
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

/** A yes/no question. The answer is the probability that it is true. */
export interface Noul {
  type: "noul";
  instructions: string | Record<string, unknown>;
  criteria?: { true: string; false: string };
}

export type Questions = Record<string, Noul>;

interface SystemOneResponse {
  model: string;
  answers: Record<string, { type: string; noul?: number }>;
  usage?: { input_tokens: number; output_tokens: number };
}

export class JevError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "JevError";
  }
}

export const jevConfigured = () => Boolean(process.env.TYPESAFE_API_KEY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ask a set of yes/no questions about one state. Returns the probability for
 * each question under the same name. A failed call throws; it is never turned
 * into an answer.
 */
export async function askJev<Q extends Questions>(state: unknown, questions: Q): Promise<Record<keyof Q, number>> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new JevError("TYPESAFE_API_KEY is not set.", 503);

  const body = JSON.stringify({ model: process.env.JEV_MODEL || "jev-latest", state, questions });

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });

    // Rate-limited or overloaded: back off and try again, a few times.
    if ((res.status === 429 || res.status === 529) && attempt < 3) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** attempt);
      continue;
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new JevError(`Jev returned ${res.status}. ${detail}`, res.status);
    }

    const json = (await res.json()) as SystemOneResponse;
    const out = {} as Record<keyof Q, number>;
    for (const name of Object.keys(questions) as (keyof Q)[]) {
      const value = json.answers[name as string]?.noul;
      if (typeof value !== "number") throw new JevError(`Jev gave no answer for "${String(name)}".`, 502);
      out[name] = value;
    }
    return out;
  }
}
