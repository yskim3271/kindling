import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible,
  Atkinson_Hyperlegible_Mono,
  Barlow,
  Barlow_Condensed,
  Big_Shoulders,
  Bricolage_Grotesque,
  Hanken_Grotesk,
  IBM_Plex_Mono,
  JetBrains_Mono,
  Martian_Mono,
  Newsreader,
  Rubik,
} from "next/font/google";
import Link from "next/link";
import { MastheadNav } from "@/components/MastheadNav";
import { ThemeBar } from "@/components/ThemeBar";
import { longDate } from "@/lib/format";
import { paypalEnv } from "@/lib/paypal";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--ff-display" });
const body = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--ff-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--ff-mono" });

// Fonts for the three theme proposals in themes.css. Only the chosen theme's
// three will stay; none of them is preloaded, so the default theme pays nothing.
const storeDisplay = Barlow_Condensed({ subsets: ["latin"], preload: false, weight: ["600", "700"], variable: "--ff-store-display" });
const storeBody = Barlow({ subsets: ["latin"], preload: false, weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--ff-store-body" });
const storeMono = JetBrains_Mono({ subsets: ["latin"], preload: false, variable: "--ff-store-mono" });
const jamDisplay = Rubik({ subsets: ["latin"], preload: false, variable: "--ff-jam-display" });
const jamBody = Atkinson_Hyperlegible({ subsets: ["latin"], preload: false, weight: ["400", "700"], style: ["normal", "italic"], variable: "--ff-jam-body" });
const jamMono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], preload: false, variable: "--ff-jam-mono" });
const posterDisplay = Big_Shoulders({ subsets: ["latin"], preload: false, variable: "--ff-poster-display" });
const posterBody = Hanken_Grotesk({ subsets: ["latin"], preload: false, style: ["normal", "italic"], variable: "--ff-poster-body" });
const posterMono = Martian_Mono({ subsets: ["latin"], preload: false, variable: "--ff-poster-mono" });
const proposalFonts = [storeDisplay, storeBody, storeMono, jamDisplay, jamBody, jamMono, posterDisplay, posterBody, posterMono];

/**
 * Applies a theme proposal before the first paint: `?theme=store` on any page
 * picks one and remembers it in this browser; `?theme=paper` goes back.
 */
const themeScript = `(function(){try{var k="kindling.theme",p=new URLSearchParams(location.search).get("theme");if(p)localStorage.setItem(k,p);var t=p||localStorage.getItem(k);if(t&&t!=="paper")document.documentElement.dataset.theme=t}catch(e){}})()`;

export const metadata: Metadata = {
  title: { default: "Kindling", template: "%s · Kindling" },
  description:
    "Independent developers post a game in progress and the specific things it still needs. Patrons pay for them through PayPal, by hand or on the recommendation of an agent that reads every project against their saved preferences and never spends without their approval.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Every page reads the live ledger, so nothing is prerendered.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [display, body, mono, ...proposalFonts].map((font) => font.variable).join(" ");
  return (
    // The theme script sets data-theme before React loads, so the attribute differs from the server's on purpose.
    <html lang="en" className={fonts} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
              no repayment, no promise beyond what the developer wrote.
            </p>
            <p className="close__sign">Kindling</p>
            <p className="close__links">
              <Link href="/ledger">Read the ledger</Link>
              <Link href="/write">Post your game</Link>
              <Link href="/patron">Patron desk</Link>
              <span>Payments by PayPal · Reading by Jev</span>
            </p>
          </div>
        </footer>

        <ThemeBar />
      </body>
    </html>
  );
}
