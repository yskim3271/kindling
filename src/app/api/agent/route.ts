import { runPatronAgent, type AgentEvent } from "@/lib/agent";
import { addMandate, newId, withinDailyLimit } from "@/lib/db";
import { describeError, fail, readJson } from "@/lib/http";
import { parsePreferences } from "@/lib/preferences";
import type { Mandate } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Reads the open projects against a patron's preferences and streams the progress
 * as newline-delimited JSON.
 */
export async function POST(req: Request) {
  const preferences = parsePreferences(await readJson(req));
  if (typeof preferences === "string") return fail(preferences);

  const mandate: Mandate = {
    ...preferences,
    patronName: preferences.patronName || "A patron",
    id: newId("mandate"),
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
