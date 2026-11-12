import type { Metadata } from "next";
import { WriteForm } from "@/components/WriteForm";

export const metadata: Metadata = { title: "Post your game" };

export default function WritePage() {
  return (
    <div className="desk desk--write wrap">
      <div className="stack">
        <div>
          <h1>Post your game, in your own words.</h1>
          <p className="desk__deck">
            Say what the game is, what you have built, and the specific things it still needs. Nothing drafts the
            letter, polishes it or translates it for you, and that is the point: a patron is reading the person making
            the game, not a machine’s idea of them.
          </p>
        </div>
        <WriteForm />
      </div>

      <aside className="desk__aside">
        <h2>What a careful patron looks for</h2>
        <ul>
          <li>Something to play or watch. A link to a build tells them more than any description.</li>
          <li>What exists today, kept apart from what you plan to make.</li>
          <li>What the money buys, item by item, with a price on each.</li>
          <li>Small asks. A patron can finish a $400 item today; a $40,000 budget needs a publisher.</li>
        </ul>
      </aside>
    </div>
  );
}
