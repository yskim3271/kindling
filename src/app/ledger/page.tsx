import type { Metadata } from "next";
import Link from "next/link";
import { listGifts, listPitches } from "@/lib/db";
import { longDate, money } from "@/lib/format";

export const metadata: Metadata = { title: "Ledger" };

export default async function LedgerPage() {
  const pitches = new Map((await listPitches()).map((p) => [p.id, p]));
  const gifts = (await listGifts()).filter((g) => g.status === "captured");
  const total = gifts.reduce((sum, g) => sum + g.amountUsd, 0);

  return (
    <div className="wrap">
      <header className="page-head">
        <h1>Every gift, in the open</h1>
        <p>
          Each line is a PayPal payment that completed. The capture ID is PayPal’s own receipt number; the developer and the
          patron can both look it up in their accounts.
        </p>
      </header>

      <div className="page-body">
        {gifts.length === 0 ? (
          <p className="empty" style={{ paddingBlock: 0 }}>
            The ledger is empty. <Link href="/">Look through the games</Link> and be the first line in it.
          </p>
        ) : (
          <div className="ledger__scroll">
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col">Paid into</th>
                  <th scope="col">PayPal capture</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {gifts.map((gift) => {
                  const pitch = pitches.get(gift.pitchId);
                  return (
                    <tr key={gift.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{longDate(gift.capturedAt ?? gift.createdAt)}</td>
                      <td>
                        {gift.patronName}
                        {gift.source === "agent" && <span className="quiet"> · via agent</span>}
                      </td>
                      <td>
                        {pitch ? (
                          <>
                            <Link href={`/p/${pitch.id}`}>{pitch.title}</Link>
                            <span className="quiet"> · {pitch.author}</span>
                          </>
                        ) : (
                          <span className="quiet">A letter from before Kindling narrowed to games</span>
                        )}
                      </td>
                      <td className="quiet">{gift.payee === "writer" ? "Developer’s PayPal" : "Demo account"}</td>
                      <td className="figure small">{gift.captureId}</td>
                      <td className="num">{money(gift.amountUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>
                    {gifts.length} {gifts.length === 1 ? "gift" : "gifts"}
                  </td>
                  <td className="num">{money(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
