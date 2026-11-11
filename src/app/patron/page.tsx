import type { Metadata } from "next";
import { PatronDesk } from "@/components/PatronDesk";
import { listPitches } from "@/lib/db";
import type { PitchKind } from "@/lib/types";

export const metadata: Metadata = { title: "Patron desk" };

export default async function PatronPage() {
  // How many letters of each kind still need funding, shown beside each choice.
  const openByKind: Record<PitchKind, number> = { story: 0, project: 0, opinion: 0 };
  for (const pitch of await listPitches()) {
    if (pitch.askUsd - pitch.raisedUsd >= 1) openByKind[pitch.kind] += 1;
  }
  return <PatronDesk openByKind={openByKind} />;
}
