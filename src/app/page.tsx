import Link from "next/link";
import { listGifts, listPitches } from "@/lib/db";
import { KIND_LABEL, money, shortDate } from "@/lib/format";
import type { PitchKind } from "@/lib/types";

const FILTERS: { kind?: PitchKind; label: string }[] = [
  { label: "All letters" },
  { kind: "story", label: "Stories" },
  { kind: "project", label: "Projects" },
  { kind: "opinion", label: "Arguments" },
];

export default async function FrontPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const all = await listPitches();
  const active = FILTERS.find((f) => f.kind === kind)?.kind;
  const letters = active ? all.filter((p) => p.kind === active) : all;

  const captured = (await listGifts()).filter((g) => g.status === "captured");
  const given = captured.reduce((sum, g) => sum + g.amountUsd, 0);
  const asked = all.reduce((sum, p) => sum + Math.max(0, p.askUsd - p.raisedUsd), 0);

  return (
    <div className="wrap">
      <section className="lede">
        <div>
          <h1>Write to the people who can help.</h1>
          <p className="lede__deck">
            Kindling is a public letterbox. Anyone can post a story, a project or an argument and say what it would
            cost. Patrons read, and pay through PayPal: by hand, or by sending an agent that reads on their behalf and
            never spends without a signature.
          </p>
          <div className="lede__actions">
            <Link href="/write" className="btn">
              Write a letter
            </Link>
            <Link href="/patron" className="btn btn--quiet">
              Send an agent
            </Link>
          </div>
        </div>

        <aside className="till" aria-label="The till">
          <span className="label">The till, counted live</span>
          <dl>
            <div>
              <dt>Letters posted</dt>
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

      <nav className="sorter" aria-label="Filter letters">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filter.kind ? `/?kind=${filter.kind}` : "/"}
            aria-current={filter.kind === active ? "true" : undefined}
            scroll={false}
          >
            {filter.label}
          </Link>
        ))}
        <span className="sorter__count">
          {letters.length} {letters.length === 1 ? "letter" : "letters"}
        </span>
      </nav>

      {letters.length === 0 ? (
        <p className="empty">
          Nothing filed under this heading yet. <Link href="/write">Write the first one.</Link>
        </p>
      ) : (
        <ol className="letters">
          {letters.map((pitch) => {
            const progress = Math.min(100, Math.round((pitch.raisedUsd / pitch.askUsd) * 100));
            return (
              <li className="letter-row" key={pitch.id}>
                <article>
                  <span className="label">
                    {KIND_LABEL[pitch.kind]}
                    {pitch.location && ` · ${pitch.location}`} · {shortDate(pitch.createdAt)}
                    {pitch.sample && " · Sample"}
                  </span>
                  <h2>
                    <Link href={`/p/${pitch.id}`}>{pitch.headline}</Link>
                  </h2>
                  <p className="letter-row__summary">{pitch.summary}</p>
                  <p className="letter-row__by">
                    {pitch.author}
                    {pitch.openToInvestment && <span className="quiet"> · open to investment</span>}
                  </p>
                </article>

                <div className="letter-row__side">
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
                    {pitch.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
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
