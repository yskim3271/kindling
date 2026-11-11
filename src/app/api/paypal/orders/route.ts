import { addGift, getMandate, getPitch, newId, patchGift } from "@/lib/db";
import { cents } from "@/lib/format";
import { describeError, fail, num, readJson, str } from "@/lib/http";
import { createOrder, paysWriterDirectly } from "@/lib/paypal";
import type { Gift } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Create a PayPal order for a gift.
 *
 * Two entry points:
 *  - a patron giving by hand: { pitchId, amountUsd, patronName, note }
 *  - a patron approving an agent proposal: { mandateId, proposalId }
 *    The amount and the recipient are read from the stored proposal, so the
 *    browser cannot change what the agent was allowed to propose.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail("Send the gift as JSON.");

  let pitchId = str(body.pitchId, 120);
  let amountUsd = cents(num(body.amountUsd));
  let patronName = str(body.patronName, 80) || "Anonymous";
  const note = str(body.note, 280) || undefined;
  const mandateId = str(body.mandateId, 60) || undefined;
  const proposalId = str(body.proposalId, 60) || undefined;

  if (mandateId || proposalId) {
    const mandate = mandateId ? await getMandate(mandateId) : undefined;
    const proposal = mandate?.proposals.find((p) => p.id === proposalId);
    if (!mandate || !proposal) return fail("That proposal no longer exists.", 404);
    if (proposal.status === "paid") return fail("That proposal has already been paid.", 409);
    pitchId = proposal.pitchId;
    amountUsd = proposal.amountUsd;
    patronName = mandate.patronName;
  }

  const pitch = await getPitch(pitchId);
  if (!pitch) return fail("That letter no longer exists.", 404);
  if (!(amountUsd >= 1 && amountUsd <= 10_000)) return fail("Gifts can be between $1 and $10,000.");

  const gift: Gift = {
    id: newId("gift"),
    pitchId: pitch.id,
    amountUsd,
    patronName,
    note,
    source: proposalId ? "agent" : "manual",
    mandateId,
    proposalId,
    status: "created",
    payee: paysWriterDirectly(pitch) ? "writer" : "platform",
    createdAt: new Date().toISOString(),
  };
  await addGift(gift);

  try {
    const { orderId } = await createOrder(gift, pitch);
    await patchGift(gift.id, { orderId });
    return Response.json({ orderId, giftId: gift.id });
  } catch (err) {
    await patchGift(gift.id, { status: "failed" });
    const { message, status, issue } = describeError(err);
    return fail(message, status, { issue });
  }
}
