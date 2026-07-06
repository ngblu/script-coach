import type { Metadata } from "next";
import { Suspense } from "react";
import PracticeClient from "./PracticeClient";

export const metadata: Metadata = {
  title: "Practice | Script Coach",
  description:
    "Practice your pitch against an AI prospect — by text or voice. Get graded on rapport, objections, value delivery, and closing.",
};

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-8 text-text-muted">Loading...</div>}>
      <PracticeClient />
    </Suspense>
  );
}
