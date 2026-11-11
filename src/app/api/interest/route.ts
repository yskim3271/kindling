import { addInterest, getPitch, newId } from "@/lib/db";
import { fail, isEmail, num, readJson, str } from "@/lib/http";

export const runtime = "nodejs";

/**
 * A patron asks a writer for an investment conversation. No money moves here:
 * selling a stake is a regulated act that belongs in a signed agreement, not
 * in a checkout button.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  const pitch = await getPitch(str(body?.pitchId, 120));
  if (!pitch) return fail("That letter no longer exists.", 404);
  if (!pitch.openToInvestment) return fail("This writer is not looking for investment.");

  const name = str(body?.name, 80);
  const email = str(body?.email, 200).toLowerCase();
  const message = str(body?.message, 1500);
  const amount = Math.round(num(body?.amountUsd));

  if (!name) return fail("Add your name so the writer knows who is asking.");
  if (!isEmail(email)) return fail("Add an email the writer can reply to.");
  if (message.length < 10) return fail("Say a sentence about what you have in mind.");

  await addInterest({
    id: newId("int"),
    pitchId: pitch.id,
    name,
    email,
    amountUsd: amount > 0 ? amount : undefined,
    message,
    createdAt: new Date().toISOString(),
  });
  return Response.json({ ok: true }, { status: 201 });
}
