import { runPatronAgent, type AgentEvent } from "@/lib/agent";
import { addMandate, newId, withinDailyLimit } from "@/lib/db";
import { cents } from "@/lib/format";
import { describeError, fail, num, readJson, str } from "@/lib/http";
import type { Mandate } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Streams the agent's progress as newline-delimited JSON. */
export async function POST(req: Request) {
  const body = await readJson(req);
  const thesis = str(body?.thesis, 2000);
  const patronName = str(body?.patronName, 80) || "A patron";
  const budgetUsd = cents(num(body?.budgetUsd));
  const perGiftCapUsd = cents(num(body?.perGiftCapUsd));

  if (thesis.length < 20) return fail("Describe what you want to back in a sentence or two.");
  if (!(budgetUsd >= 5 && budgetUsd <= 100_000)) return fail("Set a budget between $5 and $100,000.");
  if (!(perGiftCapUsd >= 1 && perGiftCapUsd <= budgetUsd)) {
    return fail("The cap per gift must be at least $1 and no more than the budget.");
  }

  const mandate: Mandate = {
    id: newId("mandate"),
    patronName,
    thesis,
    budgetUsd,
    perGiftCapUsd,
    proposals: [],
    createdAt: new Date().toISOString(),
  };
  if (!(await withinDailyLimit("agent", 300))) {
    return fail("The agent has done all the reading it can for today. Come back tomorrow.", 429);
  }
  await addMandate(mandate);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (event: AgentEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false; // the reader went away; let the run finish quietly
        }
      };
      emit({ type: "start", mandateId: mandate.id });
      try {
        await runPatronAgent(mandate, emit);
      } catch (err) {
        emit({ type: "error", message: describeError(err).message });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
