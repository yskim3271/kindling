import type { Metadata } from "next";
import { PatronDesk } from "@/components/PatronDesk";

export const metadata: Metadata = { title: "Patron desk" };

export default function PatronPage() {
  return <PatronDesk />;
}
