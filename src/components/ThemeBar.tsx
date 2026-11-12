"use client";

import { useEffect, useState } from "react";

/**
 * A switcher for comparing the theme proposals. It appears only in a browser
 * that has opened a page with `?theme=…` at least once, so ordinary visitors
 * never see it. It goes away when one theme is chosen.
 */
const THEMES = [
  { id: "paper", label: "Paper (current)" },
  { id: "store", label: "A · Storefront" },
  { id: "jam", label: "B · Jam" },
  { id: "poster", label: "C · Poster" },
];
const KEY = "kindling.theme";

export function ThemeBar() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTheme(localStorage.getItem(KEY));
    } catch {
      // No storage, no switcher.
    }
  }, []);

  if (theme === null) return null;

  const pick = (id: string) => {
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // The choice still applies to this page.
    }
    if (id === "paper") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = id;
    setTheme(id);
  };

  return (
    <div className="themebar" role="group" aria-label="Theme proposals">
      {THEMES.map((option) => (
        <button key={option.id} type="button" aria-pressed={theme === option.id} onClick={() => pick(option.id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
