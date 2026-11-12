"use client";

import { useEffect, useState } from "react";
import { loadFit } from "./patronStore";

/** Marks a project that fit the patron's saved preferences the last time their agent read the board. */
export function MatchBadge({ pitchId }: { pitchId: string }) {
  const [fit, setFit] = useState<number | null>(null);

  // Read after mount: the server cannot know what this browser has stored.
  useEffect(() => setFit(loadFit(pitchId)), [pitchId]);

  if (fit === null) return null;
  return <span className="foryou">Fits your preferences · {Math.round(fit * 100)}%</span>;
}
