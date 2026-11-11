"use client";

import { useEffect, useRef, useState } from "react";
import type { Gift } from "@/lib/types";

/** The slice of the PayPal JS SDK this app uses. */
interface PayPalActions {
  resolve: () => Promise<void>;
  reject: () => Promise<void>;
  restart: () => Promise<void>;
}
interface PayPalButtonsInstance {
  render: (el: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
}
interface PayPalNamespace {
  FUNDING: { PAYPAL: string };
  Buttons: (options: {
    fundingSource?: string;
    style?: Record<string, string | number | boolean>;
    onClick?: (data: unknown, actions: PayPalActions) => Promise<void> | void;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }, actions: PayPalActions) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }) => PayPalButtonsInstance;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

let sdk: Promise<PayPalNamespace> | null = null;

function loadPayPal(): Promise<PayPalNamespace> {
  if (sdk) return sdk;
  sdk = new Promise<PayPalNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CLIENT_ID)}&currency=USD&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal did not load.")));
    script.onerror = () => {
      sdk = null;
      reject(new Error("Could not reach PayPal. Check the connection and reload."));
    };
    document.head.appendChild(script);
  });
  return sdk;
}

/** Errors we raise ourselves carry a message worth showing as-is. */
class GiftError extends Error {}

interface Props {
  /** Returns the JSON body for POST /api/paypal/orders, or a string explaining why the gift can't be sent yet. */
  getOrderBody: () => Record<string, unknown> | string;
  onPaid: (gift: Gift) => void;
  onProblem: (message: string | null) => void;
}

export function PayPalButton({ getOrderBody, onPaid, onProblem }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  // The SDK keeps the callbacks it was rendered with, so read the latest props through a ref.
  const latest = useRef({ getOrderBody, onPaid, onProblem });
  useEffect(() => {
    latest.current = { getOrderBody, onPaid, onProblem };
  });

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    let buttons: PayPalButtonsInstance | undefined;

    loadPayPal()
      .then((paypal) => {
        if (cancelled || !slot.current) return;
        buttons = paypal.Buttons({
          fundingSource: paypal.FUNDING.PAYPAL,
          style: { layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 46 },
          onClick: (_data, actions) => {
            const body = latest.current.getOrderBody();
            if (typeof body === "string") {
              latest.current.onProblem(body);
              return actions.reject();
            }
            latest.current.onProblem(null);
            return actions.resolve();
          },
          createOrder: async () => {
            const body = latest.current.getOrderBody();
            if (typeof body === "string") throw new GiftError(body);
            const res = await fetch("/api/paypal/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const json = (await res.json()) as { orderId?: string; error?: string };
            if (!res.ok || !json.orderId) throw new GiftError(json.error ?? "PayPal could not start this payment.");
            return json.orderId;
          },
          onApprove: async (data, actions) => {
            const res = await fetch(`/api/paypal/orders/${encodeURIComponent(data.orderID)}/capture`, { method: "POST" });
            const json = (await res.json()) as { gift?: Gift; error?: string; issue?: string };
            if (json.issue === "INSTRUMENT_DECLINED") return actions.restart();
            if (!res.ok || !json.gift) throw new GiftError(json.error ?? "PayPal could not complete this payment.");
            latest.current.onPaid(json.gift);
          },
          onError: (err) => {
            latest.current.onProblem(
              err instanceof GiftError ? err.message : "PayPal closed the payment before it finished. Nothing was charged.",
            );
          },
        });
        return buttons.render(slot.current).then(() => {
          if (!cancelled) setState("ready");
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState("failed");
        latest.current.onProblem(err instanceof Error ? err.message : "PayPal did not load.");
      });

    return () => {
      cancelled = true;
      buttons?.close().catch(() => {});
    };
  }, []);

  if (!CLIENT_ID) {
    return (
      <p className="notice">
        PayPal is not connected. Add your sandbox client ID and secret to <code>.env.local</code> and restart the server.
      </p>
    );
  }

  return (
    <div className="paypal-slot" data-state={state} aria-busy={state === "loading"}>
      <div ref={slot} />
      {state === "loading" && <span className="visually-hidden">Loading PayPal</span>}
    </div>
  );
}
