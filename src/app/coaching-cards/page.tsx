import type { Metadata } from "next";
import CoachingCardsClient from "./CoachingCardsClient";

export const metadata: Metadata = {
  title: "Coaching Cards | Script Coach",
  description:
    "Your library of trigger-based coaching cards: objection handling, rapport, value props, and closes.",
};

export default function CoachingCardsPage() {
  return <CoachingCardsClient />;
}
