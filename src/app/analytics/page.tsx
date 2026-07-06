import type { Metadata } from "next";
import AnalyticsClient from "./AnalyticsClient";

export const metadata: Metadata = {
  title: "Analytics | Script Coach",
  description: "Calls, win rates, objection breakdowns, and coaching impact — all your sales data.",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
