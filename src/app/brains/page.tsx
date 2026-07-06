import type { Metadata } from "next";
import BrainsPageClient from "./BrainsPageClient";

export const metadata: Metadata = {
  title: "Brains | Script Coach",
  description:
    "Your three intelligence layers: Market Brain, Leads Brain, and Coaching Brain — all learning together.",
};

export default function BrainsPage() {
  return <BrainsPageClient />;
}
