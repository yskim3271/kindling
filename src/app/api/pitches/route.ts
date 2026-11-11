import { addPitch, getPitch, newId } from "@/lib/db";
import { slugify } from "@/lib/format";
import { fail, isEmail, num, readJson, str } from "@/lib/http";
import type { FundLine, Pitch, PitchKind } from "@/lib/types";

export const runtime = "nodejs";

const KINDS: PitchKind[] = ["story", "project", "opinion"];

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail("Send the letter as JSON.");

  const author = str(body.author, 80);
  const location = str(body.location, 80);
  const headline = str(body.headline, 140);
  const summary = str(body.summary, 600);
  const text = str(body.body, 12_000);
  const paypalEmail = str(body.paypalEmail, 200).toLowerCase();
  const kind = KINDS.includes(body.kind as PitchKind) ? (body.kind as PitchKind) : "story";
  const askUsd = Math.round(num(body.askUsd));

  if (!author) return fail("Sign the letter with your name.");
  if (!headline || !text) return fail("The letter needs a headline and a body.");
  if (!(askUsd >= 1 && askUsd <= 50_000)) return fail("Ask for an amount between $1 and $50,000.");
  if (!isEmail(paypalEmail)) return fail("Add the PayPal email that should receive gifts.");

  const useOfFunds: FundLine[] = (Array.isArray(body.useOfFunds) ? body.useOfFunds : [])
    .map((line): FundLine => {
      const l = (line ?? {}) as Record<string, unknown>;
      return { item: str(l.item, 140), amountUsd: Math.round(num(l.amountUsd)) };
    })
    .filter((l) => l.item && l.amountUsd > 0)
    .slice(0, 12);

  const tags = (Array.isArray(body.tags) ? body.tags : [])
    .map((t) => str(t, 30).toLowerCase())
    .filter(Boolean)
    .slice(0, 6);

  const language = str(body.language, 40);
  const originalBody = str(body.originalBody, 12_000);
  const translated = Boolean(language && language.toLowerCase() !== "english" && originalBody);

  let id = slugify(`${author} ${headline}`) || newId("letter");
  if (getPitch(id)) id = `${id}-${newId("x").slice(2, 8)}`;

  const pitch: Pitch = {
    id,
    kind,
    author,
    location,
    headline,
    summary,
    body: text,
    originalBody: translated ? originalBody : undefined,
    language: translated ? language : undefined,
    askUsd,
    raisedUsd: 0,
    useOfFunds,
    tags,
    paypalEmail,
    openToInvestment: body.openToInvestment === true,
    sample: false,
    createdAt: new Date().toISOString(),
  };
  addPitch(pitch);
  return Response.json({ id: pitch.id }, { status: 201 });
}
