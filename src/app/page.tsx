import Link from "next/link";
import { MatchBadge } from "@/components/MatchBadge";
import { Sigil } from "@/components/Sigil";
import { listGifts, listPitches } from "@/lib/db";
import { money, shortDate } from "@/lib/format";
import { STAGES, stageLabel } from "@/lib/preferences";

export default async function FrontPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  const all = await listPitches();
  const active = STAGES.find((s) => s.id === stage)?.id;
  const games = active ? all.filter((p) => p.stage === active) : all;

  const captured = (await listGifts()).filter((g) => g.status === "captured");
  const given = captured.reduce((sum, g) => sum + g.amountUsd, 0);
  const asked = all.reduce((sum, p) => sum + Math.max(0, p.askUsd - p.raisedUsd), 0);

  return (
    <div className="wrap">
      <section className="lede">
        <div>
          <h1>Fund the missing piece of a small game.</h1>
          <p className="lede__deck">
            Independent developers post a game in progress and the specific things it still needs: a composer, a store
            fee, a test device. Patrons pay for them through PayPal, by hand or on the recommendation of an agent that
            reads every project against their saved preferences. Nothing is spent without the patron’s own approval.
          </p>
          <div className="lede__actions">
            <Link href="/patron" className="btn">
              Set your preferences
            </Link>
            <Link href="/write" className="btn btn--quiet">
              Post your game
            </Link>
          </div>
        </div>

        <aside className="till" aria-label="The till">
          <span className="label">The till, counted live</span>
          <dl>
            <div>
              <dt>Games posted</dt>
              <dd className="figure">{all.length}</dd>
            </div>
            <div>
              <dt>Still asked for</dt>
              <dd className="figure">{money(asked)}</dd>
            </div>
            <div>
              <dt>Gifts captured</dt>
              <dd className="figure">{captured.length}</dd>
            </div>
            <div>
              <dt>Given so far</dt>
              <dd className="figure">{money(given)}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <nav className="sorter" aria-label="Filter games by stage">
        <Link href="/" aria-current={active ? undefined : "true"} scroll={false}>
          All games
        </Link>
        {STAGES.map((option) => (
          <Link
            key={option.id}
            href={`/?stage=${option.id}`}
            aria-current={option.id === active ? "true" : undefined}
            scroll={false}
          >
            {option.label}
          </Link>
        ))}
        <span className="sorter__count">
          {games.length} {games.length === 1 ? "game" : "games"}
        </span>
      </nav>

      {games.length === 0 ? (
        <p className="empty">
          No game at this stage yet. <Link href="/write">Post the first one.</Link>
        </p>
      ) : (
        <ol className="games">
          {games.map((pitch) => {
            const progress = Math.min(100, Math.round((pitch.raisedUsd / pitch.askUsd) * 100));
            return (
              <li className="game" key={pitch.id}>
                <Link href={`/p/${pitch.id}`} className="game__cover" tabIndex={-1} aria-hidden="true">
                  <Sigil id={pitch.id} />
                </Link>

                <article className="game__main">
                  <MatchBadge pitchId={pitch.id} />
                  <span className="label">
                    {stageLabel(pitch.stage)} · {shortDate(pitch.createdAt)}
                    {pitch.sample && " · Sample"}
                  </span>
                  <h2>
                    <Link href={`/p/${pitch.id}`}>{pitch.title}</Link>
                  </h2>
                  <p className="game__pitch">{pitch.headline}</p>
                  <p className="game__by">
                    {pitch.author}
                    {pitch.location && <span className="quiet">, {pitch.location}</span>}
                    {pitch.openToInvestment && <span className="quiet"> · open to investment</span>}
                  </p>
                </article>

                <div className="game__side">
                  <div className="amounts">
                    <strong>{money(pitch.askUsd)}</strong>
                    <span className="small quiet">asked</span>
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
                  <span className="small quiet figure">
                    {pitch.raisedUsd > 0 ? `${money(pitch.raisedUsd)} given` : "Nothing given yet"}
                  </span>
                  <ul className="tags">
                    {pitch.genres.map((genre) => (
                      <li key={genre}>{genre}</li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
