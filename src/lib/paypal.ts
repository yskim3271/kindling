import type { Gift, Pitch } from "./types";

/**
 * Thin client for the PayPal Orders v2 REST API.
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 */
// Read at call time, not import time: on Workers the environment arrives with the request.
export const paypalEnv = (): "live" | "sandbox" => (process.env.PAYPAL_ENV === "live" ? "live" : "sandbox");
const base = () => (paypalEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

/** True when gifts should be routed straight to the developer's PayPal account. */
export function paysWriterDirectly(pitch: Pitch): boolean {
  return process.env.PAYPAL_PAYEE_MODE !== "platform" && Boolean(pitch.paypalEmail);
}

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** PayPal's machine-readable issue code, e.g. INSTRUMENT_DECLINED. */
    readonly issue?: string,
    readonly debugId?: string,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

let cachedToken: { value: string; expiresAt: number } | undefined;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  if (!paypalConfigured()) throw new PayPalError("PayPal credentials are not set.", 503, "NOT_CONFIGURED");

  const basic = btoa(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new PayPalError("PayPal rejected the client ID and secret.", res.status, "AUTHENTICATION_FAILURE");
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

interface PayPalErrorBody {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: { issue?: string; description?: string }[];
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, requestId?: string): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      // Makes retries safe: PayPal returns the first result for a repeated ID.
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const err = json as PayPalErrorBody;
    const detail = err.details?.[0];
    throw new PayPalError(
      detail?.description ?? err.message ?? `PayPal returned ${res.status}.`,
      res.status,
      detail?.issue ?? err.name,
      err.debug_id,
    );
  }
  return json as T;
}

interface OrderResponse {
  id: string;
  status: string;
  purchase_units?: {
    payments?: {
      captures?: { id: string; status: string; amount: { currency_code: string; value: string } }[];
    };
  }[];
}

/**
 * Create an order for one gift. The amount and the payee come from our own
 * records, never from the browser.
 */
export async function createOrder(gift: Gift, pitch: Pitch): Promise<{ orderId: string }> {
  const direct = paysWriterDirectly(pitch);
  const order = await call<OrderResponse>(
    "POST",
    "/v2/checkout/orders",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: gift.id,
          custom_id: gift.id,
          description: `Gift to ${pitch.author}: ${pitch.headline}`.slice(0, 127),
          amount: { currency_code: "USD", value: gift.amountUsd.toFixed(2) },
          ...(direct ? { payee: { email_address: pitch.paypalEmail } } : {}),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Kindling",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
          },
        },
      },
    },
    `create-${gift.id}`,
  );
  return { orderId: order.id };
}

export interface CaptureResult {
  status: string;
  captureId?: string;
  amountUsd?: number;
}

function readCapture(order: OrderResponse): CaptureResult {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: capture?.status ?? order.status,
    captureId: capture?.id,
    amountUsd: capture ? Number(capture.amount.value) : undefined,
  };
}

/** Capture an approved order. Safe to call twice for the same order. */
export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const id = encodeURIComponent(orderId);
  try {
    return readCapture(await call<OrderResponse>("POST", `/v2/checkout/orders/${id}/capture`, {}, `capture-${orderId}`));
  } catch (err) {
    if (err instanceof PayPalError && err.issue === "ORDER_ALREADY_CAPTURED") {
      return readCapture(await call<OrderResponse>("GET", `/v2/checkout/orders/${id}`));
    }
    throw err;
  }
}
