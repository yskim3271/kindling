import { addPitch, getPitch, newId, withinDailyLimit } from "@/lib/db";
import { slugify } from "@/lib/format";
import { fail, isEmail, num, readJson, str } from "@/lib/http";
import { STAGES } from "@/lib/preferences";
import type { FundLine, Pitch, Stage } from "@/lib/types";

export const runtime = "nodejs";

/** The first sentence or two of a letter, cut at a word. */
function opening(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= 240) return flat;
  const cut = flat.slice(0, 240);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return stop > 80 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** A link is kept only when it is an ordinary web address. */
function webAddress(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail("Send the project as JSON.");

  const author = str(body.author, 80);
  const location = str(body.location, 80);
  const title = str(body.title, 80);
  const headline = str(body.headline, 140);
  const text = str(body.body, 12_000);
  // Without a summary of the developer's own, the board shows how the letter opens.
  const summary = str(body.summary, 600) || opening(text);
  const paypalEmail = str(body.paypalEmail, 200).toLowerCase();
  const stage = STAGES.find((s) => s.id === body.stage)?.id as Stage | undefined;
  const playUrl = webAddress(str(body.playUrl, 300));
  const askUsd = Math.round(num(body.askUsd));

  if (!author) return fail("Sign the project with your name or your studio's.");
  if (!title || !headline) return fail("The project needs the game's title and one line about it.");
  if (!text) return fail("Write the letter: what the game is, what exists, what is missing.");
  if (!stage) return fail("Say how far along the game is.");
  if (!playUrl) return fail("Link a page where someone can play or watch the game, starting with https://");
  if (!(askUsd >= 1 && askUsd <= 50_000)) return fail("Ask for an amount between $1 and $50,000.");
  if (!isEmail(paypalEmail)) return fail("Add the PayPal email that should receive gifts.");

  const useOfFunds: FundLine[] = (Array.isArray(body.useOfFunds) ? body.useOfFunds : [])
    .map((line): FundLine => {
      const l = (line ?? {}) as Record<string, unknown>;
      return { item: str(l.item, 140), amountUsd: Math.round(num(l.amountUsd)) };
    })
    .filter((l) => l.item && l.amountUsd > 0)
    .slice(0, 12);

  const genres = (Array.isArray(body.genres) ? body.genres : [])
    .map((g) => str(g, 30).toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  let id = slugify(title) || newId("game");
  if (await getPitch(id)) id = `${id}-${newId("x").slice(2, 8)}`;

  const pitch: Pitch = {
    id,
    title,
    headline,
    author,
    location,
    summary,
    body: text,
    stage,
    genres,
    playUrl,
    askUsd,
    raisedUsd: 0,
    useOfFunds,
    paypalEmail,
    openToInvestment: body.openToInvestment === true,
    sample: false,
    createdAt: new Date().toISOString(),
  };
  if (!(await withinDailyLimit("letters", 40))) {
    return fail("The board has taken all the projects it can for today. Come back tomorrow.", 429);
  }
  await addPitch(pitch);
  return Response.json({ id: pitch.id }, { status: 201 });
}
