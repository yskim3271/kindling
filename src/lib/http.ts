import { JevError } from "./jev";
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
  if (err instanceof JevError) {
    if (err.status === 401 || err.status === 503) {
      return { message: "The TypeSafe API key is missing or invalid. Set TYPESAFE_API_KEY.", status: 503 };
    }
    if (err.status === 429 || err.status === 529) {
      return { message: "Jev is busy right now. Wait a moment and send the agent again.", status: 429 };
    }
    console.error(err);
    return { message: "Jev could not read the letters just now. Nothing was proposed. Try again.", status: 502 };
  }
  if (err instanceof TypeError) {
    return { message: "A service this page depends on could not be reached. Check the network and try again.", status: 502 };
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
