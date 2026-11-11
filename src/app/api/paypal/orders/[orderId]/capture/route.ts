import { getGiftByOrder, patchGift, settleGift } from "@/lib/db";
import { describeError, fail } from "@/lib/http";
import { captureOrder } from "@/lib/paypal";

export const runtime = "nodejs";

/** Capture an order the patron has approved in PayPal, then record it. */
export async function POST(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;

  // Only orders this server created can be captured through it.
  const gift = await getGiftByOrder(orderId);
  if (!gift) return fail("Unknown order.", 404);
  if (gift.status === "captured") return Response.json({ status: "COMPLETED", gift });

  try {
    const result = await captureOrder(orderId);
    if (result.status !== "COMPLETED" || !result.captureId) {
      return fail(`PayPal has not completed this payment yet (status: ${result.status}).`, 409, {
        paypalStatus: result.status,
      });
    }
    if (result.amountUsd !== undefined && Math.abs(result.amountUsd - gift.amountUsd) > 0.001) {
      await patchGift(gift.id, { status: "failed" });
      return fail("The captured amount did not match the gift. It has been flagged for review.", 409);
    }
    const settled = await settleGift(gift.id, result.captureId);
    return Response.json({ status: "COMPLETED", gift: settled });
  } catch (err) {
    const { message, status, issue } = describeError(err);
    // A declined funding source or a not-yet-approved order can still succeed later.
    const recoverable = issue === "INSTRUMENT_DECLINED" || issue === "ORDER_NOT_APPROVED";
    if (!recoverable) await patchGift(gift.id, { status: "failed" });
    return fail(message, status, { issue });
  }
}
