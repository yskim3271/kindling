import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiftPanel } from "@/components/GiftPanel";
import { InterestForm } from "@/components/InterestForm";
import { countInterest, getPitch, listGifts } from "@/lib/db";
import { cents, KIND_LABEL, longDate, money, shortDate } from "@/lib/format";
import { paysWriterDirectly } from "@/lib/paypal";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const pitch = await getPitch(id);
  return pitch ? { title: pitch.headline, description: pitch.summary } : { title: "Letter not found" };
}

export default async function LetterPage({ params }: Params) {
  const { id } = await params;
  const pitch = await getPitch(id);
  if (!pitch) notFound();

  const gifts = (await listGifts()).filter((g) => g.pitchId === pitch.id && g.status === "captured");
  const stillNeeded = Math.max(0, cents(pitch.askUsd - pitch.raisedUsd));
  const progress = Math.min(100, Math.round((pitch.raisedUsd / pitch.askUsd) * 100));
  const linesTotal = pitch.useOfFunds.reduce((sum, line) => sum + line.amountUsd, 0);
  const interest = pitch.openToInvestment ? await countInterest(pitch.id) : 0;

  return (
    <div className="letter wrap">
      <article>
        <span className="label">
          {KIND_LABEL[pitch.kind]} · {longDate(pitch.createdAt)}
          {pitch.sample && " · Sample letter, written for the demo"}
        </span>
        <h1>{pitch.headline}</h1>
        <p className="letter__by">
          {pitch.author}
          {pitch.location && <span className="quiet">, {pitch.location}</span>}
        </p>

        <div className="letter__body">
          {pitch.body.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <p className="letter__sign">{pitch.author}</p>
        </div>

        {pitch.useOfFunds.length > 0 && (
          <>
            <h2>What the money buys</h2>
            <table className="ledger">
              <tbody>
                {pitch.useOfFunds.map((line) => (
                  <tr key={line.item}>
                    <td>{line.item}</td>
                    <td className="num">{money(line.amountUsd)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{money(linesTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        <h2>Who has given</h2>
        {gifts.length === 0 ? (
          <p className="quiet" style={{ marginTop: "var(--space-sm)" }}>
            Nobody yet. The first gift is the one that gets read about.
          </p>
        ) : (
          <table className="ledger">
            <tbody>
              {gifts.map((gift) => (
                <tr key={gift.id}>
                  <td>
                    {gift.patronName}
                    {gift.source === "agent" && <span className="quiet"> · proposed by their agent</span>}
                    {gift.note && <span className="quiet"> · “{gift.note}”</span>}
                  </td>
                  <td className="num quiet">{shortDate(gift.capturedAt ?? gift.createdAt)}</td>
                  <td className="num">{money(gift.amountUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      <aside className="give stack" aria-label="Give to this letter">
        <div className="stack stack--tight">
          <h2>Give to this letter</h2>
          <div>
            <span className="give__total">{money(pitch.raisedUsd)}</span>
            <span className="quiet"> of {money(pitch.askUsd)}</span>
          </div>
          <div
            className="meter"
            role="progressbar"
            aria-label={`Funded: ${progress}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <GiftPanel
          pitchId={pitch.id}
          author={pitch.author}
          stillNeededUsd={stillNeeded}
          direct={paysWriterDirectly(pitch)}
        />

        {pitch.openToInvestment && (
          <>
            <hr className="divider" />
            <InterestForm pitchId={pitch.id} author={pitch.author} />
            {interest > 0 && (
              <p className="small quiet">
                {interest} {interest === 1 ? "patron has" : "patrons have"} asked so far.
              </p>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
