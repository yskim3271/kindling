import Anthropic from "@anthropic-ai/sdk";
import { AiRefusedError } from "./ai";
import { PayPalError } from "./paypal";

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

/** Turn a thrown error into a message a person can act on. */
export function describeError(err: unknown): { message: string; status: number; issue?: string } {
  if (err instanceof PayPalError) {
    if (err.issue === "NOT_CONFIGURED") {
      return { message: "PayPal is not connected yet. Add the sandbox client ID and secret to .env.local.", status: 503, issue: err.issue };
    }
    if (err.issue === "INSTRUMENT_DECLINED") {
      return { message: "PayPal declined that funding source. Pick another one and try again.", status: 422, issue: err.issue };
    }
    if (err.issue === "PAYEE_ACCOUNT_INVALID" || err.issue === "PAYEE_ACCOUNT_RESTRICTED") {
      return { message: "The writer's PayPal address cannot receive payments. Nothing was charged.", status: 422, issue: err.issue };
    }
    return { message: `PayPal: ${err.message}`, status: err.status >= 500 ? 502 : 422, issue: err.issue };
  }
  if (err instanceof AiRefusedError) {
    return { message: "The model declined to work on this text. Rephrase it and try again.", status: 422 };
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return { message: "The Claude API key is missing or invalid. Set ANTHROPIC_API_KEY in .env.local.", status: 503 };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { message: "Claude is rate-limited right now. Wait a moment and try again.", status: 429 };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { message: "Could not reach Claude. Check the network and try again.", status: 502 };
  }
  if (err instanceof Anthropic.APIError) {
    return { message: `Claude returned an error (${err.status ?? "unknown"}). Try again.`, status: 502 };
  }
  console.error(err);
  return { message: "Something went wrong on our side. Try again.", status: 500 };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max = 5000): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const num = (v: unknown): number => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN);
export const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
