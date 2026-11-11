import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Newsreader } from "next/font/google";
import Link from "next/link";
import { MastheadNav } from "@/components/MastheadNav";
import { longDate } from "@/lib/format";
import { paypalEnv } from "@/lib/paypal";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--ff-display" });
const body = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--ff-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--ff-mono" });

export const metadata: Metadata = {
  title: { default: "Kindling", template: "%s · Kindling" },
  description:
    "A public letterbox. People post a story, a project or an argument; patrons read and fund them through PayPal, by hand or on the recommendation of an agent that reads against their saved preferences and never spends without their approval.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Every page reads the live ledger, so nothing is prerendered.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <header className="masthead wrap">
          <div className="masthead__strip label">
            <span>{longDate(Date.now())}</span>
            <span>{paypalEnv() === "sandbox" ? "Sandbox edition · no real money moves" : "Live payments"}</span>
          </div>
          <Link href="/" className="masthead__mark">
            Kindling
          </Link>
          <MastheadNav />
        </header>

        <main>{children}</main>

        <footer className="wrap">
          <div className="close">
          <p className="close__letter">
            Kindling keeps no balance and takes no cut. A gift is a PayPal payment from one person to another, and the
            ledger shows every one. PayPal deducts its own fee before the money arrives. Gifts are gifts: no equity,
            no repayment, no promise beyond the letter.
          </p>
          <p className="close__sign">Kindling</p>
          <p className="close__links">
            <Link href="/ledger">Read the ledger</Link>
            <Link href="/write">Write a letter</Link>
            <Link href="/patron">Patron desk</Link>
            <span>Payments by PayPal · Reading by Jev</span>
          </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
