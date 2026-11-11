import type { Metadata } from "next";
import { WriteForm } from "@/components/WriteForm";

export const metadata: Metadata = { title: "Write a letter" };

export default function WritePage() {
  return (
    <div className="desk desk--write wrap">
      <div className="stack">
        <div>
          <h1>Write it in your own words.</h1>
          <p className="desk__deck">
            A letter here is written by the person asking. Nothing drafts it, polishes it or translates it for you, and
            that is the point: a patron is reading you, not a machine’s idea of you.
          </p>
        </div>
        <WriteForm />
      </div>

      <aside className="desk__aside">
        <h2>What a careful patron looks for</h2>
        <ul>
          <li>What the money buys, item by item, with a price on each.</li>
          <li>Someone or something that can confirm your account: a supervisor, a school, a client, a record.</li>
          <li>What changes once it is paid for, and by when you need it.</li>
        </ul>
      </aside>
    </div>
  );
}
