import { shapePitch } from "@/lib/ai";
import { describeError, fail, num, readJson, str } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await readJson(req);
  const draft = str(body?.draft, 12_000);
  if (draft.length < 80) return fail("Write a little more first. A few sentences is enough for the editor to work with.");

  const ask = num(body?.askUsd);
  try {
    const shaped = await shapePitch({ draft, askUsd: ask > 0 ? Math.round(ask) : undefined });
    return Response.json({ shaped });
  } catch (err) {
    const { message, status } = describeError(err);
    return fail(message, status);
  }
}
