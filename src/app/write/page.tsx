import type { Metadata } from "next";
import { WriteForm } from "@/components/WriteForm";

export const metadata: Metadata = { title: "Write a letter" };

export default function WritePage() {
  return (
    <div className="desk desk--write wrap">
      <div className="stack">
        <div>
          <h1>Write it rough. The editor will set it.</h1>
          <p className="desk__deck">
            Put down what you need in your own words and your own language. An editor turns it into a letter a stranger
            can read in a minute, and tells you what a careful patron will ask. You approve every word before it is
            posted.
          </p>
        </div>
        <WriteForm />
      </div>

      <aside className="desk__aside">
        <h2>What the editor will not do</h2>
        <ul>
          <li>Add a fact, a number or a feeling you did not write. If something is missing, it asks you.</li>
          <li>Post anything. The edited letter comes back to you to change or throw away.</li>
          <li>Touch your money. Gifts go by PayPal to the address you give, and to nowhere else.</li>
        </ul>
      </aside>
    </div>
  );
}
