import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GiftPanel } from "@/components/GiftPanel";
import { InterestForm } from "@/components/InterestForm";
import { MatchBadge } from "@/components/MatchBadge";
import { Sigil } from "@/components/Sigil";
import { countInterest, getPitch, listGifts } from "@/lib/db";
import { cents, longDate, money, shortDate } from "@/lib/format";
import { paysWriterDirectly } from "@/lib/paypal";
import { stageLabel } from "@/lib/preferences";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const pitch = await getPitch(id);
  return pitch ? { title: pitch.title, description: pitch.headline } : { title: "Game not found" };
}

/** The site a link points at, for showing beside it. */
function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

export default async function ProjectPage({ params }: Params) {
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
        <header className="project-head">
          <Sigil id={pitch.id} className="project-head__cover" />
          <div>
            <MatchBadge pitchId={pitch.id} />
            <span className="label">
              {stageLabel(pitch.stage)} · {longDate(pitch.createdAt)}
              {pitch.sample && " · Sample project, written for the demo"}
            </span>
            <h1>{pitch.title}</h1>
            <p className="project-head__pitch">{pitch.headline}</p>
            <p className="letter__by">
              {pitch.author}
              {pitch.location && <span className="quiet">, {pitch.location}</span>}
            </p>
          </div>
        </header>

        <p className="playlink">
          {pitch.playUrl ? (
            <>
              <span className="label">Play or watch it</span>
              {/* The link was typed by the developer: open it apart from this page and pass nothing along. */}
              <a href={pitch.playUrl} target="_blank" rel="noopener noreferrer nofollow ugc">
                {host(pitch.playUrl)}
              </a>
              <span className="small quiet">Posted by the developer. Kindling has not checked it.</span>
            </>
          ) : (
            <>
              <span className="label">Play or watch it</span>
              <span className="small quiet">
                No build is linked, because this is a sample project. A real one has to link a page where anyone can
                play or watch the game.
              </span>
            </>
          )}
        </p>

        <h2>From the developer</h2>
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
                    {gift.source === "agent" && <span className="quiet"> · recommended by their agent</span>}
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

      <aside className="give stack" aria-label="Give to this game">
        <div className="stack stack--tight">
          <h2>Give to this game</h2>
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
          {pitch.genres.length > 0 && (
            <ul className="tags">
              {pitch.genres.map((genre) => (
                <li key={genre}>{genre}</li>
              ))}
            </ul>
          )}
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
