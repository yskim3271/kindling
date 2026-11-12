const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** $640 for whole amounts, $12.50 otherwise. */
export function money(amount: number): string {
  return Number.isInteger(amount) ? usd0.format(amount) : usd2.format(amount);
}

export function longDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}



/** Round to cents, the smallest unit PayPal accepts for USD. */
export function cents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
